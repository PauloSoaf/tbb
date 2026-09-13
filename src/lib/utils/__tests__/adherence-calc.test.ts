import { describe, it, expect } from "vitest";
import { computeDayAdherencePct, computeAdherenceAggregates } from "../adherence-calc";

describe("computeDayAdherencePct", () => {
  it("returns 0 when planned calories is 0", () => {
    expect(computeDayAdherencePct(1500, 0)).toBe(0);
  });

  it("returns 0 when planned calories is negative", () => {
    expect(computeDayAdherencePct(100, -100)).toBe(0);
  });

  it("returns 100 for exact match", () => {
    expect(computeDayAdherencePct(2000, 2000)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(computeDayAdherencePct(1500, 2000)).toBe(75);
    expect(computeDayAdherencePct(1000, 3000)).toBe(33);
  });

  it("caps at 150% when logged exceeds 1.5× planned", () => {
    expect(computeDayAdherencePct(4000, 2000)).toBe(150);
    expect(computeDayAdherencePct(9999, 100)).toBe(150);
  });

  it("returns exactly 150 at exactly 1.5× planned", () => {
    expect(computeDayAdherencePct(3000, 2000)).toBe(150);
  });

  it("returns 0 when no calories logged", () => {
    expect(computeDayAdherencePct(0, 2000)).toBe(0);
  });
});

describe("computeAdherenceAggregates", () => {
  const makeDay = (loggedEntries: number, loggedCalories: number, adherencePct: number) => ({
    loggedEntries,
    loggedCalories,
    adherencePct,
  });

  it("counts daysLogged as days with at least one entry", () => {
    const breakdown = [
      makeDay(2, 1800, 90),
      makeDay(0, 0, 0),
      makeDay(1, 2100, 105),
    ];
    const result = computeAdherenceAggregates(breakdown, 3, 2000);
    expect(result.daysLogged).toBe(2);
  });

  it("averages loggedCalories only over days with entries", () => {
    const breakdown = [
      makeDay(1, 2000, 100),
      makeDay(0, 0, 0),
      makeDay(1, 1000, 50),
    ];
    const result = computeAdherenceAggregates(breakdown, 3, 2000);
    expect(result.loggedAvgCalories).toBe(1500);
  });

  it("computes avgAdherencePct over ALL days (not just logged)", () => {
    const breakdown = [
      makeDay(1, 2000, 100),
      makeDay(0, 0, 0),
      makeDay(1, 1000, 50),
    ];
    const result = computeAdherenceAggregates(breakdown, 3, 2000);
    expect(result.avgAdherencePct).toBe(50);
  });

  it("returns zeros when no days logged", () => {
    const breakdown = [makeDay(0, 0, 0), makeDay(0, 0, 0)];
    const result = computeAdherenceAggregates(breakdown, 2, 2000);
    expect(result.daysLogged).toBe(0);
    expect(result.loggedAvgCalories).toBe(0);
    expect(result.avgAdherencePct).toBe(0);
  });

  it("returns zeros when plannedCalories is 0", () => {
    const breakdown = [makeDay(3, 2000, 0)];
    const result = computeAdherenceAggregates(breakdown, 1, 0);
    expect(result.avgAdherencePct).toBe(0);
  });
});
