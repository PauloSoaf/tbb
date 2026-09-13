import { normalizeAssessmentProfile, normalizeBiologicalSex } from "./profile";
import { normalizeHeightToMeters } from "./bmi";
import type { AssessmentProfile, BiologicalSex, RatioRiskCode } from "./types";

export type RatioRisk = {
  code: RatioRiskCode | null;
  label: string | null;
  status: "CLASSIFIED" | "INSUFFICIENT_DATA" | "NOT_CLASSIFIABLE";
};

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

function validPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function calculateWaistHipRatio(
  waist: number | null | undefined,
  hip: number | null | undefined
): number | null {
  if (!validPositive(waist) || !validPositive(hip)) return null;
  return round(waist / hip);
}

export function calculateWaistHeightRatio(
  waist: number | null | undefined,
  height: number | null | undefined
): number | null {
  if (!validPositive(waist)) return null;
  const heightInMeters = normalizeHeightToMeters(height);
  if (heightInMeters === null) return null;
  return round(waist / (heightInMeters * 100));
}

export function classifyWaistHipRisk(
  ratio: number | null | undefined,
  sex: BiologicalSex | string | null | undefined,
  profile: AssessmentProfile | string | null | undefined
): RatioRisk {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) {
    return { code: null, label: null, status: "INSUFFICIENT_DATA" };
  }
  if (normalizeAssessmentProfile(profile) === "CHILD") {
    return { code: null, label: null, status: "NOT_CLASSIFIABLE" };
  }

  const normalizedSex = normalizeBiologicalSex(sex);
  if (normalizedSex === "UNSPECIFIED") {
    return { code: null, label: null, status: "NOT_CLASSIFIABLE" };
  }

  const threshold = normalizedSex === "M" ? 0.9 : 0.85;
  return ratio >= threshold
    ? { code: "INCREASED", label: "Risco aumentado", status: "CLASSIFIED" }
    : { code: "LOW", label: "Sem risco aumentado", status: "CLASSIFIED" };
}

export function classifyWaistHeightRisk(
  ratio: number | null | undefined,
  profile: AssessmentProfile | string | null | undefined
): RatioRisk {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) {
    return { code: null, label: null, status: "INSUFFICIENT_DATA" };
  }
  if (normalizeAssessmentProfile(profile) === "CHILD") {
    return { code: null, label: null, status: "NOT_CLASSIFIABLE" };
  }

  if (ratio < 0.4) return { code: "LOW", label: "Baixo risco", status: "CLASSIFIED" };
  if (ratio < 0.5) return { code: "HEALTHY", label: "Sem risco aumentado", status: "CLASSIFIED" };
  if (ratio < 0.6) return { code: "INCREASED", label: "Risco aumentado", status: "CLASSIFIED" };
  return { code: "HIGH", label: "Alto risco", status: "CLASSIFIED" };
}

