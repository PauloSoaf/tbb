import type { Prisma } from "@prisma/client";
import type { OwnTransfer } from "./import-transfer-match";

/** Accounts that hold the person's own money. Cards have their own bill-payment flow. */
export const CASH_ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] as const;

/** Transfers the person registered between two of their own cash accounts, as seen from one account's statement. */
export async function ownTransfersFor(tx: Prisma.TransactionClient, workspaceId: string, accountId: string): Promise<OwnTransfer[]> {
  const rows = await tx.financeTransaction.findMany({
    where: { workspaceId, type: "TRANSFER", importBatchId: null, OR: [{ accountId }, { destinationAccountId: accountId }], account: { type: { in: [...CASH_ACCOUNT_TYPES] } }, destinationAccount: { type: { in: [...CASH_ACCOUNT_TYPES] } } },
    select: { id: true, date: true, amountCents: true, accountId: true, destinationAccountId: true, account: { select: { name: true } }, destinationAccount: { select: { name: true } } },
    orderBy: { date: "desc" }, take: 2000,
  });
  return rows.flatMap(row => row.destinationAccountId && row.destinationAccount ? [{ id: row.id, date: row.date.toISOString().slice(0, 10), amountCents: row.amountCents, fromAccountId: row.accountId, toAccountId: row.destinationAccountId, fromName: row.account.name, toName: row.destinationAccount.name }] : []);
}
