import { describe, expect, it } from "vitest";
import { calendarDayTotals, calendarMonthDays, calendarMonthTotals, isMonthKey, shiftMonth, type FinanceCalendarEntry } from "../calendar-core";
const row = (patch: Partial<FinanceCalendarEntry>): FinanceCalendarEntry => ({
  id: "1", day: "2026-10-11", description: "Compra", merchant: null,
  amountCents: 1000, type: "EXPENSE", source: "MANUAL", accountName: "Conta",
  categoryName: null, isCardPurchase: false, cardStatementId: null, ...patch,
});

describe("finance calendar", () => {
  it("allows valid months and rejects invalid months", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("abc")).toBe(false);
  });
  it("navigates seamlessly across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -13)).toBe("2025-12");
  });
  it("renders complete Monday-to-Sunday grids with padding days", () => {
    const days = calendarMonthDays("2026-10");
    expect(days[0]).toBe("2026-09-28");
    expect(days.at(-1)).toBe("2026-11-01");
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(35);
  });
  it("handles February leap years", () => {
    expect(calendarMonthDays("2028-02")).toContain("2028-02-29");
    expect(calendarMonthDays("2027-02")).not.toContain("2027-02-29");
  });
  it("distinguishes expenses, income, refunds and transfers without double counting", () => {
    const entries = [
      row({id:"expense",amountCents:1200,cardStatementId:"fatura"}),
      row({id:"income",type:"INCOME",amountCents:4300}),
      row({id:"refund",type:"REFUND",amountCents:300}),
      row({id:"transfer",type:"TRANSFER",amountCents:8000}),
      row({id:"other",type:"ADJUSTMENT",amountCents:500}),
      row({id:"other-month",day:"2026-11-01",amountCents:250}),
    ];
    const totals = calendarDayTotals(entries);
    expect(totals["2026-10-11"]).toEqual({expenseCents:1200,incomeCents:4600,scheduledExpenseCents:0,scheduledIncomeCents:0,count:5});
    expect(calendarMonthTotals(totals,"2026-10")).toEqual({expenseCents:1200,incomeCents:4600,scheduledExpenseCents:0,scheduledIncomeCents:0});
  });
  it("separates scheduled amounts and excludes unconfirmed legacy income", () => {
    const totals=calendarDayTotals([row({}),row({id:"future",day:"2026-10-15",amountCents:2400}),row({id:"future-income",day:"2026-10-15",type:"INCOME",amountCents:6000}),row({id:"legacy",type:"INCOME",source:"QUICK_INCOME",amountCents:9000})],"2026-10-11");
    expect(calendarMonthTotals(totals,"2026-10")).toEqual({expenseCents:1000,incomeCents:0,scheduledExpenseCents:2400,scheduledIncomeCents:6000});
    expect(totals["2026-10-11"].count).toBe(1);
  });
  it("keeps complete grids at the supported lower boundary and long months",()=>{
    expect(calendarMonthDays("1900-01")).toHaveLength(35);
    expect(calendarMonthDays("2026-08")).toHaveLength(42);
    expect(()=>shiftMonth("1900-01",-1)).toThrow();
  });
});
