export type BMIClassifyResult = { label: string; color: string };

export function bmiClassify(bmi: number): BMIClassifyResult {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "text-amber-600" };
  if (bmi < 25) return { label: "Peso normal", color: "text-emerald-600" };
  if (bmi < 30) return { label: "Sobrepeso", color: "text-amber-600" };
  if (bmi < 35) return { label: "Obesidade I", color: "text-orange-600" };
  if (bmi < 40) return { label: "Obesidade II", color: "text-rose-600" };
  return { label: "Obesidade III", color: "text-rose-700" };
}
