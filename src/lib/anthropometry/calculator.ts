import { calculateBmi, classifyBmiForProfile, type BmiClassification } from "./bmi";
import { normalizeAssessmentAge, normalizeAssessmentProfile, normalizeBiologicalSex } from "./profile";
import {
  calculateWaistHeightRatio,
  calculateWaistHipRatio,
  classifyWaistHeightRisk,
  classifyWaistHipRisk,
  type RatioRisk,
} from "./ratios";
import {
  calculateSkinfoldAssessment,
  isClinicalSkinfoldProtocol,
  serializeSkinfoldMeasurements,
} from "./skinfold";
import type {
  AssessmentProfile,
  BiologicalSex,
  ClinicalSkinfoldProtocol,
  SkinfoldCalculation,
  SkinfoldMeasurementsInput,
} from "./types";

function calculateBodyFatKg(weight: number | null | undefined, percentage: number | null): number | null {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0 || percentage === null) return null;
  return Number((weight * (percentage / 100)).toFixed(2));
}

export type AssessmentSummaryInput = {
  profile: AssessmentProfile | string | null | undefined;
  sex: BiologicalSex | string | null | undefined;
  age: number | null | undefined;
  weight: number | null | undefined;
  height: number | null | undefined;
  waist: number | null | undefined;
  hip: number | null | undefined;
  bodyFatPercentage?: number | null | undefined;
  protocol?: ClinicalSkinfoldProtocol | string | null | undefined;
  skinfoldMeasurements?: SkinfoldMeasurementsInput;
};

/**
 * All fields are recalculated from source measurements. Server actions should
 * call this function instead of accepting any client-provided derived values.
 */
export type AssessmentSummary = {
  assessmentProfile: AssessmentProfile;
  biologicalSex: BiologicalSex;
  assessmentAge: number | null;
  bmi: number | null;
  /** Legacy-friendly Portuguese label for `PatientMeasurement.bmiClassification`. */
  bmiClassification: string | null;
  bmiClassificationCode: BmiClassification["code"];
  bmiClassificationStatus: BmiClassification["status"];
  waistHipRatio: number | null;
  waistHeightRatio: number | null;
  /** Legacy-friendly Portuguese label for `PatientMeasurement.waistHipRisk`. */
  waistHipRisk: string | null;
  waistHipRiskCode: RatioRisk["code"];
  waistHipRiskStatus: RatioRisk["status"];
  /** Legacy-friendly Portuguese label for `PatientMeasurement.waistHeightRisk`. */
  waistHeightRisk: string | null;
  waistHeightRiskCode: RatioRisk["code"];
  waistHeightRiskStatus: RatioRisk["status"];
  bodyFatPercentage: number | null;
  bodyFatKg: number | null;
  leanMassKg: number | null;
  skinfoldProtocol: ClinicalSkinfoldProtocol | null;
  /** JSON-safe payload ready for `PatientMeasurement.skinfoldMeasurements`. */
  skinfoldMeasurements: ReturnType<typeof serializeSkinfoldMeasurements> | null;
  skinfoldSum: number | null;
  skinfoldBodyDensity: number | null;
  skinfoldFormula: string | null;
  skinfold: SkinfoldCalculation | null;
};

export function calculateAssessmentSummary(input: AssessmentSummaryInput): AssessmentSummary {
  const assessmentProfile = normalizeAssessmentProfile(input.profile);
  const biologicalSex = normalizeBiologicalSex(input.sex);
  const assessmentAge = normalizeAssessmentAge(input.age);
  const bmi = calculateBmi(input.weight, input.height);
  const bmiResult = classifyBmiForProfile(assessmentProfile, bmi);
  const waistHipRatio = calculateWaistHipRatio(input.waist, input.hip);
  const waistHeightRatio = calculateWaistHeightRatio(input.waist, input.height);
  const waistHipResult = classifyWaistHipRisk(waistHipRatio, biologicalSex, assessmentProfile);
  const waistHeightResult = classifyWaistHeightRisk(waistHeightRatio, assessmentProfile);
  const skinfoldProtocol = isClinicalSkinfoldProtocol(input.protocol) ? input.protocol : null;
  const skinfold = skinfoldProtocol
    ? calculateSkinfoldAssessment({
        protocol: skinfoldProtocol,
        profile: assessmentProfile,
        sex: biologicalSex,
        age: assessmentAge,
        weight: input.weight,
        measurements: input.skinfoldMeasurements,
      })
    : null;
  const skinfoldMeasurements = input.skinfoldMeasurements
    ? serializeSkinfoldMeasurements(input.skinfoldMeasurements)
    : null;
  const bodyFatPercentage = skinfold?.bodyFatPercentage ?? input.bodyFatPercentage ?? null;
  const bodyFatKg = skinfold?.bodyFatKg ?? calculateBodyFatKg(input.weight, bodyFatPercentage);
  const leanMassKg = bodyFatKg !== null && typeof input.weight === "number" && Number.isFinite(input.weight)
    ? Number((input.weight - bodyFatKg).toFixed(2))
    : null;

  return {
    assessmentProfile,
    biologicalSex,
    assessmentAge,
    bmi,
    bmiClassification: bmiResult.label,
    bmiClassificationCode: bmiResult.code,
    bmiClassificationStatus: bmiResult.status,
    waistHipRatio,
    waistHeightRatio,
    waistHipRisk: waistHipResult.label,
    waistHipRiskCode: waistHipResult.code,
    waistHipRiskStatus: waistHipResult.status,
    waistHeightRisk: waistHeightResult.label,
    waistHeightRiskCode: waistHeightResult.code,
    waistHeightRiskStatus: waistHeightResult.status,
    bodyFatPercentage,
    bodyFatKg,
    leanMassKg,
    skinfoldProtocol,
    skinfoldMeasurements,
    skinfoldSum: skinfold?.sum ?? null,
    skinfoldBodyDensity: skinfold?.bodyDensity ?? null,
    skinfoldFormula: skinfold?.formula ?? null,
    skinfold,
  };
}

