export const ASSESSMENT_PROFILES = ["CHILD", "ADULT", "ELDERLY"] as const;

export type AssessmentProfile = (typeof ASSESSMENT_PROFILES)[number];

export const BIOLOGICAL_SEXES = ["M", "F", "UNSPECIFIED"] as const;

export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number];

export const SKINFOLD_SITES = [
  "chest",
  "axillary",
  "triceps",
  "biceps",
  "subscapular",
  "abdominal",
  "suprailiac",
  "supraSpinal",
  "thigh",
  "medialCalf",
] as const;

export type SkinfoldSite = (typeof SKINFOLD_SITES)[number];

export const CLINICAL_SKINFOLD_PROTOCOLS = [
  "POLLOCK_3_MALE",
  "POLLOCK_3_FEMALE",
  "POLLOCK_7",
  "DURNIN_WOMERSLEY",
  "SLAUGHTER",
  "MANUAL",
] as const;

export type ClinicalSkinfoldProtocol = (typeof CLINICAL_SKINFOLD_PROTOCOLS)[number];

export type SkinfoldTriplicate = {
  first?: number | null;
  second?: number | null;
  third?: number | null;
  /**
   * Kept for importing a pre-existing averaged reading. New UI entries should
   * prefer the three raw readings above so the server can recompute the mean.
   */
  average?: number | null;
};

export type SkinfoldMeasurements = Partial<Record<SkinfoldSite, SkinfoldTriplicate>>;

export type SkinfoldMeasurementsPayload = {
  version: 1;
  sites: SkinfoldMeasurements;
};

export type SkinfoldMeasurementsInput =
  | SkinfoldMeasurements
  | SkinfoldMeasurementsPayload
  | string
  | null
  | undefined;

export type ClinicalStatus = "READY" | "INCOMPLETE" | "NOT_APPLICABLE" | "MANUAL";

export type BmiClassificationCode =
  | "ADULT_UNDERWEIGHT"
  | "ADULT_NORMAL"
  | "ADULT_OVERWEIGHT"
  | "ADULT_OBESITY_I"
  | "ADULT_OBESITY_II"
  | "ADULT_OBESITY_III"
  | "ELDERLY_UNDERWEIGHT"
  | "ELDERLY_EUTROPHIC"
  | "ELDERLY_OVERWEIGHT";

export type RatioRiskCode =
  | "LOW"
  | "HEALTHY"
  | "INCREASED"
  | "HIGH";

export type SkinfoldWarningCode =
  | "AGE_REQUIRED"
  | "SEX_REQUIRED"
  | "PROTOCOL_SEX_MISMATCH"
  | "PROFILE_NOT_SUPPORTED"
  | "AGE_OUTSIDE_REFERENCE"
  | "MISSING_REQUIRED_READINGS"
  | "READING_VARIATION_HIGH"
  | "MANUAL_PROTOCOL_NO_BODY_FAT";

export type SkinfoldCalculation = {
  status: ClinicalStatus;
  protocol: ClinicalSkinfoldProtocol;
  formula: string | null;
  sum: number | null;
  measuredSum: number | null;
  bodyDensity: number | null;
  bodyFatPercentage: number | null;
  bodyFatKg: number | null;
  leanMassKg: number | null;
  averages: Partial<Record<SkinfoldSite, number>>;
  requiredSites: readonly SkinfoldSite[];
  highVariationSites: SkinfoldSite[];
  warnings: SkinfoldWarningCode[];
};

