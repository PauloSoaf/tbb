import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getMealPlanStudioData: vi.fn(),
  findPatients: vi.fn(),
  findTemplates: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  nativeRedirect: vi.fn(),
  mealPlanStudio: vi.fn(),
  studioShell: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/tenancy/requirePermission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/services/meal-plan.service", () => ({
  getMealPlanStudioData: mocks.getMealPlanStudioData,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findMany: mocks.findPatients },
    mealPlan: { findMany: mocks.findTemplates },
  },
}));

vi.mock("@/data/meal-plan-templates", () => ({
  nativeMealPlanTemplates: [
    { id: "hipertrofia-basica", title: "Hipertrofia Clássica" },
  ],
}));

vi.mock("@/components/meal-plan-studio/MealPlanStudio", () => ({
  MealPlanStudio: mocks.mealPlanStudio,
}));

vi.mock("../NativeTemplateStudioRedirect", () => ({
  NativeTemplateStudioRedirect: mocks.nativeRedirect,
}));

vi.mock("../StudioShell", () => ({
  StudioShell: mocks.studioShell,
}));

vi.mock("@/lib/i18n/getServerTranslations", () => ({
  getServerTranslations: vi.fn(async () => ({
    t: (key: string) => key === "meal_plan_workshop.title" ? "Meal Plan Studio" : key,
  })),
}));

import StudioPage from "../page";

describe("StudioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      nutritionist: { id: "nutritionist-1" },
    });
  });

  it("prepares a native template for the Studio instead of returning 404", async () => {
    mocks.getMealPlanStudioData.mockResolvedValue(null);

    const result = await StudioPage({
      params: Promise.resolve({
        tenant: "paulo",
        templateId: "hipertrofia-basica",
      }),
    });

    expect(result.type).toBe(mocks.studioShell);
    expect(result.props).toMatchObject({
      title: "Meal Plan Studio",
      subtitle: "Hipertrofia Clássica",
    });
    expect(result.props.children.type).toBe(mocks.nativeRedirect);
    expect(result.props.children.props).toMatchObject({
      tenantSlug: "paulo",
      templateId: "hipertrofia-basica",
      templateTitle: "Hipertrofia Clássica",
    });
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.findPatients).not.toHaveBeenCalled();
    expect(mocks.findTemplates).not.toHaveBeenCalled();
  });

  it("opens an existing editable template directly in the Studio", async () => {
    const plan = {
      id: "template-1",
      title: "Meu modelo",
      isTemplate: true,
      meals: [],
    };
    const patients = [{ id: "patient-1", name: "Paciente" }];
    const templates = [{ id: "template-2", title: "Outro modelo" }];
    mocks.getMealPlanStudioData.mockResolvedValue(plan);
    mocks.findPatients.mockResolvedValue(patients);
    mocks.findTemplates.mockResolvedValue(templates);

    const result = await StudioPage({
      params: Promise.resolve({ tenant: "paulo", templateId: "template-1" }),
    });

    expect(result.type).toBe(mocks.studioShell);
    expect(result.props).toMatchObject({
      title: "Meal Plan Studio",
      subtitle: "Meu modelo",
    });
    expect(result.props.children.type).toBe(mocks.mealPlanStudio);
    expect(result.props.children.props).toMatchObject({
      tenantSlug: "paulo",
      plan,
      patients,
      customTemplates: templates,
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "mealPlans",
      "edit",
      "paulo",
    );
    expect(mocks.getMealPlanStudioData).toHaveBeenCalledWith(
      "nutritionist-1",
      "template-1",
    );
    expect(mocks.nativeRedirect).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("keeps returning 404 for an unknown template", async () => {
    mocks.getMealPlanStudioData.mockResolvedValue(null);

    await expect(
      StudioPage({
        params: Promise.resolve({
          tenant: "paulo",
          templateId: "modelo-inexistente",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
