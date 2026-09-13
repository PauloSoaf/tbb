"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { toggleShoppingListItemCheckedAction } from "@/actions/shopping-list.action";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  householdMeasure: string | null;
  source: string;
  checked: boolean;
  notes: string | null;
}

interface Props {
  tenantSlug: string;
  shoppingListId: string;
  item: ShoppingItem;
  onCheckedChange: (itemId: string, checked: boolean) => void;
  onEdit: (item: ShoppingItem) => void;
  deleteDisabled: boolean;
  deletePending: boolean;
  onDelete: (itemId: string) => Promise<void>;
}

export function ShoppingListItemRow({
  tenantSlug,
  shoppingListId,
  item,
  onCheckedChange,
  onEdit,
  deleteDisabled,
  deletePending,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !item.checked;
    onCheckedChange(item.id, next); // optimistic
    startTransition(async () => {
      const result = await toggleShoppingListItemCheckedAction(
        tenantSlug,
        shoppingListId,
        item.id,
        next
      );
      if (!result.success) {
        onCheckedChange(item.id, item.checked); // revert
        toast.error(result.error ?? t("shopping_list.toasts.error_save"));
      }
    });
  };

  const quantityText =
    item.quantity != null
      ? `${item.quantity}${item.unit ?? ""}`
      : item.householdMeasure
        ? item.householdMeasure
        : t("shopping_list.quantity_not_informed", { defaultValue: "Qtd. não informada" });

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-1 rounded-xl transition-colors ${
        item.checked ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
          item.checked
            ? "bg-emerald-500 border-emerald-500"
            : "border-border-neutral hover:border-brand-blue"
        }`}
        title={item.checked
          ? t("shopping_list.mark_unchecked", { defaultValue: "Desmarcar" })
          : t("shopping_list.mark_checked", { defaultValue: "Marcar como comprado" })}
      >
        {isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-blue" />
          : item.checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>

      {/* Name + qty */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-text-primary truncate ${item.checked ? "line-through" : ""}`}>
          {item.name}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-secondary">{quantityText}</p>
          {item.source === "MANUAL" && (
            <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full px-1.5 py-0.5 font-medium">
              {t("shopping_list.source_manual", { defaultValue: "Manual" })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="p-1.5 text-text-tertiary hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
          title={t("shopping_list.edit_item", { defaultValue: "Editar" })}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <AsyncButton
          onClick={() => onDelete(item.id)}
          pending={deletePending}
          pendingLabel={null}
          disabled={deleteDisabled}
          className="p-1.5 text-text-tertiary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          aria-label={t("shopping_list.delete_item", { defaultValue: "Remover" })}
          title={t("shopping_list.delete_item", { defaultValue: "Remover" })}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </AsyncButton>
      </div>
    </div>
  );
}
