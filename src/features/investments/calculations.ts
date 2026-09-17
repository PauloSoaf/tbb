const QUANTITY_SCALE = BigInt(1_000_000_000_000);

function divideRounded(numerator: bigint, denominator: bigint) {
  if (denominator === BigInt(0)) throw new Error("Divisão por zero.");
  const sign = numerator < BigInt(0) !== denominator < BigInt(0) ? BigInt(-1) : BigInt(1);
  const positiveNumerator = numerator < BigInt(0) ? -numerator : numerator;
  const positiveDenominator = denominator < BigInt(0) ? -denominator : denominator;
  return sign * ((positiveNumerator + positiveDenominator / BigInt(2)) / positiveDenominator);
}

export function parseQuantity(value: string) {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,12}))?$/.exec(normalized);
  if (!match) throw new Error("Quantidade inválida. Use até 12 casas decimais.");
  return BigInt(match[1]) * QUANTITY_SCALE + BigInt((match[2] || "").padEnd(12, "0"));
}

export function formatQuantity(value: bigint) {
  const whole = value / QUANTITY_SCALE;
  const fraction = String(value % QUANTITY_SCALE).padStart(12, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export type CostBasisEvent = {
  type: "BUY" | "SELL" | "SPLIT" | "TRANSFER" | "DEPOSIT" | "WITHDRAWAL" | "FEE" | "TAX" | "DIVIDEND" | "INTEREST" | "OTHER";
  quantity?: string | null;
  grossAmountCents: number;
  feesCents?: number;
  taxesCents?: number;
  netAmountCents?: number;
};

export type CostBasisState = {
  quantity: string;
  bookCostCents: number;
  averagePriceCents: string;
  realizedPnlCents: number;
};

export function calculateCostBasis(events: CostBasisEvent[]): CostBasisState {
  let quantity = BigInt(0);
  let bookCost = BigInt(0);
  let realizedPnl = BigInt(0);

  for (const event of events) {
    if (event.type === "BUY") {
      const bought = parseQuantity(event.quantity || "0");
      if (bought <= BigInt(0)) throw new Error("Compra precisa de quantidade positiva.");
      quantity += bought;
      bookCost += BigInt(event.netAmountCents ?? event.grossAmountCents + (event.feesCents || 0) + (event.taxesCents || 0));
    } else if (event.type === "SELL") {
      const sold = parseQuantity(event.quantity || "0");
      if (sold <= BigInt(0) || sold > quantity) throw new Error("Venda excede a posição disponível.");
      const removedCost = divideRounded(bookCost * sold, quantity);
      const proceeds = BigInt(event.netAmountCents ?? event.grossAmountCents - (event.feesCents || 0) - (event.taxesCents || 0));
      realizedPnl += proceeds - removedCost;
      bookCost -= removedCost;
      quantity -= sold;
    } else if (event.type === "SPLIT") {
      const ratio = parseQuantity(event.quantity || "0");
      if (ratio <= BigInt(0)) throw new Error("Fator de desdobramento inválido.");
      quantity = divideRounded(quantity * ratio, QUANTITY_SCALE);
    }
  }

  const averageScaled = quantity ? divideRounded(bookCost * QUANTITY_SCALE * QUANTITY_SCALE, quantity) : BigInt(0);
  return {
    quantity: formatQuantity(quantity),
    bookCostCents: Number(bookCost),
    averagePriceCents: formatQuantity(averageScaled),
    realizedPnlCents: Number(realizedPnl),
  };
}

export function marketValueCents(quantity: string, unitPriceCents: string) {
  const units = parseQuantity(quantity);
  const price = parseQuantity(unitPriceCents);
  return Number(divideRounded(units * price, QUANTITY_SCALE * QUANTITY_SCALE));
}

export function allocationBreakdown(items: { key: string; valueCents: number; targetBasisPoints?: number }[]) {
  const totalCents = items.reduce((sum, item) => sum + item.valueCents, 0);
  return items.map((item) => {
    const currentBasisPoints = totalCents ? Math.round(item.valueCents / totalCents * 10_000) : 0;
    const targetBasisPoints = item.targetBasisPoints || 0;
    return { ...item, currentBasisPoints, driftBasisPoints: currentBasisPoints - targetBasisPoints };
  });
}

export function normalizeBenchmark(points: { date: string; value: number }[]) {
  const first = points.find((point) => point.value > 0)?.value;
  if (!first) return points.map((point) => ({ ...point, normalized: 0 }));
  return points.map((point) => ({ ...point, normalized: Math.round(point.value / first * 10_000) / 100 }));
}

export function compoundInterest(input: { initialCents: number; monthlyContributionCents: number; annualRateBasisPoints: number; months: number }) {
  const monthlyDenominator = BigInt(120_000);
  let balance = BigInt(input.initialCents);
  let contributions = BigInt(input.initialCents);
  const history = [{ month: 0, balanceCents: Number(balance), contributionsCents: Number(contributions), returnsCents: 0 }];
  for (let month = 1; month <= input.months; month += 1) {
    balance += divideRounded(balance * BigInt(input.annualRateBasisPoints), monthlyDenominator) + BigInt(input.monthlyContributionCents);
    contributions += BigInt(input.monthlyContributionCents);
    history.push({ month, balanceCents: Number(balance), contributionsCents: Number(contributions), returnsCents: Number(balance - contributions) });
  }
  return { finalCents: Number(balance), contributionsCents: Number(contributions), returnsCents: Number(balance - contributions), history };
}

export function fixedIncomeProjection(input: { principalCents: number; months: number; indexAnnualBasisPoints: number; indexerPercentageBasisPoints?: number; spreadBasisPoints?: number; fixedRateBasisPoints?: number; taxExempt?: boolean }) {
  const annualRateBasisPoints = input.fixedRateBasisPoints !== undefined
    ? input.fixedRateBasisPoints
    : Number(divideRounded(BigInt(input.indexAnnualBasisPoints) * BigInt(input.indexerPercentageBasisPoints ?? 10_000), BigInt(10_000))) + (input.spreadBasisPoints || 0);
  const projected = compoundInterest({ initialCents: input.principalCents, monthlyContributionCents: 0, annualRateBasisPoints, months: input.months });
  const grossCents = projected.finalCents;
  const profitCents = Math.max(0, grossCents - input.principalCents);
  const taxBasisPoints = input.taxExempt ? 0 : input.months <= 6 ? 2250 : input.months <= 12 ? 2000 : input.months <= 24 ? 1750 : 1500;
  const taxCents = Number(divideRounded(BigInt(profitCents) * BigInt(taxBasisPoints), BigInt(10_000)));
  return { annualRateBasisPoints, grossCents, taxCents, netCents: grossCents - taxCents, netReturnBasisPoints: input.principalCents ? Number(divideRounded(BigInt(grossCents - taxCents - input.principalCents) * BigInt(10_000), BigInt(input.principalCents))) : 0 };
}

export function savingsProjection(input: { principalCents: number; months: number; selicAnnualBasisPoints: number; trAnnualBasisPoints?: number }) {
  const annualRate = (input.selicAnnualBasisPoints > 850 ? 600 : Math.round(input.selicAnnualBasisPoints * .7)) + (input.trAnnualBasisPoints || 0);
  return { ...fixedIncomeProjection({ principalCents: input.principalCents, months: input.months, fixedRateBasisPoints: annualRate, indexAnnualBasisPoints: 0, taxExempt: true }), rule: input.selicAnnualBasisPoints > 850 ? "0,5% ao mês + TR (aproximação anual)" : "70% da Selic + TR" };
}

export function realEstateMetrics(input: { purchasePriceCents: number; estimatedValueCents: number; financingBalanceCents: number; monthlyRentCents: number; monthlyCostsCents: number; vacancyBasisPoints?: number }) {
  const occupancy = 1 - (input.vacancyBasisPoints || 0) / 10_000;
  const effectiveRent = Math.round(input.monthlyRentCents * occupancy);
  const monthlyCashFlowCents = effectiveRent - input.monthlyCostsCents;
  const equityCents = input.estimatedValueCents - input.financingBalanceCents;
  const grossYieldBasisPoints = input.estimatedValueCents ? Math.round(input.monthlyRentCents * 12 / input.estimatedValueCents * 10_000) : 0;
  const netYieldBasisPoints = input.estimatedValueCents ? Math.round(monthlyCashFlowCents * 12 / input.estimatedValueCents * 10_000) : 0;
  return { equityCents, monthlyCashFlowCents, grossYieldBasisPoints, netYieldBasisPoints, unrealizedAppreciationCents: input.estimatedValueCents - input.purchasePriceCents };
}

export type ClosedTrade = { direction: "LONG" | "SHORT"; entryPriceCents: number; exitPriceCents: number; quantity: string | number; feesCents: number; taxesCents: number; stopPriceCents?: number | null; closedAt: string };

export function tradePnl(trade: ClosedTrade) {
  const direction = trade.direction === "LONG" ? 1 : -1;
  const quantity = parseQuantity(String(trade.quantity));
  const grossCents = Number(divideRounded(BigInt((trade.exitPriceCents - trade.entryPriceCents) * direction) * quantity, QUANTITY_SCALE));
  const netCents = grossCents - trade.feesCents - trade.taxesCents;
  const riskCents = trade.stopPriceCents ? Number(divideRounded(BigInt(Math.abs(trade.entryPriceCents - trade.stopPriceCents)) * quantity, QUANTITY_SCALE)) : 0;
  const capitalCents = Number(divideRounded(BigInt(trade.entryPriceCents) * quantity, QUANTITY_SCALE));
  return { grossCents, netCents, returnBasisPoints: capitalCents ? Number(divideRounded(BigInt(netCents) * BigInt(10_000), BigInt(capitalCents))) : 0, rMultiple: riskCents ? netCents / riskCents : null };
}

export function tradingMetrics(trades: ClosedTrade[]) {
  const results = trades.map(tradePnl);
  const wins = results.filter((result) => result.netCents > 0);
  const losses = results.filter((result) => result.netCents < 0);
  const grossProfit = wins.reduce((sum, result) => sum + result.netCents, 0);
  const grossLoss = Math.abs(losses.reduce((sum, result) => sum + result.netCents, 0));
  let equity = 0;
  let peak = 0;
  let maxDrawdownCents = 0;
  for (const result of results) {
    equity += result.netCents;
    peak = Math.max(peak, equity);
    maxDrawdownCents = Math.max(maxDrawdownCents, peak - equity);
  }
  return {
    netPnlCents: results.reduce((sum, result) => sum + result.netCents, 0),
    winRateBasisPoints: results.length ? Math.round(wins.length / results.length * 10_000) : 0,
    averageWinCents: wins.length ? Math.round(grossProfit / wins.length) : 0,
    averageLossCents: losses.length ? -Math.round(grossLoss / losses.length) : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? null : 0,
    expectancyCents: results.length ? Math.round(results.reduce((sum, result) => sum + result.netCents, 0) / results.length) : 0,
    maxDrawdownCents,
    averageR: results.filter((result) => result.rMultiple !== null).length ? results.reduce((sum, result) => sum + (result.rMultiple || 0), 0) / results.filter((result) => result.rMultiple !== null).length : null,
  };
}
