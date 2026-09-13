"use client";

import { Replace } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function SubstitutionBadge({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-2 py-1 text-[11px] font-semibold text-brand-blue transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-brand-blue hover:text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
      aria-label={t("meal_substitutions.open_for_item")}
    >
      <Replace className="h-3 w-3" />
      {count > 0
        ? t("meal_substitutions.options_count", { count })
        : t("meal_substitutions.add_short")}
    </button>
  );
}
