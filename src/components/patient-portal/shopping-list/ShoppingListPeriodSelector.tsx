"use client";

import { useI18n } from "@/lib/i18n/I18nContext";

const PERIOD_OPTIONS = [1, 3, 7, 14] as const;

export function ShoppingListPeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const label: Record<number, string> = {
    1: t("shopping_list.period_1_day"),
    3: t("shopping_list.period_3_days"),
    7: t("shopping_list.period_7_days"),
    14: t("shopping_list.period_14_days"),
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PERIOD_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => onChange(days)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            value === days
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-border-neutral text-text-secondary hover:border-brand-blue/40 hover:text-text-primary"
          }`}
        >
          {label[days]}
        </button>
      ))}
    </div>
  );
}
