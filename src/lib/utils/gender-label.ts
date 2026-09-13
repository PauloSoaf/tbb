export function genderLabel(gender: string | null | undefined): string {
  if (gender === "F") return "Feminino";
  if (gender === "M") return "Masculino";
  if (gender === "O") return "Outro";
  return "Não informado";
}
