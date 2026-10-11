import "server-only";
import { dateKeyToUTC } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/workspace";
import { isMonthKey, shiftMonth, type FinanceCalendarMonth } from "./calendar-core";

/** A READ-only member may browse the calendar but may not be shown mutation controls. */
export async function financeCalendarCanWrite(): Promise<boolean> {
  try {
    await requirePermission("WRITE");
    return true;
  } catch (error) {
    if (error instanceof AuthorizationError) return false;
    throw error;
  }
}

/** Reads only this workspace's ledger. A declared card-statement total is never a second expense. */
export async function financeCalendarMonth(workspaceId: string, month: string, showStatementLinks = false): Promise<FinanceCalendarMonth> {
  if (!isMonthKey(month) || month === "9998-12") throw new Error("Mês inválido.");
  const start = dateKeyToUTC(`${month}-01`);
  const end = dateKeyToUTC(`${shiftMonth(month, 1)}-01`);
  const rows = await prisma.financeTransaction.findMany({
    where: { workspaceId, date: { gte: start, lt: end }, source: { not: "QUICK_INCOME" } },
    select: {
      id: true, date: true, description: true, merchant: true, amountCents: true,
      type: true, source: true, cardStatementId: true,
      account: { select: { name: true, type: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return {
    month,
    entries: rows.map(row => ({
      id: row.id,
      day: row.date.toISOString().slice(0, 10),
      description: row.description,
      merchant: row.merchant,
      amountCents: row.amountCents,
      type: row.type,
      source: row.source,
      accountName: row.account.name,
      categoryName: row.category?.name || null,
      isCardPurchase: row.account.type === "CREDIT_CARD",
      cardStatementId: showStatementLinks ? row.cardStatementId : null,
    })),
  };
}

export async function financeCalendarOptions(workspaceId: string) {
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId, isArchived: false, currency: "BRL", OR: [{ institution: null }, { institution: { not: "__TBB_UNASSIGNED__" } }] },
      select: { id: true, name: true, type: true }, orderBy: { name: "asc" },
    }),
    prisma.financeCategory.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true, name: true, type: true }, orderBy: { name: "asc" },
    }),
  ]);
  return { accounts, categories };
}
