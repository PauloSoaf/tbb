import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertTenantAccess: vi.fn(),
  findFirst: vi.fn(),
  deleteMealPlan: vi.fn(),
  invalidateTemplates: vi.fn(),
}));

vi.mock("@/lib/tenancy/assertTenantAccess", () => ({
  assertTenantAccess: mocks.assertTenantAccess,
}));

vi.mock("@/lib/cache/invalidate-nutriopus-cache", () => ({
  invalidateTemplates: mocks.invalidateTemplates,
  invalidatePatientDetail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      findFirst: mocks.findFirst,
      delete: mocks.deleteMealPlan,
    },
  },
}));

vi.mock("@/services/template.service", () => ({
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock("@/services/patient-route.service", () => ({
  getPatientHref: vi.fn(),
}));

vi.mock("@/data/meal-plan-templates", () => ({
  nativeMealPlanTemplates: [],
}));

import { deleteMealPlanTemplateAction } from "../template.action";

describe("deleteMealPlanTemplateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertTenantAccess.mockResolvedValue({
      nutritionist: { id: "nutritionist-1" },
    });
  });

  it("deletes an owned template and invalidates the workshop cache", async () => {
    mocks.findFirst.mockResolvedValue({ id: "template-1" });
    mocks.deleteMealPlan.mockResolvedValue({ id: "template-1" });

    const result = await deleteMealPlanTemplateAction("fabiola", "template-1");

    expect(result).toEqual({ success: true });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        nutritionistId: "nutritionist-1",
        isTemplate: true,
      },
      select: { id: true },
    });
    expect(mocks.deleteMealPlan).toHaveBeenCalledWith({
      where: { id: "template-1" },
    });
    expect(mocks.invalidateTemplates).toHaveBeenCalledWith({
      nutritionistId: "nutritionist-1",
      tenant: "fabiola",
    });
  });

  it("does not delete a missing or foreign template", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const result = await deleteMealPlanTemplateAction("fabiola", "template-2");

    expect(result).toEqual({ error: "Modelo não encontrado." });
    expect(mocks.deleteMealPlan).not.toHaveBeenCalled();
    expect(mocks.invalidateTemplates).not.toHaveBeenCalled();
  });
});
