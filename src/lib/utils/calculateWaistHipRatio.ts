/**
 * Calculate Waist-to-Hip Ratio
 * Ratio = waist / hip
 *
 * Both measurements should be in the same unit (usually cm).
 * Returns the ratio rounded to 2 decimal places.
 */
export function calculateWaistHipRatio(
  waist: number | null | undefined,
  hip: number | null | undefined
): number | null {
  if (!waist || !hip || waist <= 0 || hip <= 0) return null;

  const ratio = waist / hip;

  return Math.round(ratio * 100) / 100;
}
