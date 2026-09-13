"use client";

import { formatEquivalentQuantity } from "@/lib/utils/food-equivalents";
import { useI18n } from "@/lib/i18n/I18nContext";

export function EquivalentPortionPreview({
  quantityInGrams,
}: {
  quantityInGrams: number | null;
}) {
  const { t } = useI18n();
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      {quantityInGrams === null
        ? t("meal_substitutions.insufficient_data")
        : t("meal_substitutions.estimated_amount", { amount: formatEquivalentQuantity(quantityInGrams) })}
    </span>
  );
}
