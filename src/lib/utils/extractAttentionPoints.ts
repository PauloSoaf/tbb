/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateBMI } from "./calculateBMI";

/**
 * Extracts attention points from anamnesis payload.
 * These are clinical flags that the nutritionist should review.
 */
export function extractAttentionPoints(
  payload: Record<string, any>
): string[] {
  const points: string[] = [];

  if (payload.allergies && payload.allergies.trim()) {
    points.push(`Alergias: ${payload.allergies}`);
  }

  if (payload.intolerances && payload.intolerances.trim()) {
    points.push(`Intolerâncias: ${payload.intolerances}`);
  }

  if (payload.medications && payload.medications.trim()) {
    points.push(`Medicações em uso: ${payload.medications}`);
  }

  if (payload.diseases && payload.diseases.trim()) {
    points.push(`Doenças/Histórico: ${payload.diseases}`);
  }

  if (payload.symptoms && payload.symptoms.trim()) {
    points.push(`Sintomas relatados: ${payload.symptoms}`);
  }

  if (payload.sleepHabits && payload.sleepHabits.trim()) {
    const sleep = payload.sleepHabits.toLowerCase();
    if (
      sleep.includes("irregular") ||
      sleep.includes("insônia") ||
      sleep.includes("pouco") ||
      sleep.includes("ruim") ||
      sleep.includes("menos de 6")
    ) {
      points.push(`Sono irregular: ${payload.sleepHabits}`);
    }
  }

  if (payload.gutHealth && payload.gutHealth.trim()) {
    const gut = payload.gutHealth.toLowerCase();
    if (
      gut.includes("irregular") ||
      gut.includes("constipação") ||
      gut.includes("diarreia") ||
      gut.includes("obstipação") ||
      gut.includes("ruim")
    ) {
      points.push(`Intestino irregular: ${payload.gutHealth}`);
    }
  }

  if (payload.weight && payload.height) {
    const bmi = calculateBMI(
      parseFloat(payload.weight),
      parseFloat(payload.height)
    );
    if (bmi && bmi >= 30) {
      points.push(`IMC elevado: ${bmi}`);
    }
    if (bmi && bmi < 18.5) {
      points.push(`IMC baixo: ${bmi}`);
    }
  }

  if (payload.familyHistory && payload.familyHistory.trim()) {
    points.push(`Histórico familiar: ${payload.familyHistory}`);
  }

  return points;
}
