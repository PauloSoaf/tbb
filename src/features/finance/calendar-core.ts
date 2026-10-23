import { dateKeyToUTC, isDateKey } from "@/lib/dates";

export type CalendarTransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER" | "ADJUSTMENT";
export type FinanceCalendarEntry = {
  id: string;
  day: string;
  description: string;
  merchant: string | null;
  notes?: string | null;
  amountCents: number;
  type: CalendarTransactionType;
  source: string;
  importOrigin?: "OPEN_FINANCE";
  accountName: string;
  categoryName: string | null;
  isCardPurchase: boolean;
  cardStatementId: string | null;
  postedDate?: string | null;
  occurredAt?: string | null;
  occurredTimezone?: string | null;
};
export type FinanceCalendarMonth = { month: string; entries: FinanceCalendarEntry[]; pendingOpenFinanceCount?: number };
export type FinanceCalendarOption = { id: string; name: string; type?: string };
export type FinanceCalendarCategory = { id: string; name: string; type: string };
export type CalendarStatement = { id: string; accountId: string; kind: string; status: string; dueDate: string | null; amountCents: number; rolledIntoStatementId?: string | null };

/** Known unpaid bills are due-date commitments, independent of daily ledger spending. */
export function calendarStatementDues(statements: CalendarStatement[]): Record<string, CalendarStatement[]> {
  const days: Record<string, CalendarStatement[]> = {};
  for (const statement of statements) {
    if (statement.rolledIntoStatementId || statement.kind !== "STATEMENT" || !["OPEN", "FUTURE_KNOWN"].includes(statement.status) ||
      !statement.dueDate || !isDateKey(statement.dueDate) || statement.amountCents <= 0) continue;
    const due = days[statement.dueDate] ?? [];
    if (!due.some(item => item.id === statement.id)) due.push(statement);
    days[statement.dueDate] = due;
  }
  return days;
}
export type DayAmounts = { expenseCents: number; incomeCents: number; scheduledExpenseCents: number; scheduledIncomeCents: number; count: number };
export const emptyDayAmounts = (): DayAmounts => ({ expenseCents: 0, incomeCents: 0, scheduledExpenseCents: 0, scheduledIncomeCents: 0, count: 0 });

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9998;
}

export function shiftMonth(month: string, delta: number): string {
  if (!isMonthKey(month) || !Number.isInteger(delta)) throw new Error("Mês inválido.");
  const value = dateKeyToUTC(`${month}-01`);
  value.setUTCMonth(value.getUTCMonth() + delta);
  const result = value.toISOString().slice(0, 7);
  if (!isMonthKey(result)) throw new Error("Mês fora do intervalo permitido.");
  return result;
}

/** Aligns columns Monday through Sunday, including adjacent-month days. */
export function calendarMonthDays(month: string): string[] {
  if (!isMonthKey(month)) throw new Error("Mês inválido.");
  const first = dateKeyToUTC(`${month}-01`);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const count = Math.max(35, Math.ceil((offset + last.getUTCDate()) / 7) * 7);
  first.setUTCDate(first.getUTCDate() - offset);
  return Array.from({ length: count }, (_, i) => new Date(first.getTime() + i * 86400000).toISOString().slice(0, 10));
}

/** Only days belonging to the requested month, useful for the compact horizontal day strip. */
export function calendarMonthDaysOnly(month: string): string[] {
  return calendarMonthDays(month).filter(day => day.startsWith(`${month}-`));
}

/** Shared validation for deep links, browser history and adjacent-day navigation. */
export function calendarSelection(month: string | null | undefined, day: string | null | undefined, today: string) {
  const validMonth = typeof month === "string" && isMonthKey(month) && month !== "9998-12" ? month : today.slice(0, 7);
  const validDay = typeof day === "string" && isDateKey(day) && day.startsWith(`${validMonth}-`)
    ? day : today.startsWith(`${validMonth}-`) ? today : `${validMonth}-01`;
  return { month: validMonth, day: validDay };
}

/** Actual ledger totals. Transfers and adjustments are visible but excluded from spending/income. */
export function calendarDayTotals(entries: FinanceCalendarEntry[], today?: string): Record<string, DayAmounts> {
  const totals: Record<string, DayAmounts> = {};
  for (const entry of entries) {
    if (!isDateKey(entry.day) || entry.source === "QUICK_INCOME") continue;
    const day = totals[entry.day] ?? emptyDayAmounts();
    day.count++;
    const future = today && entry.day > today;
    if (entry.type === "EXPENSE") day[future ? "scheduledExpenseCents" : "expenseCents"] += entry.amountCents;
    if (entry.type === "INCOME" || entry.type === "REFUND") day[future ? "scheduledIncomeCents" : "incomeCents"] += entry.amountCents;
    totals[entry.day] = day;
  }
  return totals;
}

export function calendarMonthTotals(totals: Record<string, DayAmounts>, month: string) {
  return Object.entries(totals).reduce((sum, [day, amount]) => {
    if (day.startsWith(`${month}-`)) {
      sum.expenseCents += amount.expenseCents;
      sum.incomeCents += amount.incomeCents;
      sum.scheduledExpenseCents += amount.scheduledExpenseCents;
      sum.scheduledIncomeCents += amount.scheduledIncomeCents;
    }
    return sum;
  }, { expenseCents: 0, incomeCents: 0, scheduledExpenseCents: 0, scheduledIncomeCents: 0 });
}
