import type { Prisma } from "@prisma/client";
import { suggestStatementForPurchase } from "./card-statements";

/** Manual creation means a new purchase. Imported detail follows its own explicit INCLUDED flow.
 * Existing rows never pass through this helper, so editing or refreshing cannot add them twice. */
export async function newPurchaseStatementLink(db: Prisma.TransactionClient, viewer: { workspaceId: string; role: string }, purchase: { accountId: string; type: string; date: Date }) {
  if (viewer.role !== "OWNER" || !["EXPENSE", "REFUND"].includes(purchase.type)) return {};
  const account = await db.account.findFirst({ where: { id: purchase.accountId, workspaceId: viewer.workspaceId, type: "CREDIT_CARD", isArchived: false }, select: { id: true } });
  if (!account) return {};
  const rows = await db.cardStatement.findMany({ where: { workspaceId: viewer.workspaceId, accountId: account.id, kind: "STATEMENT" },
    select: { id: true, accountId: true, kind: true, status: true, dueDate: true, closingDate: true, closingDay: true, rolledIntoStatementId: true } });
  const suggestion = suggestStatementForPurchase(rows.map(row => ({ ...row, dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null, closingDate: row.closingDate?.toISOString().slice(0, 10) ?? null })), account.id, purchase.date.toISOString().slice(0, 10));
  if (!suggestion || !["OPEN", "FUTURE_KNOWN"].includes(suggestion.status)) return {};
  return { cardStatementId: suggestion.statementId, statementDetailMode: "ADDED_TO_STATEMENT" as const, competenceDate: new Date(suggestion.dueDate + "T00:00:00Z") };
}
