import { describe, expect, it } from "vitest";
import { addMonthsKey, annualRateOf, compareScenarios, monthlyFlow, pricePayment, runScenario, validateScenario, type FlowSummary, type ScenarioInput } from "../loan-simulator";

const base = (patch: Partial<ScenarioInput> = {}): ScenarioInput => ({
  id: "a", name: "Cenário A", system: "PRICE", product: "LOAN", downPaymentCents: 0, installments: 12, monthlyRatePpm: 20_000,
  iofCents: 0, feesCents: 0, financeCharges: false, insuranceMonthlyCents: 0, monthlyPaymentCents: null,
  startOn: "2032-01-10", firstPaymentOn: "2032-02-10", informedCetAnnualPpm: null, extra: null, ...patch,
});
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const run = (patch: Partial<ScenarioInput> = {}, principal = 1_000_000) => runScenario(base(patch), principal);

describe("F06 · Price (constant installment)", () => {
  it("matches the textbook value: R$ 10.000 at 2% a.m. in 12 installments is R$ 945,60", () => {
    // PMT = PV·i / (1 − (1+i)^−n) = 10 000 · 0,02 / (1 − 1,02^−12) = 945,5959… → 945,60
    expect(pricePayment(1_000_000, 0.02, 12)).toBe(94_560);
    const result = run();
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[0]).toMatchObject({ n: 1, date: "2032-02-10", interestCents: 20_000, paymentCents: 94_560, amortizationCents: 74_560 });
    expect(result.schedule.slice(0, 11).every((row) => row.paymentCents === 94_560)).toBe(true);
    expect(result.schedule.at(-1)?.balanceCents).toBe(0);
  });

  it("repays the financed amount to the cent: the last installment absorbs the rounding", () => {
    const result = run();
    expect(sum(result.schedule.map((row) => row.amortizationCents))).toBe(1_000_000);
    expect(result.totalPaidCents).toBe(sum(result.schedule.map((row) => row.paymentCents)));
    expect(Math.abs(result.interestCents - (12 * 94_560 - 1_000_000))).toBeLessThanOrEqual(12);
  });

  it("with 0% interest the installments only split the principal (no hidden cost)", () => {
    const result = run({ monthlyRatePpm: 0, installments: 7 }, 100_000);
    expect(result.schedule.map((row) => row.paymentCents)).toEqual([14_286, 14_286, 14_286, 14_286, 14_286, 14_286, 14_284]);
    expect(result).toMatchObject({ interestCents: 0, totalPaidCents: 100_000, costCents: 0, effectiveAnnual: 0 });
  });

  it("a single installment is the amount plus one month of interest", () => {
    const result = run({ installments: 1 }, 100_000);
    expect(result.schedule).toHaveLength(1);
    expect(result.schedule[0].paymentCents).toBe(102_000);
  });

  it("supports the full 360 months and very high rates", () => {
    const long = run({ installments: 360, monthlyRatePpm: 8_000 }, 25_000_000);
    expect(long.schedule).toHaveLength(360);
    expect(sum(long.schedule.map((row) => row.amortizationCents))).toBe(25_000_000);
    const steep = run({ installments: 24, monthlyRatePpm: 250_000 }, 100_000);
    expect(sum(steep.schedule.map((row) => row.amortizationCents))).toBe(100_000);
    expect(steep.interestCents).toBeGreaterThan(100_000);
  });
});

describe("F06 · SAC (constant amortization)", () => {
  it("R$ 12.000 at 1% a.m. in 12 months: amortization 1.000, installments 1.120 down to 1.010, interest 780", () => {
    const result = run({ system: "SAC", monthlyRatePpm: 10_000 }, 1_200_000);
    expect(result.schedule.every((row) => row.amortizationCents === 100_000)).toBe(true);
    expect(result.schedule[0].paymentCents).toBe(112_000);
    expect(result.schedule.at(-1)?.paymentCents).toBe(101_000);
    expect(result.interestCents).toBe(78_000);
    expect(result.totalPaidCents).toBe(1_278_000);
    const payments = result.schedule.map((row) => row.paymentCents);
    expect(payments.every((value, index) => index === 0 || value < payments[index - 1])).toBe(true);
  });

  it("when the principal does not divide evenly the last installment takes the difference", () => {
    const result = run({ system: "SAC", installments: 3, monthlyRatePpm: 0 }, 100_000);
    expect(result.schedule.map((row) => row.amortizationCents)).toEqual([33_333, 33_333, 33_334]);
  });
});

describe("F06 · invariants over many inputs", () => {
  it("the principal always comes back exactly, the balance ends at zero and interest is never negative", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const principal = ((seed * 7_919) % 90_000_000) + 1_000;
      const system = seed % 2 ? "PRICE" : "SAC";
      const n = (seed % 60) + 1;
      const down = seed % 3 === 0 ? Math.floor(principal / 5) : 0;
      const charges = seed % 4 === 0 ? 12_345 : 0;
      const result = run({ system, installments: n, monthlyRatePpm: (seed * 331) % 150_000, downPaymentCents: down, iofCents: charges, financeCharges: seed % 8 === 0, insuranceMonthlyCents: seed % 5 === 0 ? 1_990 : 0 }, principal);
      expect(result.ok).toBe(true);
      expect(sum(result.schedule.map((row) => row.amortizationCents))).toBe(result.financedCents);
      expect(result.schedule.at(-1)?.balanceCents).toBe(0);
      expect(result.schedule.length).toBeLessThanOrEqual(n);
      expect(result.schedule.every((row) => row.interestCents >= 0 && row.paymentCents > 0)).toBe(true);
      expect([result.totalPaidCents, result.interestCents, result.chargesCents, result.costCents, result.peakPaymentCents].every(Number.isInteger)).toBe(true);
      expect(result.totalPaidCents).toBe(result.upfrontCents + sum(result.schedule.map((row) => row.paymentCents)));
    }
  });

  it("calculates five scenarios of 360 installments in well under a second", () => {
    const started = Date.now();
    for (let i = 0; i < 5; i++) run({ installments: 360, monthlyRatePpm: 12_000 + i * 1_000, system: i % 2 ? "SAC" : "PRICE" }, 30_000_000);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe("F06 · down payment and charges", () => {
  it("finances only what the down payment leaves, and counts everything the user pays", () => {
    const result = run({ downPaymentCents: 200_000, installments: 6, monthlyRatePpm: 0 });
    expect(result).toMatchObject({ financedCents: 800_000, upfrontCents: 200_000, totalPaidCents: 1_000_000, costCents: 0 });
  });
  it("IOF and fees paid at the start are out of pocket; financed charges grow the balance instead", () => {
    const upfront = run({ iofCents: 30_000, feesCents: 5_000, monthlyRatePpm: 0, installments: 10 });
    expect(upfront).toMatchObject({ financedCents: 1_000_000, upfrontCents: 35_000, totalPaidCents: 1_035_000, costCents: 35_000, chargesCents: 35_000 });
    const financed = run({ iofCents: 30_000, feesCents: 5_000, monthlyRatePpm: 0, installments: 10, financeCharges: true });
    expect(financed).toMatchObject({ financedCents: 1_035_000, upfrontCents: 0, totalPaidCents: 1_035_000, chargesCents: 35_000 });
  });
  it("insurance is paid every month and counted as a charge", () => {
    const result = run({ monthlyRatePpm: 0, installments: 4, insuranceMonthlyCents: 2_000 }, 100_000);
    expect(result.schedule.every((row) => row.insuranceCents === 2_000)).toBe(true);
    expect(result).toMatchObject({ chargesCents: 8_000, totalPaidCents: 108_000, costCents: 8_000 });
  });
});

describe("F06 · early extra payment", () => {
  const withExtra = (effect: "REDUCE_TERM" | "REDUCE_INSTALLMENT") => run({ installments: 24, extra: { month: 6, amountCents: 300_000, effect } });
  const plain = run({ installments: 24 });

  it("reducing the term ends earlier and costs less interest, and still repays the principal exactly", () => {
    const result = withExtra("REDUCE_TERM");
    expect(result.months).toBeLessThan(24);
    expect(result.interestCents).toBeLessThan(plain.interestCents);
    expect(sum(result.schedule.map((row) => row.amortizationCents))).toBe(1_000_000);
    expect(result.schedule[5].extraCents).toBe(300_000);
  });
  it("reducing the installment keeps the term and lowers the payments after the extra month", () => {
    const result = withExtra("REDUCE_INSTALLMENT");
    expect(result.months).toBe(24);
    expect(result.schedule[6].paymentCents).toBeLessThan(result.schedule[4].paymentCents);
    expect(result.interestCents).toBeLessThan(plain.interestCents);
    expect(sum(result.schedule.map((row) => row.amortizationCents))).toBe(1_000_000);
  });
  it("an extra payment larger than the balance only pays what is owed", () => {
    const result = run({ installments: 12, extra: { month: 3, amountCents: 99_000_000, effect: "REDUCE_TERM" } });
    expect(sum(result.schedule.map((row) => row.amortizationCents))).toBe(1_000_000);
    expect(result.months).toBe(3);
  });
  it("is rejected outside the term", () => {
    expect(run({ extra: { month: 12, amountCents: 1_000, effect: "REDUCE_TERM" } }).ok).toBe(false);
    expect(run({ extra: { month: 0, amountCents: 1_000, effect: "REDUCE_TERM" } }).ok).toBe(false);
  });
});

describe("F06 · CET estimated from the dated cash flows", () => {
  it("without charges it is close to the compounded nominal rate: (1,02)^12 − 1 ≈ 26,8% a.a.", () => {
    const annual = run().effectiveAnnual!;
    expect(annual).toBeGreaterThan(0.265);
    expect(annual).toBeLessThan(0.272);
  });
  it("charges push the estimate above the plain rate, and the monthly figure follows the annual one", () => {
    const plain = run().effectiveAnnual!;
    const loaded = run({ iofCents: 40_000, feesCents: 15_000, insuranceMonthlyCents: 1_500 });
    expect(loaded.effectiveAnnual!).toBeGreaterThan(plain + 0.05);
    expect(loaded.effectiveMonthly!).toBeCloseTo(Math.pow(1 + loaded.effectiveAnnual!, 1 / 12) - 1, 12);
  });
  it("keeps the creditor's CET apart and warns only when the two really differ", () => {
    const close = run({ informedCetAnnualPpm: Math.round(run().effectiveAnnual! * 1_000_000) });
    expect(close.cetDiverges).toBe(false);
    expect(close.informedCetAnnual).toBeCloseTo(close.effectiveAnnual!, 6);
    const far = run({ informedCetAnnualPpm: 450_000 });
    expect(far.cetDiverges).toBe(true);
    expect(far.flags.join(" ")).toContain("CET informado");
    expect(run().informedCetAnnual).toBeNull();
  });
  it("solves a plain loan exactly: borrow 1.000 and repay 1.100 a year later is 10% a.a.", () => {
    expect(annualRateOf([{ date: "2032-01-01", cents: 100_000 }, { date: "2032-12-31", cents: -110_000 }])).toBeCloseTo(0.1, 3);
    expect(annualRateOf([{ date: "2032-01-01", cents: 100_000 }])).toBeNull();
    expect(annualRateOf([{ date: "2032-01-01", cents: 100_000 }, { date: "2032-06-01", cents: -100_000 }])).toBe(0);
  });
});

describe("F06 · dates", () => {
  it("anchors every due date on the first one, clamping short months without drifting", () => {
    expect(addMonthsKey("2032-01-31", 1)).toBe("2032-02-29"); // leap year
    expect(addMonthsKey("2033-01-31", 1)).toBe("2033-02-28");
    expect(addMonthsKey("2032-01-31", 2)).toBe("2032-03-31");
    expect(addMonthsKey("2032-11-15", 3)).toBe("2033-02-15");
    const dates = run({ firstPaymentOn: "2032-01-31", startOn: "2032-01-10", installments: 4, monthlyRatePpm: 0 }).schedule.map((row) => row.date);
    expect(dates).toEqual(["2032-01-31", "2032-02-29", "2032-03-31", "2032-04-30"]);
  });
});

describe("F06 · paying in full and incomplete data", () => {
  it("paying now costs exactly the amount, with no schedule", () => {
    expect(run({ system: "CASH" })).toMatchObject({ ok: true, incomplete: false, totalPaidCents: 1_000_000, costCents: 0, months: 1, financedCents: 0, schedule: [] });
  });
  it("a missing rate is incomplete: nothing is invented, no numbers are produced", () => {
    const result = run({ monthlyRatePpm: null });
    expect(result).toMatchObject({ ok: true, incomplete: true, schedule: [], totalPaidCents: 0, effectiveAnnual: null });
    expect(result.issues[0]).toContain("taxa mensal");
  });
  it("rejects what cannot be computed", () => {
    for (const patch of [{ installments: 0 }, { installments: 361 }, { installments: 1.5 }, { downPaymentCents: 2_000_000 }, { iofCents: -1 }, { monthlyRatePpm: 1_000_001 }, { monthlyRatePpm: -5 }, { startOn: "2032-02-30" }, { firstPaymentOn: "2031-12-01" }] as Partial<ScenarioInput>[]) {
      const result = run(patch);
      expect(result.ok, JSON.stringify(patch)).toBe(false);
      expect(result.schedule).toEqual([]);
    }
    expect(validateScenario(base(), 0)).toContain("Informe o valor a resolver, maior que zero.");
  });
});

describe("F06 · revolving credit, informational only", () => {
  const revolving = (patch: Partial<ScenarioInput> = {}) => run({ system: "REVOLVING", product: "CARD_STATEMENT", monthlyRatePpm: 120_000, monthlyPaymentCents: 80_000, ...patch }, 500_000);
  it("needs the monthly payment to compute anything", () => {
    expect(revolving({ monthlyPaymentCents: null })).toMatchObject({ incomplete: true, schedule: [] });
  });
  it("pays off when the payment beats the interest, with a shorter last payment", () => {
    const result = revolving();
    expect(result.schedule.at(-1)?.balanceCents).toBe(0);
    expect(result.schedule.at(-1)!.paymentCents).toBeLessThanOrEqual(80_000);
    expect(result.flags.join(" ")).not.toContain("não é quitado");
  });
  it("warns when the payment does not even cover the interest, and stops at the cap", () => {
    const result = revolving({ monthlyPaymentCents: 50_000 });
    expect(result.flags.join(" ")).toContain("não cobre os juros");
    expect(result.flags.join(" ")).toContain("não é quitado em 120 meses");
    expect(result.schedule).toHaveLength(120);
  });
  it("flags the 100% cap on a card bill, but not on a plain loan with the same numbers", () => {
    const card = revolving({ monthlyPaymentCents: 62_000 });
    expect(card.interestCents + card.chargesCents).toBeGreaterThanOrEqual(500_000);
    expect(card.flags.join(" ")).toContain("100%");
    expect(revolving({ product: "LOAN", monthlyPaymentCents: 62_000 }).flags.join(" ")).not.toContain("100%");
  });
});

describe("F06 · monthly cash flow under a shock", () => {
  const params = { incomeCents: 500_000, commitmentsCents: 300_000, incomeChangePercent: 0, extraExpenseCents: 0 };
  const loan = run({ installments: 6, monthlyRatePpm: 0 }, 600_000); // 100.000 a month

  it("leaves what is left each month after the commitments and the payment", () => {
    const flow = monthlyFlow(loan, params);
    expect(flow.months).toHaveLength(6);
    expect(flow.months[0]).toMatchObject({ month: "2032-02", paymentCents: 100_000, surplusCents: 100_000 });
    expect(flow).toMatchObject({ negativeMonths: 0, lowestSurplusCents: 100_000 });
    expect(flow.peakShareOfIncome).toBeCloseTo(0.2, 6);
  });
  it("a drop in income and an extra expense turn months negative, as warnings", () => {
    const flow = monthlyFlow(loan, { ...params, incomeChangePercent: -30, extraExpenseCents: 20_000 });
    expect(flow.months[0].surplusCents).toBe(350_000 - 300_000 - 20_000 - 100_000);
    expect(flow.negativeMonths).toBe(6);
    expect(flow.lowestSurplusCents).toBe(-70_000);
  });
  it("an income of zero never divides by zero, and is reported as unknown", () => {
    const flow = monthlyFlow(loan, { ...params, incomeCents: 0 });
    expect(flow.peakShareOfIncome).toBeNull();
    expect(flow.incomeCents).toBe(0);
  });
  it("paying in full is felt in the start month: the whole bill, never shown as free", () => {
    const flow = monthlyFlow(run({ system: "CASH" }, 600_000), params);
    expect(flow.months).toEqual([{ month: "2032-01", paymentCents: 600_000, upfrontCents: 600_000, incomeCents: 500_000, commitmentsCents: 300_000, surplusCents: -400_000 }]);
    expect(flow).toMatchObject({ negativeMonths: 1, lowestSurplusCents: -400_000, incomeCents: 500_000 });
    expect(flow.peakShareOfIncome).toBeCloseTo(1.2, 6);
  });
  it("savings cover what is paid up front before the month's income has to", () => {
    const cash = run({ system: "CASH" }, 600_000);
    expect(monthlyFlow(cash, { ...params, availableCashCents: 250_000 }).months[0]).toMatchObject({ paymentCents: 350_000, upfrontCents: 350_000, surplusCents: -150_000 });
    for (const savings of [600_000, 9_000_000]) {
      const covered = monthlyFlow(cash, { ...params, availableCashCents: savings });
      expect(covered.months).toEqual([{ month: "2032-01", paymentCents: 0, upfrontCents: 0, incomeCents: 500_000, commitmentsCents: 300_000, surplusCents: 200_000 }]);
      expect(covered).toMatchObject({ negativeMonths: 0, lowestSurplusCents: 200_000, peakShareOfIncome: 0 });
    }
    expect(monthlyFlow(cash, { ...params, availableCashCents: -50_000 }).months[0].paymentCents).toBe(600_000); // never a negative reserve
  });
  it("a down payment and charges that are not financed land in the start month, installments after it", () => {
    const flow = monthlyFlow(run({ installments: 4, monthlyRatePpm: 0, downPaymentCents: 200_000, iofCents: 10_000, feesCents: 5_000 }, 600_000), params);
    expect(flow.months.map((month) => [month.month, month.upfrontCents, month.paymentCents])).toEqual([
      ["2032-01", 215_000, 215_000], ["2032-02", 0, 100_000], ["2032-03", 0, 100_000], ["2032-04", 0, 100_000], ["2032-05", 0, 100_000],
    ]);
    // charges that are financed are not paid up front
    const financed = monthlyFlow(run({ installments: 4, monthlyRatePpm: 0, iofCents: 10_000, feesCents: 5_000, financeCharges: true }, 600_000), params);
    expect(financed.months.map((month) => month.month)).toEqual(["2032-02", "2032-03", "2032-04", "2032-05"]);
  });
  it("when the first installment falls in the start month, both are added together", () => {
    const flow = monthlyFlow(run({ installments: 2, monthlyRatePpm: 0, downPaymentCents: 100_000, firstPaymentOn: "2032-01-25" }, 500_000), params);
    expect(flow.months[0]).toMatchObject({ month: "2032-01", upfrontCents: 100_000, paymentCents: 300_000 });
  });
  it("an incomplete or invalid scenario has no flow to show", () => {
    expect(monthlyFlow(run({ monthlyRatePpm: null }), params).months).toEqual([]);
    expect(monthlyFlow(run({ downPaymentCents: 9_999_999 }), params).months).toEqual([]);
  });
  it("groups two installments that fall in the same month, extra payment included", () => {
    const extra = run({ installments: 6, monthlyRatePpm: 0, extra: { month: 2, amountCents: 50_000, effect: "REDUCE_TERM" } }, 600_000);
    expect(monthlyFlow(extra, params).months.find((month) => month.month === "2032-03")?.paymentCents).toBe(150_000);
  });
});

describe("F06 · comparing scenarios", () => {
  const flow = (negativeMonths: number, lowestSurplusCents: number | null = null, incomeCents = 500_000): FlowSummary => ({ incomeCents, months: [], negativeMonths, lowestSurplusCents, peakShareOfIncome: null });
  const cheap = run({ id: "cheap", name: "Empréstimo curto", installments: 6, monthlyRatePpm: 25_000 });
  const gentle = run({ id: "gentle", name: "Parcelamento longo", installments: 48, monthlyRatePpm: 25_000 });

  it("tells apart the cheapest overall from the one that weighs least on the monthly budget", () => {
    const result = compareScenarios([cheap, gentle], { cheap: flow(2), gentle: flow(0) });
    expect(result.cheapestId).toBe("cheap");
    expect(result.mostViableId).toBe("gentle");
    expect(result.notes.join(" ")).toContain("Menor parcela não significa menor custo");
  });
  it("when the cheapest also fits the budget, it is both", () => {
    const result = compareScenarios([cheap, gentle], { cheap: flow(0), gentle: flow(0) });
    expect(result.cheapestId).toBe("cheap");
    expect(result.mostViableId).toBe("gentle"); // lowest payment among those that fit
    const fits = compareScenarios([gentle, cheap], { cheap: flow(0), gentle: flow(1) });
    expect(fits.mostViableId).toBe("cheap");
  });
  it("says when nothing fits the monthly flow", () => {
    expect(compareScenarios([cheap, gentle], { cheap: flow(3), gentle: flow(3) }).notes.join(" ")).toContain("Nenhum cenário cabe");
  });
  it("among those that fit, the one with the most room in its worst month wins, not the smallest installment", () => {
    // `cheap` has the bigger installment but no money up front; `gentle` pays less per month but needs a big entry.
    const result = compareScenarios([cheap, gentle], { cheap: flow(0, 150_000), gentle: flow(0, 40_000) });
    expect(gentle.peakPaymentCents).toBeLessThan(cheap.peakPaymentCents);
    expect(result.mostViableId).toBe("cheap");
    expect(compareScenarios([cheap, gentle], { cheap: flow(0, 40_000), gentle: flow(0, 150_000) }).mostViableId).toBe("gentle");
    expect(compareScenarios([cheap, gentle], { cheap: flow(1, 900_000), gentle: flow(0, 10_000) }).mostViableId).toBe("gentle"); // a negative month always loses
  });
  it("without a known income nothing is said about fitting the budget, only about cost", () => {
    const result = compareScenarios([cheap, gentle], { cheap: flow(0, null, 0), gentle: flow(0, null, 0) });
    expect(result).toMatchObject({ cheapestId: "cheap", mostViableId: null });
    expect(result.notes.join(" ")).toContain("Informe a renda mensal");
    expect(compareScenarios([cheap, gentle], {}).mostViableId).toBeNull();
  });
  it("paying in full is judged by the budget too: free of interest, but not necessarily affordable", () => {
    const now = run({ id: "now", name: "Quitar agora", system: "CASH" });
    const flows = { now: monthlyFlow(now, { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0 }), cheap: monthlyFlow(cheap, { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0 }) };
    expect(flows.now.negativeMonths).toBe(1);
    const result = compareScenarios([now, cheap], flows);
    expect(result).toMatchObject({ cheapestId: "now", mostViableId: "cheap" });
    // with savings that cover it, paying in full is both the cheapest and the one with most room
    const covered = monthlyFlow(now, { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0, availableCashCents: 1_000_000 });
    expect(compareScenarios([now, cheap], { ...flows, now: covered })).toMatchObject({ cheapestId: "now", mostViableId: "now" });
  });
  it("makes no recommendation with fewer than two complete scenarios, and names what is missing", () => {
    const incomplete = run({ id: "x", name: "Sem taxa", monthlyRatePpm: null });
    const result = compareScenarios([cheap, incomplete], { cheap: flow(0) });
    expect(result).toMatchObject({ cheapestId: null, mostViableId: null });
    expect(result.notes.join(" ")).toContain("Sem taxa");
    expect(compareScenarios([], {}).cheapestId).toBeNull();
  });
  it("includes paying in full as a real option", () => {
    const now = run({ id: "now", name: "Quitar agora", system: "CASH" });
    expect(compareScenarios([now, cheap], { now: flow(1), cheap: flow(0) }).cheapestId).toBe("now");
  });
  it("ranks by cost, not by installment size", () => {
    const longCheapPayment = run({ id: "long", name: "Longo", installments: 60, monthlyRatePpm: 30_000 });
    const shortBigPayment = run({ id: "short", name: "Curto", installments: 6, monthlyRatePpm: 30_000 });
    expect(longCheapPayment.peakPaymentCents).toBeLessThan(shortBigPayment.peakPaymentCents);
    expect(longCheapPayment.costCents).toBeGreaterThan(shortBigPayment.costCents);
    expect(compareScenarios([longCheapPayment, shortBigPayment], { long: flow(0), short: flow(0) }).cheapestId).toBe("short");
  });
});
