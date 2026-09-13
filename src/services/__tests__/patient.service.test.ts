import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listPatients, getWellnessPanelData } from "@/services/patient.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    wellnessCheckin: {
      findMany: vi.fn(),
    },
    patientTag: {
      findMany: vi.fn(),
    },
  },
}));

const patientFindMany = vi.mocked(prisma.patient.findMany);
const wellnessFindMany = vi.mocked(prisma.wellnessCheckin.findMany);

describe("patient.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00Z"));
    patientFindMany.mockResolvedValue([]);
    wellnessFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("listPatients", () => {
    it("queries with only nutritionistId when no filters provided", async () => {
      await listPatients("nutri-1");

      expect(patientFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nutritionistId: "nutri-1" },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("adds search OR filter when search is provided", async () => {
      await listPatients("nutri-1", "maria");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        nutritionistId: "nutri-1",
        OR: [
          { name: { contains: "maria", mode: "insensitive" } },
          { phone: { contains: "maria" } },
          { email: { contains: "maria", mode: "insensitive" } },
        ],
      });
    });

    it("ignores whitespace-only search", async () => {
      await listPatients("nutri-1", "   ");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).not.toHaveProperty("OR");
    });

    it("filters by ACTIVE status", async () => {
      await listPatients("nutri-1", undefined, "ACTIVE");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({ status: "ACTIVE" });
    });

    it("filters by INACTIVE status", async () => {
      await listPatients("nutri-1", undefined, "INACTIVE");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({ status: "INACTIVE" });
    });

    it("ignores unknown status values", async () => {
      await listPatients("nutri-1", undefined, "INVALID_STATUS");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).not.toHaveProperty("status");
    });

    it("filters WITH_CHECKIN using wellnessCheckins.some", async () => {
      await listPatients("nutri-1", undefined, undefined, "WITH_CHECKIN");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        wellnessCheckins: { some: { date: { gte: expect.any(Date) } } },
      });
    });

    it("filters WITHOUT_CHECKIN using wellnessCheckins.none", async () => {
      await listPatients("nutri-1", undefined, undefined, "WITHOUT_CHECKIN");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        wellnessCheckins: { none: { date: { gte: expect.any(Date) } } },
      });
    });

    it("engagement checkin date is 7 days ago", async () => {
      await listPatients("nutri-1", undefined, undefined, "WITH_CHECKIN");

      const call = patientFindMany.mock.calls[0]![0]!;
      const since = (call.where as Record<string, unknown> & { wellnessCheckins: { some: { date: { gte: Date } } } })
        .wellnessCheckins.some.date.gte as Date;
      const expectedDate = new Date("2026-06-17T00:00:00.000Z");
      expect(since.getTime()).toBe(expectedDate.getTime());
    });

    it("filters WITH_PLAN using mealPlans.some active non-template", async () => {
      await listPatients("nutri-1", undefined, undefined, "WITH_PLAN");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        mealPlans: { some: { status: "ACTIVE", isTemplate: false } },
      });
    });

    it("filters by tag label", async () => {
      await listPatients("nutri-1", undefined, undefined, undefined, undefined, "vegano");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        patientTags: { some: { label: "vegano", nutritionistId: "nutri-1" } },
      });
    });

    it("ignores whitespace-only tag", async () => {
      await listPatients("nutri-1", undefined, undefined, undefined, undefined, "  ");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).not.toHaveProperty("patientTags");
    });

    it("sorts by name ascending when sort=name", async () => {
      await listPatients("nutri-1", undefined, undefined, undefined, "name");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.orderBy).toEqual({ name: "asc" });
    });

    it("sorts by createdAt ascending when sort=oldest", async () => {
      await listPatients("nutri-1", undefined, undefined, undefined, "oldest");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.orderBy).toEqual({ createdAt: "asc" });
    });

    it("defaults to createdAt desc", async () => {
      await listPatients("nutri-1", undefined, undefined, undefined, "unknown");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.orderBy).toEqual({ createdAt: "desc" });
    });

    it("can combine search, status, and tag filters", async () => {
      await listPatients("nutri-1", "ana", "ACTIVE", undefined, "name", "vegano");

      const call = patientFindMany.mock.calls[0]![0]!;
      expect(call.where).toMatchObject({
        nutritionistId: "nutri-1",
        status: "ACTIVE",
        OR: expect.arrayContaining([{ name: { contains: "ana", mode: "insensitive" } }]),
        patientTags: { some: { label: "vegano" } },
      });
      expect(call.orderBy).toEqual({ name: "asc" });
    });
  });

  describe("getWellnessPanelData", () => {
    it("returns empty array when no active patients", async () => {
      patientFindMany.mockResolvedValue([]);
      wellnessFindMany.mockResolvedValue([]);

      const result = await getWellnessPanelData("nutri-1");
      expect(result).toEqual([]);
    });

    it("returns patients with zero checkins", async () => {
      patientFindMany.mockResolvedValue([{ id: "p1", name: "Ana" }] as never);
      wellnessFindMany.mockResolvedValue([]);

      const result = await getWellnessPanelData("nutri-1");
      expect(result).toHaveLength(1);
      expect(result[0].checkinCount).toBe(0);
      expect(result[0].avgMood).toBeNull();
      expect(result[0].latest).toBeNull();
    });

    it("groups check-ins by patient correctly", async () => {
      patientFindMany.mockResolvedValue([
        { id: "p1", name: "Ana" },
        { id: "p2", name: "João" },
      ] as never);
      wellnessFindMany.mockResolvedValue([
        { patientId: "p1", date: new Date("2026-06-23"), mood: 4, energy: 3, sleep: 7, notes: null },
        { patientId: "p1", date: new Date("2026-06-22"), mood: 2, energy: 2, sleep: 5, notes: null },
        { patientId: "p2", date: new Date("2026-06-24"), mood: 5, energy: 5, sleep: 8, notes: "ótimo" },
      ] as never);

      const result = await getWellnessPanelData("nutri-1");

      const ana = result.find((r) => r.patient.id === "p1");
      const joao = result.find((r) => r.patient.id === "p2");

      expect(ana?.checkinCount).toBe(2);
      expect(ana?.avgMood).toBe(3); // (4+2)/2
      expect(joao?.checkinCount).toBe(1);
      expect(joao?.avgMood).toBe(5);
    });

    it("sets latest to first check-in in the array (already ordered by date desc)", async () => {
      patientFindMany.mockResolvedValue([{ id: "p1", name: "Ana" }] as never);
      const latestCheckin = { patientId: "p1", date: new Date("2026-06-24"), mood: 5, energy: 4, sleep: 8, notes: null };
      wellnessFindMany.mockResolvedValue([
        latestCheckin,
        { patientId: "p1", date: new Date("2026-06-20"), mood: 3, energy: 3, sleep: 6, notes: null },
      ] as never);

      const result = await getWellnessPanelData("nutri-1");

      expect(result[0].latest).toEqual(latestCheckin);
    });

    it("queries only active patients for nutritionist", async () => {
      patientFindMany.mockResolvedValue([]);
      wellnessFindMany.mockResolvedValue([]);

      await getWellnessPanelData("nutri-42");

      expect(patientFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nutritionistId: "nutri-42", status: "ACTIVE" },
        }),
      );
    });

    it("queries check-ins in the last 7 days", async () => {
      patientFindMany.mockResolvedValue([]);
      wellnessFindMany.mockResolvedValue([]);

      await getWellnessPanelData("nutri-1");

      const call = wellnessFindMany.mock.calls[0]![0]!;
      const since = (call.where as { nutritionistId: string; date: { gte: Date } }).date.gte;
      const expectedDate = new Date("2026-06-17T00:00:00.000Z");
      expect(since.getTime()).toBe(expectedDate.getTime());
    });
  });
});
