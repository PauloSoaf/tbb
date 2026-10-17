import type { Prisma } from "@prisma/client";
import { dateOnly } from "../money";

export type BankSettlementInput = { mode: "UNRECONCILED" | "STATUS_ONLY" | "LINKED" | "CREATED"; accountId?: string; transactionId?: string; balanceConfirmed?: boolean };
type BankDb = Pick<Prisma.TransactionClient, "financeTransaction" | "cardStatementPayment" | "activityEvent"> & Partial<Pick<Prisma.TransactionClient, "account">>;
export async function reconcileBankSettlement(db: BankDb, actor: { workspaceId: string; userId: string }, payment: {
  id: string; accountId: string; amountCents: number; date: string | null; fingerprint: string;
}, input: BankSettlementInput, today: string) {
  if (!["UNRECONCILED", "STATUS_ONLY", "LINKED", "CREATED"].includes(input.mode)) throw new Error("Escolha a situação bancária do pagamento.");
  if (input.mode === "STATUS_ONLY" && !input.balanceConfirmed) throw new Error("Confirme que o pagamento já está refletido no saldo informado.");
  let bankTransactionId: string | null = null, bankRevision: number | null = null, effectiveDate = payment.date;
  if (input.mode === "LINKED") {
    const row = await db.financeTransaction.findFirst({ where: { id: input.transactionId || "", workspaceId: actor.workspaceId }, include: { account: true } });
    if (!row || row.amountCents !== payment.amountCents || !["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"].includes(row.account.type) || row.currency !== "BRL" || row.destinationAccountId && row.destinationAccountId !== payment.accountId) throw new Error("Selecione uma liquidação bancária do mesmo valor neste espaço.");
    const settlement = row.type === "TRANSFER" && row.destinationAccountId === payment.accountId || row.type === "EXPENSE" && !row.isConsumption && ["CARD_SETTLEMENT", "CARD_PAYMENT"].includes(row.eventKind);
    if (!settlement || row.date.toISOString().slice(0, 10) > today) throw new Error("O lançamento deve ser uma liquidação de cartão já realizada, não uma compra ou previsão.");
    if (payment.date && row.date.toISOString().slice(0, 10) !== payment.date) throw new Error("A data do pagamento difere da movimentação. Confira antes de conciliar.");
    const used = await db.cardStatementPayment.findFirst({ where: { bankTransactionId: row.id, id: { not: payment.id } }, select: { id: true } });
    if (used) throw new Error("Esta movimentação já está vinculada a outro pagamento.");
    bankTransactionId = row.id; bankRevision = row.revision; effectiveDate = row.date.toISOString().slice(0, 10);
  }
  if (input.mode === "CREATED") {
    if (!payment.date || payment.date > today) throw new Error("Informe a data efetiva, não futura, para movimentar o banco.");
    const account = await db.account?.findFirst({ where: { id: input.accountId || "", workspaceId: actor.workspaceId, isArchived: false, currency: "BRL", type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } } });
    if (!account) throw new Error("Escolha a conta de dinheiro que efetivamente pagou a fatura.");
    const row = await db.financeTransaction.create({ data: {
      workspaceId: actor.workspaceId, accountId: account.id, destinationAccountId: payment.accountId, type: "TRANSFER",
      description: "Liquidação de fatura de cartão", amountCents: payment.amountCents, date: dateOnly(payment.date),
      isConsumption: false, eventKind: "CARD_SETTLEMENT", source: "BANK_SETTLEMENT", fingerprint: `bank:${payment.fingerprint}`,
    } });
    bankTransactionId = row.id; bankRevision = row.revision;
  }
  const updated = await db.cardStatementPayment.updateMany({ where: { id: payment.id, workspaceId: actor.workspaceId, bankTransactionId: null }, data: { bankTransactionId, bankReconciliation: input.mode, ...(!payment.date && effectiveDate ? { date: dateOnly(effectiveDate) } : {}) } });
  if (updated.count !== 1) throw new Error("Este pagamento já mudou. Atualize antes de conciliar.");
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "finance.bank_settlement_reconciled", entityType: "CardStatementPayment", entityId: payment.id, source: "MANUAL", metadata: { mode: input.mode, bankTransactionId, bankRevision, amountCents: payment.amountCents } } });
  return { bankTransactionId, bankRevision, bankMode: input.mode, effectiveDate };
}

/** A new, unreconciled payment releases card debt but reserves the same amount as a pending liability. */
export function pendingBankLiability(payments: { amountCents: number; bankReconciliation?: string }[]) {
  return payments.filter(row => row.bankReconciliation === "UNRECONCILED").reduce((sum, row) => sum + row.amountCents, 0);
}
