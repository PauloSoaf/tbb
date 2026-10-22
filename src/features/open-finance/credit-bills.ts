import { createHash } from "node:crypto";
import { Prisma, type CardStatement } from "@prisma/client";
import { assertImportOwner, runFinancialImport, stageFinancialDocuments, type ImportActor } from "@/features/finance/document-import";
import { sourceHash } from "@/features/finance/import-reconciliation";
import { dateOnly } from "@/features/finance/money";
import type { CreditBill } from "./credit-normalize";

type DB = Prisma.TransactionClient;
export const BILL_KINDS = ["OPEN_FINANCE_BILL", "OPEN_FINANCE_BILL_REVIEW"];
export type BillPayload = { linkId: string; bill: CreditBill; statementId: string | null; statementVersion: string | null; addedDigest: string; reason: string | null };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const date = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

export async function latestCreditBills(db: DB, workspaceId: string, accountId?: string) {
  const rows = await db.financialSnapshot.findMany({ where: { workspaceId, ...(accountId ? { accountId } : {}), kind: { in: BILL_KINDS } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5001 });
  if (rows.length > 5000) throw new Error("Muitos snapshots de crédito; restrinja a consulta ao cartão.");
  const latest = new Map<string, (typeof rows)[number] & { data: BillPayload }>();
  for (const row of rows) {
    const data = row.payload as unknown as BillPayload;
    if (!data?.bill?.externalId || !data.linkId) continue;
    const key = `${data.linkId}:${data.bill.externalId}`;
    if (!latest.has(key)) latest.set(key, { ...row, data });
  }
  return [...latest.values()];
}

async function detailsOf(db: DB, workspaceId: string, statementId: string) {
  const details = await db.financeTransaction.findMany({ where: { workspaceId, cardStatementId: statementId }, select: { id: true, type: true, amountCents: true, statementDetailMode: true }, orderBy: { id: "asc" } });
  const sign = (row: { type: string; amountCents: number }) => (row.type === "REFUND" ? -1 : 1) * row.amountCents;
  const added = details.filter(row => row.statementDetailMode === "ADDED_TO_STATEMENT");
  return { addedCents: added.reduce((sum, row) => sum + sign(row), 0), detailCents: details.reduce((sum, row) => sum + sign(row), 0), addedDigest: digest(added) };
}

async function storeSnapshot(db: DB, actor: ImportActor, accountId: string, sourceId: string, data: BillPayload, asOfDate: string, previous: CardStatement | null, review: boolean) {
  const locator = `bill:${digest([data.linkId, data.bill.externalId, review, data.statementVersion, data.addedDigest, data.reason])}`;
  const saved = await db.financialSnapshot.findUnique({ where: { sourceId_locator: { sourceId, locator } } });
  if (saved) return saved;
  const snapshot = await db.financialSnapshot.create({ data: { workspaceId: actor.workspaceId, accountId, sourceId, locator, asOfDate: dateOnly(asOfDate), kind: review ? "OPEN_FINANCE_BILL_REVIEW" : "OPEN_FINANCE_BILL", statementId: data.statementId, payload: json({ ...data, previous }) } });
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: review ? "open_finance.bill_review_required" : "open_finance.bill_reconciled", entityType: "FinancialSnapshot", entityId: snapshot.id, metadata: { accountId, statementId: data.statementId } } });
  return snapshot;
}

async function writeBill(db: DB, actor: ImportActor, accountId: string, bill: CreditBill, existing: CardStatement | null, asOfDate: string) {
  if (!bill.status) throw new Error("Confirme a situação da fatura.");
  if (existing?.rolledIntoStatementId || existing?.reconciliation === "PENDING") throw new Error("Revise primeiro o saldo transportado ou a sobreposição desta fatura.");
  if (existing?.status === "PAID" && (bill.status !== "PAID" || existing.amountCents !== bill.totalCents)) throw new Error("Fatura quitada preservada; revise o histórico antes de alterar.");
  if (existing && date(existing.sourceAsOf)! > asOfDate) throw new Error("A fonte do banco é anterior à conciliação existente.");
  if (bill.basis === "ACCOUNT_BALANCE") {
    if (!existing || bill.unknownPayments) throw new Error("Confirme a fatura atual e as datas dos pagamentos antes de usar o saldo em aberto.");
    const payments = await db.cardStatementPayment.findMany({ where: { workspaceId: actor.workspaceId, cardStatementId: existing.id }, select: { id: true, date: true, amountCents: true }, orderBy: { id: "asc" } });
    if (digest(payments) !== bill.paymentDigest) throw new Error("Os pagamentos mudaram desde a prévia. Sincronize novamente antes de confirmar.");
  }
  const details = existing ? await detailsOf(db, actor.workspaceId, existing.id) : { addedCents: 0, detailCents: 0, addedDigest: digest([]) };
  if (bill.totalCents < details.detailCents || bill.totalCents - details.addedCents < 0) throw new Error("O total do banco é menor que o detalhamento. Revise as compras antes de conciliar.");
  const collision = await db.cardStatement.findFirst({ where: { workspaceId: actor.workspaceId, accountId, ...(existing ? { id: { not: existing.id } } : {}), periodKey: `due:${bill.dueDate}` }, select: { id: true } });
  if (collision) throw new Error("Outra fatura já usa este vencimento; concilie sem criar duplicata.");
  const data = { kind: "STATEMENT" as const, status: bill.status, amountCents: bill.totalCents - details.addedCents,
    periodKey: `due:${bill.dueDate}`, dueDate: dateOnly(bill.dueDate), closingDate: bill.closingDate ? dateOnly(bill.closingDate) : existing?.closingDate ?? null,
    closingDay: bill.closingDate ? Number(bill.closingDate.slice(8, 10)) : existing?.closingDay ?? null, referenceMonth: bill.dueDate.slice(0, 7), paidAt: bill.status === "PAID" && bill.paidOn ? dateOnly(bill.paidOn) : null,
    amountIsOutstanding: false, source: "OPEN_FINANCE", sourceAsOf: dateOnly(asOfDate), sourceRecordType: bill.status === "PAID" ? "PAST_STATEMENT" : bill.status === "FUTURE_KNOWN" ? "FUTURE_STATEMENT" : "CURRENT_STATEMENT",
    reconciliation: "NOT_REQUIRED" as const, overlapsStatementId: null };
  return existing ? db.cardStatement.update({ where: { id: existing.id }, data }) : db.cardStatement.create({ data: { ...data, workspaceId: actor.workspaceId, accountId, externalKey: `pluggy-bill:${digest([actor.workspaceId, accountId, bill.externalId])}` } });
}

/** One account lock is shared with document imports and manual reconciliation. Source snapshots are append-only. */
export async function reconcileCreditBills(db: DB, actor: ImportActor, input: { linkId: string; accountId: string; bills: CreditBill[]; asOfDate: string; syncFrom: string | null }) {
  const account = await assertImportOwner(db, actor, input.accountId);
  if (account?.type !== "CREDIT_CARD") throw new Error("Vincule a um cartão de crédito deste espaço.");
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:${input.accountId}:financial-import`}, 0))`;
  const saved = await latestCreditBills(db, actor.workspaceId, input.accountId);
  const statementIds = new Map<string, string>(); let needsReview = 0;
  for (const bill of input.bills) {
    const prior = saved.find(row => row.data.linkId === input.linkId && row.data.bill.externalId === bill.externalId);
    const mapped = prior?.data.statementId ? await db.cardStatement.findFirst({ where: { id: prior.data.statementId, workspaceId: actor.workspaceId, accountId: input.accountId } }) : null;
    const candidates = mapped ? [mapped] : await db.cardStatement.findMany({ where: { workspaceId: actor.workspaceId, accountId: input.accountId, OR: [{ dueDate: dateOnly(bill.dueDate) }, { referenceMonth: bill.dueDate.slice(0, 7) }] } });
    const exact = candidates.filter(row => date(row.dueDate) === bill.dueDate);
    let existing = mapped ?? (candidates.length === 1 && (exact.length === 1 || candidates[0].kind === "MONTHLY_PROJECTION") ? candidates[0] : null);
    // The date window applies to purchases. Existing/overdue bills still need reconciliation; unrelated old history is skipped.
    if (input.syncFrom && bill.dueDate < input.syncFrom && !existing && bill.status !== "OPEN") continue;
    let reason: string | null = null;
    const details = existing ? await detailsOf(db, actor.workspaceId, existing.id) : { addedCents: 0, detailCents: 0, addedDigest: digest([]) };
    const managed = prior?.kind === "OPEN_FINANCE_BILL" && prior.data.statementVersion === existing?.updatedAt.toISOString() && prior.data.addedDigest === details.addedDigest;
    if (!existing && candidates.length) reason = "Há outra fatura no mesmo período. Escolha qual registro representa a fatura do banco.";
    else if (bill.basis === "ACCOUNT_BALANCE" && bill.unknownPayments) reason = "Há pagamentos sem data. Confira-os nas Faturas antes de conciliar o saldo em aberto do banco.";
    else if (bill.basis === "ACCOUNT_BALANCE" && (!managed || existing?.amountIsOutstanding)) reason = "O banco informou o saldo em aberto, sem publicar a fatura atual. Confirme a fatura de destino; o total conciliado inclui os pagamentos já registrados até a data da fonte.";
    else if (!bill.status && (!existing || existing.status !== "PAID")) reason = "O banco não confirmou a situação desta fatura. Confira antes de importar.";
    else if (existing?.rolledIntoStatementId || existing?.reconciliation === "PENDING") reason = "Fatura com saldo transportado ou sobreposição: confira a conciliação existente.";
    else if (existing && date(existing.sourceAsOf)! > input.asOfDate) reason = "A fonte bancária é anterior à conciliação existente. Aguarde dados atualizados.";
    else if (existing?.amountIsOutstanding) reason = "O TBB registra saldo restante e o banco informa o total da fatura; confira os pagamentos.";
    else if (existing?.status === "PAID" && (bill.totalCents !== existing.amountCents + details.addedCents || bill.status && bill.status !== "PAID")) reason = "A fatura está quitada no TBB. O histórico será preservado até sua conferência.";
    else if (existing && bill.status === "PAID" && existing.status !== "PAID") reason = "O banco informa quitação. Confira os pagamentos existentes antes de alterar a situação.";
    else if (existing && !managed && (date(existing.dueDate) && date(existing.dueDate) !== bill.dueDate || date(existing.closingDate) && bill.closingDate && date(existing.closingDate) !== bill.closingDate)) reason = "As datas do banco divergem do registro atual. Confira vencimento e fechamento antes de atualizar.";
    else if (existing && existing.kind === "STATEMENT" && existing.amountCents + details.addedCents !== bill.totalCents && !managed) reason = "O total do banco diverge do registro atual. Confirme a atualização da fatura.";
    if (bill.totalCents < details.detailCents || bill.totalCents - details.addedCents < 0) reason = "O detalhamento excede o total do banco. Revise as compras antes de conciliar.";
    const bytes = new TextEncoder().encode(JSON.stringify({ provider: "MEUPLUGGY", linkId: input.linkId, bill }));
    const [sourceId] = await stageFinancialDocuments(db, actor, input.accountId, [{ name: `Open Finance · Fatura · ${bill.dueDate}`, bytes, sha256: sourceHash(bytes), mediaType: "application/json", candidates: [], metadata: { origin: "OPEN_FINANCE", product: "CREDIT_BILL" } }]);
    const source = await db.financialSource.findUniqueOrThrow({ where: { id: sourceId }, select: { importBatchId: true } });
    if (source.importBatchId) await db.importBatch.update({ where: { id: source.importBatchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    const previous = existing;
    if (!reason) {
      // Recognise already paid history without rewriting its dates or reconciliation metadata on replay.
      // A bill with unknown provider status can reuse that local paid record, but cannot replace it.
      if (bill.status && existing?.status !== "PAID" && (!existing || existing.kind !== "STATEMENT" || existing.status !== bill.status || existing.amountCents + details.addedCents !== bill.totalCents || managed && (date(existing.dueDate) !== bill.dueDate || bill.closingDate && date(existing.closingDate) !== bill.closingDate))) existing = await writeBill(db, actor, input.accountId, bill, existing, input.asOfDate);
      if (existing) statementIds.set(bill.externalId, existing.id);
    } else needsReview++;
    await storeSnapshot(db, actor, input.accountId, sourceId, { linkId: input.linkId, bill, statementId: existing?.id ?? null, statementVersion: existing?.updatedAt.toISOString() ?? null, addedDigest: details.addedDigest, reason }, input.asOfDate, previous, Boolean(reason));
  }
  return { statementIds, needsReview };
}

export async function approveCreditBill(prisma: Parameters<typeof runFinancialImport>[0], actor: ImportActor, input: { snapshotId: string; statementId: string | null; statementVersion: string | null; status: "OPEN" | "FUTURE_KNOWN" | "PAID"; confirmed: boolean }) {
  if (!input.confirmed) throw new Error("Confirme que conferiu o total e a fatura de destino.");
  return runFinancialImport(prisma, async db => {
    await assertImportOwner(db, actor);
    const row = await db.financialSnapshot.findFirst({ where: { id: input.snapshotId, workspaceId: actor.workspaceId, kind: "OPEN_FINANCE_BILL_REVIEW" } });
    if (!row) throw new Error("Revisão de fatura não encontrada.");
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:${row.accountId}:financial-import`}, 0))`;
    const latest = await latestCreditBills(db, actor.workspaceId, row.accountId);
    const payload = row.payload as unknown as BillPayload;
    if (!latest.some(value => value.id === row.id)) throw new Error("A revisão mudou. Atualize a página antes de confirmar.");
    const target = input.statementId ? await db.cardStatement.findFirst({ where: { id: input.statementId, workspaceId: actor.workspaceId, accountId: row.accountId } }) : null;
    if (input.statementId && (!target || target.updatedAt.toISOString() !== input.statementVersion)) throw new Error("A fatura mudou desde a prévia. Atualize a página.");
    if (!target && await db.cardStatement.count({ where: { workspaceId: actor.workspaceId, accountId: row.accountId, OR: [{ dueDate: dateOnly(payload.bill.dueDate) }, { referenceMonth: payload.bill.dueDate.slice(0, 7) }] } })) throw new Error("Escolha a fatura existente deste período.");
    const bill = { ...payload.bill, status: input.status };
    if (bill.basis === "ACCOUNT_BALANCE" && input.status !== "OPEN") throw new Error("O saldo em aberto só pode representar uma fatura atual aberta.");
    if (input.status === "PAID" && target && target.status !== "PAID") throw new Error("Registre a quitação pelo fluxo de pagamento de faturas, com a conciliação bancária.");
    if (input.status === "PAID" && !bill.paidOn && target?.status !== "PAID") throw new Error("Registre a quitação pelo fluxo de pagamento de faturas, com a conciliação bancária.");
    const result = await writeBill(db, actor, row.accountId, bill, target, date(row.asOfDate)!);
    const details = await detailsOf(db, actor.workspaceId, result.id);
    await storeSnapshot(db, actor, row.accountId, row.sourceId, { ...payload, bill, reason: null, statementId: result.id, statementVersion: result.updatedAt.toISOString(), addedDigest: details.addedDigest }, date(row.asOfDate)!, target, false);
    return result.id;
  });
}
