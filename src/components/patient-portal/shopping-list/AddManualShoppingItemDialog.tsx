"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addShoppingListItemAction, updateShoppingListItemAction } from "@/actions/shopping-list.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { PatientShoppingItem } from "./ShoppingListCategoryGroup";

const CATEGORIES = [
  "FRUITS",
  "VEGETABLES",
  "PROTEINS",
  "GRAINS",
  "DAIRY",
  "LEGUMES",
  "OILS",
  "SEASONINGS",
  "BEVERAGES",
  "SUPPLEMENTS",
  "OTHER",
] as const;

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

export function AddManualShoppingItemDialog({
  tenantSlug,
  shoppingListId,
  open,
  item,
  onClose,
  onSaved,
}: {
  tenantSlug: string;
  shoppingListId: string;
  open: boolean;
  item: PatientShoppingItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity != null ? String(item.quantity) : "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [category, setCategory] = useState(item?.category ?? "OTHER");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    const payload = {
      name,
      quantity: quantity ? Number(quantity) : null,
      unit: unit || null,
      category,
      notes: notes || null,
      source: item ? item.source : "MANUAL",
    };

    startTransition(async () => {
      const result = item
        ? await updateShoppingListItemAction(tenantSlug, shoppingListId, item.id, payload)
        : await addShoppingListItemAction(tenantSlug, shoppingListId, payload);
      if (!result.success) {
        toast.error(result.error ?? t("shopping_list.toasts.error_save"));
        return;
      }
      toast.success(item ? t("shopping_list.toasts.item_updated") : t("shopping_list.toasts.item_added"));
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border-neutral bg-card-bg p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-text-primary">
            {item ? t("shopping_list.edit_item") : t("shopping_list.add_manual_item")}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-warm-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("shopping_list.item_name_placeholder")}
            className="w-full rounded-xl border border-border-neutral bg-warm-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("shopping_list.item_quantity_placeholder")}
              type="number"
              min="0"
              className="rounded-xl border border-border-neutral bg-warm-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder={t("shopping_list.item_unit_placeholder")}
              className="rounded-xl border border-border-neutral bg-warm-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-border-neutral bg-warm-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`shopping_list.categories.${categoryKey[cat]}`)}
              </option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder={t("shopping_list.item_notes_placeholder")}
            className="w-full resize-none rounded-xl border border-border-neutral bg-warm-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isPending || !name.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {item ? t("shopping_list.edit_item") : t("shopping_list.add_manual_item")}
        </button>
      </div>
    </div>
  );
}
