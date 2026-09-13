export type BmiClass = "low" | "normal" | "overweight" | "obese1" | "obese2" | "obese3";

export function classifyBmi(bmi: number): { label: string; cls: BmiClass } {
  if (bmi < 18.5) return { label: "Baixo peso", cls: "low" };
  if (bmi < 25)   return { label: "Eutrofia", cls: "normal" };
  if (bmi < 30)   return { label: "Sobrepeso", cls: "overweight" };
  if (bmi < 35)   return { label: "Obesidade Grau I", cls: "obese1" };
  if (bmi < 40)   return { label: "Obesidade Grau II", cls: "obese2" };
  return           { label: "Obesidade Grau III", cls: "obese3" };
}
