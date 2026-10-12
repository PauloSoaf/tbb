import { Prisma } from "@prisma/client";
import type { ImportActor } from "./document-import";
import { assertImportOwner } from "./document-import";
import { dateOnly } from "./money";
import { addDays } from "@/lib/dates";
import { shiftMonth } from "./calendar-core";

type Snapshot = { sourceId: string; locator: string; asOfDate: string; statementId?: string; expectedVersion?: string; amountCents: number; status: "OPEN" | "PAID" | "FUTURE_KNOWN"; referenceMonth: string; dueDate: string | null; closingDate?: string | null; closingDay?: number | null; amountIsOutstanding?: boolean; notes?: string };
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function applyStatementSnapshot(db: Prisma.TransactionClient, actor: ImportActor, accountId: string, input: Snapshot) {
  const account = await assertImportOwner(db, actor, accountId);
  if (account?.type !== "CREDIT_CARD") throw new Error("Snapshot exige cartão existente.");
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.workspaceId}:${accountId}:financial-import`}, 0))`;
  const source = await db.financialSource.findFirst({ where: { id: input.sourceId, workspaceId: actor.workspaceId, accountId } });
  if (!source || !Number.isSafeInteger(input.amountCents) || input.amountCents < 0 || input.amountCents > 2147483647 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.referenceMonth)) throw new Error("Fonte/valor/competência inválida.");
  dateOnly(input.asOfDate); if (input.dueDate) dateOnly(input.dueDate);
  if (input.status === "OPEN" && !input.dueDate) throw new Error("Fatura aberta exige vencimento confirmado.");
  const saved = await db.financialSnapshot.findUnique({ where: { sourceId_locator: { sourceId: source.id, locator: input.locator } } });
  if (saved) {
    const payload = saved.payload as { input?: Snapshot };
    const canonical = (v: Snapshot) => Object.fromEntries(Object.entries(v).filter(([key, value]) => value !== undefined && !["expectedVersion", "statementId"].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
    if (input.statementId && input.statementId !== saved.statementId) throw new Error("Snapshot já pertence a outra fatura.");
    if (JSON.stringify(canonical(payload.input!)) !== JSON.stringify(canonical(input))) throw new Error("Snapshot é imutável. Use nova origem ou identificador.");
    return { action: "KEEP" as const, statementId: saved.statementId! };
  }
  const existing = input.statementId ? await db.cardStatement.findFirst({ where: { id: input.statementId, workspaceId: actor.workspaceId, accountId } }) : null;
  if (input.statementId && (!existing || input.expectedVersion !== existing.updatedAt.toISOString())) throw new Error("Fatura mudou durante revisão ou pertence a outro cartão.");
  if (existing && (existing.sourceAsOf > dateOnly(input.asOfDate) || existing.status === "PAID" && (input.status !== "PAID" || existing.amountCents !== input.amountCents))) throw new Error("Snapshot antigo ou alteração de fatura quitada bloqueada.");
  if (existing?.status === "OPEN" && input.status === "FUTURE_KNOWN") throw new Error("Snapshot não rebaixa fatura aberta para futura.");
  if (existing?.rolledIntoStatementId && existing.amountCents !== input.amountCents) throw new Error("Saldo histórico já conciliado na próxima fatura; revise o vínculo antes de alterar a base.");
  const periodKey = input.dueDate ? `due:${input.dueDate}` : `${input.status === "PAID" ? "history" : "known"}-month:${input.referenceMonth}`;
  const collision = await db.cardStatement.findFirst({ where: { workspaceId: actor.workspaceId, accountId, id: existing ? { not: existing.id } : undefined, OR: [{ periodKey }, { referenceMonth: input.referenceMonth }, ...(!existing ? [{ dueDate: { gte: dateOnly(`${input.referenceMonth}-01`), lt: dateOnly(`${shiftMonth(input.referenceMonth, 1)}-01`) } }, ...(input.dueDate ? [{ dueDate: { gte: dateOnly(addDays(input.dueDate, -7)), lte: dateOnly(addDays(input.dueDate, 7)) } }] : [])] : [])] } });
  if (collision) throw new Error("Outra fatura corresponde ao período/competência; concilie preservando seu ID.");
  if (existing) {
    const details = await db.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, cardStatementId: existing.id }, select: { type: true, amountCents: true, statementDetailMode: true } });
    if (details.some(t => t.statementDetailMode === "ADDED_TO_STATEMENT") && existing.amountCents !== input.amountCents) throw new Error("Existem compras somadas manualmente. Concilie antes de substituir a base.");
    if (details.reduce((s, t) => s + (t.type === "REFUND" ? -1 : 1) * t.amountCents, 0) > input.amountCents) throw new Error("Snapshot menor que detalhamento confirmado.");
  }
  const data = { kind: "STATEMENT" as const, status: input.status, amountCents: input.amountCents, periodKey, referenceMonth: input.referenceMonth, dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
    closingDate: input.closingDate === undefined ? existing?.closingDate || null : input.closingDate ? dateOnly(input.closingDate) : null, closingDay: input.closingDay ?? existing?.closingDay ?? account.closingDay,
    amountIsOutstanding: input.amountIsOutstanding ?? false, sourceAsOf: dateOnly(input.asOfDate), source: "VERIFIED_DOCUMENT", sourceRecordType: input.status === "PAID" || input.status === "OPEN" && input.dueDate! < input.asOfDate ? "PAST_STATEMENT" : input.status === "FUTURE_KNOWN" ? "FUTURE_STATEMENT" : "CURRENT_STATEMENT", notes: input.notes ?? existing?.notes ?? null };
  const statement = existing ? await db.cardStatement.update({ where: { id: existing.id }, data }) : await db.cardStatement.create({ data: { workspaceId: actor.workspaceId, accountId, externalKey: `document:${source.sha256}:${input.locator}`, ...data } });
  await db.financialSnapshot.create({ data: { workspaceId: actor.workspaceId, accountId, sourceId: source.id, locator: input.locator, asOfDate: dateOnly(input.asOfDate), kind: "CARD_STATEMENT", statementId: statement.id, payload: json({ input, previous: existing, result: statement }) } });
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "finance.statement_snapshot_applied", entityType: "CardStatement", entityId: statement.id, metadata: { sourceId: source.id, locator: input.locator, action: existing ? "UPDATE" : "CREATE" } } });
  return { action: existing ? "UPDATE" as const : "CREATE" as const, statementId: statement.id };
}

export async function linkStatementCarryover(db: Prisma.TransactionClient, actor: ImportActor, previousId: string, nextId: string, sourceId: string, asOfDate: string) {
  await assertImportOwner(db, actor);
  const rows = await db.cardStatement.findMany({ where: { id: { in: [previousId, nextId] }, workspaceId: actor.workspaceId } });
  const previous = rows.find(r => r.id === previousId), next = rows.find(r => r.id === nextId);
  if (!previous || !next || previous.id === next.id || previous.accountId !== next.accountId || !previous.dueDate || !next.dueDate || previous.dueDate >= next.dueDate || previous.rolledIntoStatementId && previous.rolledIntoStatementId !== next.id || previous.status === "PAID") throw new Error("Vínculo de saldo anterior inválido.");
  const source = await db.financialSource.findFirst({ where: { id: sourceId, workspaceId: actor.workspaceId, accountId: previous.accountId } });
  if (!source) throw new Error("Fonte de conciliação inválida.");
  if (previous.rolledIntoStatementId === next.id) return;
  await db.cardStatement.update({ where: { id: previous.id }, data: { rolledIntoStatementId: next.id } });
  await db.financialSnapshot.create({ data: { workspaceId: actor.workspaceId, accountId: previous.accountId, sourceId, locator: `carryover:${previousId}:${nextId}`, asOfDate: dateOnly(asOfDate), kind: "CONFIRMED_CARRYOVER", statementId: previousId, payload: { previousId, nextId, explanation: "Saldo anterior já representado na fatura seguinte; histórico e pagamentos preservados." } } });
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "finance.statement_carryover_linked", entityType: "CardStatement", entityId: previousId, metadata: { nextId, sourceId } } });
}
