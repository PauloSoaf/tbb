import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClinicOverview, getMonthlyAppointments } from "@/services/clinic-report.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { count: vi.fn() },
    appointment: { count: vi.fn() },
    patientGoal: { groupBy: vi.fn() },
    foodDiaryEntry: { count: vi.fn() },
    patientMeasurement: { aggregate: vi.fn() },
    mealPlan: { count: vi.fn() },
  },
}));

const patientCount = vi.mocked(prisma.patient.count);
const appointmentCount = vi.mocked(prisma.appointment.count);
const goalGroupBy = vi.mocked(prisma.patientGoal.groupBy);
const diaryCount = vi.mocked(prisma.foodDiaryEntry.count);
const measurementAggregate = vi.mocked(prisma.patientMeasurement.aggregate);
const mealPlanCount = vi.mocked(prisma.mealPlan.count);

describe("clinic-report.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    patientCount.mockResolvedValue(0);
    appointmentCount.mockResolvedValue(0);
    goalGroupBy.mockResolvedValue([]);
    diaryCount.mockResolvedValue(0);
    measurementAggregate.mockResolvedValue({ _avg: { weight: null, bmi: null, bodyFatPercentage: null } } as never);
    mealPlanCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("getClinicOverview", () => {
    it("returns zero goals for all statuses when no goals exist", async () => {
      goalGroupBy.mockResolvedValue([]);

      const result = await getClinicOverview("nutri-1");

      expect(result.goals).toEqual({ active: 0, achieved: 0, abandoned: 0 });
    });

    it("maps partial goal statuses with zero fallback for missing ones", async () => {
      goalGroupBy.mockResolvedValue([
        { status: "ACTIVE", _count: 5 },
        { status: "ACHIEVED", _count: 3 },
      ] as never);

      const result = await getClinicOverview("nutri-1");

      expect(result.goals.active).toBe(5);
      expect(result.goals.achieved).toBe(3);
      expect(result.goals.abandoned).toBe(0); // missing in groupBy → fallback
    });

    it("maps all three goal statuses", async () => {
      goalGroupBy.mockResolvedValue([
        { status: "ACTIVE", _count: 10 },
        { status: "ACHIEVED", _count: 7 },
        { status: "ABANDONED", _count: 2 },
      ] as never);

      const result = await getClinicOverview("nutri-1");

      expect(result.goals).toEqual({ active: 10, achieved: 7, abandoned: 2 });
    });

    it("returns null avgMeasurements when no measurement data", async () => {
      measurementAggregate.mockResolvedValue({
        _avg: { weight: null, bmi: null, bodyFatPercentage: null },
      } as never);

      const result = await getClinicOverview("nutri-1");

      expect(result.avgMeasurements.weight).toBeNull();
      expect(result.avgMeasurements.bmi).toBeNull();
      expect(result.avgMeasurements.bodyFatPercentage).toBeNull();
    });

    it("rounds measurement averages to 1 decimal", async () => {
      measurementAggregate.mockResolvedValue({
        _avg: { weight: 72.3456, bmi: 23.78901, bodyFatPercentage: 18.555 },
      } as never);

      const result = await getClinicOverview("nutri-1");

      expect(result.avgMeasurements.weight).toBe(72.3);
      expect(result.avgMeasurements.bmi).toBe(23.8);
      expect(result.avgMeasurements.bodyFatPercentage).toBe(18.6);
    });

    it("returns aggregated patient and appointment counts", async () => {
      patientCount.mockResolvedValueOnce(50).mockResolvedValueOnce(35).mockResolvedValueOnce(3);
      appointmentCount.mockResolvedValue(8);
      mealPlanCount.mockResolvedValue(12);

      const result = await getClinicOverview("nutri-1");

      expect(result.totalPatients).toBe(50);
      expect(result.activePatients).toBe(35);
      expect(result.activeMealPlans).toBe(12);
    });
  });

  describe("getMonthlyAppointments", () => {
    beforeEach(() => {
      appointmentCount.mockResolvedValue(0);
    });

    it("returns 6 entries by default", async () => {
      const result = await getMonthlyAppointments("nutri-1");
      expect(result).toHaveLength(6);
    });

    it("returns custom number of months", async () => {
      const result = await getMonthlyAppointments("nutri-1", 3);
      expect(result).toHaveLength(3);
    });

    it("entries are in chronological order (oldest first)", async () => {
      appointmentCount
        .mockResolvedValueOnce(1).mockResolvedValueOnce(0) // Jan total, done
        .mockResolvedValueOnce(2).mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const result = await getMonthlyAppointments("nutri-1", 3);

      // With fake time at 2026-06-15, 3 months back = Apr, May, Jun
      expect(result[0].total).toBe(1); // oldest
      expect(result[1].total).toBe(2);
      expect(result[2].total).toBe(3); // current month
    });

    it("includes both total and done counts per month", async () => {
      appointmentCount
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(4); // done

      const result = await getMonthlyAppointments("nutri-1", 1);

      expect(result[0]).toMatchObject({ total: 5, done: 4 });
      expect(result[0].month).toBeTruthy(); // PT-BR month abbreviation
    });
  });
});
