import { normalizeAssessmentAge, normalizeAssessmentProfile, normalizeBiologicalSex } from "./profile";
import {
  CLINICAL_SKINFOLD_PROTOCOLS,
  SKINFOLD_SITES,
  type AssessmentProfile,
  type BiologicalSex,
  type ClinicalSkinfoldProtocol,
  type SkinfoldCalculation,
  type SkinfoldMeasurements,
  type SkinfoldMeasurementsInput,
  type SkinfoldMeasurementsPayload,
  type SkinfoldSite,
  type SkinfoldTriplicate,
  type SkinfoldWarningCode,
} from "./types";

type ProtocolDefinition = {
  requiredSites: readonly SkinfoldSite[];
  selectableSites: readonly SkinfoldSite[];
  formula: string;
};

const ALL_SITES = [...SKINFOLD_SITES] as readonly SkinfoldSite[];

export const SKINFOLD_PROTOCOL_DEFINITIONS: Record<ClinicalSkinfoldProtocol, ProtocolDefinition> = {
  POLLOCK_3_MALE: {
    requiredSites: ["chest", "abdominal", "thigh"],
    selectableSites: ["chest", "abdominal", "thigh"],
    formula: "JACKSON_POLLOCK_3_MALE_SIRI",
  },
  POLLOCK_3_FEMALE: {
    requiredSites: ["triceps", "suprailiac", "thigh"],
    selectableSites: ["triceps", "suprailiac", "thigh"],
    formula: "JACKSON_POLLOCK_3_FEMALE_SIRI",
  },
  POLLOCK_7: {
    requiredSites: ["chest", "axillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
    selectableSites: ["chest", "axillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
    formula: "JACKSON_POLLOCK_7_SIRI",
  },
  DURNIN_WOMERSLEY: {
    requiredSites: ["biceps", "triceps", "subscapular", "suprailiac"],
    selectableSites: ["biceps", "triceps", "subscapular", "suprailiac"],
    formula: "DURNIN_WOMERSLEY_4_SITE_SIRI",
  },
  SLAUGHTER: {
    requiredSites: ["triceps", "subscapular"],
    selectableSites: ["triceps", "subscapular"],
    formula: "SLAUGHTER_TRICEPS_SUBSCAPULAR",
  },
  MANUAL: {
    requiredSites: [],
    selectableSites: ALL_SITES,
    formula: "MANUAL_SUM",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

function hasOwn(object: Record<string, unknown>, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function normalizeTriplicate(value: unknown): SkinfoldTriplicate | null {
  if (positiveNumber(value) !== null) return { average: positiveNumber(value) };
  if (!isRecord(value)) return null;

  const reading: SkinfoldTriplicate = {
    first: positiveNumber(value.first),
    second: positiveNumber(value.second),
    third: positiveNumber(value.third),
    average: positiveNumber(value.average),
  };

  return Object.values(reading).some((entry) => entry !== null && entry !== undefined) ? reading : null;
}

export function isClinicalSkinfoldProtocol(value: unknown): value is ClinicalSkinfoldProtocol {
  return CLINICAL_SKINFOLD_PROTOCOLS.includes(value as ClinicalSkinfoldProtocol);
}

export function parseSkinfoldMeasurements(input: SkinfoldMeasurementsInput): SkinfoldMeasurements {
  let source: unknown = input;
  if (typeof input === "string") {
    try {
      source = JSON.parse(input) as unknown;
    } catch {
      return {};
    }
  }
  if (!isRecord(source)) return {};

  const sourceSites = isRecord(source.sites) && hasOwn(source, "version") ? source.sites : source;
  const normalized: SkinfoldMeasurements = {};

  for (const site of SKINFOLD_SITES) {
    const reading = normalizeTriplicate(sourceSites[site]);
    if (reading) normalized[site] = reading;
  }

  return normalized;
}

export function serializeSkinfoldMeasurements(input: SkinfoldMeasurementsInput): SkinfoldMeasurementsPayload {
  return {
    version: 1,
    sites: parseSkinfoldMeasurements(input),
  };
}

export function serializeSkinfoldMeasurementsJson(input: SkinfoldMeasurementsInput): string {
  return JSON.stringify(serializeSkinfoldMeasurements(input));
}

export function averageSkinfoldReadings(readings: SkinfoldTriplicate | null | undefined): number | null {
  if (!readings) return null;
  const samples = [readings.first, readings.second, readings.third]
    .map(positiveNumber)
    .filter((value): value is number => value !== null);

  if (samples.length > 0) {
    return round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  }

  return positiveNumber(readings.average);
}

export function skinfoldReadingVariation(readings: SkinfoldTriplicate | null | undefined): number | null {
  if (!readings) return null;
  const samples = [readings.first, readings.second, readings.third]
    .map(positiveNumber)
    .filter((value): value is number => value !== null);
  if (samples.length < 2) return null;

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (average <= 0) return null;
  return round((Math.max(...samples) - Math.min(...samples)) / average, 4);
}

export function getSkinfoldAverages(input: SkinfoldMeasurementsInput): Partial<Record<SkinfoldSite, number>> {
  const measurements = parseSkinfoldMeasurements(input);
  const averages: Partial<Record<SkinfoldSite, number>> = {};
  for (const site of SKINFOLD_SITES) {
    const average = averageSkinfoldReadings(measurements[site]);
    if (average !== null) averages[site] = average;
  }
  return averages;
}

export function getHighVariationSkinfoldSites(
  input: SkinfoldMeasurementsInput,
  threshold = 0.05
): SkinfoldSite[] {
  const measurements = parseSkinfoldMeasurements(input);
  return SKINFOLD_SITES.filter((site) => {
    const variation = skinfoldReadingVariation(measurements[site]);
    return variation !== null && variation > threshold;
  });
}

export function getAvailableSkinfoldProtocols(profile: AssessmentProfile | string | null | undefined): ClinicalSkinfoldProtocol[] {
  return normalizeAssessmentProfile(profile) === "CHILD"
    ? ["SLAUGHTER", "MANUAL"]
    : ["POLLOCK_3_MALE", "POLLOCK_3_FEMALE", "POLLOCK_7", "DURNIN_WOMERSLEY", "MANUAL"];
}

export function getDefaultSkinfoldProtocol(
  profile: AssessmentProfile | string | null | undefined,
  sex: BiologicalSex | string | null | undefined
): ClinicalSkinfoldProtocol {
  if (normalizeAssessmentProfile(profile) === "CHILD") return "SLAUGHTER";
  return normalizeBiologicalSex(sex) === "M" ? "POLLOCK_3_MALE" : "POLLOCK_3_FEMALE";
}

function bodyCompositionFromPercentage(
  percentage: number | null,
  weight: number | null | undefined
): Pick<SkinfoldCalculation, "bodyFatKg" | "leanMassKg"> {
  if (percentage === null || typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
    return { bodyFatKg: null, leanMassKg: null };
  }
  const bodyFatKg = round((percentage / 100) * weight);
  return { bodyFatKg, leanMassKg: round(weight - bodyFatKg) };
}

function siriBodyFatPercentage(bodyDensity: number): number | null {
  if (!Number.isFinite(bodyDensity) || bodyDensity <= 0) return null;
  const percentage = (4.95 / bodyDensity - 4.5) * 100;
  return percentage >= 0 && percentage <= 100 ? round(percentage) : null;
}

function durninBodyDensity(age: number, sex: Exclude<BiologicalSex, "UNSPECIFIED">, sum: number): number {
  const logSum = Math.log10(sum);
  if (sex === "M") {
    // Durnin-Womersley (1974), four-site equations. The 17–19 and
    // 20–29 bands intentionally use different coefficients.
    if (age <= 19) return 1.162 - 0.063 * logSum;
    if (age <= 29) return 1.1631 - 0.0632 * logSum;
    if (age <= 39) return 1.1422 - 0.0544 * logSum;
    if (age <= 49) return 1.162 - 0.07 * logSum;
    return 1.1715 - 0.0779 * logSum;
  }

  if (age <= 19) return 1.1549 - 0.0678 * logSum;
  if (age <= 29) return 1.1599 - 0.0717 * logSum;
  if (age <= 39) return 1.1423 - 0.0632 * logSum;
  if (age <= 49) return 1.1333 - 0.0612 * logSum;
  return 1.1339 - 0.0645 * logSum;
}

function baseResult(
  protocol: ClinicalSkinfoldProtocol,
  averages: Partial<Record<SkinfoldSite, number>>,
  highVariationSites: SkinfoldSite[],
  warnings: SkinfoldWarningCode[],
  status: SkinfoldCalculation["status"]
): SkinfoldCalculation {
  const definition = SKINFOLD_PROTOCOL_DEFINITIONS[protocol];
  const measuredValues = Object.values(averages);
  return {
    status,
    protocol,
    formula: null,
    sum: null,
    measuredSum: measuredValues.length > 0 ? round(measuredValues.reduce((sum, value) => sum + value, 0)) : null,
    bodyDensity: null,
    bodyFatPercentage: null,
    bodyFatKg: null,
    leanMassKg: null,
    averages,
    requiredSites: definition.requiredSites,
    highVariationSites,
    warnings,
  };
}

export function calculateSkinfoldAssessment(input: {
  protocol: ClinicalSkinfoldProtocol | string | null | undefined;
  profile: AssessmentProfile | string | null | undefined;
  sex: BiologicalSex | string | null | undefined;
  age: number | null | undefined;
  weight?: number | null;
  measurements: SkinfoldMeasurementsInput;
}): SkinfoldCalculation | null {
  if (!isClinicalSkinfoldProtocol(input.protocol)) return null;

  const protocol = input.protocol;
  const profile = normalizeAssessmentProfile(input.profile);
  const sex = normalizeBiologicalSex(input.sex);
  const age = normalizeAssessmentAge(input.age);
  const measurements = parseSkinfoldMeasurements(input.measurements);
  const averages = getSkinfoldAverages(measurements);
  const highVariationSites = getHighVariationSkinfoldSites(measurements);
  const warnings: SkinfoldWarningCode[] = highVariationSites.length > 0 ? ["READING_VARIATION_HIGH"] : [];
  const definition = SKINFOLD_PROTOCOL_DEFINITIONS[protocol];

  if (protocol === "SLAUGHTER" && profile !== "CHILD") {
    return baseResult(protocol, averages, highVariationSites, ["PROFILE_NOT_SUPPORTED", ...warnings], "NOT_APPLICABLE");
  }
  if (protocol !== "SLAUGHTER" && protocol !== "MANUAL" && profile === "CHILD") {
    return baseResult(protocol, averages, highVariationSites, ["PROFILE_NOT_SUPPORTED", ...warnings], "NOT_APPLICABLE");
  }

  if (protocol === "POLLOCK_3_MALE" && sex !== "M") {
    return baseResult(protocol, averages, highVariationSites, [sex === "UNSPECIFIED" ? "SEX_REQUIRED" : "PROTOCOL_SEX_MISMATCH", ...warnings], "NOT_APPLICABLE");
  }
  if (protocol === "POLLOCK_3_FEMALE" && sex !== "F") {
    return baseResult(protocol, averages, highVariationSites, [sex === "UNSPECIFIED" ? "SEX_REQUIRED" : "PROTOCOL_SEX_MISMATCH", ...warnings], "NOT_APPLICABLE");
  }
  if (protocol !== "MANUAL" && sex === "UNSPECIFIED") {
    return baseResult(protocol, averages, highVariationSites, ["SEX_REQUIRED", ...warnings], "NOT_APPLICABLE");
  }

  if (protocol !== "MANUAL" && protocol !== "SLAUGHTER" && age === null) {
    return baseResult(protocol, averages, highVariationSites, ["AGE_REQUIRED", ...warnings], "INCOMPLETE");
  }
  if (protocol === "DURNIN_WOMERSLEY" && age !== null && (age < 17 || age > 72)) {
    warnings.unshift("AGE_OUTSIDE_REFERENCE");
  }
  if (protocol === "SLAUGHTER" && age !== null && (age < 8 || age > 18)) {
    warnings.unshift("AGE_OUTSIDE_REFERENCE");
  }

  const valuesForFormula = protocol === "MANUAL"
    ? Object.values(averages)
    : definition.requiredSites.map((site) => averages[site]);
  const hasAllRequiredReadings = protocol === "MANUAL"
    ? valuesForFormula.length > 0
    : valuesForFormula.every((value) => typeof value === "number");
  if (!hasAllRequiredReadings) {
    return baseResult(protocol, averages, highVariationSites, ["MISSING_REQUIRED_READINGS", ...warnings], "INCOMPLETE");
  }

  const sum = round((valuesForFormula as number[]).reduce((total, value) => total + value, 0));
  if (protocol === "MANUAL") {
    return {
      ...baseResult(protocol, averages, highVariationSites, ["MANUAL_PROTOCOL_NO_BODY_FAT", ...warnings], "MANUAL"),
      formula: definition.formula,
      sum,
      measuredSum: sum,
    };
  }

  let bodyDensity: number | null = null;
  let bodyFatPercentage: number | null = null;

  if (protocol === "POLLOCK_3_MALE") {
    bodyDensity = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * (age as number);
  } else if (protocol === "POLLOCK_3_FEMALE") {
    bodyDensity = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * (age as number);
  } else if (protocol === "POLLOCK_7") {
    bodyDensity = sex === "M"
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * (age as number)
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * (age as number);
  } else if (protocol === "DURNIN_WOMERSLEY") {
    bodyDensity = durninBodyDensity(age as number, sex as Exclude<BiologicalSex, "UNSPECIFIED">, sum);
  } else if (protocol === "SLAUGHTER") {
    if (sex === "M") {
      bodyFatPercentage = sum <= 35
        ? 1.21 * sum - 0.008 * sum ** 2 - 1.7
        : 0.783 * sum + 1.6;
    } else {
      bodyFatPercentage = sum <= 35
        ? 1.33 * sum - 0.013 * sum ** 2 - 2.5
        : 0.546 * sum + 9.7;
    }
    bodyFatPercentage = Math.max(0, round(bodyFatPercentage));
  }

  const roundedDensity = bodyDensity === null ? null : round(bodyDensity, 5);
  if (roundedDensity !== null) bodyFatPercentage = siriBodyFatPercentage(roundedDensity);
  const composition = bodyCompositionFromPercentage(bodyFatPercentage, input.weight);

  return {
    status: "READY",
    protocol,
    formula: definition.formula,
    sum,
    measuredSum: sum,
    bodyDensity: roundedDensity,
    bodyFatPercentage,
    bodyFatKg: composition.bodyFatKg,
    leanMassKg: composition.leanMassKg,
    averages,
    requiredSites: definition.requiredSites,
    highVariationSites,
    warnings,
  };
}
