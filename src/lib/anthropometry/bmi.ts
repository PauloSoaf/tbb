import { normalizeAssessmentProfile } from "./profile";
import type { AssessmentProfile, BmiClassificationCode } from "./types";

export type BmiClassification = {
  value: number | null;
  status: "CLASSIFIED" | "INSUFFICIENT_DATA" | "NOT_CLASSIFIABLE";
  profile: AssessmentProfile;
  reference: "ADULT_WHO" | "ELDERLY_LIPSCHITZ" | "WHO_BMI_FOR_AGE_REQUIRED";
  code: BmiClassificationCode | null;
  /** Portuguese label maintained for the legacy persisted `bmiClassification` field. */
  label: string | null;
};

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export function normalizeHeightToMeters(height: number | null | undefined): number | null {
  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) return null;
  const meters = height > 3 ? height / 100 : height;
  return meters > 0 ? meters : null;
}

export function calculateBmi(weight: number | null | undefined, height: number | null | undefined): number | null {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) return null;
  const heightInMeters = normalizeHeightToMeters(height);
  if (heightInMeters === null) return null;
  return round(weight / (heightInMeters * heightInMeters));
}

export function classifyAdultBmi(bmi: number | null | undefined): BmiClassification {
  if (typeof bmi !== "number" || !Number.isFinite(bmi)) {
    return {
      value: null,
      status: "INSUFFICIENT_DATA",
      profile: "ADULT",
      reference: "ADULT_WHO",
      code: null,
      label: null,
    };
  }

  if (bmi < 18.5) return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_UNDERWEIGHT", label: "Abaixo do peso" };
  if (bmi < 25) return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_NORMAL", label: "Peso normal" };
  if (bmi < 30) return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_OVERWEIGHT", label: "Sobrepeso" };
  if (bmi < 35) return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_OBESITY_I", label: "Obesidade grau I" };
  if (bmi < 40) return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_OBESITY_II", label: "Obesidade grau II" };
  return { value: bmi, status: "CLASSIFIED", profile: "ADULT", reference: "ADULT_WHO", code: "ADULT_OBESITY_III", label: "Obesidade grau III" };
}

/** Lipschitz classification used for older adults: <22, 22–27, >27 kg/m². */
export function classifyElderlyBmi(bmi: number | null | undefined): BmiClassification {
  if (typeof bmi !== "number" || !Number.isFinite(bmi)) {
    return {
      value: null,
      status: "INSUFFICIENT_DATA",
      profile: "ELDERLY",
      reference: "ELDERLY_LIPSCHITZ",
      code: null,
      label: null,
    };
  }

  if (bmi < 22) return { value: bmi, status: "CLASSIFIED", profile: "ELDERLY", reference: "ELDERLY_LIPSCHITZ", code: "ELDERLY_UNDERWEIGHT", label: "Baixo peso" };
  if (bmi <= 27) return { value: bmi, status: "CLASSIFIED", profile: "ELDERLY", reference: "ELDERLY_LIPSCHITZ", code: "ELDERLY_EUTROPHIC", label: "Eutrofia" };
  return { value: bmi, status: "CLASSIFIED", profile: "ELDERLY", reference: "ELDERLY_LIPSCHITZ", code: "ELDERLY_OVERWEIGHT", label: "Sobrepeso" };
}

/**
 * A BMI value can be calculated for children, but it must not receive adult
 * cutoffs. A WHO age-and-sex reference is required before it is classifiable.
 */
export function classifyChildBmi(bmi: number | null | undefined): BmiClassification {
  if (typeof bmi !== "number" || !Number.isFinite(bmi)) {
    return {
      value: null,
      status: "INSUFFICIENT_DATA",
      profile: "CHILD",
      reference: "WHO_BMI_FOR_AGE_REQUIRED",
      code: null,
      label: null,
    };
  }

  return {
    value: bmi,
    status: "NOT_CLASSIFIABLE",
    profile: "CHILD",
    reference: "WHO_BMI_FOR_AGE_REQUIRED",
    code: null,
    label: null,
  };
}

export function classifyBmiForProfile(
  profile: AssessmentProfile | string | null | undefined,
  bmi: number | null | undefined
): BmiClassification {
  switch (normalizeAssessmentProfile(profile)) {
    case "ELDERLY":
      return classifyElderlyBmi(bmi);
    case "CHILD":
      return classifyChildBmi(bmi);
    default:
      return classifyAdultBmi(bmi);
  }
}

