"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { dateOnly, normalizeDate, parseMoney } from "./money";
import { CsvFinanceImportParser, previewCsv, transactionFingerprint, type ColumnMapping, type ImportPreviewRow } from "./import-engine";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const name = (fd: FormData, key = "name") => z.string().min(1, "Informe um nome.").max(200).parse(text(fd, key));
const optional = (fd: FormData, key: string, max = 1000) => z.string().max(max).parse(text(fd, key)) || null;
const cents = (fd: FormData, key: string, zero = false, signed = false) => { const amount = parseMoney(text(fd, key) || "0", signed); if (!zero && amount <= 0) throw new Error("O valor deve ser maior que zero."); return amount; };
const enumValue = <T extends string>(fd: FormData, key: string, values: readonly T[], fallback: T): T => z.enum(values as [T, ...T[]]).parse(text(fd, key) || fallback);
const integer = (fd: FormData, key: string, min: number, max: number) => text(fd, key) ? z.coerce.number().int().min(min).max(max).parse(text(fd, key)) : null;
const date = (fd: FormData, key: string) => dateOnly(text(fd, key));
const optionalDate = (fd: FormData, key: string) => text(fd, key) ? date(fd, key) : null;

function invalidate() { revalidatePath("/finance", "layout"); revalidatePath("/today"); revalidatePath("/insights"); }
function failure(error: unknown) {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message || "Confira os campos." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: error.code === "P2002" ? "Já existe um registro com esses dados." : "Não foi possível salvar. Atualize a página e tente novamente." };
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
}
async function accountRef(workspaceId: string, accountId: string, required = true) {
  if (!accountId && !required) return null;
  const account = await prisma.account.findFirst({ where: { id: accountId, workspaceId, isArchived: false, currency: "BRL" } });
  if (!account) throw new Error("Selecione uma conta ativa deste workspace em BRL.");
  return account;
}
async function categoryRef(workspaceId: string, categoryId: string) {
  if (!categoryId) return null;
  const category = await prisma.financeCategory.findFirst({ where: { id: categoryId, workspaceId, isArchived: false } });
  if (!category) throw new Error("Categoria indisponível neste workspace.");
  return category;
}
async function log(tx: Prisma.TransactionClient, ctx: { workspaceId: string; userId: string }, type: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue = {}) {
  await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type, entityType, entityId, metadata } });
}

export async function saveAccount(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const data = { name: name(fd), type: enumValue(fd, "type", ["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT", "DIGITAL_WALLET", "OTHER"], "CHECKING"), institution: optional(fd, "institution", 200), currency: "BRL", initialBalanceCents: cents(fd, "initialBalance", true, true), creditLimitCents: text(fd, "creditLimit") ? cents(fd, "creditLimit", true) : null, closingDay: integer(fd, "closingDay", 1, 31), dueDay: integer(fd, "dueDay", 1, 31) };
    await prisma.$transaction(async tx => {
      const id = text(fd, "id");
      if (id) { const result = await tx.account.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data }); if (!result.count) throw new Error("Conta não encontrada."); await log(tx, ctx, "account.updated", "Account", id); }
      else { const item = await tx.account.create({ data: { ...data, workspaceId: ctx.workspaceId } }); await log(tx, ctx, "account.created", "Account", item.id); }
    });
    invalidate(); return { success: "Conta salva." };
  } catch (error) { return failure(error); }
}

export async function saveCategory(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const parent = await categoryRef(ctx.workspaceId, text(fd, "parentId"));
    const type = enumValue(fd, "type", ["INCOME", "EXPENSE"], "EXPENSE");
    if (parent && parent.type !== type) throw new Error("A categoria principal deve ter o mesmo tipo.");
    await prisma.financeCategory.create({ data: { workspaceId: ctx.workspaceId, name: name(fd), type, parentId: parent?.id, color: z.string().regex(/^#[0-9a-f]{6}$/i).parse(text(fd, "color") || "#8b8ef5") } });
    invalidate(); return { success: "Categoria criada." };
  } catch (error) { return failure(error); }
}

export async function createDefaultCategories() {
  const ctx = await requirePermission("WRITE");
  const categories = [["Moradia", "EXPENSE"], ["Alimentação", "EXPENSE"], ["Mercado", "EXPENSE"], ["Transporte", "EXPENSE"], ["Saúde", "EXPENSE"], ["Educação", "EXPENSE"], ["Lazer", "EXPENSE"], ["Compras", "EXPENSE"], ["Assinaturas", "EXPENSE"], ["Viagens", "EXPENSE"], ["Impostos", "EXPENSE"], ["Salário", "INCOME"], ["Freelance", "INCOME"], ["Investimentos", "INCOME"], ["Outros", "EXPENSE"]];
  try { await prisma.financeCategory.createMany({ data: categories.map(([categoryName, type]) => ({ workspaceId: ctx.workspaceId, name: categoryName, type, isSystem: true })), skipDuplicates: true }); invalidate(); return { success: "Categorias iniciais adicionadas." }; }
  catch (error) { return failure(error); }
}

export async function saveTransaction(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountRef(ctx.workspaceId, text(fd, "accountId"));
    const type = enumValue(fd, "type", ["INCOME", "EXPENSE", "TRANSFER", "REFUND", "ADJUSTMENT"], "EXPENSE");
    const destination = type === "TRANSFER" ? await accountRef(ctx.workspaceId, text(fd, "destinationAccountId")) : null;
    if (destination?.id === account!.id) throw new Error("A conta de destino deve ser diferente da origem.");
    const category = type === "TRANSFER" ? null : await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    const installmentNumber = integer(fd, "installmentNumber", 1, 999), installmentTotal = integer(fd, "installmentTotal", 1, 999);
    if (Boolean(installmentNumber) !== Boolean(installmentTotal) || (installmentNumber && installmentTotal && installmentNumber > installmentTotal)) throw new Error("Confira número e total de parcelas.");
    const data = { accountId: account!.id, destinationAccountId: destination?.id || null, categoryId: category?.id || null, type, description: name(fd, "description"), merchant: optional(fd, "merchant", 200), amountCents: cents(fd, "amount", type === "ADJUSTMENT", type === "ADJUSTMENT"), currency: "BRL", date: date(fd, "date"), competenceDate: optionalDate(fd, "competenceDate"), installmentNumber, installmentTotal, notes: optional(fd, "notes", 2000), tags: text(fd, "tags").split(",").map(t => t.trim()).filter(Boolean).slice(0, 20).map(t => z.string().max(50).parse(t)), recurring: fd.get("recurring") === "on" };
    await prisma.$transaction(async tx => {
      const id = text(fd, "id");
      if (id) { const result = await tx.financeTransaction.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { ...data, revision: { increment: 1 } } }); if (!result.count) throw new Error("Lançamento não encontrado."); await log(tx, ctx, "transaction.updated", "FinanceTransaction", id); }
      else { const item = await tx.financeTransaction.create({ data: { ...data, workspaceId: ctx.workspaceId } }); await log(tx, ctx, "transaction.created", "FinanceTransaction", item.id, { amountCents: data.amountCents, type }); }
    });
    invalidate(); return { success: "Lançamento salvo." };
  } catch (error) { return failure(error); }
}

export async function bulkTransactions(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const ids = z.array(z.string().min(1)).min(1, "Selecione lançamentos.").max(100).parse(fd.getAll("ids"));
    const operation = enumValue(fd, "operation", ["CATEGORIZE", "DELETE"], "CATEGORIZE");
    if (operation === "DELETE" && text(fd, "confirmation") !== "EXCLUIR") throw new Error("Digite EXCLUIR para confirmar a exclusão dos selecionados.");
    const category = operation === "CATEGORIZE" ? await categoryRef(ctx.workspaceId, text(fd, "categoryId")) : null;
    const result = await prisma.$transaction(async tx => {
      const count = await tx.financeTransaction.count({ where: { workspaceId: ctx.workspaceId, id: { in: ids } } });
      if (count !== new Set(ids).size) throw new Error("Um lançamento está indisponível neste workspace.");
      const result = operation === "DELETE" ? await tx.financeTransaction.deleteMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids } } }) : await tx.financeTransaction.updateMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids }, type: { not: "TRANSFER" } }, data: { categoryId: category?.id || null, revision: { increment: 1 } } });
      await log(tx, ctx, operation === "DELETE" ? "transactions.deleted" : "transactions.categorized", "FinanceTransaction", ids[0], { count: result.count });
      return result;
    });
    invalidate(); return { success: `${result.count} lançamento(s) ${operation === "DELETE" ? "excluído(s)" : "categorizado(s)"}.` };
  } catch (error) { return failure(error); }
}

export async function saveBudget(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const category = await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    if (!category || category.type !== "EXPENSE") throw new Error("Selecione uma categoria de despesa.");
    const startDate = date(fd, "startDate"), endDate = date(fd, "endDate");
    if (endDate < startDate) throw new Error("A data final deve ser posterior à inicial.");
    const data = { categoryId: category.id, period: enumValue(fd, "period", ["MONTHLY", "WEEKLY", "CUSTOM"], "MONTHLY"), startDate, endDate, limitCents: cents(fd, "limit") };
    const id = text(fd, "id");
    if (id) { const result = await prisma.budget.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data }); if (!result.count) throw new Error("Orçamento não encontrado."); }
    else await prisma.budget.create({ data: { ...data, workspaceId: ctx.workspaceId } });
    invalidate(); return { success: "Orçamento salvo." };
  } catch (error) { return failure(error); }
}

export async function saveSubscription(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountRef(ctx.workspaceId, text(fd, "accountId"), false), category = await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    const billingCycle = enumValue(fd, "billingCycle", ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"], "MONTHLY");
    const customDays = integer(fd, "customDays", 1, 3650);
    if (billingCycle === "CUSTOM" && !customDays) throw new Error("Informe a duração do ciclo em dias.");
    const data = { name: name(fd), merchant: optional(fd, "merchant", 200), amountCents: cents(fd, "amount"), billingCycle, customDays, nextChargeDate: date(fd, "nextChargeDate"), startedAt: date(fd, "startedAt"), accountId: account?.id || null, categoryId: category?.id || null, status: enumValue(fd, "status", ["ACTIVE", "PAUSED", "CANCELED"], "ACTIVE"), notes: optional(fd, "notes", 2000) };
    const id = text(fd, "id");
    if (id) { const result = await prisma.subscription.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data }); if (!result.count) throw new Error("Assinatura não encontrada."); }
    else await prisma.subscription.create({ data: { ...data, workspaceId: ctx.workspaceId } });
    invalidate(); return { success: "Assinatura salva." };
  } catch (error) { return failure(error); }
}

export async function saveDebt(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const interestBasisPoints = parseMoney(text(fd, "interestRate") || "0");
    if (interestBasisPoints > 10000) throw new Error("Taxa deve estar entre 0 e 100% por período.");
    const data = { name: name(fd), originalAmountCents: cents(fd, "originalAmount"), remainingBalanceCents: cents(fd, "remainingBalance", true), minimumPaymentCents: cents(fd, "minimumPayment"), interestBasisPoints, ratePeriod: enumValue(fd, "ratePeriod", ["MONTHLY", "YEARLY"], "MONTHLY"), installments: integer(fd, "installments", 1, 600), dueDay: integer(fd, "dueDay", 1, 31), startDate: date(fd, "startDate"), targetPayoffDate: optionalDate(fd, "targetPayoffDate"), status: enumValue(fd, "status", ["ACTIVE", "PAID", "PAUSED"], "ACTIVE") };
    if (data.status === "PAID" && data.remainingBalanceCents !== 0) throw new Error("Dívida quitada deve ter saldo zero.");
    const id = text(fd, "id");
    if (id) { const result = await prisma.debt.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data }); if (!result.count) throw new Error("Dívida não encontrada."); }
    else await prisma.debt.create({ data: { ...data, workspaceId: ctx.workspaceId } });
    invalidate(); return { success: "Dívida salva." };
  } catch (error) { return failure(error); }
}

export async function saveSavingsGoal(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountRef(ctx.workspaceId, text(fd, "linkedAccountId"), false);
    const data = { name: name(fd), targetAmountCents: cents(fd, "targetAmount"), currentAmountCents: cents(fd, "currentAmount", true), linkedAccountId: account?.id || null, targetDate: optionalDate(fd, "targetDate"), status: enumValue(fd, "status", ["ACTIVE", "COMPLETED", "PAUSED"], "ACTIVE") };
    const id = text(fd, "id");
    if (id) { const result = await prisma.savingsGoal.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data }); if (!result.count) throw new Error("Meta não encontrada."); }
    else await prisma.savingsGoal.create({ data: { ...data, workspaceId: ctx.workspaceId } });
    invalidate(); return { success: "Meta financeira salva." };
  } catch (error) { return failure(error); }
}

export async function archiveFinanceEntity(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const id = name(fd, "id"), entity = enumValue(fd, "entity", ["ACCOUNT", "CATEGORY", "RULE", "BUDGET"], "ACCOUNT");
    if (entity === "ACCOUNT") await prisma.account.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { isArchived: fd.get("restore") !== "on" } });
    if (entity === "CATEGORY") await prisma.financeCategory.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { isArchived: true } });
    if (entity === "RULE") await prisma.transactionRule.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { isEnabled: false } });
    if (entity === "BUDGET") await prisma.budget.deleteMany({ where: { id, workspaceId: ctx.workspaceId } });
    invalidate(); return { success: "Registro atualizado." };
  } catch (error) { return failure(error); }
}

export async function saveTransactionRule(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const category = await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    const account = await accountRef(ctx.workspaceId, text(fd, "accountId"), false);
    const setMerchant = optional(fd, "setMerchant", 200), addTag = optional(fd, "addTag", 50);
    if (!category && !setMerchant && !addTag) throw new Error("Escolha ao menos uma ação para a regra.");
    const minAmountCents = text(fd, "minAmount") ? cents(fd, "minAmount", true) : null, maxAmountCents = text(fd, "maxAmount") ? cents(fd, "maxAmount", true) : null;
    if (minAmountCents !== null && maxAmountCents !== null && minAmountCents > maxAmountCents) throw new Error("Faixa de valores inválida.");
    await prisma.transactionRule.create({ data: { workspaceId: ctx.workspaceId, name: name(fd), field: enumValue(fd, "field", ["description", "merchant"], "description"), operator: enumValue(fd, "operator", ["contains", "startsWith", "equals"], "contains"), value: name(fd, "value"), minAmountCents, maxAmountCents, categoryId: category?.id || null, accountId: account?.id || null, source: optional(fd, "source", 50), setMerchant, addTag, priority: integer(fd, "priority", 0, 10000) ?? 100 } });
    invalidate(); return { success: "Regra criada. Ela será aplicada nas próximas prévias de importação." };
  } catch (error) { return failure(error); }
}

export async function uploadCsv(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountRef(ctx.workspaceId, text(fd, "accountId"));
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000 || !file.name.toLowerCase().endsWith(".csv")) throw new Error("Selecione um CSV UTF-8 de até 1 MB.");
    const rawContent = await file.text();
    const parsed = CsvFinanceImportParser.parse(rawContent);
    const batch = await prisma.importBatch.create({ data: { workspaceId: ctx.workspaceId, accountId: account!.id, fileName: file.name.slice(0, 200), fileSize: file.size, rawContent, rowCount: parsed.rows.length } });
    return { batchId: batch.id, headers: parsed.headers, rows: parsed.rows.slice(0, 5), count: parsed.rows.length, delimiter: parsed.delimiter };
  } catch (error) { return failure(error); }
}

const mappingSchema = z.object({ date: z.string().min(1), description: z.string().min(1), amount: z.string().min(1), externalId: z.string().optional(), merchant: z.string().optional(), type: z.string().optional(), direction: z.enum(["SIGNED", "EXPENSE", "INCOME"]) });

async function existingFingerprints(tx: Prisma.TransactionClient, workspaceId: string, accountId: string) {
  const rows = await tx.financeTransaction.findMany({ where: { workspaceId, accountId }, select: { date: true, description: true, amountCents: true, type: true, externalId: true, fingerprint: true } });
  return new Set(rows.flatMap(t => {
    const values = t.fingerprint ? [t.fingerprint] : [];
    if (t.type === "INCOME" || t.type === "EXPENSE" || t.type === "REFUND") values.push(transactionFingerprint(workspaceId, accountId, { ...t, type: t.type, date: t.date.toISOString().slice(0, 10) }));
    return values;
  }));
}

export async function prepareCsvPreview(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const batch = await prisma.importBatch.findFirst({ where: { id: text(fd, "batchId"), workspaceId: ctx.workspaceId, status: { in: ["UPLOADED", "PREVIEW"] } } });
    if (!batch?.rawContent) throw new Error("Lote indisponível para revisão.");
    const mapping = mappingSchema.parse(Object.fromEntries(["date", "description", "amount", "externalId", "merchant", "type", "direction"].map(key => [key, text(fd, key)])));
    const [fingerprints, rules] = await Promise.all([existingFingerprints(prisma, ctx.workspaceId, batch.accountId), prisma.transactionRule.findMany({ where: { workspaceId: ctx.workspaceId, isEnabled: true, OR: [{ categoryId: null }, { category: { workspaceId: ctx.workspaceId, isArchived: false } }] }, orderBy: [{ priority: "asc" }, { id: "asc" }] })]);
    const preview = previewCsv(batch.rawContent, mapping, ctx.workspaceId, batch.accountId, fingerprints, rules);
    const duplicateCount = preview.filter(r => r.duplicate).length, failedCount = preview.filter(r => r.errors.length).length;
    const updated = await prisma.importBatch.updateMany({ where: { id: batch.id, workspaceId: ctx.workspaceId, status: { in: ["UPLOADED", "PREVIEW"] } }, data: { status: "PREVIEW", mapping: mapping as Prisma.InputJsonValue, preview: preview as unknown as Prisma.InputJsonValue, duplicateCount, failedCount } });
    if (!updated.count) throw new Error("O lote mudou durante a revisão. Atualize a página.");
    const mappingName = optional(fd, "mappingName", 100);
    if (mappingName) await prisma.importMapping.upsert({ where: { workspaceId_name: { workspaceId: ctx.workspaceId, name: mappingName } }, create: { workspaceId: ctx.workspaceId, name: mappingName, mapping: mapping as Prisma.InputJsonValue }, update: { mapping: mapping as Prisma.InputJsonValue } });
    return { preview: preview.slice(0, 20), reviewRows: preview.filter(r => r.errors.length || r.duplicate).slice(0, 100), count: preview.length, duplicates: duplicateCount, failed: failedCount, ready: preview.length - duplicateCount - failedCount };
  } catch (error) { return failure(error); }
}

export async function confirmCsvImport(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const result = await prisma.$transaction(async tx => {
      const batchId = text(fd, "batchId");
      const claimed = await tx.importBatch.updateMany({ where: { id: batchId, workspaceId: ctx.workspaceId, status: "PREVIEW" }, data: { status: "IMPORTING" } });
      if (!claimed.count) throw new Error("Lote já importado ou ainda não revisado.");
      const batch = await tx.importBatch.findFirstOrThrow({ where: { id: batchId, workspaceId: ctx.workspaceId } });
      if (batch.failedCount > 0 && fd.get("acceptErrors") !== "on") throw new Error("Confirme que deseja ignorar as linhas inválidas.");
      const account = await tx.account.findFirst({ where: { id: batch.accountId, workspaceId: ctx.workspaceId, isArchived: false, currency: "BRL" } });
      if (!account) throw new Error("A conta foi arquivada. Envie o CSV para uma conta ativa.");
      const rows = batch.preview as unknown as ImportPreviewRow[];
      if (!Array.isArray(rows)) throw new Error("Prévia indisponível. Revise o arquivo novamente.");
      const fingerprints = await existingFingerprints(tx, ctx.workspaceId, batch.accountId);
      const valid = rows.filter(row => row.data && !row.duplicate && !row.errors.length && !fingerprints.has(row.data.fingerprint));
      const categories = [...new Set(valid.map(r => r.data!.categoryId).filter((id): id is string => Boolean(id)))];
      const categoryCount = await tx.financeCategory.count({ where: { id: { in: categories }, workspaceId: ctx.workspaceId, isArchived: false } });
      if (categoryCount !== categories.length) throw new Error("Uma categoria mudou. Gere a prévia novamente.");
      const imported = valid.length ? await tx.financeTransaction.createMany({ data: valid.map(row => {
        const item = row.data!;
        return { workspaceId: ctx.workspaceId, accountId: batch.accountId, importBatchId: batch.id, amountCents: item.amountCents, type: item.type, description: item.description, merchant: item.merchant, externalId: item.externalId, fingerprint: item.fingerprint, categoryId: item.categoryId, tags: item.tags, date: dateOnly(item.date), source: "CSV", currency: "BRL" };
      }), skipDuplicates: true }) : { count: 0 };
      const duplicates = rows.length - batch.failedCount - imported.count;
      await tx.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", importedCount: imported.count, duplicateCount: duplicates, completedAt: new Date(), rawContent: null } });
      await log(tx, ctx, "finance.imported", "ImportBatch", batch.id, { count: imported.count, duplicates, failed: batch.failedCount });
      return { imported: imported.count, duplicates, failed: batch.failedCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    invalidate(); return { success: `${result.imported} lançamento(s) importado(s). ${result.duplicates} duplicado(s), ${result.failed} inválido(s) ignorado(s).`, ...result };
  } catch (error) { return failure(error); }
}

export async function rollbackImport(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    if (text(fd, "confirmation") !== "DESFAZER") throw new Error("Digite DESFAZER para confirmar o rollback.");
    const result = await prisma.$transaction(async tx => {
      const batch = await tx.importBatch.findFirst({ where: { id: text(fd, "batchId"), workspaceId: ctx.workspaceId, status: "COMPLETED" } });
      if (!batch) throw new Error("Lote indisponível ou já desfeito.");
      const removed = await tx.financeTransaction.deleteMany({ where: { workspaceId: ctx.workspaceId, importBatchId: batch.id, revision: 0 } });
      const preserved = await tx.financeTransaction.count({ where: { workspaceId: ctx.workspaceId, importBatchId: batch.id } });
      await tx.importBatch.update({ where: { id: batch.id }, data: { status: preserved ? "PARTIAL_ROLLBACK" : "ROLLED_BACK", rolledBackAt: new Date(), rolledBackCount: removed.count, preservedCount: preserved } });
      await log(tx, ctx, "finance.import_rolled_back", "ImportBatch", batch.id, { removed: removed.count, preserved });
      return { removed: removed.count, preserved };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    invalidate(); return { success: `${result.removed} lançamento(s) removido(s). ${result.preserved} editado(s) após importar foram preservados.` };
  } catch (error) { return failure(error); }
}

export async function cancelImport(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try { await prisma.importBatch.updateMany({ where: { id: text(fd, "batchId"), workspaceId: ctx.workspaceId, status: { in: ["UPLOADED", "PREVIEW"] } }, data: { status: "CANCELED", rawContent: null, preview: Prisma.DbNull } }); invalidate(); return { success: "Importação cancelada." }; }
  catch (error) { return failure(error); }
}
