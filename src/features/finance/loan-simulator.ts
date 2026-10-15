import { dateKeyToUTC, isDateKey } from "@/lib/dates";

/**
 * Loan and card-bill installment simulator. Pure and deterministic: no database, no network, no bank.
 *
 * Money is integer cents. Interest of a period is the balance times the monthly rate, rounded to the nearest
 * cent (half up); a Price installment is rounded the same way; the last installment always absorbs the
 * leftover cents, so the principal repaid equals the financed amount exactly. Rates are parts per million
 * (3,99% = 39 900 ppm) and are never invented: a missing rate makes the scenario "incomplete" instead of
 * guessing one. The CET computed here is an ESTIMATE from the cash flows entered; it is never the creditor's
 * official CET, which is kept apart as "informado".
 */
export const MAX_INSTALLMENTS = 360;
export const MAX_SCENARIOS = 5;
export const REVOLVING_CAP_MONTHS = 120;
const MAX_ROWS = 1_200;
const MONTHLY_RATE_LIMIT_PPM = 1_000_000; // 100% a month is the limit of what the engine accepts

export type RepaymentSystem = "CASH" | "PRICE" | "SAC" | "REVOLVING";
export type LoanProduct = "CARD_STATEMENT" | "LOAN" | "OTHER";
export type ExtraEffect = "REDUCE_TERM" | "REDUCE_INSTALLMENT";
export type ExtraPayment = { month: number; amountCents: number; effect: ExtraEffect };

export type ScenarioInput = {
  id: string;
  name: string;
  system: RepaymentSystem;
  product: LoanProduct;
  /** Paid at the start out of pocket; the rest is financed. */
  downPaymentCents: number;
  installments: number;
  /** Monthly interest in ppm, or null when the user does not know it yet. */
  monthlyRatePpm: number | null;
  /** IOF and fees: paid at the start, or added to the financed amount when `financeCharges` is set. */
  iofCents: number;
  feesCents: number;
  financeCharges: boolean;
  insuranceMonthlyCents: number;
  /** Fixed monthly payment of a revolving balance. */
  monthlyPaymentCents: number | null;
  startOn: string;
  firstPaymentOn: string;
  /** CET as printed by the creditor, annual, in ppm. Kept separate from the estimate. */
  informedCetAnnualPpm: number | null;
  extra: ExtraPayment | null;
};

export type ScheduleRow = {
  n: number; date: string;
  /** Everything paid that month: amortization, interest, insurance and any extra payment. */
  paymentCents: number;
  interestCents: number; amortizationCents: number; insuranceCents: number; extraCents: number;
  balanceCents: number;
};
export type ScenarioResult = {
  id: string; name: string; system: RepaymentSystem; product: LoanProduct;
  /** Contract start: the month in which anything paid up front (the bill in full, a down payment) is felt. */
  startOn: string;
  ok: boolean; incomplete: boolean; issues: string[]; flags: string[];
  principalCents: number; financedCents: number; upfrontCents: number;
  schedule: ScheduleRow[];
  months: number;
  firstPaymentCents: number; peakPaymentCents: number;
  totalPaidCents: number; interestCents: number; chargesCents: number;
  /** What the credit costs on top of the amount needed: total paid minus the principal. */
  costCents: number;
  /** Annualized rate of the dated cash flows, charges included: an estimate of the CET. */
  effectiveAnnual: number | null; effectiveMonthly: number | null;
  informedCetAnnual: number | null; cetDiverges: boolean;
};

const round = (value: number) => Math.round(value);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const isCents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function addMonthsKey(key: string, months: number): string {
  const base = dateKeyToUTC(key);
  const month = base.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(base.getUTCFullYear(), month, Math.min(base.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}
const daysBetween = (from: string, to: string) => Math.round((dateKeyToUTC(to).getTime() - dateKeyToUTC(from).getTime()) / 86_400_000);

/** Price (constant installment) payment for a balance over `periods` at monthly rate `rate`. */
export function pricePayment(balanceCents: number, rate: number, periods: number): number {
  if (periods <= 0) return balanceCents;
  if (rate === 0) return round(balanceCents / periods);
  return round((balanceCents * rate) / (1 - Math.pow(1 + rate, -periods)));
}

/** Everything wrong with a scenario that makes it impossible to compute. Missing optional knowledge is not an error. */
export function validateScenario(input: ScenarioInput, principalCents: number): string[] {
  const issues: string[] = [];
  if (!isCents(principalCents) || principalCents <= 0) issues.push("Informe o valor a resolver, maior que zero.");
  for (const [label, value] of [["entrada", input.downPaymentCents], ["IOF", input.iofCents], ["tarifas", input.feesCents], ["seguro mensal", input.insuranceMonthlyCents]] as const) {
    if (!isCents(value)) issues.push(`Valor de ${label} inválido.`);
  }
  if (isCents(input.downPaymentCents) && input.downPaymentCents > principalCents) issues.push("A entrada não pode ser maior que o valor a resolver.");
  if (!isDateKey(input.startOn) || !isDateKey(input.firstPaymentOn)) issues.push("Informe datas válidas de início e do primeiro vencimento.");
  else if (input.firstPaymentOn < input.startOn) issues.push("O primeiro vencimento não pode ser anterior ao início.");
  if (input.system === "CASH") return issues;
  if (!Number.isInteger(input.installments) || input.installments < 1 || input.installments > MAX_INSTALLMENTS) issues.push(`O número de parcelas deve ficar entre 1 e ${MAX_INSTALLMENTS}.`);
  if (input.monthlyRatePpm !== null && (!Number.isInteger(input.monthlyRatePpm) || input.monthlyRatePpm < 0 || input.monthlyRatePpm > MONTHLY_RATE_LIMIT_PPM)) issues.push("A taxa mensal deve ficar entre 0% e 100%.");
  if (input.system === "REVOLVING" && input.monthlyPaymentCents !== null && !isCents(input.monthlyPaymentCents)) issues.push("Pagamento mensal inválido.");
  if (input.extra) {
    if (!isCents(input.extra.amountCents) || input.extra.amountCents === 0) issues.push("Informe o valor da amortização extra.");
    if (!Number.isInteger(input.extra.month) || input.extra.month < 1 || input.extra.month >= input.installments) issues.push("A amortização extra deve cair entre a 1ª parcela e a penúltima.");
  }
  return issues;
}

function buildSchedule(input: ScenarioInput, financedCents: number): { rows: ScheduleRow[]; flags: string[] } {
  const rate = (input.monthlyRatePpm ?? 0) / 1_000_000;
  const flags: string[] = [];
  const rows: ScheduleRow[] = [];
  const insurance = input.insuranceMonthlyCents;
  let balance = financedCents;
  const n = input.installments;
  const dateOf = (k: number) => addMonthsKey(input.firstPaymentOn, k - 1);

  if (input.system === "REVOLVING") {
    const payment = input.monthlyPaymentCents ?? 0;
    for (let k = 1; balance > 0 && k <= REVOLVING_CAP_MONTHS; k++) {
      const interest = round(balance * rate);
      const toPay = Math.min(payment, balance + interest);
      const amortization = toPay - interest; // negative when the payment does not even cover the interest
      balance -= amortization;
      rows.push({ n: k, date: dateOf(k), paymentCents: toPay + insurance, interestCents: interest, amortizationCents: amortization, insuranceCents: insurance, extraCents: 0, balanceCents: balance });
    }
    if (balance > 0) flags.push(`O saldo não é quitado em ${REVOLVING_CAP_MONTHS} meses com este pagamento.`);
    if (payment <= round(financedCents * rate) && financedCents > 0) flags.push("O pagamento mensal não cobre os juros: o saldo não diminui.");
    return { rows, flags };
  }

  let payment = input.system === "PRICE" ? pricePayment(balance, rate, n) : 0;
  let amortBase = input.system === "SAC" ? Math.floor(balance / n) : 0;
  for (let k = 1; balance > 0 && k <= MAX_ROWS; k++) {
    const interest = round(balance * rate);
    const planned = input.system === "PRICE" ? payment - interest : amortBase;
    const last = k >= n || planned >= balance || planned <= 0;
    let amortization = last ? balance : planned;
    balance -= amortization;
    let extra = 0;
    if (input.extra && input.extra.month === k && balance > 0) {
      extra = Math.min(input.extra.amountCents, balance);
      balance -= extra;
      amortization += extra;
      const remaining = n - k;
      if (input.extra.effect === "REDUCE_INSTALLMENT" && remaining > 0 && balance > 0) {
        if (input.system === "PRICE") payment = pricePayment(balance, rate, remaining);
        else amortBase = Math.floor(balance / remaining);
      }
    }
    rows.push({ n: k, date: dateOf(k), paymentCents: amortization + interest + insurance, interestCents: interest, amortizationCents: amortization, insuranceCents: insurance, extraCents: extra, balanceCents: balance });
  }
  return { rows, flags };
}

/** Annual effective rate (Actual/365) that makes the dated flows net to zero, or null when there is none. */
export function annualRateOf(flows: { date: string; cents: number }[]): number | null {
  if (flows.length < 2) return null;
  const origin = flows[0].date;
  const years = flows.map((flow) => daysBetween(origin, flow.date) / 365);
  const value = (rate: number) => flows.reduce((total, flow, index) => total + flow.cents / Math.pow(1 + rate, years[index]), 0);
  if (value(0) >= 0) return 0; // nothing costs more than it brings: no positive rate
  let high = 1;
  while (value(high) < 0 && high < 1e7) high *= 4;
  if (value(high) < 0) return null;
  let low = 0;
  for (let step = 0; step < 200; step++) {
    const middle = (low + high) / 2;
    if (value(middle) < 0) low = middle; else high = middle;
    if (high - low < 1e-12) break;
  }
  return (low + high) / 2;
}

export function runScenario(input: ScenarioInput, principalCents: number): ScenarioResult {
  const base = { id: input.id, name: input.name, system: input.system, product: input.product, startOn: input.startOn, principalCents, informedCetAnnual: input.informedCetAnnualPpm === null ? null : input.informedCetAnnualPpm / 1_000_000 };
  const blank = { financedCents: 0, upfrontCents: 0, schedule: [] as ScheduleRow[], months: 0, firstPaymentCents: 0, peakPaymentCents: 0, totalPaidCents: 0, interestCents: 0, chargesCents: 0, costCents: 0, effectiveAnnual: null, effectiveMonthly: null, cetDiverges: false, flags: [] as string[] };
  const issues = validateScenario(input, principalCents);
  if (issues.length) return { ...base, ...blank, ok: false, incomplete: false, issues };

  if (input.system === "CASH") {
    return { ...base, ...blank, ok: true, incomplete: false, issues: [], upfrontCents: principalCents, totalPaidCents: principalCents, peakPaymentCents: principalCents, firstPaymentCents: principalCents, months: 1 };
  }
  const needsRate = input.monthlyRatePpm === null;
  const needsPayment = input.system === "REVOLVING" && input.monthlyPaymentCents === null;
  if (needsRate || needsPayment) {
    return { ...base, ...blank, ok: true, incomplete: true, issues: [needsRate ? "Informe a taxa mensal para calcular." : "Informe o pagamento mensal para calcular."] };
  }

  const charges = input.iofCents + input.feesCents;
  const financedBase = principalCents - input.downPaymentCents;
  const financed = financedBase + (input.financeCharges ? charges : 0);
  const upfront = input.downPaymentCents + (input.financeCharges ? 0 : charges);
  if (financed <= 0) return { ...base, ...blank, ok: true, incomplete: false, issues: [], upfrontCents: upfront, totalPaidCents: upfront, peakPaymentCents: upfront, firstPaymentCents: upfront, months: 1, costCents: upfront - principalCents };

  const { rows, flags } = buildSchedule(input, financed);
  const installmentsTotal = sum(rows.map((row) => row.paymentCents));
  const totalPaid = upfront + installmentsTotal;
  const interest = sum(rows.map((row) => row.interestCents));
  const insuranceTotal = sum(rows.map((row) => row.insuranceCents));
  const chargesTotal = charges + insuranceTotal;

  // t0: the credit received (principal minus the down payment) less what is paid up front on top of it.
  const flows = [{ date: input.startOn, cents: financedBase - (input.financeCharges ? 0 : charges) }, ...rows.map((row) => ({ date: row.date, cents: -row.paymentCents }))];
  const annual = annualRateOf(flows);
  const monthly = annual === null ? null : Math.pow(1 + annual, 1 / 12) - 1;
  const informed = base.informedCetAnnual;
  const diverges = annual !== null && informed !== null && Math.abs(annual - informed) > 0.005;
  const heavy = interest + chargesTotal >= principalCents;
  const allFlags = [...flags];
  if (input.product === "CARD_STATEMENT" && heavy) allFlags.push("Juros e encargos somam pelo menos o valor original da dívida. Para rotativo e parcelamento de fatura há um teto legal de 100% (regra vigente desde 03/01/2024, para operações elegíveis): confira com o banco se este contrato o respeita.");
  if (diverges) allFlags.push("O CET informado pelo banco difere do estimado aqui. Confira tarifas, IOF, seguros e datas: vale o do contrato.");
  return {
    ...base, ok: true, incomplete: false, issues: [], flags: allFlags, financedCents: financed, upfrontCents: upfront, schedule: rows, months: rows.length,
    firstPaymentCents: rows[0]?.paymentCents ?? 0, peakPaymentCents: Math.max(0, ...rows.map((row) => row.paymentCents)),
    totalPaidCents: totalPaid, interestCents: interest, chargesCents: chargesTotal, costCents: totalPaid - principalCents,
    effectiveAnnual: annual, effectiveMonthly: monthly, cetDiverges: diverges,
  };
}

/* ---------- monthly cash flow under a shock ---------- */
export type FlowParams = {
  incomeCents: number; commitmentsCents: number; incomeChangePercent: number; extraExpenseCents: number;
  /** Savings the user would spend now. It covers what is paid up front before the month's income has to. */
  availableCashCents?: number;
};
/** `paymentCents` is everything paid in the month out of income: installments plus the up-front part
 * (`upfrontCents`) that savings did not cover. */
export type FlowMonth = { month: string; paymentCents: number; upfrontCents: number; incomeCents: number; commitmentsCents: number; surplusCents: number };
/** `incomeCents` is the income after the shock; zero means it is unknown, and then nothing can be judged. */
export type FlowSummary = { incomeCents: number; months: FlowMonth[]; negativeMonths: number; lowestSurplusCents: number | null; peakShareOfIncome: number | null };

/** What is left each month after the plan's fixed commitments and the scenario's payments, with an optional
 * change in income and an extra monthly expense. Money paid on day one (the whole bill, a down payment,
 * charges not financed) is felt in the contract's start month, so paying in full is not shown as free.
 * A negative month is a warning, never a rejection. */
export function monthlyFlow(result: ScenarioResult, params: FlowParams): FlowSummary {
  const income = Math.max(0, round(params.incomeCents * (1 + params.incomeChangePercent / 100)));
  const commitments = params.commitmentsCents + params.extraExpenseCents;
  const byMonth = new Map<string, { installments: number; upfront: number }>();
  const slot = (month: string) => byMonth.get(month) ?? byMonth.set(month, { installments: 0, upfront: 0 }).get(month)!;
  if (result.ok && !result.incomplete) {
    // The start month exists whenever something is paid up front, even if savings cover all of it.
    if (result.upfrontCents > 0 && isDateKey(result.startOn)) slot(result.startOn.slice(0, 7)).upfront += Math.max(0, result.upfrontCents - Math.max(0, params.availableCashCents ?? 0));
    for (const row of result.schedule) slot(row.date.slice(0, 7)).installments += row.paymentCents;
  }
  const months: FlowMonth[] = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, part]) => {
    const paymentCents = part.installments + part.upfront;
    return { month, paymentCents, upfrontCents: part.upfront, incomeCents: income, commitmentsCents: commitments, surplusCents: income - commitments - paymentCents };
  });
  return {
    incomeCents: income, months, negativeMonths: months.filter((month) => month.surplusCents < 0).length,
    lowestSurplusCents: months.length ? Math.min(...months.map((month) => month.surplusCents)) : null,
    peakShareOfIncome: income > 0 && months.length ? Math.max(...months.map((month) => month.paymentCents)) / income : null,
  };
}

/* ---------- comparison ---------- */
export type Comparison = { cheapestId: string | null; mostViableId: string | null; notes: string[]; comparable: string[] };

/** Two different questions, answered separately: which costs least overall, and which fits the monthly
 * cash flow best (fewest negative months, then the most room left in the worst month). A smaller installment
 * is NOT a smaller cost, and the notes say so when they differ. Without a known income there is nothing to
 * fit into, so only the cost is judged. */
export function compareScenarios(results: ScenarioResult[], flows: Record<string, FlowSummary>): Comparison {
  const comparable = results.filter((result) => result.ok && !result.incomplete);
  const notes: string[] = [];
  const skipped = results.filter((result) => !comparable.includes(result));
  if (skipped.length) notes.push(`Sem dados suficientes para comparar: ${skipped.map((result) => result.name).join(", ")}.`);
  if (comparable.length < 2) { notes.push("Preencha pelo menos dois cenários completos para ver uma comparação."); return { cheapestId: null, mostViableId: null, notes, comparable: comparable.map((result) => result.id) }; }
  const cheapest = [...comparable].sort((a, b) => a.costCents - b.costCents || a.peakPaymentCents - b.peakPaymentCents)[0];
  const sameCost = comparable.filter((result) => result.costCents === cheapest.costCents);
  if (sameCost.length > 1) notes.push("Mais de um cenário tem o mesmo custo total.");
  if (comparable.some((result) => !((flows[result.id]?.incomeCents ?? 0) > 0))) {
    notes.push("Informe a renda mensal para ver qual opção cabe melhor no orçamento. Sem ela, só o custo é comparado.");
    return { cheapestId: cheapest.id, mostViableId: null, notes, comparable: comparable.map((result) => result.id) };
  }
  const negatives = (result: ScenarioResult) => flows[result.id]?.negativeMonths ?? 0;
  const worstMonth = (result: ScenarioResult) => flows[result.id]?.lowestSurplusCents ?? null;
  const roomLeft = (a: ScenarioResult, b: ScenarioResult) => { const left = worstMonth(a), right = worstMonth(b); return left !== null && right !== null ? right - left : 0; };
  const viable = [...comparable].sort((a, b) => negatives(a) - negatives(b) || roomLeft(a, b) || a.peakPaymentCents - b.peakPaymentCents || a.costCents - b.costCents)[0];
  if (negatives(viable) > 0) notes.push("Nenhum cenário cabe no fluxo mensal com estes parâmetros: todos têm meses negativos.");
  if (cheapest.id !== viable.id) notes.push(`${cheapest.name} é o mais barato no total, mas ${viable.name} deixa mais folga no pior mês do orçamento. Menor parcela não significa menor custo.`);
  return { cheapestId: cheapest.id, mostViableId: viable.id, notes, comparable: comparable.map((result) => result.id) };
}
