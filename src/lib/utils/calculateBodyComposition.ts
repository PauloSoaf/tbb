/**
 * Calculate Body Fat in kg
 * Formula: weight (kg) * (bodyFatPercentage / 100)
 */
export function calculateBodyFatKg(
  weight: number | null | undefined,
  bodyFatPercentage: number | null | undefined
): number | null {
  if (!weight || weight <= 0 || bodyFatPercentage === null || bodyFatPercentage === undefined || bodyFatPercentage < 0 || bodyFatPercentage > 100) {
    return null;
  }

  const fatKg = weight * (bodyFatPercentage / 100);

  return Math.round(fatKg * 100) / 100;
}

/**
 * Calculate Lean Mass in kg
 * Formula: weight (kg) - bodyFatKg
 */
export function calculateLeanMassKg(
  weight: number | null | undefined,
  bodyFatKg: number | null | undefined
): number | null {
  if (!weight || weight <= 0 || bodyFatKg === null || bodyFatKg === undefined || bodyFatKg < 0) {
    return null;
  }

  const leanMass = weight - bodyFatKg;
  if (leanMass < 0) return null;

  return Math.round(leanMass * 100) / 100;
}
