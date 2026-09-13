"use client";

// Demo Oficina de Planos = the REAL OficinaPlanosPageClient. Native templates
// are code-defined (fully browsable/usable); custom templates come from the
// demo meal plan. Saving hits the demo boundary (no backend writes).
import { OficinaPlanosPageClient } from "@/components/ferramentas/OficinaPlanosPageClient";
import { demoMealPlans } from "@/demo/demo-data";

export default function DemoOficinaPlanosPage() {
  const customTemplates = demoMealPlans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    description: null,
    objective: plan.objective,
    totalCalories: plan.meals.reduce((s, m) => s + m.items.reduce((a, i) => a + i.calories, 0), 0),
    meals: plan.meals.map((meal) => ({ items: meal.items })),
  }));

  return <OficinaPlanosPageClient tenant="demo" customTemplates={customTemplates} />;
}
