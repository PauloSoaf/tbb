import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBirthdaysThisWeek,
  getPatientsWithoutRecentCheckin,
} from "@/services/dashboard.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    wellnessCheckin: {
      groupBy: vi.fn(),
    },
  },
}));

const patientFindMany = vi.mocked(prisma.patient.findMany);
const patientCount = vi.mocked(prisma.patient.count);
const wellnessGroupBy = vi.mocked(prisma.wellnessCheckin.groupBy);

describe("dashboard.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00-04:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("getBirthdaysThisWeek", () => {
    it("returns active patients with birthdays in the current week sorted by days until birthday", async () => {
      patientFindMany.mockResolvedValue([
        { id: "p1", name: "Hoje", birthDate: new Date(1990, 5, 24) },
        { id: "p2", name: "Amanha", birthDate: new Date(1988, 5, 25) },
        { id: "p3", name: "Fora", birthDate: new Date(1992, 5, 29) },
        { id: "p4", name: "Nulo", birthDate: null },
      ] as never);

      const result = await getBirthdaysThisWeek("nutri-1");

      expect(patientFindMany).toHaveBeenCalledWith({
        where: { nutritionistId: "nutri-1", status: "ACTIVE", birthDate: { not: null } },
        select: { id: true, name: true, birthDate: true },
      });
      expect(result).toEqual([
        { id: "p1", name: "Hoje", birthDate: new Date(1990, 5, 24), daysUntil: 0 },
        { id: "p2", name: "Amanha", birthDate: new Date(1988, 5, 25), daysUntil: 1 },
      ]);
    });
  });

  describe("getPatientsWithoutRecentCheckin", () => {
    it("subtracts patients with recent wellness check-ins from active patients", async () => {
      patientCount.mockResolvedValue(8);
      wellnessGroupBy.mockResolvedValue([
        { patientId: "p1" },
        { patientId: "p2" },
        { patientId: "p3" },
      ] as never);

      const result = await getPatientsWithoutRecentCheckin("nutri-1");

      expect(patientCount).toHaveBeenCalledWith({
        where: { nutritionistId: "nutri-1", status: "ACTIVE" },
      });
      expect(wellnessGroupBy).toHaveBeenCalledWith({
        by: ["patientId"],
        where: {
          nutritionistId: "nutri-1",
          date: { gte: new Date("2026-06-17T00:00:00.000Z") },
        },
      });
      expect(result).toBe(5);
    });
  });
});
