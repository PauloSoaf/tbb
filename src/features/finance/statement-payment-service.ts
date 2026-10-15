import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { dateOnly, money } from "./money";
import { outstandingOf, planStatementPayment, type PaymentMode, type PaymentPlan } from "./statement-payment";

/** Server side of "Marcar como paga". Every call runs inside the caller's serializable transaction and
 * writes only the liability: a payment row, the bill's status and one audit event. It never touches the
 * ledger, so no expense, income or balance movement can appear from here. */
export type PaymentDb = Pick<Prisma.TransactionClient, "cardStatement" | "cardStatementPayment" | "financeTransaction" | "activityEvent">;
export type PaymentActor = { workspaceId: string; userId: string; role: string };
export const PAYMENT_EVENT = "finance.statement_payment_recorded";
export const PAYMENT_UNDONE_EVENT = "finance.statement_payment_undone";
const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

export type PaymentInput = {
  statementId: string; version: string; mode: PaymentMode; amountCents: number | null; paidOn: string | null; unknownDate: boolean;
  nextStatementId: string | null; carryIncluded: boolean; confirmed: boolean; token: string; today: string;
  /** Free text kept in the audit event, e.g. when the change is applied on the owner's behalf. */
  note?: string;
};
export type PaymentOutcome = { already: boolean; message: string; plan?: PaymentPlan };

const ownerOnly = (actor: PaymentActor) => { if (actor.role !== "OWNER") throw new Error("Somente o titular deste espaço pode registrar pagamentos de fatura."); };

export async function applyStatementPayment(db: PaymentDb, actor: PaymentActor, input: PaymentInput): Promise<PaymentOutcome> {
  ownerOnly(actor);
  if (!input.confirmed) throw new Error("Confirme a ação para registrar o pagamento.");
  if (!/^[A-Za-z0-9-]{16,80}$/.test(input.token)) throw new Error("Pedido inválido. Abra o painel de pagamento novamente.");
  // The same token always maps to the same payment, so a double click or a network retry cannot pay twice.
  const fingerprint = createHash("sha256").update(`manual-payment:${actor.workspaceId}:${input.statementId}:${input.token}`).digest("hex");
  const retry = await db.cardStatementPayment.findUnique({ where: { workspaceId_fingerprint: { workspaceId: actor.workspaceId, fingerprint } }, select: { id: true } });
  if (retry) return { already: true, message: "Este pagamento já estava registrado." };

  const statement = await db.cardStatement.findFirst({ where: { id: input.statementId, workspaceId: actor.workspaceId }, include: { payments: { select: { amountCents: true, date: true } } } });
  if (!statement) throw new Error("Fatura não encontrada neste espaço.");
  const carriedAlready = statement.status === "PAID" && input.mode === "CARRY" && statement.rolledIntoStatementId !== null && statement.rolledIntoStatementId === input.nextStatementId && !input.amountCents;
  if (carriedAlready) return { already: true, message: "O saldo desta fatura já estava transportado para a fatura seguinte." };
  if (statement.status === "PAID" && input.mode === "CLOSE_CARRIED" && statement.rolledIntoStatementId) return { already: true, message: "Esta fatura já estava encerrada como paga." };
  if (statement.updatedAt.toISOString() !== input.version) throw new Error("Esta fatura mudou. Atualize a página antes de registrar o pagamento.");

  const purchases = await db.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, cardStatementId: statement.id, type: { in: ["EXPENSE", "REFUND"] }, statementDetailMode: "ADDED_TO_STATEMENT" }, select: { amountCents: true, type: true } });
  const addedCents = purchases.reduce((total, item) => total + (item.type === "REFUND" ? -1 : 1) * item.amountCents, 0);
  const owed = outstandingOf({ status: statement.status, declaredCents: statement.amountCents, addedCents, amountIsOutstanding: statement.amountIsOutstanding, sourceAsOf: day(statement.sourceAsOf), payments: statement.payments.map((item) => ({ amountCents: item.amountCents, date: day(item.date) })) }).effectiveCents;
  const target = input.mode === "CARRY" && input.nextStatementId
    ? await db.cardStatement.findFirst({ where: { id: input.nextStatementId, workspaceId: actor.workspaceId, accountId: statement.accountId }, select: { id: true, accountId: true, kind: true, status: true, dueDate: true, rolledIntoStatementId: true } })
    : null;
  // A bill closed because its balance moved on is dated by its last known payment, never by an invented day.
  const lastPayment = statement.payments.map((item) => day(item.date)).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  const paidOn = input.mode === "CLOSE_CARRIED" && !input.paidOn && !input.unknownDate ? lastPayment : input.paidOn;
  const planned = planStatementPayment(
    { id: statement.id, accountId: statement.accountId, kind: statement.kind, status: statement.status, dueDate: day(statement.dueDate), outstandingCents: owed, amountIsOutstanding: statement.amountIsOutstanding, sourceAsOf: day(statement.sourceAsOf), rolledIntoStatementId: statement.rolledIntoStatementId },
    { mode: input.mode, amountCents: input.amountCents, paidOn, unknownDate: input.unknownDate, carryTarget: target ? { ...target, dueDate: day(target.dueDate) } : null, carryIncluded: input.carryIncluded },
    input.today,
  );
  if (!planned.ok) throw new Error(planned.error);
  const plan = planned.plan;

  if (plan.payment) {
    const sameDay = (line: { amountCents: number; date: Date | null }) => line.amountCents === plan.payment!.amountCents && day(line.date) === plan.payment!.date;
    if (statement.payments.some(sameDay)) throw new Error("Já existe um pagamento do mesmo valor e data nesta fatura. Se for outro pagamento, ajuste a data ou o valor.");
  }
  const payment = plan.payment ? await db.cardStatementPayment.create({ data: {
    workspaceId: actor.workspaceId, accountId: statement.accountId, cardStatementId: statement.id, fingerprint, amountCents: plan.payment.amountCents,
    date: plan.payment.date ? dateOnly(plan.payment.date) : null, origin: "MANUAL_VERIFIED", sourceId: "MANUAL", locator: input.token,
  }, select: { id: true } }) : null;

  const after = { status: plan.closes ? "PAID" : statement.status, paidAt: plan.closes ? plan.paidAt : day(statement.paidAt), rolledIntoStatementId: plan.carry?.nextId ?? statement.rolledIntoStatementId };
  // Optimistic lock: only the exact version the user looked at can be changed.
  const changed = await db.cardStatement.updateMany({ where: { id: statement.id, workspaceId: actor.workspaceId, status: "OPEN", updatedAt: statement.updatedAt }, data: {
    updatedAt: new Date(),
    ...(plan.closes ? { status: "PAID" as const, paidAt: plan.paidAt ? dateOnly(plan.paidAt) : null, ...(plan.carry ? { rolledIntoStatementId: plan.carry.nextId } : {}) } : {}),
  } });
  if (changed.count !== 1) throw new Error("Esta fatura mudou durante o registro. Atualize a página e tente de novo.");

  await db.activityEvent.create({ data: {
    workspaceId: actor.workspaceId, actorUserId: actor.userId, type: PAYMENT_EVENT, entityType: "CardStatement", entityId: statement.id, source: "MANUAL",
    metadata: {
      mode: input.mode, paymentId: payment?.id ?? null, amountCents: plan.payment?.amountCents ?? 0, paidOn: plan.payment?.date ?? null, dateUnknown: Boolean(plan.payment && !plan.payment.date),
      carriedCents: plan.carry?.cents ?? 0, nextStatementId: plan.carry?.nextId ?? null, outstandingBeforeCents: owed, outstandingAfterCents: plan.outstandingAfterCents, token: input.token, ...(input.note ? { note: input.note.slice(0, 300) } : {}),
      before: { status: statement.status, paidAt: day(statement.paidAt), rolledIntoStatementId: statement.rolledIntoStatementId }, after,
    },
  } });
  const paidText = plan.payment ? `Pagamento de ${money(plan.payment.amountCents)} registrado${plan.payment.date ? "" : " (data não informada)"}.` : "";
  const carryText = plan.carry ? ` O saldo de ${money(plan.carry.cents)} ficou na fatura seguinte, sem ser somado de novo.` : "";
  const closeText = plan.closes ? (input.mode === "CLOSE_CARRIED" ? " Fatura encerrada como paga: o saldo já estava na fatura seguinte." : " Fatura marcada como paga.") : ` Saldo restante: ${money(plan.outstandingAfterCents)}.`;
  return { already: false, plan, message: `${paidText}${carryText}${closeText}`.trim() };
}

/** Latest manual payment event of each bill that has not been undone yet. */
export async function undoableManualPayments(db: Pick<PaymentDb, "activityEvent">, workspaceId: string, statementIds: string[]) {
  const events = statementIds.length ? await db.activityEvent.findMany({
    where: { workspaceId, entityType: "CardStatement", entityId: { in: statementIds }, type: { in: [PAYMENT_EVENT, PAYMENT_UNDONE_EVENT] } },
    select: { id: true, type: true, entityId: true, createdAt: true, metadata: true }, orderBy: { createdAt: "desc" },
  }) : [];
  const undone = new Set(events.filter((event) => event.type === PAYMENT_UNDONE_EVENT).map((event) => String((event.metadata as { undoes?: string } | null)?.undoes ?? "")));
  const latest = new Map<string, { eventId: string; at: Date; metadata: Record<string, unknown> }>();
  for (const event of events) {
    if (event.type !== PAYMENT_EVENT || undone.has(event.id) || latest.has(event.entityId)) continue;
    latest.set(event.entityId, { eventId: event.id, at: event.createdAt, metadata: (event.metadata ?? {}) as Record<string, unknown> });
  }
  return latest;
}

export async function undoStatementPayment(db: PaymentDb, actor: PaymentActor, input: { statementId: string; version: string; confirmed: boolean }) {
  ownerOnly(actor);
  if (!input.confirmed) throw new Error("Confirme para desfazer o pagamento.");
  const statement = await db.cardStatement.findFirst({ where: { id: input.statementId, workspaceId: actor.workspaceId } });
  if (!statement) throw new Error("Fatura não encontrada neste espaço.");
  if (statement.updatedAt.toISOString() !== input.version) throw new Error("Esta fatura mudou. Atualize a página antes de desfazer.");
  const target = (await undoableManualPayments(db, actor.workspaceId, [statement.id])).get(statement.id);
  if (!target) throw new Error("Não há pagamento manual para desfazer nesta fatura.");
  const meta = target.metadata as { paymentId?: string | null; before?: { status: "OPEN" | "PAID" | "FUTURE_KNOWN" | "FORECAST"; paidAt: string | null; rolledIntoStatementId: string | null }; after?: { status: string; paidAt: string | null; rolledIntoStatementId: string | null } };
  if (!meta.before || !meta.after) throw new Error("O registro deste pagamento não permite desfazer.");
  // Only if nothing else touched the bill since: the state must still be exactly what the payment left.
  const current = { status: statement.status, paidAt: day(statement.paidAt), rolledIntoStatementId: statement.rolledIntoStatementId };
  const unchangedStatus = meta.after.status === current.status && meta.after.paidAt === current.paidAt && meta.after.rolledIntoStatementId === current.rolledIntoStatementId;
  if (meta.before.status !== "OPEN" || !unchangedStatus) throw new Error("A fatura mudou depois do pagamento. Revise-a antes de desfazer.");
  if (meta.paymentId) {
    const removed = await db.cardStatementPayment.deleteMany({ where: { id: meta.paymentId, workspaceId: actor.workspaceId, cardStatementId: statement.id, origin: "MANUAL_VERIFIED" } });
    if (removed.count !== 1) throw new Error("O pagamento registrado não foi encontrado; nada foi desfeito.");
  }
  const restored = await db.cardStatement.updateMany({ where: { id: statement.id, workspaceId: actor.workspaceId, updatedAt: statement.updatedAt }, data: {
    updatedAt: new Date(), status: "OPEN", paidAt: meta.before.paidAt ? dateOnly(meta.before.paidAt) : null, rolledIntoStatementId: meta.before.rolledIntoStatementId,
  } });
  if (restored.count !== 1) throw new Error("Esta fatura mudou durante o procedimento. Atualize a página e tente de novo.");
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: PAYMENT_UNDONE_EVENT, entityType: "CardStatement", entityId: statement.id, source: "MANUAL", metadata: { undoes: target.eventId, restored: meta.before } } });
  return { message: "Pagamento desfeito. A fatura voltou a ficar aberta." };
}
