import type { FixedItem, FixedItemKind } from "./fixed-expenses";

/** Where the monthly income is planned to go. Integer cents end to end: the slices of a month with room to
 * spare add up to the income exactly, and percentages are basis points that always add up to 10 000.
 * A shortfall is reported as a number of its own: it is never a negative slice of the pie. */
export type AllocationKind = FixedItemKind | "BILL" | "VARIABLE" | "FREE" | "RESERVE" | "PLANNED";

export type BillStatementLine = { id: string; dueDate: string | null; toPayCents: number; paidCents: number };
/** What one card's statements ask of a month: what is still to be paid and what was already paid in it. */
export type BillGroup = { key: string; label: string; toPayCents: number; paidCents: number; statements: BillStatementLine[] };
/** The bill slice always shows `grossCents`. `linkedCents` records fixed spending proven inside it;
 * `netCents` is the remaining non-fixed spending, for reconciliation, not the chart's bill value. */
export type BillDetail = {
  key: string; label: string; grossCents: number; linkedCents: number; netCents: number; toPayCents: number; paidCents: number; statements: BillStatementLine[];
};

export type AllocationSlice = {
  key: string; kind: AllocationKind; label: string; cents: number; basisPoints: number;
  id: string | null; plannedCents?: number; postedCents?: number;
  /** Number of small commitments folded into an "Outros" slice. */
  merged?: number;
  /** Credit card a fixed commitment is charged to. */
  cardId?: string | null;
  /** Present on the slice of a card's bill. */
  bill?: BillDetail;
  /** Original items retained when the legend groups small commitments or groups by kind. */
  members?: AllocationSlice[];
  includedInBillsCents?: number;
};
export type SalaryAllocation = {
  incomeCents: number;
  /** Fixed commitments (planned, subscriptions, recurring) already in the plan. */
  fixedCents: number;
  fixedOutsideBillsCents: number;
  fixedIncludedInBillsCents: number;
  /** Everything else registered this month. */
  variableCents: number;
  /** Full card bills. Evidenced overlap is removed from fixedOutsideBillsCents instead. */
  billsCents: number;
  /** Full card bills, also kept explicitly for summary displays. */
  billsGrossCents: number;
  commitmentsCents: number;
  freeCents: number;
  deficitCents: number;
  /** commitments ÷ income, null when there is no income to compare with. */
  usageBasisPoints: number | null;
  /** What the full circle represents: the income, or the commitments when they exceed it. */
  baseCents: number;
  slices: AllocationSlice[];
  byKind: AllocationSlice[];
  /** Every bill taken into account, even one whose slice is empty after the deduction. */
  bills: BillDetail[];
};

export const KIND_LABEL: Record<AllocationKind, string> = {
  RESERVE: "Reservas para objetivos", PLANNED: "Despesas eventuais",
  FIXED: "Gastos fixos", SUBSCRIPTION: "Assinaturas", RECURRING: "Recorrentes já lançados", BILL: "Faturas de cartão", VARIABLE: "Variáveis do mês", FREE: "Sobra prevista",
};

/** Basis points that add up to exactly 10 000 (largest-remainder method). */
export function shares(cents: number[]): number[] {
  const total = cents.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return cents.map(() => 0);
  const exact = cents.map((value) => (value * 10_000) / total);
  const result = exact.map(Math.floor);
  let missing = 10_000 - result.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) { if (missing <= 0) break; result[index] += 1; missing -= 1; }
  return result;
}

const positive = (value: number) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

/** Bills keep their full value. A fixed expense is removed from its separate slice only to the extent that
 * linked purchase evidence proves it is already in those bills. A card assignment is a plan, not evidence. */
export function buildSalaryAllocation(input: { incomeCents: number; items: FixedItem[]; variableCents: number; bills?: BillGroup[]; maxItems?: number; additionalCommitments?: { key: string; kind: "RESERVE" | "PLANNED"; label: string; cents: number }[] }): SalaryAllocation {
  const income = positive(input.incomeCents);
  const variable = positive(input.variableCents);
  const items = input.items.filter((item) => positive(item.cents) > 0).map((item) => ({ ...item, cents: positive(item.cents) }));
  const fixed = items.reduce((sum, item) => sum + item.cents, 0);

  const billCapacity = new Map((input.bills ?? []).map(group => [group.key, positive(group.toPayCents) + positive(group.paidCents)]));
  const includedByCard = new Map<string, number>();
  const separateItems = items.map(item => {
    const included = item.cardId ? Math.min(item.cents, positive(item.includedInBillsCents ?? 0), billCapacity.get(item.cardId) ?? 0) : 0;
    if (item.cardId) {
      billCapacity.set(item.cardId, (billCapacity.get(item.cardId) ?? 0) - included);
      includedByCard.set(item.cardId, (includedByCard.get(item.cardId) ?? 0) + included);
    }
    return { ...item, includedInBillsCents: included, cents: item.cents - included };
  });
  const bills: BillDetail[] = (input.bills ?? []).map((group) => {
    const toPayCents = positive(group.toPayCents), paidCents = positive(group.paidCents);
    const grossCents = toPayCents + paidCents, linkedCents = includedByCard.get(group.key) ?? 0;
    return { key: group.key, label: group.label, grossCents, linkedCents, netCents: Math.max(0, grossCents - linkedCents), toPayCents, paidCents, statements: group.statements };
  }).filter((bill) => bill.grossCents > 0).sort((a, b) => b.netCents - a.netCents || a.label.localeCompare(b.label, "pt-BR"));
  const billsGross = bills.reduce((sum, bill) => sum + bill.grossCents, 0);
  const fixedOutside = separateItems.reduce((sum, item) => sum + item.cents, 0);

  const additional = (input.additionalCommitments ?? []).filter(row => positive(row.cents) > 0).map(row => ({ ...row, cents: positive(row.cents) }));
  const commitments = fixedOutside + billsGross + variable + additional.reduce((sum, row) => sum + row.cents, 0);
  const free = Math.max(0, income - commitments);
  const deficit = Math.max(0, commitments - income);
  const base = Math.max(income, commitments);

  // Biggest fixed commitments get their own slice; the long tail is folded into one "Outros" slice.
  const limit = Math.max(2, input.maxItems ?? 8);
  const ranked = separateItems.filter(item => item.cents > 0).sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "pt-BR"));
  const shown = ranked.length > limit ? ranked.slice(0, limit - 1) : ranked;
  const tail = ranked.length > limit ? ranked.slice(limit - 1) : [];
  const leaf = (item: typeof ranked[number], index: number): AllocationSlice => ({
    key: `${item.kind.toLowerCase()}:${item.id ?? index}`, kind: item.kind, label: item.name, cents: item.cents, id: item.id, plannedCents: item.plannedCents, postedCents: item.postedCents, cardId: item.cardId ?? null, includedInBillsCents: item.includedInBillsCents,
    basisPoints: base ? Math.round(item.cents * 10_000 / base) : 0,
  });
  const allFixed = ranked.map(leaf);
  const draft: Omit<AllocationSlice, "basisPoints">[] = shown.map(leaf);
  if (tail.length) draft.push({ key: "other", kind: "FIXED", label: `Outros (${tail.length})`, cents: tail.reduce((sum, item) => sum + item.cents, 0), id: null, merged: tail.length, members: tail.map((item, index) => leaf(item, shown.length + index)) });
  for (const bill of bills) if (bill.grossCents > 0) draft.push({ key: `bill:${bill.key}`, kind: "BILL", label: bill.label, cents: bill.grossCents, id: bill.key, bill });
  if (variable) draft.push({ key: "variable", kind: "VARIABLE", label: KIND_LABEL.VARIABLE, cents: variable, id: null });
  for (const row of additional) draft.push({ ...row, id: null });
  if (free) draft.push({ key: "free", kind: "FREE", label: KIND_LABEL.FREE, cents: free, id: null });

  const bp = shares(draft.map((slice) => slice.cents));
  const slices = draft.map((slice, index) => ({ ...slice, basisPoints: bp[index] }));

  const kinds: AllocationKind[] = ["FIXED", "SUBSCRIPTION", "RECURRING", "BILL", "VARIABLE", "RESERVE", "PLANNED", "FREE"];
  const unmerged = [...allFixed, ...draft.filter(slice => slice.kind === "BILL" || slice.kind === "VARIABLE" || slice.kind === "FREE" || slice.kind === "RESERVE" || slice.kind === "PLANNED")];
  const grouped = kinds.map((kind) => ({ key: `kind:${kind}`, kind, label: KIND_LABEL[kind], cents: unmerged.filter(slice => slice.kind === kind).reduce((sum, slice) => sum + slice.cents, 0), id: null, members: unmerged.filter(slice => slice.kind === kind).map(slice => ({ ...slice, basisPoints: base ? Math.round(slice.cents * 10_000 / base) : 0 })) })).filter((group) => group.cents > 0);
  const groupBp = shares(grouped.map((group) => group.cents));
  return {
    incomeCents: income, fixedCents: fixed, fixedOutsideBillsCents: fixedOutside, fixedIncludedInBillsCents: fixed - fixedOutside, variableCents: variable, billsCents: billsGross, billsGrossCents: billsGross, commitmentsCents: commitments, freeCents: free, deficitCents: deficit,
    usageBasisPoints: income ? Math.round((commitments * 10_000) / income) : null, baseCents: base,
    slices, byKind: grouped.map((group, index) => ({ ...group, basisPoints: groupBp[index] })), bills,
  };
}
