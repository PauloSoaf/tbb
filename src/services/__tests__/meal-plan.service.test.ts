import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMealPlansByPatient,
  getRecentMealPlanSummary,
  replaceMealPlanFromTemplate,
} from "@/services/meal-plan.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mealPlanFindMany = vi.mocked(prisma.mealPlan.findMany);
const mealPlanFindFirst = vi.mocked(prisma.mealPlan.findFirst);
const transaction = vi.mocked(prisma.$transaction);

describe("meal-plan.service", () => {
  beforeEach(() => {
    mealPlanFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getMealPlansByPatient", () => {
    it("queries all plans for the patient ordered by createdAt desc", async () => {
      await getMealPlansByPatient("nutri-1", "patient-1");

      expect(mealPlanFindMany).toHaveBeenCalledWith({
        where: { nutritionistId: "nutri-1", patientId: "patient-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns whatever the db returns", async () => {
      const fakePlan = [{ id: "mp-1", title: "Plano A" }];
      mealPlanFindMany.mockResolvedValue(fakePlan as never);

      const result = await getMealPlansByPatient("nutri-1", "patient-1");
      expect(result).toEqual(fakePlan);
    });
  });

  describe("getRecentMealPlanSummary", () => {
    it("queries with isTemplate: false and take: 4 by default", async () => {
      await getRecentMealPlanSummary("nutri-1", "patient-1");

      expect(mealPlanFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nutritionistId: "nutri-1", patientId: "patient-1", isTemplate: false },
          take: 4,
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("respects custom limit", async () => {
      await getRecentMealPlanSummary("nutri-1", "patient-1", 2);

      expect(mealPlanFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
    });

    it("selects only summary fields without meals or items", async () => {
      await getRecentMealPlanSummary("nutri-1", "patient-1");

      const call = mealPlanFindMany.mock.calls[0]![0]!;
      expect(call.select).toEqual({
        id: true,
        title: true,
        status: true,
        totalCalories: true,
        startDate: true,
        createdAt: true,
      });
    });

    it("excludes templates from results", async () => {
      await getRecentMealPlanSummary("nutri-1", "patient-1");

      const call = mealPlanFindMany.mock.calls[0]![0]!;
      expect((call.where as Record<string, unknown>).isTemplate).toBe(false);
    });

    it("enforces tenant isolation via nutritionistId", async () => {
      await getRecentMealPlanSummary("nutri-99", "patient-1");

      const call = mealPlanFindMany.mock.calls[0]![0]!;
      expect((call.where as Record<string, unknown>).nutritionistId).toBe("nutri-99");
    });

    it("returns empty array when no plans exist", async () => {
      mealPlanFindMany.mockResolvedValue([]);

      const result = await getRecentMealPlanSummary("nutri-1", "patient-1");
      expect(result).toEqual([]);
    });
  });

  describe("replaceMealPlanFromTemplate", () => {
    it("replaces meals and builds editor content with persisted ids in one transaction", async () => {
      mealPlanFindFirst.mockResolvedValue({
        id: "target-plan",
        patientId: null,
      } as never);

      const update = vi.fn().mockResolvedValue({});
      const findUnique = vi.fn().mockResolvedValue({
        id: "target-plan",
        title: "Hipertrofia",
        objective: "Ganho de massa",
        description: "Modelo",
        notes: null,
        totalCalories: 700,
        totalCarbs: 80,
        totalProtein: 45,
        totalFat: 20,
        targetCalories: 700,
        meals: [
          {
            id: "saved-meal",
            name: "Almoco",
            time: "12:00",
            notes: null,
            imageUrl: null,
            position: 0,
            items: [
              {
                id: "saved-item",
                foodName: "Frango",
                source: "CUSTOM",
                tacoFoodId: null,
                quantity: 150,
                unit: "g",
                householdMeasure: null,
                calories: 240,
                protein: 45,
                carbs: 0,
                fat: 5,
                fiber: null,
                sodium: null,
                notes: null,
                position: 0,
              },
            ],
          },
        ],
      });
      transaction.mockImplementation(async (callback) => callback({
        mealPlan: { update, findUnique },
      } as never));

      const result = await replaceMealPlanFromTemplate(
        "nutritionist-1",
        "target-plan",
        {
          title: "Hipertrofia",
          objective: "Ganho de massa",
          description: "Modelo",
          totalCalories: 700,
          totalCarbs: 80,
          totalProtein: 45,
          totalFat: 20,
          targetCalories: 700,
          contentBlocks: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Orientacao" }] },
              { type: "meal", attrs: { id: "source-meal", name: "Antiga", items: [] } },
            ],
          },
          meals: [
            {
              name: "Almoco",
              time: "12:00",
              position: 0,
              items: [
                {
                  foodName: "Frango",
                  source: "CUSTOM",
                  quantity: 150,
                  unit: "g",
                  calories: 240,
                  protein: 45,
                  carbs: 0,
                  fat: 5,
                  position: 0,
                },
              ],
            },
          ],
        },
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: "target-plan" },
          data: expect.objectContaining({
            meals: {
              deleteMany: { nutritionistId: "nutritionist-1" },
              create: [expect.objectContaining({
                name: "Almoco",
                items: { create: [expect.objectContaining({ foodName: "Frango" })] },
              })],
            },
          }),
        }),
      );
      expect(update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: "target-plan" },
          data: {
            contentBlocks: expect.objectContaining({ type: "doc" }),
          },
        }),
      );
      expect(result.plan.meals[0]).toEqual(
        expect.objectContaining({
          id: "saved-meal",
          items: [expect.objectContaining({ id: "saved-item" })],
        }),
      );
      const serializedContent = JSON.stringify(result.plan.contentBlocks);
      expect(serializedContent).not.toContain("source-meal");
      expect(serializedContent).toContain("saved-meal");
    });
  });
});
