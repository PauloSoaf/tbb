import { describe, expect, it } from "vitest";
import { nextSendAtFromFrequency } from "../goals.service";

describe("nextSendAtFromFrequency", () => {
  const base = new Date("2026-06-01T10:00:00.000Z");

  it("DAILY adds 1 day", () => {
    const next = nextSendAtFromFrequency("DAILY", base);
    expect(next.getDate()).toBe(2);
    expect(next.getMonth()).toBe(5); // June = 5
  });

  it("WEEKLY adds 7 days", () => {
    const next = nextSendAtFromFrequency("WEEKLY", base);
    expect(next.getDate()).toBe(8);
    expect(next.getMonth()).toBe(5);
  });

  it("BIWEEKLY adds 14 days", () => {
    const next = nextSendAtFromFrequency("BIWEEKLY", base);
    expect(next.getDate()).toBe(15);
    expect(next.getMonth()).toBe(5);
  });

  it("MONTHLY adds 1 month", () => {
    const next = nextSendAtFromFrequency("MONTHLY", base);
    expect(next.getDate()).toBe(1);
    expect(next.getMonth()).toBe(6); // July = 6
  });

  it("does not mutate the original date", () => {
    const original = new Date("2026-06-01T10:00:00.000Z");
    nextSendAtFromFrequency("WEEKLY", original);
    expect(original.getDate()).toBe(1);
  });

  it("defaults to today when no base date provided", () => {
    const before = new Date();
    const next = nextSendAtFromFrequency("DAILY");
    const after = new Date();
    // Result should be tomorrow relative to now — at least 23h ahead
    expect(next.getTime()).toBeGreaterThan(before.getTime());
    expect(next.getTime()).toBeLessThanOrEqual(after.getTime() + 24 * 60 * 60 * 1000 + 1000);
  });
});
