import { describe, expect, it } from "vitest";
import { calculateCreditCardLimitBreakdown, cardLimitInput, creditRisk, type CreditLimitInput } from "../credit-limit";
import { summarizeCardStatements, type StatementRow } from "../card-statements";

const input = (patch: Partial<CreditLimitInput> = {}): CreditLimitInput => ({ limitCents: 10000, openCents: 3000, futureCents: 2000, unreconciledCents: 1000, forecastCents: 9000, pendingCents: 8000, incomplete: false, referenceDate: "2031-12-31", source: "STATEMENTS", ...patch });
const bill = (patch: Partial<StatementRow> = {}): StatementRow => ({ id: "bill", accountId: "card", accountName: "Synthetic card", kind: "STATEMENT", status: "OPEN", amountCents: 3000, dueDate: "2032-01-05", closingDate: "2031-12-28", closingDay: null, referenceMonth: "2032-01", paidAt: null, reconciliation: "NOT_REQUIRED", overlapsStatementId: null, notes: null, ...patch });

describe("credit limit breakdown", () => {
  it("uses open and known future commitments plus uncovered purchases, excluding forecasts", () => {
    expect(calculateCreditCardLimitBreakdown(input())).toMatchObject({ committedCents: 6000, availableCents: 4000, futureCents: 3000, excessCents: 0, segments: { available: 4000, open: 3000, future: 3000 } });
  });
  it.each([null, 0, -1])("handles unavailable limit %s without dividing by zero", limitCents => {
    expect(calculateCreditCardLimitBreakdown(input({ limitCents }))).toMatchObject({ hasLimit: false, availableCents: null, segments: null, committedBasisPoints: null, risk: "none" });
  });
  it("caps the segments while reporting excess separately", () => {
    const result = calculateCreditCardLimitBreakdown(input({ openCents: 18000, futureCents: 7000 }));
    expect(result.excessCents).toBe(16000);
    expect(result.availableCents).toBe(0);
    expect(Object.values(result.segments!).reduce((a,b) => a+b,0)).toBe(10000);
    expect(result.risk).toBe("critical");
  });
  it("keeps integer nonnegative segments with awkward fractions and empty commitments", () => {
    for (const limitCents of [1, 3, 9999]) for (const openCents of [0, 1, 10001]) for (const futureCents of [0, 7, 7777]) {
      const result = calculateCreditCardLimitBreakdown(input({ limitCents, openCents, futureCents, unreconciledCents: 0 }));
      const segments = Object.values(result.segments!);
      expect(segments.every(value => Number.isInteger(value) && value >= 0)).toBe(true);
      expect(segments.reduce((a,b) => a+b,0)).toBe(10000);
    }
    expect(calculateCreditCardLimitBreakdown(input({openCents:-5,futureCents:-1,unreconciledCents:-3})).committedCents).toBe(0);
  });
  it.each([[69,"info"],[70,"attention"],[89,"attention"],[90,"high"],[99,"high"],[100,"critical"]] as const)("classifies %s%% at the exact band boundary", (percentage,risk) => {
    expect(creditRisk(percentage * 100,10000)).toBe(risk);
  });
});

describe("card commitment inputs", () => {
  it("uses only purchases from the uncovered period, net of refunds, across the year", () => {
    const statements = [bill(), bill({id:"paid",status:"PAID",amountCents:50000,dueDate:"2031-12-05",closingDate:"2031-11-28"})];
    const result = cardLimitInput({limitCents:10000,today:"2031-12-31",statements,totals:summarizeCardStatements(statements,"2031-12-31").byAccount.card,ledger:{balanceCents:0,futureNetCents:0,unlinked:[{date:"2031-12-27",type:"EXPENSE",amountCents:8000},{date:"2031-12-28",type:"EXPENSE",amountCents:700},{date:"2032-01-01",type:"REFUND",amountCents:200}]}});
    expect(result).toMatchObject({openCents:3000,futureCents:0,unreconciledCents:500,source:"STATEMENTS",incomplete:false});
  });
  it("does not let ledger payments release the commitment of an open bill", () => {
    const statements=[bill()];
    const totals=summarizeCardStatements(statements,"2031-12-31").byAccount.card;
    for(const balanceCents of [-3000,0,3000]) expect(cardLimitInput({limitCents:10000,today:"2031-12-31",statements,totals,ledger:{balanceCents,futureNetCents:0,unlinked:[]}}).openCents).toBe(3000);
  });
  it("splits future ledger installments and refunds when there are no statements", () => {
    expect(cardLimitInput({limitCents:null,today:"2031-12-31",statements:[],totals:undefined,ledger:{balanceCents:-9000,futureNetCents:5500,unlinked:[]}})).toMatchObject({openCents:3500,futureCents:5500,source:"LEDGER"});
    expect(cardLimitInput({limitCents:null,today:"2031-12-31",statements:[],totals:undefined,ledger:{balanceCents:100,futureNetCents:5500,unlinked:[]}})).toMatchObject({openCents:0,futureCents:0});
  });
  it("flags stale known bills and missing coverage while excluding pending forecasts", () => {
    const statements=[bill({status:"FUTURE_KNOWN",dueDate:"2031-12-05"}),bill({id:"forecast",kind:"MONTHLY_PROJECTION",status:"FORECAST",amountCents:700,dueDate:null,closingDate:null,reconciliation:"PENDING"})];
    expect(cardLimitInput({limitCents:10000,today:"2031-12-31",statements,totals:summarizeCardStatements(statements,"2031-12-31").byAccount.card,ledger:{balanceCents:-99999,futureNetCents:0,unlinked:[]}})).toMatchObject({openCents:0,futureCents:3000,pendingCents:700,incomplete:true});
    const forecast=statements.slice(1);
    expect(cardLimitInput({limitCents:null,today:"2031-12-31",statements:forecast,totals:summarizeCardStatements(forecast,"2031-12-31").byAccount.card,ledger:{balanceCents:-700,futureNetCents:0,unlinked:[{date:"2031-12-31",type:"EXPENSE",amountCents:700}]}}).incomplete).toBe(true);
  });
});
