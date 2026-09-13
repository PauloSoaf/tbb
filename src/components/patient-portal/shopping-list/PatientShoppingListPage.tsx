"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { archiveShoppingListAction, deleteShoppingListItemAction } from "@/actions/shopping-list.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GenerateShoppingListCard } from "./GenerateShoppingListCard";
import { ShoppingListCategoryGroup, type PatientShoppingItem } from "./ShoppingListCategoryGroup";
import { AddManualShoppingItemDialog } from "./AddManualShoppingItemDialog";
import { CopyShoppingListButton } from "./CopyShoppingListButton";
import { ShoppingListEmptyState } from "./ShoppingListEmptyState";

export type PatientShoppingList = {
  id: string;
  title: string;
  periodDays: number;
  createdAt: string;
  generatedFromPlan: boolean;
  items: PatientShoppingItem[];
  mealPlan: { id: string; title: string } | null;
};

const CATEGORY_ORDER = [
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
];

export function PatientShoppingListPage({
  tenantSlug,
  activePlan,
  initialList,
}: {
  tenantSlug: string;
  activePlan: { id: string; title: string } | null;
  initialList: PatientShoppingList | null;
}) {
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const router = useRouter();
  const [list, setList] = useState(initialList);
  const [editingItem, setEditingItem] = useState<PatientShoppingItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isArchiving, startArchiveTransition] = useTransition();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const deletingItemIdRef = useRef<string | null>(null);

  const groups = useMemo(() => {
    const byCategory = new Map<string, PatientShoppingItem[]>();
    for (const item of list?.items ?? []) {
      const current = byCategory.get(item.category) ?? [];
      current.push(item);
      byCategory.set(item.category, current);
    }
    return CATEGORY_ORDER
      .map((category) => ({ category, items: byCategory.get(category) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [list]);

  const checkedCount = list?.items.filter((item) => item.checked).length ?? 0;
  const total = list?.items.length ?? 0;

  function handleCheckedChange(itemId: string, checked: boolean) {
    setList((current) => current
      ? { ...current, items: current.items.map((item) => (item.id === itemId ? { ...item, checked } : item)) }
      : current);
  }

  async function handleDelete(itemId: string) {
    if (!list || deletingItemIdRef.current) return;

    deletingItemIdRef.current = itemId;
    setDeletingItemId(itemId);
    try {
      const result = await deleteShoppingListItemAction(tenantSlug, list.id, itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("shopping_list.toasts.item_deleted"));
      setList((current) => current
        ? { ...current, items: current.items.filter((item) => item.id !== itemId) }
        : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("shopping_list.toasts.error_save"));
    } finally {
      deletingItemIdRef.current = null;
      setDeletingItemId(null);
    }
  }

  async function handleArchive() {
    if (!list) return;
    const confirmed = await requestConfirmation({
      title: t("confirmations.archive_shopping_list.title"),
      description: t("confirmations.archive_shopping_list.description"),
      confirmLabel: t("confirmations.archive_shopping_list.confirm"),
      tone: "warning",
    });
    if (!confirmed) return;
    startArchiveTransition(async () => {
      const result = await archiveShoppingListAction(tenantSlug, list.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("shopping_list.toasts.archived"));
      setList(null);
      router.refresh();
    });
  }

  function refreshAfterSave() {
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("shopping_list.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("shopping_list.subtitle")}</p>
      </div>

      <GenerateShoppingListCard tenantSlug={tenantSlug} activePlan={activePlan} />

      {list ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border-neutral bg-card-bg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-text-primary">{list.title}</h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {t("shopping_list.generated_from_plan_notice", { days: list.periodDays })}
                </p>
                <p className="mt-1 text-xs font-semibold text-brand-blue">
                  {t("shopping_list.items_checked", { count: checkedCount, total })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-blue-hover"
                >
                  <Plus className="h-4 w-4" />
                  {t("shopping_list.add_manual_item")}
                </button>
                <CopyShoppingListButton tenantSlug={tenantSlug} shoppingListId={list.id} />
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-neutral bg-card-bg px-3 py-2 text-sm font-semibold text-text-primary transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:text-brand-blue hover:shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  {t("shopping_list.print")}
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isArchiving || deletingItemId !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-neutral bg-card-bg px-3 py-2 text-sm font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-danger/30 hover:text-danger hover:shadow-sm disabled:opacity-70"
                >
                  {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  {t("shopping_list.archive")}
                </button>
              </div>
            </div>
          </div>

          {groups.map((group) => (
            <ShoppingListCategoryGroup
              key={group.category}
              tenantSlug={tenantSlug}
              shoppingListId={list.id}
              category={group.category}
              items={group.items}
              onCheckedChange={handleCheckedChange}
              deletingItemId={deletingItemId}
              deleteDisabled={deletingItemId !== null || isArchiving}
              onEdit={(item) => {
                setEditingItem(item);
                setDialogOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}

          {dialogOpen && (
            <AddManualShoppingItemDialog
              key={editingItem?.id ?? "new-shopping-item"}
              tenantSlug={tenantSlug}
              shoppingListId={list.id}
              open={dialogOpen}
              item={editingItem}
              onClose={() => setDialogOpen(false)}
              onSaved={refreshAfterSave}
            />
          )}
        </section>
      ) : (
        <ShoppingListEmptyState />
      )}
      {confirmDialog}
    </div>
  );
}
