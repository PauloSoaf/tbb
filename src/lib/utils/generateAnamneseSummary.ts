/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateBMI } from "./calculateBMI";
import { classifyBMI } from "./classifyBMI";

/**
 * Generates a deterministic text summary from the anamnesis payload.
 */
export function generateAnamneseSummary(payload: Record<string, any>): string {
  const parts: string[] = [];

  const name = payload.name || "Paciente";
  parts.push(`Pré-consulta de ${name}.`);

  if (payload.goal) {
    parts.push(`Objetivo: ${payload.goal}.`);
  }

  if (payload.weight && payload.height) {
    const bmi = calculateBMI(
      parseFloat(payload.weight),
      parseFloat(payload.height)
    );
    if (bmi) {
      const classification = classifyBMI(bmi);
      parts.push(`IMC: ${bmi} (${classification.label}).`);
    }
  }

  if (payload.diseases) {
    parts.push(`Histórico de saúde: ${payload.diseases}.`);
  }

  if (payload.medications) {
    parts.push(`Medicações em uso: ${payload.medications}.`);
  }

  if (payload.allergies) {
    parts.push(`Alergias: ${payload.allergies}.`);
  }

  if (payload.intolerances) {
    parts.push(`Intolerâncias: ${payload.intolerances}.`);
  }

  if (payload.dietaryRestrictions) {
    parts.push(`Restrições alimentares: ${payload.dietaryRestrictions}.`);
  }

  if (payload.symptoms) {
    parts.push(`Sintomas relatados: ${payload.symptoms}.`);
  }

  if (payload.sleepHabits) {
    parts.push(`Sono: ${payload.sleepHabits}.`);
  }

  if (payload.gutHealth) {
    parts.push(`Intestino: ${payload.gutHealth}.`);
  }

  return parts.join(" ");
}
