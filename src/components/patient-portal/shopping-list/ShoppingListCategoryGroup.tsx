"use client";

import { useI18n } from "@/lib/i18n/I18nContext";
import { ShoppingListItemRow } from "./ShoppingListItemRow";

export type PatientShoppingItem = {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  householdMeasure: string | null;
  source: string;
  checked: boolean;
  notes: string | null;
};

const categoryKey: Record<string, string> = {
  FRUITS: "fruits",
  VEGETABLES: "vegetables",
  PROTEINS: "proteins",
  GRAINS: "grains",
  DAIRY: "dairy",
  LEGUMES: "legumes",
  OILS: "oils",
  SEASONINGS: "seasonings",
  BEVERAGES: "beverages",
  SUPPLEMENTS: "supplements",
  OTHER: "other",
};

export function ShoppingListCategoryGroup({
  tenantSlug,
  shoppingListId,
  category,
  items,
  onCheckedChange,
  onEdit,
  deletingItemId,
  deleteDisabled,
  onDelete,
}: {
  tenantSlug: string;
  shoppingListId: string;
  category: string;
  items: PatientShoppingItem[];
  onCheckedChange: (itemId: string, checked: boolean) => void;
  onEdit: (item: PatientShoppingItem) => void;
  deletingItemId: string | null;
  deleteDisabled: boolean;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-border-neutral bg-card-bg p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">
          {t(`shopping_list.categories.${categoryKey[category] ?? "other"}`)}
        </h3>
        <span className="rounded-full bg-warm-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-border-neutral/50">
        {items.map((item) => (
          <ShoppingListItemRow
            key={item.id}
            tenantSlug={tenantSlug}
            shoppingListId={shoppingListId}
            item={item}
            onCheckedChange={onCheckedChange}
            onEdit={onEdit}
            deletePending={deletingItemId === item.id}
            deleteDisabled={deleteDisabled}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
