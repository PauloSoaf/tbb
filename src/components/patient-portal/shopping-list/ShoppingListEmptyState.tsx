"use client";

import { ShoppingCart } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function ShoppingListEmptyState() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border-neutral bg-card-bg p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
        <ShoppingCart className="h-6 w-6" />
      </div>
      <h2 className="font-semibold text-text-primary">{t("shopping_list.empty_title")}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t("shopping_list.empty_description")}</p>
    </div>
  );
}
