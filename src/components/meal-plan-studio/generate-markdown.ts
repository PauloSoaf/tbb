import { calculateMealTotals, type PartialMealItem } from "@/lib/utils/nutrition";

interface MealForMarkdown {
  name?: unknown;
  time?: unknown;
  notes?: unknown;
  items?: unknown;
}

interface PlanForMarkdown {
  title: string;
  objective?: string | null;
  patient?: { name: string } | null;
  meals: Record<string, unknown>[];
  notes?: string | null;
}

export function getMealItems(meal: Record<string, unknown>): PartialMealItem[] {
  return Array.isArray(meal.items) ? (meal.items as PartialMealItem[]) : [];
}

export function generateMarkdown(plan: PlanForMarkdown): string {
  const lines: string[] = [];
  lines.push(`# ${plan.title}`);
  if (plan.objective) lines.push(`\n**Objetivo:** ${plan.objective}`);
  if (plan.patient) lines.push(`**Paciente:** ${plan.patient.name}`);
  lines.push("");

  for (const meal of plan.meals) {
    lines.push(`## ${meal.name}${meal.time ? ` (${meal.time})` : ""}`);
    if (meal.notes) lines.push(`_${meal.notes}_`);
    const items = getMealItems(meal);
    for (const item of items) {
      lines.push(`- ${item.quantity}${item.unit} ${item.foodName} — ${item.calories}kcal (C:${item.carbs}g P:${item.protein}g G:${item.fat}g)`);
    }
    const totals = calculateMealTotals(items);
    lines.push(`> Total: ${totals.calories}kcal · Carb:${totals.carbs}g · Prot:${totals.protein}g · Gord:${totals.fat}g`);
    lines.push("");
  }

  if (plan.notes) {
    lines.push(`---\n**Observações:** ${plan.notes}`);
  }

  return lines.join("\n");
}
