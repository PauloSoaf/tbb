import "server-only";
import { dateKeyToUTC } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/workspace";
import { isMonthKey, shiftMonth, type FinanceCalendarMonth } from "./calendar-core";
import { transactionOriginWhere, transactionOriginLabel, type FinanceOrigin } from "./data-origin";

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
export async function financeCalendarMonth(workspaceId: string, month: string, showStatementLinks = false, origin: FinanceOrigin = "combined"): Promise<FinanceCalendarMonth> {
  if (!isMonthKey(month) || month === "9998-12") throw new Error("Mês inválido.");
  const start = dateKeyToUTC(`${month}-01`);
  const end = dateKeyToUTC(`${shiftMonth(month, 1)}-01`);
  const rows = await prisma.financeTransaction.findMany({
    where: { workspaceId, isConsumption: true, date: { gte: start, lt: end }, source: { not: "QUICK_INCOME" }, AND: transactionOriginWhere(origin) },
    select: {
      id: true, date: true, description: true, merchant: true, notes: true, amountCents: true,
      type: true, source: true, tags: true, cardStatementId: true, postedDate: true, occurredAt: true, occurredTimezone: true,
      evidence: { where: { decision: "COMMITTED" }, select: { source: { select: { fileName: true } } } },
      account: { select: { name: true, type: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const pendingOpenFinanceCount = showStatementLinks && (origin === "combined" || origin === "open-finance") ? await prisma.financialEvidence.count({ where: {
    workspaceId, decision: "NEEDS_REVIEW", source: { fileName: { startsWith: "Open Finance ·" } },
    AND: [{ candidate: { path: ["effectiveDate"], gte: `${month}-01` } }, { candidate: { path: ["effectiveDate"], lt: `${shiftMonth(month, 1)}-01` } }],
  } }) : 0;
  return {
    month,
    ...(pendingOpenFinanceCount ? { pendingOpenFinanceCount } : {}),
    entries: rows.map(row => ({
      id: row.id,
      day: row.date.toISOString().slice(0, 10),
      description: row.description,
      merchant: row.merchant,
      notes: row.notes,
      amountCents: row.amountCents,
      type: row.type,
      source: row.source,
      ...(transactionOriginLabel(row).includes("Open Finance") ? { importOrigin: "OPEN_FINANCE" as const } : {}),
      originLabel: transactionOriginLabel(row),
      accountName: row.account.name,
      categoryName: row.category?.name || null,
      isCardPurchase: row.account.type === "CREDIT_CARD",
      cardStatementId: showStatementLinks ? row.cardStatementId : null,
      postedDate: row.postedDate?.toISOString().slice(0, 10) || null,
      occurredAt: row.occurredAt?.toISOString() || null,
      occurredTimezone: row.occurredTimezone,
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
