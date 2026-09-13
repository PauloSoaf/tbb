export type RiskResult = { label: string; color: string };
export type WaistRiskResult = { label: string; color: string; detail: string };

export function getRCQRisk(rcq: number, sex: "M" | "F"): RiskResult {
  if (sex === "F") {
    if (rcq < 0.71) return { label: "Baixo risco", color: "text-emerald-600" };
    if (rcq < 0.78) return { label: "Risco moderado", color: "text-amber-500" };
    if (rcq < 0.82) return { label: "Alto risco", color: "text-orange-500" };
    return { label: "Muito alto risco", color: "text-rose-600" };
  } else {
    if (rcq < 0.82) return { label: "Baixo risco", color: "text-emerald-600" };
    if (rcq < 0.88) return { label: "Risco moderado", color: "text-amber-500" };
    if (rcq < 0.95) return { label: "Alto risco", color: "text-orange-500" };
    return { label: "Muito alto risco", color: "text-rose-600" };
  }
}

export function getWaistRisk(waist: number, sex: "M" | "F"): WaistRiskResult {
  if (sex === "F") {
    if (waist < 80)
      return { label: "Sem risco aumentado", color: "text-emerald-600", detail: "< 80 cm (referência OMS para mulheres)" };
    if (waist < 88)
      return { label: "Risco aumentado", color: "text-amber-500", detail: "80–87 cm — risco aumentado" };
    return { label: "Risco muito aumentado", color: "text-rose-600", detail: "≥ 88 cm — risco substancialmente aumentado" };
  } else {
    if (waist < 94)
      return { label: "Sem risco aumentado", color: "text-emerald-600", detail: "< 94 cm (referência OMS para homens)" };
    if (waist < 102)
      return { label: "Risco aumentado", color: "text-amber-500", detail: "94–101 cm — risco aumentado" };
    return { label: "Risco muito aumentado", color: "text-rose-600", detail: "≥ 102 cm — risco substancialmente aumentado" };
  }
}
