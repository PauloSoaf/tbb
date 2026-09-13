import { describe, it, expect } from "vitest";
import { calculateAge } from "@/lib/utils/calculateAge";

describe("calculateAge", () => {
  it("returns 0 for newborn (today)", () => {
    const today = new Date();
    expect(calculateAge(today)).toBe(0);
  });

  it("calculates correct age for 30 years ago", () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 30);
    expect(calculateAge(date)).toBe(30);
  });

  it("accepts a string ISO date", () => {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 25);
    const y = yearAgo.getFullYear();
    const m = String(yearAgo.getMonth() + 1).padStart(2, "0");
    const d = String(yearAgo.getDate()).padStart(2, "0");
    expect(calculateAge(`${y}-${m}-${d}`)).toBe(25);
  });

  it("returns age correctly just before birthday (not yet had birthday)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const past = new Date(tomorrow);
    past.setFullYear(past.getFullYear() - 10);
    // Born 10 years ago tomorrow → should be 9
    expect(calculateAge(past)).toBe(9);
  });
});
