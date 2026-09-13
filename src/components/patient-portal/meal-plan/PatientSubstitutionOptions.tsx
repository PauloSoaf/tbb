import type { MealSubstitutionGroupDTO } from "@/services/meal-substitution.service";
import { PatientSubstitutionBadge } from "./PatientSubstitutionBadge";

export function PatientSubstitutionOptions({
  groups,
  labels,
}: {
  groups: MealSubstitutionGroupDTO[];
  labels: {
    viewOptions: string;
    optionsAvailable: string;
    patientWarning: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (total === 0) return null;

  return (
    <details className="mt-2 rounded-xl border border-brand-blue/15 bg-brand-blue/5 p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold text-brand-blue">
        <span className="inline-flex items-center gap-2">
          {labels.viewOptions}
          <PatientSubstitutionBadge label={labels.optionsAvailable.replace("{{count}}", String(total))} />
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-text-secondary">{labels.patientWarning}</p>
        {groups.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-xs font-semibold text-text-primary">{group.title}</p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-card-bg p-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary">{item.foodName}</p>
                      <p className="text-text-secondary">
                        {item.quantity ? `${item.quantity}${item.unit ?? ""}` : ""}
                        {item.householdMeasure ? ` · ${item.householdMeasure}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-text-secondary">{item.calories ?? 0} kcal</p>
                  </div>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {labels.carbs} {item.carbs ?? 0}g · {labels.protein} {item.protein ?? 0}g · {labels.fat} {item.fat ?? 0}g
                  </p>
                  {item.equivalenceNotes && <p className="mt-1 italic text-text-secondary">{item.equivalenceNotes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
