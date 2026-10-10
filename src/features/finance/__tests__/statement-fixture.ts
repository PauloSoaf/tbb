/** Synthetic statement file with the same shape as a real import: 12 paid (two of them zero),
 * 3 open, 5 known future statements and 7 monthly forecasts, the first one overlapping an open
 * statement. Issuers and values are fictitious on purpose: real financial data never enters the repo. */
export const AS_OF = "2031-03-15";
export const KEYS = {
  betulaCurrent: "test:betula:current_statement:2031-05-06",
  betulaFirstForecast: "test:betula:future_monthly_projection:2031-05",
};
export const PAID_AMOUNTS = [10, 20, 0, 1, 0, 99, 33333, 123456, 7, 500000, 2_147_483_647, 4];
export const FUTURE_AMOUNTS = [11111, 22222, 33333, 44444, 55555];
export const FORECAST_AMOUNTS = [7000, 7000, 7100, 6600, 6600, 6600, 6600];
export const EXPECTED = {
  paidCents: 2_148_140_577,
  openCents: 350_081,
  futureKnownCents: 166_665,
  forecastCents: 47_500,
  pendingCents: 7_000,
  dueDates: ["2031-03-25", "2031-04-05", "2031-05-06"],
};

type Overrides = Record<string, unknown>;
const base = { currency: "BRL", referenceMonth: null, closingDate: null, closingDayOfMonth: null, paymentDate: null, potentialOverlapKey: null, note: null };
const month = (offset: number) => { const date = new Date(Date.UTC(2031, 3 + offset, 1)); return date.toISOString().slice(0, 7); };

export function syntheticStatementFile(asOfDate = AS_OF, keyPrefix = "test") {
  const key = (rest: string) => `${keyPrefix}:${rest}`;
  const paid = PAID_AMOUNTS.map((amountCents, index) => {
    const dueDate = `${month(index - 12)}-05`;
    return { ...base, externalKey: key(`alfa:past_statement:${dueDate}`), cardIssuer: "Alfa Bank", recordType: "PAST_STATEMENT", amountCents, dueDate, paymentStatus: "PAID", isCurrentOutstanding: false, excludeFromCurrentDebtTotal: true, note: "Quitada; data de pagamento não informada." };
  });
  const current = [
    { ...base, externalKey: key("alfa:current_statement:2031-04-05"), cardIssuer: "Alfa Bank", recordType: "CURRENT_STATEMENT", amountCents: 100_001, dueDate: "2031-04-05", closingDate: "2031-03-28", paymentStatus: "OPEN", isCurrentOutstanding: true, excludeFromCurrentDebtTotal: false },
    { ...base, externalKey: key("betula:current_statement:2031-05-06"), cardIssuer: "Bétula", recordType: "CURRENT_STATEMENT", amountCents: 250_050, dueDate: "2031-05-06", closingDayOfMonth: 27, paymentStatus: "OPEN", isCurrentOutstanding: true, excludeFromCurrentDebtTotal: false },
    { ...base, externalKey: key("cometa:current_statement:2031-03-25"), cardIssuer: "Cometa Pay", recordType: "CURRENT_STATEMENT", amountCents: 30, dueDate: "2031-03-25", closingDate: "2031-03-18", paymentStatus: "OPEN", isCurrentOutstanding: true, excludeFromCurrentDebtTotal: false },
  ];
  const future = FUTURE_AMOUNTS.map((amountCents, index) => {
    const dueDate = `${month(index + 1)}-05`;
    return { ...base, externalKey: key(`alfa:future_statement:${dueDate}`), cardIssuer: "Alfa Bank", recordType: "FUTURE_STATEMENT", amountCents, dueDate, paymentStatus: "FUTURE_KNOWN", isCurrentOutstanding: false, excludeFromCurrentDebtTotal: true };
  });
  const forecasts = FORECAST_AMOUNTS.map((amountCents, index) => ({
    ...base, externalKey: key(`betula:future_monthly_projection:${month(index + 1)}`), cardIssuer: "Bétula", recordType: "FUTURE_MONTHLY_PROJECTION", amountCents,
    dueDate: null, referenceMonth: month(index + 1), closingDayOfMonth: 27, paymentStatus: "FORECAST", isCurrentOutstanding: false, excludeFromCurrentDebtTotal: true,
    potentialOverlapKey: index === 0 ? key("betula:current_statement:2031-05-06") : null,
  }));
  const records = [...paid, ...current, ...future, ...forecasts];
  return {
    schemaVersion: "1.0", source: "synthetic-test", asOfDate,
    summary: { recordCount: 27, counts: { PAST_STATEMENT: 12, CURRENT_STATEMENT: 3, FUTURE_STATEMENT: 5, FUTURE_MONTHLY_PROJECTION: 7 }, currentOutstandingCents: EXPECTED.openCents },
    records: records as Overrides[],
  };
}
