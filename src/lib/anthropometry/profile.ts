import {
  ASSESSMENT_PROFILES,
  BIOLOGICAL_SEXES,
  type AssessmentProfile,
  type BiologicalSex,
} from "./types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeAssessmentProfile(value: unknown): AssessmentProfile {
  return ASSESSMENT_PROFILES.includes(value as AssessmentProfile)
    ? (value as AssessmentProfile)
    : "ADULT";
}

export function normalizeBiologicalSex(value: unknown): BiologicalSex {
  return BIOLOGICAL_SEXES.includes(value as BiologicalSex)
    ? (value as BiologicalSex)
    : "UNSPECIFIED";
}

export function normalizeAssessmentAge(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 0 || value > 130) return null;
  return Math.trunc(value);
}

/**
 * Suggested profile only. The nutritionist remains able to choose the profile
 * that is clinically appropriate for the assessment.
 */
export function suggestAssessmentProfile(age: number | null | undefined): AssessmentProfile {
  const normalizedAge = normalizeAssessmentAge(age);
  if (normalizedAge === null) return "ADULT";
  if (normalizedAge < 18) return "CHILD";
  if (normalizedAge >= 60) return "ELDERLY";
  return "ADULT";
}

