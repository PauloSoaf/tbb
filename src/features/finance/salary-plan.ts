import type { StatementRow } from "./card-statements";
import { fixedExpenseKey, type FixedItem } from "./fixed-expenses";
import { buildSalaryAllocation, type BillGroup, type BillStatementLine, type SalaryAllocation } from "./salary-allocation";

/** The salary plan looks at the current month and the next five: enough to see a big bill coming. */
export const PLAN_MONTHS = 6;

export function monthKeys(today: string, count = PLAN_MONTHS): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => new Date(Date.UTC(year, month - 1 + index, 1)).toISOString().slice(0, 7));
}

export type StatementLite = Pick<StatementRow, "id" | "accountId" | "accountName" | "kind" | "status" | "amountCents" | "dueDate" | "paidAt" | "rolledIntoStatementId"> & {
  payments?: { amountCents: number; date: string | null }[];
};

const monthOf = (day: string | null | undefined) => (day ? day.slice(0, 7) : null);

/** What each card's statements ask of `month`, in cash terms:
 * - still to pay: open or known future bills that fall due in the month, plus open bills already overdue (those
 *   are due now, so they belong to the current month). A bill whose balance moved into the next one owes nothing;
 *   the next bill carries it, so it is never counted in two months;
 * - already paid: payments dated in the month (an undated one belongs to the month its bill is due), or the whole
 *   bill when it was marked paid in the month and has no payment lines.
 * Forecasts and monthly projections are estimates, not bills, and are left out. */
export function billsForMonth(rows: StatementLite[], month: string, today: string): BillGroup[] {
  const currentMonth = today.slice(0, 7);
  const groups = new Map<string, BillGroup>();
  for (const row of rows) {
    if (row.kind !== "STATEMENT") continue;
    const dueMonth = monthOf(row.dueDate);
    let toPay = 0;
    if (!row.rolledIntoStatementId && (row.status === "OPEN" || row.status === "FUTURE_KNOWN")) {
      // Only months from the current one on ask for money: a bill that fell due before it is owed now or not at all.
      const overdue = row.status === "OPEN" && dueMonth !== null && dueMonth < currentMonth;
      if ((dueMonth !== null && dueMonth >= currentMonth && dueMonth === month) || (overdue && month === currentMonth)) toPay = Math.max(0, row.amountCents);
    }
    let paid = 0;
    const payments = row.payments ?? [];
    for (const payment of payments) if ((monthOf(payment.date) ?? dueMonth) === month) paid += Math.max(0, payment.amountCents);
    if (!payments.length && row.status === "PAID" && !row.rolledIntoStatementId && (monthOf(row.paidAt) ?? dueMonth) === month) paid += Math.max(0, row.amountCents);
    if (toPay <= 0 && paid <= 0) continue;

    const group = groups.get(row.accountId) ?? { key: row.accountId, label: `Fatura ${row.accountName}`, toPayCents: 0, paidCents: 0, statements: [] as BillStatementLine[] };
    group.toPayCents += toPay;
    group.paidCents += paid;
    group.statements.push({ id: row.id, dueDate: row.dueDate, toPayCents: toPay, paidCents: paid });
    groups.set(row.accountId, group);
  }
  return [...groups.values()].sort((a, b) => (b.toPayCents + b.paidCents) - (a.toPayCents + a.paidCents) || a.label.localeCompare(b.label, "pt-BR"));
}

/** Card purchases are in the plan through their bill, so the variable slice leaves them out when a registered
 * statement already holds them: the ones linked to a bill, and the ones dated before what the bills cover (the same
 * rule as the credit limit). Purchases on a card without statements, or after the last closing, still count here.
 * Posted fixed expenses that remain are taken out, since they already have their own slice. */
export function variableOutsideStatements(input: {
  expenses: { amountCents: number; accountId: string; date: string; cardStatementId: string | null; isFixed: boolean }[];
  cards: ReadonlyMap<string, { hasStatements: boolean; coverage: string | null }>;
}): number {
  const insideBill = (row: { accountId: string; date: string; cardStatementId: string | null }) => {
    const card = input.cards.get(row.accountId);
    if (!card?.hasStatements) return false;
    return row.cardStatementId !== null || (card.coverage !== null && row.date < card.coverage);
  };
  const kept = input.expenses.filter((row) => !insideBill(row));
  const total = kept.reduce((sum, row) => sum + Math.max(0, row.amountCents), 0);
  const fixed = kept.filter((row) => row.isFixed).reduce((sum, row) => sum + Math.max(0, row.amountCents), 0);
  return Math.max(0, total - Math.min(total, fixed));
}

/** Everything one month of the plan needs, as plain data the browser can recompute from. */
export type MonthPlan = {
  month: string;
  incomeCents: number;
  items: FixedItem[];
  bills: BillGroup[];
  variableCents: number;
  /** Variable spending is only known for the current month; later months have none registered yet. */
  variablesKnown: boolean;
};
export type SalaryPlanView = { months: MonthPlan[]; canSeeBills: boolean; excludedDebtMinimumsCents: number; openBillsCents?: number; openBillsCount?: number; undatedBillsCount?: number };

type FixedBillPurchase = { id: string; accountId: string; cardStatementId: string | null; amountCents: number; description: string; merchant: string | null; subscriptionId: string | null };

/** Only a linked purchase proves that a fixed commitment is already in a bill. Planned card spending and
 * future subscription estimates stay additional until there is evidence. Each purchase cent is used once. */
export function fixedBillCoverage(items: FixedItem[], bills: BillGroup[], purchases: FixedBillPurchase[]): FixedItem[] {
  const statementIds = new Set(bills.flatMap(bill => bill.statements.map(statement => statement.id)));
  const remaining = new Map(purchases.filter(row => row.cardStatementId && statementIds.has(row.cardStatementId)).map(row => [row.id, Math.max(0, row.amountCents)]));
  return items.map(item => {
    let included = 0;
    if (item.cardId) for (const row of purchases) {
      if (row.accountId !== item.cardId || !remaining.has(row.id)) continue;
      const sameSubscription = item.kind === "SUBSCRIPTION" && item.id && item.id === row.subscriptionId;
      const key = fixedExpenseKey(item.name);
      const sameName = key && [fixedExpenseKey(row.description), fixedExpenseKey(row.merchant)].includes(key);
      if (!sameSubscription && !sameName) continue;
      const used = Math.min(Math.max(0, item.cents - included), remaining.get(row.id)!);
      included += used; remaining.set(row.id, remaining.get(row.id)! - used);
    }
    return { ...item, includedInBillsCents: included };
  });
}

/** The two charts of a month: the complete one (fixed, bills and variable) and the fixed-only one.
 * `hiddenBills` are card keys the user took out of the chart; their fixed expenses stay, because those are separate commitments. */
export function allocateMonth(plan: MonthPlan, options: { hiddenBills?: ReadonlySet<string>; maxItems?: number } = {}): { complete: SalaryAllocation; fixedOnly: SalaryAllocation; hiddenBills: BillGroup[] } {
  const hidden = options.hiddenBills ?? new Set<string>();
  return {
    complete: buildSalaryAllocation({ incomeCents: plan.incomeCents, items: plan.items, variableCents: plan.variableCents, bills: plan.bills.filter((bill) => !hidden.has(bill.key)), maxItems: options.maxItems }),
    fixedOnly: buildSalaryAllocation({ incomeCents: plan.incomeCents, items: plan.items, variableCents: 0, maxItems: options.maxItems }),
    hiddenBills: plan.bills.filter((bill) => hidden.has(bill.key)),
  };
}

/** True when the fixed expenses and the card bills together, before any variable spending, already pass the income.
 * Bills are taken net of the fixed expenses charged to them, so nothing is added twice. */
export function billsOverflow(allocation: SalaryAllocation): boolean {
  return allocation.incomeCents > 0 && allocation.billsCents > 0 && allocation.fixedOutsideBillsCents + allocation.billsCents > allocation.incomeCents;
}
