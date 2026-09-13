export function formatNullableNumber(value: number | null | undefined, suffix = ""): string {
  return value == null ? "Sem dado" : `${Number(value.toFixed(1))}${suffix}`;
}
