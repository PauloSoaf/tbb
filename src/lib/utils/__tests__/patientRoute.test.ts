import { describe, expect, it } from "vitest";
import { getPatientEvaluationsHref, getPatientMeasurementsHref } from "../patientRoute";

describe("patientRoute", () => {
  const patient = { id: "clx123456789rd3evm8h", name: "Déborah" };

  it("builds evaluation links with the clear /avaliacoes route", () => {
    expect(getPatientEvaluationsHref("fabiola", patient)).toBe(
      "/dashboard/fabiola/pacientes/deborah-rd3evm8h/avaliacoes"
    );
  });

  it("keeps the old measurements helper pointing to the valid evaluations route", () => {
    expect(getPatientMeasurementsHref("fabiola", patient)).toBe(
      "/dashboard/fabiola/pacientes/deborah-rd3evm8h/avaliacoes"
    );
  });
});
