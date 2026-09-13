"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { MealSubstitutionItemDTO } from "@/services/meal-substitution.service";
import { AsyncButton } from "@/components/ui/AsyncButton";

export function SubstitutionItemList({
  items,
  onDelete,
  disabled = false,
}: {
  items: MealSubstitutionItemDTO[];
  onDelete: (id: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral p-4 text-center text-sm text-text-secondary">
        {t("meal_substitutions.no_substitutions")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-border-neutral bg-card-bg p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">{item.foodName}</p>
              <p className="text-xs text-text-secondary">
                {item.quantity ? `${item.quantity}${item.unit ?? ""}` : t("meal_substitutions.manual_quantity")}
                {item.householdMeasure ? ` · ${item.householdMeasure}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {item.calories ?? 0} kcal · C {item.carbs ?? 0}g · P {item.protein ?? 0}g · G {item.fat ?? 0}g
              </p>
              {item.equivalenceNotes && (
                <p className="mt-1 text-[11px] italic text-text-secondary">{item.equivalenceNotes}</p>
              )}
            </div>
            <AsyncButton
              type="button"
              onClick={() => onDelete(item.id)}
              disabled={disabled}
              pendingLabel={null}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-red-50 hover:text-danger dark:hover:bg-red-500/10"
              aria-label={t("meal_substitutions.delete_item")}
            >
              <Trash2 className="h-4 w-4" />
            </AsyncButton>
          </div>
        </div>
      ))}
    </div>
  );
}
