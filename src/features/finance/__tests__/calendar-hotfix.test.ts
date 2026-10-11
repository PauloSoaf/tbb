import { describe, expect, it } from "vitest";
import { calendarMonthDaysOnly, calendarMonthDays, shiftMonth, calendarDayTotals, calendarSelection, type FinanceCalendarMonth } from "../calendar-core";
import { cacheCalendarMonth, cachedCalendarMonth, type CalendarCache } from "../calendar-cache";

describe("finance calendar hotfix regression", () => {
  it("renders only in-month days in the compact strip", () => {
    const days = calendarMonthDaysOnly("2026-10");
    expect(days).toHaveLength(31);
    expect(days[0]).toBe("2026-10-01");
    expect(days.at(-1)).toBe("2026-10-31");
    expect(calendarMonthDays("2026-10")).toContain("2026-09-28");
    expect(days).not.toContain("2026-09-28");
  });
  it("handles February leap years without adjacent days in the compact strip", () => {
    expect(calendarMonthDaysOnly("2028-02")).toHaveLength(29);
    expect(calendarMonthDaysOnly("2027-02")).toHaveLength(28);
  });
  it("handles calendar boundaries", () => {
    expect(shiftMonth("1900-01",1)).toBe("1900-02");
    expect(() => shiftMonth("1900-01",-1)).toThrow();
  });
  it.each(["2026-09-28", "2026-11-01", "2028-02-29", "2027-01-01"])("preserves the selected adjacent/deep-linked day %s", day => {
    expect(calendarSelection(day.slice(0, 7), day, "2026-10-11")).toEqual({ month: day.slice(0, 7), day });
  });
  it("validates URL parameters, mismatched days and nonexistent leap days", () => {
    expect(calendarSelection("invalid", "2026-11-01", "2026-10-11")).toEqual({ month: "2026-10", day: "2026-10-11" });
    expect(calendarSelection("2027-02", "2027-02-29", "2026-10-11").day).toBe("2027-02-01");
    expect(calendarSelection("9998-12", null, "2026-10-11").month).toBe("2026-10");
  });
  it("does not count future expenses as money already spent", () => {
    const entries = [{ id:"future", day:"2026-10-20", description:"Bill", merchant:null, amountCents:15000, type:"EXPENSE" as const, source:"MANUAL",accountName:"Bank",categoryName:null,isCardPurchase:false,cardStatementId:null }];
    const totals=calendarDayTotals(entries,"2026-10-11");
    expect(totals["2026-10-20"].expenseCents).toBe(0);
    expect(totals["2026-10-20"].scheduledExpenseCents).toBe(15000);
  });
});

describe("calendar cache invalidation", () => {
  const snapshot: FinanceCalendarMonth = { month: "2032-01", entries: [] };
  it("reuses a loaded month until a new server snapshot arrives", () => {
    const loaded: FinanceCalendarMonth = { month: "2032-02", entries: [] };
    const cache = cacheCalendarMonth({}, loaded, snapshot);
    expect(cachedCalendarMonth(cache, loaded.month, snapshot)).toBe(loaded);
    // A refresh may reflect an edit, deletion or import in any month, even if January is identical.
    const refreshed: FinanceCalendarMonth = { ...snapshot };
    expect(cachedCalendarMonth(cache, loaded.month, refreshed)).toBeUndefined();
    expect(cachedCalendarMonth(cache, "2032-03", snapshot)).toBeUndefined();
  });
  it("keeps at most twelve months and discards entries from the previous snapshot", () => {
    let cache: CalendarCache = {};
    for (let i = 1; i <= 13; i++) cache = cacheCalendarMonth(cache, { month: shiftMonth("2032-01", i), entries: [] }, snapshot);
    expect(Object.keys(cache)).toHaveLength(12);
    expect(cachedCalendarMonth(cache, "2032-02", snapshot)).toBeUndefined();
    const refreshed = { ...snapshot };
    cache = cacheCalendarMonth(cache, { month: "2032-06", entries: [] }, refreshed);
    expect(Object.keys(cache)).toEqual(["2032-06"]);
  });
});
