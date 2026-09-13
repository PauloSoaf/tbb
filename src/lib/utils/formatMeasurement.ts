/**
 * Format a measurement value with an optional unit.
 * If the value is null or undefined, returns a placeholder (e.g. "—").
 * If decimals are provided, the value is rounded to that number of decimals before appending the unit.
 */
export function formatMeasurement(
  value: number | null | undefined,
  unit: string = "",
  decimals?: number
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  let formattedValue = value.toString();

  if (decimals !== undefined) {
    // Avoid floating point precision issues
    const multiplier = Math.pow(10, decimals);
    formattedValue = (Math.round(value * multiplier) / multiplier).toFixed(decimals);
  } else {
    // Round to max 2 decimals if not specified, just to avoid huge floats like 3.14159265
    formattedValue = (Math.round(value * 100) / 100).toString();
  }

  // Format with pt-BR decimal separator
  formattedValue = formattedValue.replace(".", ",");

  return unit ? `${formattedValue} ${unit}` : formattedValue;
}
