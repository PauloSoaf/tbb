export type FatClassResult = { label: string; color: string };

export function fatClassify(pct: number, gender: string | null): FatClassResult {
  const isFemale = gender === "F";
  if (isFemale) {
    if (pct < 14) return { label: "Abaixo do ideal", color: "text-amber-600" };
    if (pct <= 20) return { label: "Atlética", color: "text-emerald-600" };
    if (pct <= 24) return { label: "Boa condição", color: "text-emerald-500" };
    if (pct <= 31) return { label: "Acima do ideal", color: "text-amber-600" };
    return { label: "Obesidade", color: "text-rose-600" };
  } else {
    if (pct < 6) return { label: "Abaixo do ideal", color: "text-amber-600" };
    if (pct <= 13) return { label: "Atlético", color: "text-emerald-600" };
    if (pct <= 17) return { label: "Boa condição", color: "text-emerald-500" };
    if (pct <= 24) return { label: "Acima do ideal", color: "text-amber-600" };
    return { label: "Obesidade", color: "text-rose-600" };
  }
}
