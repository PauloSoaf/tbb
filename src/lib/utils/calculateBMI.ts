/**
 * Calculate BMI (Body Mass Index)
 * BMI = weight (kg) / height (m)²
 *
 * If height > 3, it's assumed to be in centimeters and converted to meters.
 */
export function calculateBMI(
  weight: number | null | undefined,
  height: number | null | undefined
): number | null {
  if (!weight || !height || weight <= 0 || height <= 0) return null;

  const heightInMeters = height > 3 ? height / 100 : height;
  const bmi = weight / (heightInMeters * heightInMeters);

  return Math.round(bmi * 100) / 100;
}
