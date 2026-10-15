import { z } from "zod";
import { isDateKey } from "@/lib/dates";
import { addMonthsKey, compareScenarios, monthlyFlow, runScenario, MAX_INSTALLMENTS, MAX_SCENARIOS, type ExtraEffect, type FlowParams, type FlowSummary, type LoanProduct, type RepaymentSystem, type ScenarioInput } from "./loan-simulator";
import { moneyInput, parseMoney } from "./money";

const MAX_CENTS = 2_147_483_647;

/** Percent text ("3,99") to parts per million of the rate (39 900), exactly, with up to four decimals.
 * No floating point is involved, so what the user typed is what is calculated. Empty means "not known". */
export function parsePercentPpm(text: string): { ppm: number | null; error?: string } {
  const clean = text.trim().replace(/\s/g, "").replace(/%$/, "");
  if (!clean) return { ppm: null };
  const match = /^(\d{1,3})(?:[.,](\d{1,4}))?$/.exec(clean);
  if (!match) return { ppm: null, error: "Use um percentual como 3,99 (até 4 casas decimais)." };
  return { ppm: Number(match[1]) * 10_000 + Number((match[2] ?? "").padEnd(4, "0")) };
}

/** Money text to cents; empty is zero. Reuses the app's exact parser, so "1.234,56" and "1234.56" both work. */
export function parseCentsField(text: string, label: string): { cents: number; error?: string } {
  if (!text.trim()) return { cents: 0 };
  try { return { cents: parseMoney(text) }; } catch (error) { return { cents: 0, error: `${label}: ${error instanceof Error ? error.message : "valor inválido"}` }; }
}

/** What the editor holds while the user types: plain strings, nothing parsed yet. */
export type ScenarioForm = {
  id: string; name: string; system: RepaymentSystem; product: LoanProduct;
  down: string; installments: string; rate: string; iof: string; fees: string; financeCharges: boolean; insurance: string; payment: string;
  startOn: string; firstPaymentOn: string; informedCet: string;
  extraAmount: string; extraMonth: string; extraEffect: ExtraEffect;
};

export function emptyForm(id: string, today: string, patch: Partial<ScenarioForm> = {}): ScenarioForm {
  return { id, name: "", system: "PRICE", product: "LOAN", down: "", installments: "12", rate: "", iof: "", fees: "", financeCharges: false, insurance: "", payment: "", startOn: today, firstPaymentOn: addMonthsKey(today, 1), informedCet: "", extraAmount: "", extraMonth: "", extraEffect: "REDUCE_TERM", ...patch };
}

export function defaultForms(today: string): ScenarioForm[] {
  return [
    emptyForm("s1", today, { name: "Quitar agora", system: "CASH", product: "CARD_STATEMENT" }),
    emptyForm("s2", today, { name: "Parcelar a fatura", system: "PRICE", product: "CARD_STATEMENT" }),
  ];
}

/** The strings of one scenario turned into a typed input, with every problem named in plain words.
 * Only the fields the chosen way of paying shows are read: a value typed under one system and left behind,
 * hidden, after switching to another must never change the numbers or raise an error nobody can see. */
export function scenarioFromForm(form: ScenarioForm): { input: ScenarioInput; errors: string[] } {
  const errors: string[] = [];
  const credit = form.system !== "CASH";
  const installmentBased = credit && form.system !== "REVOLVING";
  const money = (text: string, label: string) => { const parsed = parseCentsField(text, label); if (parsed.error) errors.push(parsed.error); return parsed.cents; };
  const rate = credit ? parsePercentPpm(form.rate) : { ppm: null }; if (rate.error) errors.push(`Juros ao mês: ${rate.error}`);
  const cet = installmentBased ? parsePercentPpm(form.informedCet) : { ppm: null }; if (cet.error) errors.push(`CET informado: ${cet.error}`);
  const installments = installmentBased ? (form.installments.trim() ? Number(form.installments) : NaN) : 1;
  if (installmentBased && !Number.isInteger(installments)) errors.push("Parcelas: informe um número inteiro.");
  const extraAmount = installmentBased ? money(form.extraAmount, "Amortização extra") : 0;
  const extraMonth = installmentBased && form.extraMonth.trim() ? Number(form.extraMonth) : null;
  if (extraAmount > 0 && (extraMonth === null || !Number.isInteger(extraMonth))) errors.push("Amortização extra: informe o mês da parcela em que ela acontece.");
  const payment = form.system === "REVOLVING" && form.payment.trim() ? money(form.payment, "Pagamento mensal") : null;
  return {
    errors,
    input: {
      id: form.id, name: form.name.trim() || "Cenário", system: form.system, product: form.product,
      downPaymentCents: installmentBased ? money(form.down, "Entrada") : 0, installments: Number.isInteger(installments) ? installments : 0, monthlyRatePpm: rate.ppm,
      iofCents: installmentBased ? money(form.iof, "IOF") : 0, feesCents: installmentBased ? money(form.fees, "Tarifas") : 0, financeCharges: installmentBased && form.financeCharges,
      insuranceMonthlyCents: credit ? money(form.insurance, "Seguro mensal") : 0,
      monthlyPaymentCents: payment, startOn: form.startOn, firstPaymentOn: credit ? form.firstPaymentOn : form.startOn, informedCetAnnualPpm: cet.ppm,
      extra: extraAmount > 0 && extraMonth !== null ? { month: extraMonth, amountCents: extraAmount, effect: form.extraEffect } : null,
    },
  };
}

/* ---------- what is stored when the user chooses to save ---------- */
const cents = z.number().int().min(0).max(MAX_CENTS);
const dateKey = z.string().refine(isDateKey, "data inválida");
export const scenarioInputSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  system: z.enum(["CASH", "PRICE", "SAC", "REVOLVING"]),
  product: z.enum(["CARD_STATEMENT", "LOAN", "OTHER"]),
  downPaymentCents: cents,
  installments: z.number().int().min(0).max(MAX_INSTALLMENTS),
  monthlyRatePpm: z.number().int().min(0).max(1_000_000).nullable(),
  iofCents: cents, feesCents: cents, financeCharges: z.boolean(), insuranceMonthlyCents: cents,
  monthlyPaymentCents: cents.nullable(),
  startOn: dateKey, firstPaymentOn: dateKey,
  informedCetAnnualPpm: z.number().int().min(0).max(100_000_000).nullable(),
  extra: z.object({ month: z.number().int().min(1).max(MAX_INSTALLMENTS), amountCents: cents, effect: z.enum(["REDUCE_TERM", "REDUCE_INSTALLMENT"]) }).nullable(),
});
export const comparisonPayloadSchema = z.object({
  version: z.literal(1),
  neededCents: cents,
  // `availableCashCents` was added after the first saves, so older comparisons read as "no savings used".
  flow: z.object({ incomeCents: cents, commitmentsCents: cents, incomeChangePercent: z.number().min(-100).max(100), extraExpenseCents: cents, availableCashCents: cents.default(0) }),
  scenarios: z.array(scenarioInputSchema).min(1).max(MAX_SCENARIOS),
});
export type ComparisonPayload = z.infer<typeof comparisonPayloadSchema>;

/** Stored inputs back to editor strings, so a saved comparison can be reopened and changed. */
export function formFromScenario(input: ScenarioInput): ScenarioForm {
  const money = (value: number) => (value ? (value / 100).toFixed(2).replace(".", ",") : "");
  const percent = (ppm: number | null) => (ppm === null ? "" : (ppm / 10_000).toFixed(4).replace(/0+$/, "").replace(/\.$/, "").replace(".", ","));
  return {
    id: input.id, name: input.name, system: input.system, product: input.product, down: money(input.downPaymentCents), installments: String(input.installments || ""),
    rate: percent(input.monthlyRatePpm), iof: money(input.iofCents), fees: money(input.feesCents), financeCharges: input.financeCharges, insurance: money(input.insuranceMonthlyCents),
    payment: input.monthlyPaymentCents === null ? "" : money(input.monthlyPaymentCents), startOn: input.startOn, firstPaymentOn: input.firstPaymentOn, informedCet: percent(input.informedCetAnnualPpm),
    extraAmount: input.extra ? money(input.extra.amountCents) : "", extraMonth: input.extra ? String(input.extra.month) : "", extraEffect: input.extra?.effect ?? "REDUCE_TERM",
  };
}

/* ---------- the whole editor, from typed text to a comparison ---------- */
/** The budget half of the editor, as typed: what must be resolved and the monthly picture around it. */
export type BudgetForm = { needed: string; income: string; commitments: string; savings: string; change: string; extra: string };
export const emptyBudget = (patch: Partial<BudgetForm> = {}): BudgetForm => ({ needed: "", income: "", commitments: "", savings: "", change: "0", extra: "", ...patch });
/** Cents back to the text a person would type; zero stays empty so the field shows its placeholder. */
export const centsText = (cents: number) => (cents ? moneyInput(cents) : "");

export type Simulation = {
  neededCents: number; flowParams: FlowParams;
  /** Problems in the budget fields, each naming the field. */
  fieldErrors: string[];
  /** Problems typed into the scenarios, each naming the field. */
  scenarioErrors: string[];
  parsed: ReturnType<typeof scenarioFromForm>[];
  results: ReturnType<typeof runScenario>[];
  flows: Record<string, FlowSummary>;
  comparison: ReturnType<typeof compareScenarios>;
};

/** Everything the screen shows is computed here from plain text, so it can be tested without a browser.
 * Nothing is guessed: an unreadable field is reported by name and counts as empty. */
export function simulate(forms: ScenarioForm[], budget: BudgetForm): Simulation {
  const needed = parseCentsField(budget.needed, "Valor a resolver");
  const income = parseCentsField(budget.income, "Renda mensal");
  const commitments = parseCentsField(budget.commitments, "Gastos do mês");
  const extra = parseCentsField(budget.extra, "Gasto extra");
  const savings = parseCentsField(budget.savings, "Dinheiro guardado");
  const change = Number(budget.change.trim().replace(/[−–]/g, "-").replace(",", "."));
  const changeError = budget.change.trim() && !Number.isFinite(change) ? "Mudança de renda: use um número como -20 ou 10." : undefined;
  const flowParams: FlowParams = {
    incomeCents: income.cents, commitmentsCents: commitments.cents, incomeChangePercent: Number.isFinite(change) ? Math.max(-100, Math.min(100, change)) : 0,
    extraExpenseCents: extra.cents, availableCashCents: savings.cents,
  };
  const parsed = forms.map(scenarioFromForm);
  const results = parsed.map((item) => runScenario(item.input, needed.cents));
  const flows = Object.fromEntries(results.map((result) => [result.id, monthlyFlow(result, flowParams)]));
  return {
    neededCents: needed.cents, flowParams,
    fieldErrors: [needed.error, income.error, commitments.error, extra.error, savings.error, changeError].filter((error): error is string => Boolean(error)),
    scenarioErrors: parsed.flatMap((item) => item.errors),
    parsed, results, flows, comparison: compareScenarios(results, flows),
  };
}

/** What is stored when the user chooses to save: the inputs only, never the results. */
export function payloadOf(simulation: Simulation): ComparisonPayload {
  const { flowParams } = simulation;
  return {
    version: 1, neededCents: simulation.neededCents,
    flow: { incomeCents: flowParams.incomeCents, commitmentsCents: flowParams.commitmentsCents, incomeChangePercent: flowParams.incomeChangePercent, extraExpenseCents: flowParams.extraExpenseCents, availableCashCents: flowParams.availableCashCents ?? 0 },
    scenarios: simulation.parsed.map((item) => item.input),
  };
}

/** A saved comparison back into the budget fields, so it can be reopened and changed. */
export function budgetFromPayload(payload: ComparisonPayload): BudgetForm {
  const { flow } = payload;
  return emptyBudget({
    needed: centsText(payload.neededCents), income: centsText(flow.incomeCents), commitments: centsText(flow.commitmentsCents),
    savings: centsText(flow.availableCashCents), change: String(flow.incomeChangePercent).replace(".", ","), extra: centsText(flow.extraExpenseCents),
  });
}
