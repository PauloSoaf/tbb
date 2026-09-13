export type WaterResult = {
  minMl: number;
  maxMl: number;
  minL: string;
  maxL: string;
};

export function calculateWater(weightKg: number): WaterResult | null {
  if (!weightKg || weightKg <= 0) return null;
  const minMl = Math.round(weightKg * 30);
  const maxMl = Math.round(weightKg * 35);
  return {
    minMl,
    maxMl,
    minL: (minMl / 1000).toFixed(1),
    maxL: (maxMl / 1000).toFixed(1),
  };
}
