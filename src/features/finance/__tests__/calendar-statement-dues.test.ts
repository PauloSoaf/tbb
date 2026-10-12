import { describe, expect, it } from "vitest";
import { calendarDayTotals, calendarMonthTotals, calendarStatementDues, type CalendarStatement, type FinanceCalendarEntry } from "../calendar-core";

const bill = (patch: Partial<CalendarStatement> = {}): CalendarStatement => ({ id: "bill", accountId: "card", kind: "STATEMENT", status: "OPEN", dueDate: "2032-02-29", amountCents: 90000, ...patch });
describe("statement due dates in the calendar", () => {
  it("groups actual known unpaid bills by due date, including multiple cards on one day", () => {
    const rows = [bill(), bill({ id: "future", accountId: "second-card", status: "FUTURE_KNOWN", amountCents: 70000 }), bill({ id: "next-month", dueDate: "2032-03-12" })];
    const dues = calendarStatementDues(rows);
    expect(dues["2032-02-29"].map(item => item.id)).toEqual(["bill", "future"]);
    expect(dues["2032-02-29"].reduce((sum, item) => sum + item.amountCents, 0)).toBe(160000);
    expect(dues["2032-03-12"]).toHaveLength(1);
  });
  it("excludes paid bills, undated/invalid dates and forecasts without inventing a payment date", () => {
    expect(calendarStatementDues([bill({ status: "PAID" }), bill({ status: "FORECAST" }), bill({ kind: "MONTHLY_PROJECTION" }), bill({ dueDate: null }), bill({ dueDate: "2031-02-29" }), bill({ amountCents: 0 })])).toEqual({});
  });
  it("does not repeat the same bill, while preserving distinct bills on the same day", () => {
    const row = bill();
    expect(calendarStatementDues([row, row, bill({ id: "other" })])[row.dueDate!]).toHaveLength(2);
  });
  it("excludes the historical balance already carried into a later statement", () => {
    expect(calendarStatementDues([bill({ rolledIntoStatementId: "next" }), bill({ id: "next", dueDate: "2032-03-12" })])).toEqual({ "2032-03-12": [bill({ id: "next", dueDate: "2032-03-12" })] });
  });
  it("keeps aggregate statement payments out of ledger spending, even with included purchases", () => {
    const purchase: FinanceCalendarEntry = { id: "purchase", day: "2032-02-29", description: "Synthetic card purchase", merchant: null, amountCents: 3500, type: "EXPENSE", source: "MANUAL", accountName: "Card", categoryName: null, isCardPurchase: true, cardStatementId: "bill" };
    const dues = calendarStatementDues([bill()]);
    expect(dues[purchase.day][0].amountCents).toBe(90000);
    expect(calendarMonthTotals(calendarDayTotals([purchase], "2032-02-29"), "2032-02").expenseCents).toBe(3500);
    expect(calendarMonthTotals(calendarDayTotals([], "2032-02-29"), "2032-02").expenseCents).toBe(0);
  });
});
