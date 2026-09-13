import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiaryStats, deleteFoodDiaryEntry } from "@/services/food-diary.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    foodDiaryEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const entryFindMany = vi.mocked(prisma.foodDiaryEntry.findMany);
const entryFindFirst = vi.mocked(prisma.foodDiaryEntry.findFirst);
const entryDelete = vi.mocked(prisma.foodDiaryEntry.delete);

describe("food-diary.service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getDiaryStats", () => {
    const from = new Date("2026-06-17T00:00:00Z");
    const to = new Date("2026-06-24T00:00:00Z"); // 7 days

    it("returns zeros for empty entry list", async () => {
      entryFindMany.mockResolvedValue([]);

      const result = await getDiaryStats("p1", "nutri-1", from, to);

      expect(result).toEqual({
        totalEntries: 0,
        avgCaloriesPerDay: 0,
        avgProteinPerDay: 0,
        avgCarbsPerDay: 0,
        avgFatPerDay: 0,
      });
    });

    it("calculates daily averages over the date range", async () => {
      entryFindMany.mockResolvedValue([
        { calories: 700, protein: 35, carbs: 90, fat: 20 },
        { calories: 700, protein: 35, carbs: 90, fat: 20 },
      ] as never);

      // 7 days: 1400 kcal total / 7 = 200 avg
      const result = await getDiaryStats("p1", "nutri-1", from, to);

      expect(result.totalEntries).toBe(2);
      expect(result.avgCaloriesPerDay).toBe(200);
      expect(result.avgProteinPerDay).toBe(10);
      expect(result.avgCarbsPerDay).toBe(Number((180 / 7).toFixed(1)));
      expect(result.avgFatPerDay).toBe(Number((40 / 7).toFixed(1)));
    });

    it("treats null macro values as zero", async () => {
      entryFindMany.mockResolvedValue([
        { calories: null, protein: null, carbs: null, fat: null },
        { calories: 300, protein: 15, carbs: 40, fat: 10 },
      ] as never);

      const result = await getDiaryStats("p1", "nutri-1", from, to);

      expect(result.avgCaloriesPerDay).toBe(Math.round(300 / 7));
      expect(result.avgProteinPerDay).toBe(Number((15 / 7).toFixed(1)));
    });

    it("uses 1 as days denominator for same-day range to avoid division by zero", async () => {
      const sameDay = new Date("2026-06-24T00:00:00Z");
      entryFindMany.mockResolvedValue([
        { calories: 500, protein: 25, carbs: 60, fat: 15 },
      ] as never);

      const result = await getDiaryStats("p1", "nutri-1", sameDay, sameDay);

      expect(result.avgCaloriesPerDay).toBe(500);
    });

    it("queries with correct patientId and nutritionistId for tenant isolation", async () => {
      entryFindMany.mockResolvedValue([]);

      await getDiaryStats("patient-99", "nutri-42", from, to);

      expect(entryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: "patient-99",
            nutritionistId: "nutri-42",
          }),
        }),
      );
    });

    it("passes date range to the query", async () => {
      entryFindMany.mockResolvedValue([]);

      await getDiaryStats("p1", "nutri-1", from, to);

      const call = entryFindMany.mock.calls[0]![0]!;
      expect((call.where as Record<string, unknown>).loggedAt).toEqual({ gte: from, lte: to });
    });
  });

  describe("deleteFoodDiaryEntry", () => {
    it("throws when entry not found (prevents cross-tenant deletion)", async () => {
      entryFindFirst.mockResolvedValue(null);

      await expect(
        deleteFoodDiaryEntry("patient-1", "nutri-1", "entry-999"),
      ).rejects.toThrow("Entrada não encontrada.");
    });

    it("deletes the entry when found and ownership matches", async () => {
      entryFindFirst.mockResolvedValue({ id: "entry-1" } as never);
      entryDelete.mockResolvedValue({ id: "entry-1" } as never);

      await deleteFoodDiaryEntry("patient-1", "nutri-1", "entry-1");

      expect(entryDelete).toHaveBeenCalledWith({ where: { id: "entry-1" } });
    });

    it("verifies ownership with both patientId and nutritionistId", async () => {
      entryFindFirst.mockResolvedValue({ id: "entry-1" } as never);
      entryDelete.mockResolvedValue({ id: "entry-1" } as never);

      await deleteFoodDiaryEntry("patient-42", "nutri-99", "entry-1");

      expect(entryFindFirst).toHaveBeenCalledWith({
        where: { id: "entry-1", patientId: "patient-42", nutritionistId: "nutri-99" },
      });
    });
  });
});
