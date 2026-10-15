import { describe, expect, it } from "vitest";
import { budgetFromPayload, comparisonPayloadSchema, defaultForms, emptyBudget, emptyForm, formFromScenario, parseCentsField, parsePercentPpm, payloadOf, scenarioFromForm, simulate } from "../loan-comparison";
import { runScenario } from "../loan-simulator";

describe("F06 · reading what the user types", () => {
  it("turns percentages into exact ppm without floating point", () => {
    expect(parsePercentPpm("3,99")).toEqual({ ppm: 39_900 });
    expect(parsePercentPpm("3.99")).toEqual({ ppm: 39_900 });
    expect(parsePercentPpm("0,0001")).toEqual({ ppm: 1 });
    expect(parsePercentPpm("12 %")).toEqual({ ppm: 120_000 });
    expect(parsePercentPpm("0")).toEqual({ ppm: 0 });
    expect(parsePercentPpm("1,1")).toEqual({ ppm: 11_000 });
    expect(parsePercentPpm("   ")).toEqual({ ppm: null });
  });
  it("rejects what is not a percentage instead of guessing", () => {
    for (const text of ["abc", "1,23456", "-2", "1,2,3", "1000"]) expect(parsePercentPpm(text).error, text).toBeTruthy();
  });
  it("reads money with the app's own exact parser, and empty as zero", () => {
    expect(parseCentsField("1.234,56", "Entrada")).toEqual({ cents: 123_456 });
    expect(parseCentsField("", "Entrada")).toEqual({ cents: 0 });
    expect(parseCentsField("x", "Entrada").error).toContain("Entrada");
  });
});

describe("F06 · from the editor to a scenario", () => {
  const filled = (patch = {}) => emptyForm("s", "2032-01-10", { name: "Empréstimo", rate: "2,5", installments: "24", down: "1.000,00", iof: "150,00", insurance: "9,90", informedCet: "40,5", ...patch });

  it("parses every field into integers", () => {
    const { input, errors } = scenarioFromForm(filled());
    expect(errors).toEqual([]);
    expect(input).toMatchObject({ name: "Empréstimo", system: "PRICE", installments: 24, monthlyRatePpm: 25_000, downPaymentCents: 100_000, iofCents: 15_000, insuranceMonthlyCents: 990, informedCetAnnualPpm: 405_000, startOn: "2032-01-10", firstPaymentOn: "2032-02-10", extra: null });
  });
  it("an unknown rate stays unknown (null), so the scenario is incomplete rather than wrong", () => {
    const { input } = scenarioFromForm(filled({ rate: "" }));
    expect(input.monthlyRatePpm).toBeNull();
    expect(runScenario(input, 1_000_000).incomplete).toBe(true);
  });
  it("names the field that is wrong", () => {
    const { errors } = scenarioFromForm(filled({ rate: "abc", down: "x", installments: "dez", extraAmount: "100,00", extraMonth: "" }));
    expect(errors.join("|")).toMatch(/Juros ao mês/);
    expect(errors.join("|")).toMatch(/Entrada/);
    expect(errors.join("|")).toMatch(/Parcelas/);
    expect(errors.join("|")).toMatch(/Amortização extra/);
  });
  it("paying in full has no installments to enter", () => {
    const { input, errors } = scenarioFromForm(emptyForm("c", "2032-01-10", { system: "CASH", installments: "" }));
    expect(errors).toEqual([]);
    expect(input.installments).toBe(1);
  });
  it("a form survives a round trip through the stored shape", () => {
    const { input } = scenarioFromForm(filled({ extraAmount: "2.000,00", extraMonth: "6", extraEffect: "REDUCE_INSTALLMENT" }));
    const back = formFromScenario(input);
    expect(back).toMatchObject({ rate: "2,5", down: "1000,00", iof: "150,00", informedCet: "40,5", extraAmount: "2000,00", extraMonth: "6", extraEffect: "REDUCE_INSTALLMENT", installments: "24" });
    expect(scenarioFromForm(back).input).toEqual(input);
  });
  it("ignores what the chosen way of paying does not show, so leftovers never change the numbers", () => {
    const leftovers = { rate: "3,5", installments: "12", down: "1.000,00", iof: "50,00", fees: "20,00", financeCharges: true, insurance: "9,90", payment: "300,00", informedCet: "40", extraAmount: "500,00", extraMonth: "3" };
    // paying in full reads nothing but the name, the product and the date it happens
    const cash = scenarioFromForm(emptyForm("c", "2032-01-10", { ...leftovers, system: "CASH", startOn: "2032-02-01", firstPaymentOn: "2031-01-01" }));
    expect(cash.errors).toEqual([]);
    expect(cash.input).toMatchObject({ system: "CASH", downPaymentCents: 0, installments: 1, monthlyRatePpm: null, iofCents: 0, feesCents: 0, financeCharges: false, insuranceMonthlyCents: 0, monthlyPaymentCents: null, informedCetAnnualPpm: null, extra: null, startOn: "2032-02-01", firstPaymentOn: "2032-02-01" });
    expect(runScenario(cash.input, 100_000)).toMatchObject({ ok: true, incomplete: false, totalPaidCents: 100_000 }); // the leftover entry (R$ 1.000) is not "bigger than the bill"
    // a revolving balance has no entry, installments, charges, CET or extra payment: only rate, payment and insurance
    const revolving = scenarioFromForm(emptyForm("r", "2032-01-10", { ...leftovers, system: "REVOLVING", installments: "" }));
    expect(revolving.errors).toEqual([]);
    expect(revolving.input).toMatchObject({ system: "REVOLVING", downPaymentCents: 0, installments: 1, iofCents: 0, feesCents: 0, financeCharges: false, informedCetAnnualPpm: null, extra: null, monthlyRatePpm: 35_000, insuranceMonthlyCents: 990, monthlyPaymentCents: 30_000 });
    // and a monthly payment left behind does not change an installment loan
    expect(scenarioFromForm(emptyForm("p", "2032-01-10", { ...leftovers, system: "PRICE" })).input.monthlyPaymentCents).toBeNull();
  });
  it("an unreadable value in a field that is not shown is not an error", () => {
    const bad = { rate: "abc", down: "x", installments: "dez", iof: "?", extraAmount: "y", informedCet: "!", payment: "z" };
    expect(scenarioFromForm(emptyForm("c", "2032-01-10", { ...bad, system: "CASH" })).errors).toEqual([]);
    expect(scenarioFromForm(emptyForm("r", "2032-01-10", { ...bad, rate: "3", system: "REVOLVING" })).errors.join("|")).toMatch(/Pagamento mensal/); // shown, so it is checked
  });
  it("starts with two scenarios: pay now, and installments to be filled in", () => {
    const forms = defaultForms("2032-01-10");
    expect(forms.map((form) => form.system)).toEqual(["CASH", "PRICE"]);
    expect(new Set(forms.map((form) => form.id)).size).toBe(2);
  });
});

describe("F06 · what is allowed to be saved", () => {
  const scenario = scenarioFromForm(emptyForm("s", "2032-01-10", { name: "A", rate: "2", installments: "12" })).input;
  const payload = (patch = {}) => ({ version: 1, neededCents: 500_000, flow: { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: -10, extraExpenseCents: 0 }, scenarios: [scenario], ...patch });

  it("accepts a well-formed comparison", () => {
    expect(comparisonPayloadSchema.safeParse(payload()).success).toBe(true);
  });
  it("reads a comparison saved before savings existed as \"no savings used\", and rejects an invalid amount", () => {
    const flow = { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0 };
    const old = comparisonPayloadSchema.parse(payload({ flow }));
    expect(old.flow.availableCashCents).toBe(0);
    expect(comparisonPayloadSchema.parse(payload({ flow: { ...flow, availableCashCents: 120_000 } })).flow.availableCashCents).toBe(120_000);
    for (const availableCashCents of [-1, 1.5, "100"]) expect(comparisonPayloadSchema.safeParse(payload({ flow: { ...flow, availableCashCents } })).success).toBe(false);
  });
  it("limits the number of scenarios, and rejects non-integers, negatives, bad dates and unknown fields' types", () => {
    expect(comparisonPayloadSchema.safeParse(payload({ scenarios: [] })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ scenarios: Array.from({ length: 6 }, (_, i) => ({ ...scenario, id: `s${i}` })) })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ neededCents: 12.5 })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ neededCents: -1 })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ scenarios: [{ ...scenario, startOn: "2032-02-30" }] })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ scenarios: [{ ...scenario, installments: 361 }] })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ scenarios: [{ ...scenario, system: "ROTATIVO" }] })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ flow: { incomeCents: 1, commitmentsCents: 1, incomeChangePercent: -150, extraExpenseCents: 0 } })).success).toBe(false);
    expect(comparisonPayloadSchema.safeParse(payload({ version: 2 })).success).toBe(false);
  });
});

describe("F06 · from typed text to a comparison", () => {
  const budget = (patch = {}) => emptyBudget({ needed: "4.200,00", income: "5.500,00", commitments: "2.000,00", ...patch });
  const forms = () => [
    emptyForm("now", "2032-01-10", { name: "Quitar agora", system: "CASH", product: "CARD_STATEMENT" }),
    emptyForm("x12", "2032-01-10", { name: "Parcelar em 12x", product: "CARD_STATEMENT", rate: "3,99", installments: "12" }),
    emptyForm("loan", "2032-01-10", { name: "Empréstimo", rate: "2,2", installments: "24" }),
  ];

  it("turns what was typed into numbers: the cheapest is paying in full, the roomiest is the longer loan", () => {
    const sim = simulate(forms(), budget());
    expect(sim).toMatchObject({ neededCents: 420_000, fieldErrors: [], scenarioErrors: [] });
    expect(sim.flowParams).toMatchObject({ incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0, availableCashCents: 0 });
    expect(sim.results.map((result) => [result.id, result.ok && !result.incomplete])).toEqual([["now", true], ["x12", true], ["loan", true]]);
    // R$ 4.200 at once leaves the month R$ 700 short; a 24x loan leaves the most room of the three
    expect(sim.flows.now.months[0]).toMatchObject({ month: "2032-01", surplusCents: -70_000 });
    expect(sim.comparison).toMatchObject({ cheapestId: "now", mostViableId: "loan" });
    expect(sim.comparison.notes.join(" ")).toContain("Menor parcela não significa menor custo");
  });
  it("savings that cover the bill make paying in full both the cheapest and the one with most room", () => {
    const sim = simulate(forms(), budget({ savings: "4.200,00" }));
    expect(sim.flows.now.negativeMonths).toBe(0);
    expect(sim.comparison).toMatchObject({ cheapestId: "now", mostViableId: "now" });
  });
  it("a drop in income and an extra expense are applied to every scenario, and -150 stops at -100", () => {
    const shock = simulate(forms(), budget({ change: "−20", extra: "300,00" }));
    expect(shock.flowParams).toMatchObject({ incomeChangePercent: -20, extraExpenseCents: 30_000 });
    expect(shock.flows.x12.months[0].incomeCents).toBe(440_000);
    expect(simulate(forms(), budget({ change: "-150" })).flowParams.incomeChangePercent).toBe(-100);
    expect(simulate(forms(), budget({ change: "10,5" })).flowParams.incomeChangePercent).toBe(10.5);
  });
  it("without an income nothing is said about fitting the budget", () => {
    const sim = simulate(forms(), budget({ income: "" }));
    expect(sim.comparison.mostViableId).toBeNull();
    expect(sim.comparison.cheapestId).toBe("now");
    expect(sim.comparison.notes.join(" ")).toContain("Informe a renda mensal");
  });
  it("names every unreadable field and treats it as empty instead of guessing", () => {
    const sim = simulate([emptyForm("a", "2032-01-10", { rate: "x", installments: "dez" }), ...forms().slice(0, 1)], budget({ needed: "abc", income: "1,2,3", savings: "R$ ?", change: "muito", extra: "-" }));
    expect(sim.fieldErrors.join("|")).toMatch(/Valor a resolver/);
    expect(sim.fieldErrors.join("|")).toMatch(/Renda mensal/);
    expect(sim.fieldErrors.join("|")).toMatch(/Dinheiro guardado/);
    expect(sim.fieldErrors.join("|")).toMatch(/Mudança de renda/);
    expect(sim.fieldErrors.join("|")).toMatch(/Gasto extra/);
    expect(sim.scenarioErrors.join("|")).toMatch(/Juros ao mês/);
    expect(sim.neededCents).toBe(0);
    expect(sim.flowParams).toMatchObject({ incomeCents: 0, incomeChangePercent: 0, availableCashCents: 0 });
  });
  it("blank fields are not errors, and a blank value to resolve simply has no numbers yet", () => {
    const sim = simulate(defaultForms("2032-01-10"), emptyBudget());
    expect(sim.fieldErrors).toEqual([]);
    expect(sim.neededCents).toBe(0);
    expect(sim.results.every((result) => !result.ok)).toBe(true);
  });
  it("what is saved holds only the inputs, validates, and reopens into the very same comparison", () => {
    const sim = simulate(forms(), budget({ savings: "1.000,00", change: "-10,5", extra: "50,00" }));
    const payload = payloadOf(sim);
    expect(comparisonPayloadSchema.safeParse(payload).success).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("schedule");
    expect(payload.flow).toEqual({ incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: -10.5, extraExpenseCents: 5_000, availableCashCents: 100_000 });
    const reopened = simulate(payload.scenarios.map(formFromScenario), budgetFromPayload(payload));
    expect(reopened.results).toEqual(sim.results);
    expect(reopened.flows).toEqual(sim.flows);
    expect(reopened.comparison).toEqual(sim.comparison);
    expect(budgetFromPayload(payload)).toEqual(emptyBudget({ needed: "4200,00", income: "5500,00", commitments: "2000,00", savings: "1000,00", change: "-10,5", extra: "50,00" }));
  });
});
