export type MacroResult = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  total: number;
};

export function calculateMacros(
  kcal: number,
  proteinPct: number,
  carbsPct: number,
  fatPct: number,
): MacroResult {
  return {
    proteinG: Math.round((kcal * (proteinPct / 100)) / 4),
    carbsG:   Math.round((kcal * (carbsPct   / 100)) / 4),
    fatG:     Math.round((kcal * (fatPct      / 100)) / 9),
    total:    proteinPct + carbsPct + fatPct,
  };
}
