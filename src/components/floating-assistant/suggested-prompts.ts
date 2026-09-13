export const PATIENT_PROMPTS = [
  "Resuma este paciente.",
  "Calcular IMC.",
  "Calcular TMB.",
  "Distribuição de macros.",
] as const;

export const GLOBAL_PROMPTS = [
  "Onde vejo a agenda?",
  "Abrir Tabela TACO.",
  "Como crio um plano alimentar?",
  "Como gero link de atendimento?",
] as const;

export function getSuggestedPrompts(patientId?: string | null): string[] {
  return patientId
    ? [...PATIENT_PROMPTS, ...GLOBAL_PROMPTS]
    : [...GLOBAL_PROMPTS];
}
