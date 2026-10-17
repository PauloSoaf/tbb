import { addDays } from "@/lib/dates";

export type Limit = {
  id: string; scope: string; limitCents: number; startDate: string; endDate: string;
  baselineAt: string | null; baselineDate: string | null; excludeFixed: boolean;
  filterAccountIds: string[]; filterCategoryIds: string[]; statementId: string | null;
  recurring: boolean; status: string;
};
export type LimitTransaction = {
  id: string; type: string; amountCents: number; currency?: string; accountId: string; categoryId: string | null;
  date: string; purchasedDate?: string | null; occurredAt?: string | null; createdAt: string;
  dateBasis?: string; source?: string; isConsumption: boolean; eventKind?: string;
  fixedExpenseId?: string | null; subscriptionId?: string | null; recurring?: boolean; cardStatementId?: string | null;
};
export type LimitDecision = { transactionId: string; decision: string };
export function limitWindow(limit: Pick<Limit, "startDate" | "endDate" | "recurring">, month?: string) {
  if (!limit.recurring || !month) return { start: limit.startDate, end: limit.endDate, initial: true };
  const startDay = Number(limit.startDate.slice(8)), endDay = Number(limit.endDate.slice(8));
  const [year, number] = month.split("-").map(Number);
  const day = (offset: number, value: number) => new Date(Date.UTC(year, number - 1 + offset, Math.min(value, new Date(Date.UTC(year, number + offset, 0)).getUTCDate()))).toISOString().slice(0, 10);
  const start = day(0, startDay), end = day(endDay < startDay ? 1 : 0, endDay);
  return { start, end, initial: start === limit.startDate };
}
/** Only a purchase consumes a limit. Import time and invoice due date never stand in for purchase time. */
export function spendingLimitUsage(limit: Limit, transactions: LimitTransaction[], decisions: LimitDecision[], today: string, month?: string) {
  const window = limitWindow(limit, month), decisionById = new Map(decisions.map(row => [row.transactionId, row.decision]));
  const included: LimitTransaction[] = [], pending: { id: string; reason: string }[] = [];
  for (const row of transactions) {
    if (!row.isConsumption || !["EXPENSE", "REFUND"].includes(row.type) || (row.currency && row.currency !== "BRL")) continue;
    if (["CARD_SETTLEMENT", "CARD_PAYMENT", "DEBT_SETTLEMENT"].includes(row.eventKind ?? "")) continue;
    if (limit.excludeFixed && (row.fixedExpenseId || row.subscriptionId || row.recurring)) continue;
    if (limit.filterAccountIds.length && !limit.filterAccountIds.includes(row.accountId)) continue;
    if (limit.filterCategoryIds.length && (!row.categoryId || !limit.filterCategoryIds.includes(row.categoryId))) continue;
    if (limit.scope === "CATEGORY" && !limit.filterCategoryIds.length) continue;
    if (limit.scope === "ACCOUNT" && !limit.filterAccountIds.length) continue;
    if (limit.scope === "CARD_CYCLE" && row.cardStatementId && row.cardStatementId !== limit.statementId) continue;
    const date = row.purchasedDate || row.date;
    if (date < window.start || date > window.end) continue;
    const decision = decisionById.get(row.id);
    if (decision === "IGNORE" || (window.initial && decision === "BASELINE")) continue;
    if (decision === "COUNT") { included.push(row); continue; }
    if (row.type === "REFUND") { pending.push({ id: row.id, reason: "REFUND_ORIGIN" }); continue; }
    if (row.source === "DOCUMENT_V2" && !row.purchasedDate && ["POSTED_DATE", "DUE_DATE", "UNKNOWN"].includes(row.dateBasis ?? "UNKNOWN")) {
      pending.push({ id: row.id, reason: "PURCHASE_DATE_UNKNOWN" }); continue;
    }
    if (window.initial && limit.baselineAt && limit.baselineDate) {
      if (date < limit.baselineDate) continue;
      if (date === limit.baselineDate) {
        if (!row.occurredAt) { pending.push({ id: row.id, reason: "TIME_UNKNOWN" }); continue; }
        if (row.occurredAt <= limit.baselineAt) continue;
      }
    }
    included.push(row);
  }
  const actualCents = Math.max(0, included.reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0));
  const scheduledCents = Math.max(0, included.filter(row => (row.purchasedDate || row.date) > today).reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0));
  const usedNowCents = Math.max(0, included.filter(row => (row.purchasedDate || row.date) <= today).reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0));
  const dayCount = (start: string, end: string) => Math.max(0, Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000));
  const daysRemaining = today > window.end ? 0 : dayCount(today > window.start ? today : window.start, window.end) + 1;
  const elapsed = today < window.start ? 0 : dayCount(window.start, today < window.end ? today : window.end) + 1;
  const remainingCents = limit.limitCents - actualCents;
  const usageBasisPoints = limit.limitCents > 0 ? Math.round(actualCents * 10000 / limit.limitCents) : actualCents > 0 ? 10001 : 0;
  const paceCents = elapsed ? Math.round(usedNowCents / elapsed) : 0;
  const exhaustedOn = paceCents > 0 && usedNowCents < limit.limitCents ? addDays(today, Math.ceil(Math.max(0, limit.limitCents - usedNowCents) / paceCents)) : null;
  const grouped = new Map<string, number>();
  for (const row of included) { const date = row.purchasedDate || row.date; grouped.set(date, (grouped.get(date) ?? 0) + (row.type === "REFUND" ? -1 : 1) * row.amountCents); }
  let accumulated = 0;
  const history = [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([date, cents]) => { accumulated += cents; return { date, usedCents: Math.max(0, accumulated), limitCents: limit.limitCents }; });
  return { ...window, limitCents: limit.limitCents, actualCents, usedNowCents, scheduledCents, remainingCents, usageBasisPoints,
    pending, pendingReviewCount: pending.length, transactionIds: included.map(row => row.id), daysRemaining,
    dailyAvailableCents: daysRemaining ? Math.floor(Math.max(0, remainingCents) / daysRemaining) : 0,
    projectedCents: paceCents * (dayCount(window.start, window.end) + 1) + scheduledCents, exhaustedOn,
    risk: actualCents > limit.limitCents ? "EXCEEDED" : actualCents === limit.limitCents ? "REACHED" : actualCents * 100 >= limit.limitCents * 80 ? "ALERT" : actualCents * 100 >= limit.limitCents * 50 ? "ATTENTION" : "NORMAL", history };
}
