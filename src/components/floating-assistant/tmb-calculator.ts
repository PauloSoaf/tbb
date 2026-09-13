export type TmbResult = {
  tmb: number;
  get: number;
};

export function calculateTmb(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "M" | "F",
  activityFactor: number,
): TmbResult {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const tmb = Math.round(sex === "M" ? base + 5 : base - 161);
  return { tmb, get: Math.round(tmb * activityFactor) };
}
