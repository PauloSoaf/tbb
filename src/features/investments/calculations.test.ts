import { describe, expect, it } from "vitest";
import { allocationBreakdown, calculateCostBasis, compoundInterest, fixedIncomeProjection, marketValueCents, normalizeBenchmark, realEstateMetrics, savingsProjection, tradePnl, tradingMetrics } from "./calculations";

describe("investment calculations", () => {
  it("keeps weighted cost basis through multiple buys and a partial sale", () => {
    const state = calculateCostBasis([
      { type: "BUY", quantity: "10", grossAmountCents: 10_000, feesCents: 100, netAmountCents: 10_100 },
      { type: "BUY", quantity: "10", grossAmountCents: 20_000, feesCents: 200, netAmountCents: 20_200 },
      { type: "SELL", quantity: "5", grossAmountCents: 10_000, feesCents: 100, netAmountCents: 9_900 },
    ]);
    expect(state).toEqual({ quantity: "15", bookCostCents: 22_725, averagePriceCents: "1515", realizedPnlCents: 2_325 });
  });

  it("changes quantity, not book cost, on a split", () => {
    const state = calculateCostBasis([{ type: "BUY", quantity: "3", grossAmountCents: 9_000 }, { type: "SPLIT", quantity: "2", grossAmountCents: 0 }]);
    expect(state.quantity).toBe("6");
    expect(state.bookCostCents).toBe(9_000);
    expect(state.averagePriceCents).toBe("1500");
  });

  it("values fractional crypto without losing small quantities", () => {
    expect(marketValueCents("0.00000001", "10000000000")).toBe(100);
    expect(marketValueCents("0.123456789012", "12345.6789")).toBe(1_524);
  });

  it("projects contributions and returns with integer cent rounding", () => {
    const result = compoundInterest({ initialCents: 100_000, monthlyContributionCents: 10_000, annualRateBasisPoints: 1_200, months: 12 });
    expect(result.contributionsCents).toBe(220_000);
    expect(result.finalCents).toBeGreaterThan(result.contributionsCents);
    expect(result.history).toHaveLength(13);
    expect(result.returnsCents).toBe(result.finalCents - result.contributionsCents);
  });

  it("applies fixed-income tax brackets and exemption", () => {
    const taxed = fixedIncomeProjection({ principalCents: 1_000_000, months: 6, indexAnnualBasisPoints: 1_500, indexerPercentageBasisPoints: 10_000 });
    const exempt = fixedIncomeProjection({ principalCents: 1_000_000, months: 6, indexAnnualBasisPoints: 1_500, indexerPercentageBasisPoints: 10_000, taxExempt: true });
    expect(taxed.taxCents).toBeGreaterThan(0);
    expect(exempt.taxCents).toBe(0);
    expect(exempt.netCents).toBe(taxed.grossCents);
    expect(taxed.annualRateBasisPoints).toBe(1_500);
  });

  it("uses the documented savings threshold rule", () => {
    expect(savingsProjection({ principalCents: 100_000, months: 12, selicAnnualBasisPoints: 900 }).rule).toContain("0,5%");
    expect(savingsProjection({ principalCents: 100_000, months: 12, selicAnnualBasisPoints: 800 }).annualRateBasisPoints).toBe(560);
  });

  it("computes allocation drift and benchmark normalization", () => {
    const allocation = allocationBreakdown([{ key: "fixed", valueCents: 60_000, targetBasisPoints: 5_000 }, { key: "stocks", valueCents: 40_000, targetBasisPoints: 5_000 }]);
    expect(allocation[0]).toMatchObject({ currentBasisPoints: 6_000, driftBasisPoints: 1_000 });
    expect(allocation[1]).toMatchObject({ currentBasisPoints: 4_000, driftBasisPoints: -1_000 });
    expect(normalizeBenchmark([{ date: "a", value: 200 }, { date: "b", value: 250 }])).toEqual([{ date: "a", value: 200, normalized: 100 }, { date: "b", value: 250, normalized: 125 }]);
  });

  it("computes property equity, cash flow and yields", () => {
    const result = realEstateMetrics({ purchasePriceCents: 40_000_000, estimatedValueCents: 50_000_000, financingBalanceCents: 20_000_000, monthlyRentCents: 250_000, monthlyCostsCents: 50_000, vacancyBasisPoints: 1_000 });
    expect(result.equityCents).toBe(30_000_000);
    expect(result.monthlyCashFlowCents).toBe(175_000);
    expect(result.grossYieldBasisPoints).toBe(600);
    expect(result.netYieldBasisPoints).toBe(420);
  });

  it("computes long/short P&L, fees and journal metrics", () => {
    const long = { direction: "LONG" as const, entryPriceCents: 1_000, exitPriceCents: 1_200, quantity: "10", feesCents: 100, taxesCents: 0, stopPriceCents: 900, closedAt: "2026-01-01" };
    const short = { direction: "SHORT" as const, entryPriceCents: 2_000, exitPriceCents: 2_200, quantity: "5", feesCents: 0, taxesCents: 0, stopPriceCents: 2_100, closedAt: "2026-01-02" };
    expect(tradePnl(long)).toMatchObject({ grossCents: 2_000, netCents: 1_900, returnBasisPoints: 1_900, rMultiple: 1.9 });
    expect(tradePnl(short).netCents).toBe(-1_000);
    expect(tradingMetrics([long, short])).toMatchObject({ netPnlCents: 900, winRateBasisPoints: 5_000, averageWinCents: 1_900, averageLossCents: -1_000, maxDrawdownCents: 1_000 });
  });
});
