import { statementClosing, type CardTotals, type StatementRow } from "./card-statements";

/** Credit-limit usage as TBB knows it: an estimate from the commitments recorded here, never the
 * bank's official available limit. Amounts are integer cents; percentages are basis points. */
export type CreditLimitInput = {
  limitCents: number | null;
  /** Open bills (overdue ones included): they hold the limit until they are paid. */
  openCents: number;
  /** Known future bills, including installments the bank already charged to them. */
  futureCents: number;
  /** Card purchases that no registered bill covers yet. */
  unreconciledCents: number;
  /** Forecasts and amounts pending reconciliation: reported, never treated as consumed credit. */
  forecastCents: number;
  pendingCents: number;
  incomplete: boolean;
  referenceDate: string;
  source: "STATEMENTS" | "LEDGER";
};
export type CreditRisk = "none" | "info" | "attention" | "high" | "critical";

/** Internal follow-up bands, not bank rules: below 70%, 70–89%, 90–99% and 100% or more. */
export function creditRisk(committedCents: number, limitCents: number | null): CreditRisk {
  if (!limitCents || limitCents <= 0) return "none";
  if (committedCents * 100 >= limitCents * 100) return "critical";
  if (committedCents * 100 >= limitCents * 90) return "high";
  if (committedCents * 100 >= limitCents * 70) return "attention";
  return "info";
}

export function calculateCreditCardLimitBreakdown(input: CreditLimitInput) {
  const openCents = Math.max(0, input.openCents);
  const futureCents = Math.max(0, input.futureCents) + Math.max(0, input.unreconciledCents);
  const committedCents = openCents + futureCents;
  const limitCents = input.limitCents && input.limitCents > 0 ? input.limitCents : null;
  const base = {
    ...input, limitCents, hasLimit: limitCents !== null, openCents, futureCents, unreconciledCents: Math.max(0, input.unreconciledCents), committedCents,
    risk: creditRisk(committedCents, limitCents),
  };
  if (!limitCents) return { ...base, availableCents: null, excessCents: 0, committedBasisPoints: null, segments: null };
  // Segments always fill at most the bar; an excess is reported apart instead of overflowing it.
  const scale = Math.max(limitCents, committedCents);
  const full = committedCents >= limitCents;
  let open = Math.round(openCents * 10_000 / scale);
  let future = Math.min(10_000 - open, Math.round(futureCents * 10_000 / scale));
  if (full) { if (futureCents) future = 10_000 - open; else open = 10_000; }
  return {
    ...base,
    availableCents: Math.max(0, limitCents - committedCents),
    excessCents: Math.max(0, committedCents - limitCents),
    committedBasisPoints: Math.round(committedCents * 10_000 / limitCents),
    segments: { available: full ? 0 : 10_000 - open - future, open, future },
  };
}
export type CreditLimitBreakdown = ReturnType<typeof calculateCreditCardLimitBreakdown>;

export type CardLedger = {
  /** Account balance from the ledger; negative while purchases are unpaid. */
  balanceCents: number;
  /** Purchases dated after today (installments) minus refunds dated after today. */
  futureNetCents: number;
  /** Card purchases and refunds not linked to any statement. */
  unlinked: { date: string; type: "EXPENSE" | "REFUND"; amountCents: number }[];
};

/** One rule for every screen. A card with registered bills is measured by them: open and known
 * future bills (already including detailed purchases) plus purchases after the last closing that
 * no bill covers yet. Paid bills free the limit; payments are reflected by the bill status, so a
 * transfer to the card is not counted again. A card without bills falls back to its ledger. */
export function cardLimitInput(input: {
  limitCents: number | null; today: string; statements: StatementRow[]; totals: CardTotals | undefined; ledger: CardLedger;
}): CreditLimitInput {
  const { statements, totals, ledger, today } = input;
  if (!totals) {
    const outstanding = Math.max(0, -ledger.balanceCents);
    const future = Math.min(outstanding, Math.max(0, ledger.futureNetCents));
    return { limitCents: input.limitCents, openCents: outstanding - future, futureCents: future, unreconciledCents: 0, forecastCents: 0, pendingCents: 0, incomplete: false, referenceDate: today, source: "LEDGER" };
  }
  const bills = statements.filter((row) => row.kind === "STATEMENT" && row.dueDate);
  const closings = bills.map((row) => statementClosing(row, bills)).filter((value): value is NonNullable<typeof value> => Boolean(value));
  const lastClosing = closings.map((value) => value.date).sort().at(-1);
  const coverage = lastClosing ?? bills.map((row) => row.dueDate!).sort().at(-1) ?? null;
  const uncovered = coverage ? ledger.unlinked.filter((item) => item.date >= coverage) : [];
  const unreconciled = Math.max(0, uncovered.reduce((sum, item) => sum + (item.type === "EXPENSE" ? item.amountCents : -item.amountCents), 0));
  const pendingCents = statements.filter((row) => row.status === "FORECAST" && row.reconciliation === "PENDING").reduce((sum, row) => sum + row.amountCents, 0);
  const stale = statements.some((row) => row.status === "FUTURE_KNOWN" && (row.dueDate || "") < today);
  return {
    limitCents: input.limitCents, openCents: totals.openCents, futureCents: totals.futureKnownCents, unreconciledCents: unreconciled,
    forecastCents: totals.forecastCents, pendingCents, incomplete: stale || (!coverage && ledger.unlinked.length > 0), referenceDate: today, source: "STATEMENTS",
  };
}
