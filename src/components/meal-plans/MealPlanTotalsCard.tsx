import { MealTotals } from "@/lib/utils/nutrition";

interface MealPlanTotalsCardProps {
  totals: MealTotals;
}

export function MealPlanTotalsCard({ totals }: MealPlanTotalsCardProps) {
  return (
    <div className="bg-brand-blue text-white rounded-xl p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold mb-4 opacity-90">Resumo Nutricional (Diário)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-sm opacity-80 mb-1">Calorias Totais</p>
          <p className="text-2xl font-bold">{totals.calories} <span className="text-sm font-normal opacity-80">kcal</span></p>
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">Carboidratos</p>
          <p className="text-2xl font-bold">{totals.carbs} <span className="text-sm font-normal opacity-80">g</span></p>
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">Proteínas</p>
          <p className="text-2xl font-bold">{totals.protein} <span className="text-sm font-normal opacity-80">g</span></p>
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">Gorduras</p>
          <p className="text-2xl font-bold">{totals.fat} <span className="text-sm font-normal opacity-80">g</span></p>
        </div>
      </div>
    </div>
  );
}
