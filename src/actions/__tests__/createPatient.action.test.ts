import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditRecord: vi.fn(),
  checkEntityLimit: vi.fn(),
  createPatient: vi.fn(),
  findUnique: vi.fn(),
  generateActivationLink: vi.fn(),
  headers: vi.fn(),
  patientCount: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requirePermission: vi.fn(),
  sendWelcomePatientEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      count: mocks.patientCount,
    },
    nutritionist: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/tenancy/requirePermission", () => ({
  requirePermission: mocks.requirePermission,
  AuthorizationError: class AuthorizationError extends Error {},
}));

vi.mock("@/services/audit-log.service", () => ({
  auditLogService: {
    record: mocks.auditRecord,
  },
}));

vi.mock("@/services/email.service", () => ({
  sendWelcomePatientEmail: mocks.sendWelcomePatientEmail,
}));

vi.mock("@/services/patient-portal.service", () => ({
  generateActivationLink: mocks.generateActivationLink,
}));

vi.mock("@/services/patient.service", () => ({
  createPatient: mocks.createPatient,
}));

vi.mock("@/services/usageLimit.service", () => ({
  usageLimitService: {
    checkEntityLimit: mocks.checkEntityLimit,
  },
}));

import { createPatientAction } from "../createPatient.action";

function validPatientFormData() {
  const formData = new FormData();
  formData.set("name", "Maria L\u00facia");
  formData.set("phone", "11999999999");
  return formData;
}

describe("createPatientAction", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.requirePermission.mockResolvedValue({
      nutritionistId: "tenant-from-context",
      session: { nutritionistId: "stale-session-tenant" },
      userId: "user-1",
      teamMemberId: null,
      nutritionist: { name: "Cl\u00ednica Exemplo", slug: "clinica-exemplo" },
      isGlobalAdmin: false,
      role: "OWNER",
    });
    mocks.patientCount.mockResolvedValue(2);
    mocks.checkEntityLimit.mockResolvedValue({ allowed: true, current: 2, limit: 10 });
    mocks.createPatient.mockResolvedValue({
      id: "patient-1",
      name: "Maria L\u00facia",
      email: null,
    });
    mocks.headers.mockResolvedValue(new Headers());
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("uses the authorized context tenant and redirects to the patient list with success feedback", async () => {
    await expect(createPatientAction("clinica-exemplo", null, validPatientFormData()))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/clinica-exemplo/pacientes?created=1");

    expect(mocks.patientCount).toHaveBeenCalledWith({
      where: { nutritionistId: "tenant-from-context", status: "ACTIVE" },
    });
    expect(mocks.checkEntityLimit).toHaveBeenCalledWith("tenant-from-context", "patients.max", 2);
    expect(mocks.createPatient).toHaveBeenCalledWith("tenant-from-context", expect.objectContaining({
      name: "Maria L\u00facia",
      phone: "11999999999",
    }));
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant-from-context",
      resourceId: "patient-1",
    }));
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard/clinica-exemplo");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/dashboard/clinica-exemplo/pacientes");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard/clinica-exemplo/pacientes?created=1");
  });

  it("still redirects after an audit failure because the patient has already been saved", async () => {
    mocks.auditRecord.mockRejectedValue(new Error("audit unavailable"));

    await expect(createPatientAction("clinica-exemplo", null, validPatientFormData()))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/clinica-exemplo/pacientes?created=1");

    expect(mocks.createPatient).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard/clinica-exemplo/pacientes?created=1");
    expect(consoleError).toHaveBeenCalledWith(
      "[PATIENT_CREATE_AUDIT_FAILED] The patient was saved, but audit recording failed."
    );
  });

  it("uses the authorized context tenant to prepare the welcome email", async () => {
    mocks.createPatient.mockResolvedValue({
      id: "patient-1",
      name: "Maria L\u00facia",
      email: "maria@example.com",
    });
    mocks.findUnique.mockResolvedValue({ name: "Cl\u00ednica Exemplo", slug: "clinica-exemplo" });
    mocks.generateActivationLink.mockResolvedValue("https://nutriopus.com.br/activation");
    mocks.sendWelcomePatientEmail.mockResolvedValue({ success: true });

    await expect(createPatientAction("clinica-exemplo", null, validPatientFormData()))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard/clinica-exemplo/pacientes?created=1");

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "tenant-from-context" },
      select: { name: true, slug: true },
    });
    expect(mocks.generateActivationLink).toHaveBeenCalledWith(
      "tenant-from-context",
      "patient-1",
      expect.any(String)
    );
  });
});
