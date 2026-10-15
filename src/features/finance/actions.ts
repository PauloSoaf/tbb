"use server";

import { createHash } from "node:crypto";
import { Prisma, type FinanceTransaction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/tenancy/requirePermission";
import { dateOnly, parseMoney } from "./money";
import { CsvFinanceImportParser, previewCsv, transactionFingerprint, type ImportPreviewRow } from "./import-engine";
import { applyCardStatementImport, previewCardStatementImport } from "./card-statement-import";
import { statementLinkError } from "./card-statements";
import { interpretCardExpenseText } from "./natural-language";
import { NOTE_MAX, normalizeNote } from "./transaction-notes";
import { ensureUnassignedAccount } from "./unassigned-account";
import { rollbackFinancialDocument } from "./document-import";

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
async function accountOrUnassigned(workspaceId:string,accountId:string){const account=await accountRef(workspaceId,accountId,false);return account||prisma.$transaction(tx=>ensureUnassignedAccount(tx,workspaceId))}
async function categoryRef(workspaceId: string, categoryId: string) {
  if (!categoryId) return null;
  const category = await prisma.financeCategory.findFirst({ where: { id: categoryId, workspaceId, isArchived: false } });
  if (!category) throw new Error("Categoria indisponível neste workspace.");
  return category;
}
// A detailed card purchase belongs to its card's bill; moving it to another account detaches it.
type StatementPurchase = Pick<FinanceTransaction, "id" | "accountId" | "type" | "amountCents" | "cardStatementId" | "statementDetailMode">;
const purchaseSelect = { id: true, accountId: true, type: true, amountCents: true, cardStatementId: true, statementDetailMode: true } as const;
/** Every edit path checks the same effective total inside its serializable transaction. */
async function protectStatementPurchase(tx: Prisma.TransactionClient, ctx: { workspaceId: string; role: string }, current: StatementPurchase, change: { accountId?: string; type?: string; amountCents?: number; detach?: boolean }) {
  if (!current.cardStatementId || !current.statementDetailMode) return {};
  const detach = change.detach || (change.accountId !== undefined && change.accountId !== current.accountId) || (change.type !== undefined && change.type !== "EXPENSE");
  const amount = change.amountCents ?? current.amountCents;
  if (!detach && amount === current.amountCents) return {};
  if (ctx.role !== "OWNER") throw new AuthorizationError("Somente o titular deste espaço pode alterar gastos vinculados a faturas.");
  const statement = await statementForLink(tx, ctx.workspaceId, current.cardStatementId, current.accountId, current.id);
  if (statement.status === "PAID" && current.statementDetailMode === "ADDED_TO_STATEMENT") throw new Error("Esta fatura já foi paga e o valor dela não muda.");
  if (!detach) {
    const error = statementLinkError({ status: statement.status, amountCents: statement.totalCents, detailedCents: statement.detailedCents }, current.statementDetailMode, amount);
    if (error) throw new Error(error);
  }
  return detach ? { cardStatementId: null, statementDetailMode: null } : {};
}
async function log(tx: Prisma.TransactionClient, ctx: { workspaceId: string; userId: string }, type: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue = {}) {
  await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type, entityType, entityId, metadata } });
}

const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT", "DIGITAL_WALLET", "OTHER"] as const;
/** Only fields the form actually sent are written: an edit never wipes a value it did not show,
 * and the card's recurring cycle lives here, apart from the dates of each statement. */
function accountFields(fd: FormData, creating: boolean) {
  const sent = (key: string) => creating || fd.has(key);
  const data: Partial<{ name: string; type: (typeof ACCOUNT_TYPES)[number]; institution: string | null; initialBalanceCents: number; creditLimitCents: number | null; closingDay: number | null; dueDay: number | null }> = {};
  if (sent("name")) data.name = name(fd);
  if (sent("type")) data.type = enumValue(fd, "type", ACCOUNT_TYPES, "CHECKING");
  if (sent("institution")) data.institution = optional(fd, "institution", 200);
  if (sent("initialBalance")) data.initialBalanceCents = cents(fd, "initialBalance", true, true);
  if (sent("creditLimit")) data.creditLimitCents = text(fd, "creditLimit") ? cents(fd, "creditLimit", true) : null;
  if (sent("closingDay")) data.closingDay = integer(fd, "closingDay", 1, 31);
  if (sent("dueDay")) data.dueDay = integer(fd, "dueDay", 1, 31);
  return data;
}

export async function saveAccount(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const id = text(fd, "id");
    const data = accountFields(fd, !id);
    await prisma.$transaction(async tx => {
      if (id) {
        if (data.type && data.type !== "CREDIT_CARD" && await tx.cardStatement.count({ where: { workspaceId: ctx.workspaceId, accountId: id } })) throw new Error("Este cartão tem faturas registradas; o tipo da conta não pode mudar.");
        const result = await tx.account.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data });
        if (!result.count) throw new Error("Conta não encontrada.");
        await log(tx, ctx, "account.updated", "Account", id, { fields: Object.keys(data) });
      } else {
        const item = await tx.account.create({ data: { ...data, name: data.name!, currency: "BRL", workspaceId: ctx.workspaceId } });
        await log(tx, ctx, "account.created", "Account", item.id);
      }
    });
    invalidate(); return { success: "Conta salva." };
  } catch (error) { return failure(error); }
}

/** Reconcile a bank balance without rewriting the opening balance or past transactions. */
export async function reconcileAccountBalance(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const id = text(fd, "id");
    if (!text(fd, "balance")) throw new Error("Informe o saldo atual.");
    const desired = cents(fd, "balance", true, true);
    const today = dayKey(new Date(), ctx.workspace.timezone);
    const entryDate = dateOnly(today);
    const until = new Date(entryDate.getTime() + 86400000);
    await prisma.$transaction(async tx => {
      const account = await tx.account.findFirst({ where: { id, workspaceId: ctx.workspaceId, isArchived: false, type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } } });
      if (!account) throw new Error("Selecione uma conta corrente, carteira ou reserva deste espaço.");
      const [origin, incoming] = await Promise.all([
        tx.financeTransaction.groupBy({ by: ["type"], where: { workspaceId: ctx.workspaceId, accountId: id, source: { not: "QUICK_INCOME" }, date: { lt: until } }, _sum: { amountCents: true } }),
        tx.financeTransaction.aggregate({ where: { workspaceId: ctx.workspaceId, destinationAccountId: id, type: "TRANSFER", date: { lt: until } }, _sum: { amountCents: true } }),
      ]);
      const current = account.initialBalanceCents + (incoming._sum.amountCents || 0) + origin.reduce((sum, row) => sum + (["INCOME", "REFUND", "ADJUSTMENT"].includes(row.type) ? 1 : -1) * (row._sum.amountCents || 0), 0);
      const adjustment = desired - current;
      if (!adjustment) return;
      const item = await tx.financeTransaction.create({ data: { workspaceId: ctx.workspaceId, accountId: id, type: "ADJUSTMENT", description: "Conferência do saldo da conta", amountCents: adjustment, date: entryDate, source: "BALANCE_RECONCILIATION", currency: "BRL" } });
      await log(tx, ctx, "account.balance_reconciled", "FinanceTransaction", item.id, { accountId: id });
    }, { isolationLevel: "Serializable" });
    invalidate(); return { success: "Saldo atualizado." };
  } catch (error) { return failure(error); }
}

export async function saveMonthlyIncome(fd:FormData){
  const ctx=await requirePermission("WRITE");
  try{
    const amountCents=cents(fd,"amount",true);
    const account=await accountRef(ctx.workspaceId,text(fd,"accountId"),false);
    if(account&&!['CHECKING','CASH','DIGITAL_WALLET'].includes(account.type))throw new Error("Escolha uma conta de dinheiro para receber a renda, não o cartão.");
    const payDay=integer(fd,"payDay",1,31);
    await prisma.$transaction(async tx=>{
      const data={incomeCents:amountCents,payDay,receivingAccountId:account?.id||null};
      await tx.financePlan.upsert({where:{workspaceId:ctx.workspaceId},create:{workspaceId:ctx.workspaceId,...data},update:data});
      await log(tx,ctx,"income.plan_saved","FinancePlan",ctx.workspaceId);
    });
    invalidate();
    return {success:"Renda prevista atualizada. Nenhum recebimento foi lançado."};
  }catch(error){return failure(error)}
}

export async function receiveMonthlyIncome(fd:FormData){
  const ctx=await requirePermission("WRITE");
  try{
    const amountCents=cents(fd,"amount");
    const entryDate=date(fd,"date");
    if(entryDate>dateOnly(dayKey(new Date(),ctx.workspace.timezone)))throw new Error("O recebimento confirmado não pode ter data futura.");
    const account=await accountRef(ctx.workspaceId,text(fd,"accountId"));
    if(!account||!['CHECKING','CASH','DIGITAL_WALLET'].includes(account.type))throw new Error("Escolha uma conta de dinheiro para receber a renda.");
    const fingerprint=createHash('sha256').update(`income-receipt:${account.id}:${entryDate.toISOString()}:${amountCents}`).digest('hex');
    await prisma.$transaction(async tx=>{
      const item=await tx.financeTransaction.create({data:{workspaceId:ctx.workspaceId,accountId:account.id,type:"INCOME",description:"Recebimento de renda mensal",amountCents,currency:"BRL",date:entryDate,source:"MONTHLY_INCOME_RECEIVED",tags:["renda-mensal:recebida"],fingerprint}});
      await log(tx,ctx,"income.received","FinanceTransaction",item.id);
    });
    invalidate();return {success:"Recebimento registrado no saldo da conta."};
  }catch(error){return failure(error)}
}

export async function saveFixedExpense(fd:FormData){
  const ctx=await requirePermission("WRITE");
  try{
    const id=text(fd,"id");
    // An end date and a card are optional. Clearing either field on an edit removes it.
    const endsOn=optionalDate(fd,"endsOn");
    if(endsOn&&(endsOn.getUTCFullYear()<2000||endsOn.getUTCFullYear()>2100))throw new Error("Informe uma data de término válida.");
    const cardAccountId=text(fd,"cardAccountId");
    if(cardAccountId){const card=await accountRef(ctx.workspaceId,cardAccountId);if(card?.type!=="CREDIT_CARD")throw new Error("Escolha um cartão de crédito para ligar o gasto à fatura.");}
    const data={name:name(fd),amountCents:cents(fd,"amount"),dueDay:integer(fd,"dueDay",1,31),notes:optional(fd,"notes"),endsOn,cardAccountId:cardAccountId||null};
    await prisma.$transaction(async tx=>{
      if(id){const result=await tx.fixedExpense.updateMany({where:{id,workspaceId:ctx.workspaceId,isActive:true},data});if(!result.count)throw new Error("Gasto fixo não encontrado.");}
      else{const item=await tx.fixedExpense.create({data:{workspaceId:ctx.workspaceId,...data}});await log(tx,ctx,"expense.plan_created","FixedExpense",item.id);}
    });
    invalidate();return {success:"Gasto fixo previsto salvo. Nenhuma despesa foi lançada."};
  }catch(error){return failure(error)}
}

export async function archiveFixedExpense(fd:FormData){
  const ctx=await requirePermission("WRITE");
  try{const result=await prisma.fixedExpense.updateMany({where:{id:text(fd,"id"),workspaceId:ctx.workspaceId},data:{isActive:false}});if(!result.count)throw new Error("Gasto fixo não encontrado.");invalidate();return {success:"Previsão removida."};}catch(error){return failure(error)}
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
    let account = await accountRef(ctx.workspaceId, text(fd, "accountId"), false);
    const type = enumValue(fd, "type", ["INCOME", "EXPENSE", "TRANSFER", "REFUND", "ADJUSTMENT"], "EXPENSE");
    if(type==="TRANSFER"&&!account)throw new Error("Transferências precisam de uma conta de origem.");
    if(!account)account=await prisma.$transaction(tx=>ensureUnassignedAccount(tx,ctx.workspaceId));
    const destination = type === "TRANSFER" ? await accountRef(ctx.workspaceId, text(fd, "destinationAccountId")) : null;
    if (destination?.id === account.id) throw new Error("A conta de destino deve ser diferente da origem.");
    const category = type === "TRANSFER" ? null : await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    const installmentNumber = integer(fd, "installmentNumber", 1, 999), installmentTotal = integer(fd, "installmentTotal", 1, 999);
    if (Boolean(installmentNumber) !== Boolean(installmentTotal) || (installmentNumber && installmentTotal && installmentNumber > installmentTotal)) throw new Error("Confira número e total de parcelas.");
    const data = { accountId: account.id, destinationAccountId: destination?.id || null, categoryId: category?.id || null, type, description: name(fd, "description"), merchant: optional(fd, "merchant", 200), amountCents: cents(fd, "amount", type === "ADJUSTMENT", type === "ADJUSTMENT"), currency: "BRL", date: date(fd, "date"), competenceDate: optionalDate(fd, "competenceDate"), installmentNumber, installmentTotal, notes: normalizeNote(z.string().max(NOTE_MAX).parse(text(fd, "notes"))), tags: text(fd, "tags").split(",").map(t => t.trim()).filter(Boolean).slice(0, 20).map(t => z.string().max(50).parse(t)), recurring: fd.get("recurring") === "on" };
    await prisma.$transaction(async tx => {
      const id = text(fd, "id");
      if (id) {
        const current = await tx.financeTransaction.findFirst({ where: { id, workspaceId: ctx.workspaceId }, select: purchaseSelect });
        if (!current) throw new Error("Lançamento não encontrado.");
        const linkFields = await protectStatementPurchase(tx, ctx, current, data);
        await tx.financeTransaction.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { ...data, ...linkFields, revision: { increment: 1 } } });
        await log(tx, ctx, "transaction.updated", "FinanceTransaction", id);
      }
      else { const item = await tx.financeTransaction.create({ data: { ...data, workspaceId: ctx.workspaceId } }); await log(tx, ctx, "transaction.created", "FinanceTransaction", item.id, { amountCents: data.amountCents, type }); }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
      if (operation === "DELETE") {
        const linked = await tx.financeTransaction.findMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids }, cardStatementId: { not: null } }, select: purchaseSelect });
        for (const purchase of linked) await protectStatementPurchase(tx, ctx, purchase, { detach: true });
      }
      const result = operation === "DELETE" ? await tx.financeTransaction.deleteMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids } } }) : await tx.financeTransaction.updateMany({ where: { workspaceId: ctx.workspaceId, id: { in: ids }, type: { not: "TRANSFER" } }, data: { categoryId: category?.id || null, revision: { increment: 1 } } });
      await log(tx, ctx, operation === "DELETE" ? "transactions.deleted" : "transactions.categorized", "FinanceTransaction", ids[0], { count: result.count });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
    const account = await accountOrUnassigned(ctx.workspaceId, text(fd, "accountId"));
    if (account?.type === "CREDIT_CARD") throw new Error("Use Documentos e conciliação para compras e pagamentos de cartão.");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000 || !file.name.toLowerCase().endsWith(".csv")) throw new Error("Selecione um CSV UTF-8 de até 5 MB.");
    const rawContent = await file.text();
    const parsed = CsvFinanceImportParser.parse(rawContent);
    const batch = await prisma.importBatch.create({ data: { workspaceId: ctx.workspaceId, accountId: account!.id, fileName: file.name.slice(0, 200), fileSize: file.size, rawContent, rowCount: parsed.rows.length } });
    return { batchId: batch.id, headers: parsed.headers, rows: parsed.rows.slice(0, 5), count: parsed.rows.length, delimiter: parsed.delimiter };
  } catch (error) { return failure(error); }
}

export async function uploadPastedData(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountOrUnassigned(ctx.workspaceId, text(fd, "accountId"));
    if (account?.type === "CREDIT_CARD") throw new Error("Use Documentos e conciliação para compras e pagamentos de cartão.");
    const rawContent = text(fd, "content");
    if (!rawContent || Buffer.byteLength(rawContent, "utf8") > 1_000_000) throw new Error("Cole dados tabulares de até 1 MB.");
    const parsed = CsvFinanceImportParser.parse(rawContent);
    const batch = await prisma.importBatch.create({ data: { workspaceId: ctx.workspaceId, accountId: account!.id, source: "PASTE", fileName: "clipboard.csv", fileSize: Buffer.byteLength(rawContent, "utf8"), rawContent, rowCount: parsed.rows.length } });
    return { batchId: batch.id, headers: parsed.headers, rows: parsed.rows.slice(0, 5), count: parsed.rows.length, delimiter: parsed.delimiter, source: "PASTE" };
  } catch (error) { return failure(error); }
}

function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }
/** PDF text-layer ingestion uses the same review pipeline as CSV and never creates a transaction directly. */
export async function uploadFinanceDocument(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const account = await accountOrUnassigned(ctx.workspaceId, text(fd, "accountId"));
    if (account?.type === "CREDIT_CARD") throw new Error("Use Documentos e conciliação para faturas de cartão.");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5_000_000) throw new Error("Selecione um CSV ou PDF de até 5 MB.");
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv")) return uploadCsv(fd);
    if (!lower.endsWith(".pdf") || file.type && file.type !== "application/pdf") throw new Error("Formato aceito: CSV ou PDF.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await Promise.race([
      getDocumentProxy(bytes, { maxImageSize: 16_777_216 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("A leitura do PDF excedeu o tempo limite.")), 10_000)),
    ]);
    if (pdf.numPages > 100) throw new Error("PDF deve ter no máximo 100 páginas.");
    const extracted = await Promise.race([
      extractText(pdf, { mergePages: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("A extração do PDF excedeu o tempo limite.")), 15_000)),
    ]);
    const content = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
    if (!content || content.trim().length < 20) throw new Error("Este PDF parece digitalizado. A extração automática precisa de OCR.");
    const candidates: string[] = [];
    const datePattern = /(\d{2}[/.\-]\d{2}(?:[/.\-](?:\d{2}|\d{4}))?|\d{4}-\d{2}-\d{2})/;
    const amountPattern = /([-+]?\s*(?:R\$\s*)?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2})\s*$/;
    for (const rawLine of content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
      const dateMatch = rawLine.match(datePattern); const amountMatch = rawLine.match(amountPattern);
      if (!dateMatch || !amountMatch || dateMatch.index === undefined || amountMatch.index === undefined || amountMatch.index <= dateMatch.index) continue;
      const description = rawLine.slice(dateMatch.index + dateMatch[0].length, amountMatch.index).replace(/\s+/g, " ").trim();
      if (description.length < 2) continue;
      const rawDate=dateMatch[0];const normalizedPdfDate=rawDate;
      candidates.push([csvCell(normalizedPdfDate), csvCell(description.slice(0, 300)), csvCell(amountMatch[1].replace(/\s/g, ""))].join(";"));
    }
    if (!candidates.length) throw new Error("O PDF tem texto, mas nenhuma linha financeira segura foi reconhecida. Use CSV ou cole os dados na grade.");
    const rawContent = `Data;Descrição;Valor\n${candidates.join("\n")}`;
    const batch = await prisma.importBatch.create({ data: { workspaceId: ctx.workspaceId, accountId: account!.id, source: "PDF", fileName: file.name.slice(0, 200), fileSize: file.size, rawContent, rowCount: candidates.length } });
    return { batchId: batch.id, headers: ["Data","Descrição","Valor"], rows: CsvFinanceImportParser.parse(rawContent).rows.slice(0,5), count: candidates.length, delimiter: ";", source: "PDF" };
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
    const preview = previewCsv(batch.rawContent, mapping, ctx.workspaceId, batch.accountId, fingerprints, rules, batch.source);
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
      if (account.type === "CREDIT_CARD") throw new Error("Lote de cartão precisa da revisão de documentos; pagamentos não podem virar receita.");
      const rows = batch.preview as unknown as ImportPreviewRow[];
      if (!Array.isArray(rows)) throw new Error("Prévia indisponível. Revise o arquivo novamente.");
      const fingerprints = await existingFingerprints(tx, ctx.workspaceId, batch.accountId);
      const valid = rows.filter(row => row.data && !row.duplicate && !row.errors.length && !fingerprints.has(row.data.fingerprint));
      const categories = [...new Set(valid.map(r => r.data!.categoryId).filter((id): id is string => Boolean(id)))];
      const categoryCount = await tx.financeCategory.count({ where: { id: { in: categories }, workspaceId: ctx.workspaceId, isArchived: false } });
      if (categoryCount !== categories.length) throw new Error("Uma categoria mudou. Gere a prévia novamente.");
      const imported = valid.length ? await tx.financeTransaction.createMany({ data: valid.map(row => {
        const item = row.data!;
        return { workspaceId: ctx.workspaceId, accountId: batch.accountId, importBatchId: batch.id, amountCents: item.amountCents, type: item.type, description: item.description, merchant: item.merchant, externalId: item.externalId, fingerprint: item.fingerprint, categoryId: item.categoryId, tags: item.tags, date: dateOnly(item.date), source: batch.source, currency: "BRL" };
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
      const batch = await tx.importBatch.findFirst({ where: { id: text(fd, "batchId"), workspaceId: ctx.workspaceId, status: { in: ["COMPLETED", "NEEDS_REVIEW"] } } });
      if (!batch) throw new Error("Lote indisponível ou já desfeito.");
      if (batch.source === "DOCUMENT_V2") return rollbackFinancialDocument(tx, ctx, batch.id);
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

// Card statements are personal data: the workspace comes only from the session and only
// its owner may import or reconcile them. The uploaded file itself is never stored.
async function statementOwner() {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") throw new AuthorizationError("Somente o titular deste espaço pode gerenciar faturas de cartão.");
  return ctx;
}
async function statementFile(fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size || file.size > 1_000_000) throw new Error("Selecione um arquivo JSON de até 1 MB.");
  if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Formato aceito: JSON.");
  const content = await file.text();
  try { return { raw: JSON.parse(content.replace(/^﻿/, "")) as unknown, sha256: createHash("sha256").update(content).digest("hex") }; }
  catch { throw new Error("O arquivo não contém um JSON válido."); }
}

export async function previewCardStatements(fd: FormData) {
  try {
    const ctx = await statementOwner();
    const { raw } = await statementFile(fd);
    return { report: await previewCardStatementImport(prisma, ctx.workspaceId, raw, dayKey(new Date(), ctx.workspace.timezone)) };
  } catch (error) { return failure(error); }
}

export async function confirmCardStatements(fd: FormData) {
  try {
    const ctx = await statementOwner();
    const { raw, sha256 } = await statementFile(fd);
    const result = await prisma.$transaction(tx => applyCardStatementImport(tx, ctx, raw, { fingerprint: text(fd, "fingerprint"), acceptConflicts: fd.get("acceptConflicts") === "on", fileSha256: sha256 }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    invalidate();
    const { create, update, keep, conflict } = result.counts;
    return { success: `${create} criada(s), ${update} atualizada(s), ${keep} mantida(s)${conflict ? `, ${conflict} em conflito preservada(s)` : ""}.`, ...result };
  } catch (error) { return failure(error); }
}

const DETAIL_MODES = ["ALREADY_INCLUDED", "ADDED_TO_STATEMENT"] as const;
const addMonths = (value: Date, months: number) => {
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  target.setUTCDate(Math.min(value.getUTCDate(), new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()));
  return target;
};
/** Effective total and detailed sum of a statement, read inside the caller's transaction. */
async function statementForLink(tx: Prisma.TransactionClient, workspaceId: string, statementId: string, accountId: string, excludeTransactionId?: string) {
  const statement = await tx.cardStatement.findFirst({ where: { id: statementId, workspaceId, accountId }, select: { id: true, status: true, amountCents: true, dueDate: true, referenceMonth: true } });
  if (!statement) throw new Error("A fatura escolhida não pertence a este cartão.");
  const linked = await tx.financeTransaction.findMany({ where: { workspaceId, cardStatementId: statementId, type: { in: ["EXPENSE", "REFUND"] }, ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}) }, select: { amountCents: true, statementDetailMode: true, type: true } });
  const signed = (item: { type: string; amountCents: number }) => (item.type === "REFUND" ? -1 : 1) * item.amountCents;
  const addedCents = linked.reduce((sum, item) => sum + (item.statementDetailMode === "ADDED_TO_STATEMENT" ? signed(item) : 0), 0);
  return { ...statement, totalCents: statement.amountCents + addedCents, detailedCents: linked.reduce((sum, item) => sum + signed(item), 0) };
}

export async function interpretCardExpense(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    const input = z.string().trim().min(3, "Descreva o gasto, por exemplo: gastei 89,90 no ifood ontem no nubank.").max(500).parse(text(fd, "text"));
    const [cards, categories] = await Promise.all([
      prisma.account.findMany({ where: { workspaceId: ctx.workspaceId, type: "CREDIT_CARD", isArchived: false }, select: { id: true, name: true, institution: true, type: true } }),
      prisma.financeCategory.findMany({ where: { workspaceId: ctx.workspaceId, isArchived: false, type: "EXPENSE" }, select: { id: true, name: true } }),
    ]);
    return { draft: await interpretCardExpenseText(input, dayKey(new Date(), ctx.workspace.timezone), cards, categories) };
  } catch (error) { return failure(error); }
}

/** Records a card purchase in the ledger and, optionally, details it under one statement: either it
 * was already inside the declared amount, or it is added on top. It is never counted twice. */
export async function saveCardExpense(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    const card = await accountRef(ctx.workspaceId, text(fd, "accountId"));
    if (!card || card.type !== "CREDIT_CARD") throw new Error("Escolha um cartão de crédito.");
    const amountCents = cents(fd, "amount");
    const description = name(fd, "description");
    const purchaseDate = date(fd, "date");
    const merchant = optional(fd, "merchant", 200);
    const notes = normalizeNote(z.string().max(NOTE_MAX).parse(text(fd, "notes")));
    const category = await categoryRef(ctx.workspaceId, text(fd, "categoryId"));
    const installments = integer(fd, "installments", 1, 24) ?? 1;
    if (amountCents < installments) throw new Error("Cada parcela precisa ter pelo menos um centavo.");
    const link = enumValue(fd, "link", ["NONE", ...DETAIL_MODES], "NONE");
    const statementId = link === "NONE" ? null : z.string().min(1, "Escolha a fatura.").parse(text(fd, "statementId"));
    if (statementId && ctx.role !== "OWNER") throw new AuthorizationError("Somente o titular deste espaço pode vincular gastos a faturas.");
    const base = Math.floor(amountCents / installments);
    const parts = Array.from({ length: installments }, (_, index) => ({ number: index + 1, amountCents: base + (index === 0 ? amountCents - base * installments : 0), date: addMonths(purchaseDate, index) }));
    const result = await prisma.$transaction(async tx => {
      let statement: Awaited<ReturnType<typeof statementForLink>> | null = null;
      if (statementId && link !== "NONE") {
        statement = await statementForLink(tx, ctx.workspaceId, statementId, card.id);
        const error = statementLinkError({ status: statement.status, amountCents: statement.totalCents, detailedCents: statement.detailedCents }, link, parts[0].amountCents);
        if (error) throw new Error(error);
      }
      const ids: string[] = [];
      for (const part of parts) {
        const partDescription = installments > 1 ? `${description} (${part.number}/${installments})` : description;
        const day = part.date.toISOString().slice(0, 10);
        const row = await tx.financeTransaction.create({ data: {
          workspaceId: ctx.workspaceId, accountId: card.id, categoryId: category?.id || null, type: "EXPENSE", description: partDescription, merchant, notes,
          amountCents: part.amountCents, currency: "BRL", date: part.date, installmentNumber: installments > 1 ? part.number : null, installmentTotal: installments > 1 ? installments : null,
          source: "CARD_QUICK_ADD", fingerprint: transactionFingerprint(ctx.workspaceId, card.id, { date: day, description: partDescription, amountCents: part.amountCents, type: "EXPENSE", externalId: null }),
          ...(statement && part.number === 1 && link !== "NONE" ? { cardStatementId: statement.id, statementDetailMode: link } : {}),
        }, select: { id: true } });
        ids.push(row.id);
      }
      const after = statement ? statement.totalCents + (link === "ADDED_TO_STATEMENT" ? parts[0].amountCents : 0) : null;
      await log(tx, ctx, "finance.card_expense_added", "FinanceTransaction", ids[0], { cardId: card.id, amountCents, installments, statementId: statement?.id ?? null, mode: statement ? link : null, statementTotalBefore: statement?.totalCents ?? null, statementTotalAfter: after });
      return { ids, statement, after };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    invalidate();
    const value = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const effect = !result.statement ? "sem vínculo com fatura" : link === "ADDED_TO_STATEMENT" ? `somado à fatura de ${result.statement.dueDate?.toISOString().slice(0, 10) ?? result.statement.referenceMonth}, que passou a ${value(result.after!)}` : `detalhado na fatura de ${result.statement.dueDate?.toISOString().slice(0, 10) ?? result.statement.referenceMonth}, sem mudar o total`;
    return { success: `Gasto de ${value(amountCents)} lançado em ${card.name}${installments > 1 ? ` em ${installments}x` : ""}, ${effect}.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Este gasto já foi lançado (mesma data, descrição e valor)." };
    return failure(error);
  }
}

/** Links, re-classifies or unlinks one card purchase. The statement must be on the purchase's card. */
export async function updateStatementLink(fd: FormData) {
  try {
    const ctx = await statementOwner();
    const transactionId = text(fd, "transactionId");
    const statementId = text(fd, "statementId");
    const mode = statementId ? z.enum(DETAIL_MODES).parse(text(fd, "mode")) : null;
    await prisma.$transaction(async tx => {
      const purchase = await tx.financeTransaction.findFirst({ where: { id: transactionId, workspaceId: ctx.workspaceId, type: "EXPENSE" }, select: purchaseSelect });
      if (!purchase) throw new Error("Gasto não encontrado neste espaço.");
      if (purchase.cardStatementId !== statementId || purchase.statementDetailMode !== mode) await protectStatementPurchase(tx, ctx, purchase, { detach: true });
      if (statementId && mode) {
        const statement = await statementForLink(tx, ctx.workspaceId, statementId, purchase.accountId, purchase.id);
        const error = statementLinkError({ status: statement.status, amountCents: statement.totalCents, detailedCents: statement.detailedCents }, mode, purchase.amountCents);
        if (error) throw new Error(error);
      }
      await tx.financeTransaction.updateMany({ where: { id: purchase.id, workspaceId: ctx.workspaceId }, data: { cardStatementId: statementId || null, statementDetailMode: mode, revision: { increment: 1 } } });
      await log(tx, ctx, "finance.card_expense_link_updated", "FinanceTransaction", purchase.id, { statementId: statementId || null, mode });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    invalidate();
    return { success: !statementId ? "Gasto desvinculado da fatura." : mode === "ADDED_TO_STATEMENT" ? "Gasto somado à fatura." : "Gasto marcado como já incluído na fatura." };
  } catch (error) { return failure(error); }
}

export async function resolveCardStatementOverlap(fd: FormData) {
  try {
    const ctx = await statementOwner();
    const id = text(fd, "id");
    const resolution = z.enum(["INCLUDED_IN_STATEMENT", "SEPARATE_CHARGE"]).parse(text(fd, "resolution"));
    await prisma.$transaction(async tx => {
      const result = await tx.cardStatement.updateMany({ where: { id, workspaceId: ctx.workspaceId, reconciliation: "PENDING" }, data: { reconciliation: resolution } });
      if (!result.count) throw new Error("Previsão não encontrada ou já conciliada.");
      await log(tx, ctx, "finance.card_statement_reconciled", "CardStatement", id, { resolution });
    });
    invalidate();
    return { success: resolution === "SEPARATE_CHARGE" ? "Previsão marcada como cobrança separada." : "Previsão marcada como já incluída na fatura." };
  } catch (error) { return failure(error); }
}

const gridTransactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  description: z.string().trim().min(1).max(300),
  merchant: z.string().trim().max(200).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "REFUND", "ADJUSTMENT"]),
  amount: z.string().min(1),
  tags: z.string().max(1000).optional(),
  notes: z.string().max(NOTE_MAX).optional(),
});
export type GridTransactionInput = z.input<typeof gridTransactionSchema>;

/** Persists spreadsheet draft rows only after the user confirms the complete block. */
export async function saveGridTransactions(input: GridTransactionInput[]) {
  const ctx = await requirePermission("WRITE");
  try {
    const rows = z.array(gridTransactionSchema).min(1).max(500).parse(input);
    const accountIds = [...new Set(rows.flatMap((row) => row.accountId ? [row.accountId] : []))];
    const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter((id): id is string => Boolean(id)))];
    const [accountCount, categoryCount] = await Promise.all([
      prisma.account.count({ where: { workspaceId: ctx.workspaceId, id: { in: accountIds }, isArchived: false, currency: "BRL" } }),
      prisma.financeCategory.count({ where: { workspaceId: ctx.workspaceId, id: { in: categoryIds }, isArchived: false } }),
    ]);
    if (accountCount !== accountIds.length || categoryCount !== categoryIds.length) throw new Error("Conta ou categoria indisponível neste workspace.");
    const data = rows.map((row) => ({
      id: row.id && !row.id.startsWith("draft-") ? row.id : null,
      workspaceId: ctx.workspaceId,
      accountId: row.accountId || null,
      categoryId: row.categoryId || null,
      date: dateOnly(row.date),
      description: row.description,
      merchant: row.merchant || null,
      type: row.type,
      amountCents: Math.abs(parseMoney(row.amount, row.type === "ADJUSTMENT")),
      tags: [...new Set((row.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20),
      // undefined leaves a stored note untouched; an empty string clears it. Notes never reach the fingerprint.
      notes: row.notes === undefined ? undefined : normalizeNote(row.notes),
      source: "PASTE",
      currency: "BRL",
    }));
    if (data.some((row) => !row.amountCents)) throw new Error("Valor zero requer revisão.");
    await prisma.$transaction(async (tx) => {
      const existingIds = data.flatMap((row) => row.id ? [row.id] : []);
      const owned = new Map((await tx.financeTransaction.findMany({ where: { workspaceId: ctx.workspaceId, id: { in: existingIds }, type: { not: "TRANSFER" } }, select: purchaseSelect })).map((row) => [row.id, row]));
      if (owned.size !== existingIds.length) throw new Error("Uma transação editada não está disponível neste workspace.");
      let unassignedId:string|null=null;
      for (const row of data) {
        const { id, ...fields } = row;
        if(!fields.accountId){if(!unassignedId)unassignedId=(await ensureUnassignedAccount(tx,ctx.workspaceId)).id;fields.accountId=unassignedId}
        const resolvedFields={...fields,accountId:fields.accountId!};
        if (id) {
          const linkFields = await protectStatementPurchase(tx, ctx, owned.get(id)!, resolvedFields);
          await tx.financeTransaction.update({ where: { id, workspaceId: ctx.workspaceId }, data: { ...resolvedFields, ...linkFields, source: undefined, revision: { increment: 1 } } });
        }
        else await tx.financeTransaction.create({ data: resolvedFields });
      }
      await log(tx, ctx, "transactions.grid_saved", "FinanceTransaction", "batch", { count: data.length, created: data.filter(row => !row.id).length });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    invalidate();
    return { success: `${data.length} lançamento(s) salvo(s).` };
  } catch (error) { return failure(error); }
}

const editableCellSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("date"), value: z.string(), id: z.string() }),
  z.object({ field: z.literal("description"), value: z.string().trim().min(1).max(300), id: z.string() }),
  z.object({ field: z.literal("merchant"), value: z.string().trim().max(200), id: z.string() }),
  z.object({ field: z.literal("amount"), value: z.string(), id: z.string() }),
  z.object({ field: z.literal("categoryId"), value: z.string(), id: z.string() }),
  z.object({ field: z.literal("accountId"), value: z.string().min(1), id: z.string() }),
  z.object({ field: z.literal("type"), value: z.enum(["INCOME", "EXPENSE", "REFUND", "ADJUSTMENT"]), id: z.string() }),
  z.object({ field: z.literal("tags"), value: z.string().max(1000), id: z.string() }),
  z.object({ field: z.literal("notes"), value: z.string().max(NOTE_MAX), id: z.string() }),
]);

/** Saves one committed cell, never on each keypress. */
export async function updateTransactionCell(input: z.input<typeof editableCellSchema>) {
  const ctx = await requirePermission("WRITE");
  try {
    const change = editableCellSchema.parse(input);
    const current = await prisma.financeTransaction.findFirst({ where: { id: change.id, workspaceId: ctx.workspaceId } });
    if (!current) throw new Error("Lançamento não encontrado.");
    if (current.type === "TRANSFER") throw new Error("Edite transferências pelo formulário detalhado.");
    let data: Prisma.FinanceTransactionUncheckedUpdateManyInput;
    switch (change.field) {
      case "date": data = { date: dateOnly(change.value) }; break;
      case "description": data = { description: change.value }; break;
      case "merchant": data = { merchant: change.value || null }; break;
      case "amount": data = { amountCents: Math.abs(parseMoney(change.value, current.type === "ADJUSTMENT")) }; break;
      case "type": data = { type: change.value }; break;
      case "notes": data = { notes: normalizeNote(change.value) }; break;
      case "tags": data = { tags: [...new Set(change.value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20) }; break;
      case "categoryId": {
        if (change.value) await categoryRef(ctx.workspaceId, change.value);
        data = { categoryId: change.value || null }; break;
      }
      case "accountId": {
        await accountRef(ctx.workspaceId, change.value);
        data = { accountId: change.value }; break;
      }
    }
    const updated = await prisma.$transaction(async tx => {
      const latest = await tx.financeTransaction.findFirst({ where: { id: change.id, workspaceId: ctx.workspaceId }, select: purchaseSelect });
      if (!latest || latest.type === "TRANSFER") throw new Error("O lançamento mudou. Atualize a página.");
      const linkFields = await protectStatementPurchase(tx, ctx, latest, {
        ...(typeof data.accountId === "string" ? { accountId: data.accountId } : {}),
        ...(typeof data.type === "string" ? { type: data.type } : {}),
        ...(typeof data.amountCents === "number" ? { amountCents: data.amountCents } : {}),
      });
      return tx.financeTransaction.updateMany({ where: { id: change.id, workspaceId: ctx.workspaceId }, data: { ...data, ...linkFields, revision: { increment: 1 } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!updated.count) throw new Error("O lançamento mudou. Atualize a página.");
    invalidate();
    return { success: "Célula salva." };
  } catch (error) { return failure(error); }
}
