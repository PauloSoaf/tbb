"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";
import {
  addSubstitutionItemAction,
  createSubstitutionGroupAction,
  deleteSubstitutionGroupAction,
  deleteSubstitutionItemAction,
  getSubstitutionGroupsByMealItemAction,
  updateSubstitutionGroupAction,
} from "@/actions/meal-substitution.action";
import type { MealSubstitutionGroupDTO } from "@/services/meal-substitution.service";
import { EquivalentFoodSearch } from "./EquivalentFoodSearch";
import { SubstitutionBadge } from "./SubstitutionBadge";
import { SubstitutionItemList } from "./SubstitutionItemList";
import type { SubstitutionBaseItem, SubstitutionBasis } from "./types";

const BASIS_OPTIONS: SubstitutionBasis[] = ["CALORIES", "CARBS", "PROTEIN", "FAT", "PORTION", "MANUAL"];

type TacoSubstituteInput = {
  foodName: string;
  source: "TACO";
  tacoFoodId: string;
  quantity?: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  equivalenceNotes?: string;
};

export function SubstitutionGroupDrawer({
  tenantSlug,
  mealPlanId,
  mealId,
  mealItem,
}: {
  tenantSlug: string;
  mealPlanId: string;
  mealId: string;
  mealItem: SubstitutionBaseItem;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<MealSubstitutionGroupDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [basis, setBasis] = useState<SubstitutionBasis>("CALORIES");
  const [title, setTitle] = useState("");
  const [customName, setCustomName] = useState("");
  const [customQuantity, setCustomQuantity] = useState("");
  const [customUnit, setCustomUnit] = useState("g");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null,
    [activeGroupId, groups],
  );

  const substitutionCount = groups.reduce((total, group) => total + group.items.length, 0);

  async function loadGroups() {
    setLoading(true);
    const result = await getSubstitutionGroupsByMealItemAction(tenantSlug, mealItem.id);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setGroups(result.groups);
    setActiveGroupId(result.groups[0]?.id ?? null);
    if (result.groups[0]) {
      setBasis(result.groups[0].equivalenceBasis);
      setTitle(result.groups[0].title);
    } else {
      setTitle(t("meal_substitutions.default_group_title", { food: mealItem.foodName }));
    }
  }

  useEffect(() => {
    if (open) {
      queueMicrotask(() => void loadGroups());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealItem.id]);

  async function createGroup() {
    if (pendingAction) return;
    setPendingAction("group:create");
    try {
      const result = await createSubstitutionGroupAction(tenantSlug, {
        mealPlanId,
        mealId,
        baseMealItemId: mealItem.id,
        type: "ITEM_REPLACEMENT",
        title: title.trim() || t("meal_substitutions.default_group_title", { food: mealItem.foodName }),
        equivalenceBasis: basis,
        targetCalories: mealItem.calories,
        targetProtein: mealItem.protein,
        targetCarbs: mealItem.carbs,
        targetFat: mealItem.fat,
        targetQuantity: mealItem.quantity,
        targetUnit: mealItem.unit,
        visibleToPatient: true,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.group_created"));
      setGroups((current) => [...current, result.group]);
      setActiveGroupId(result.group.id);
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleVisibility(group: MealSubstitutionGroupDTO) {
    if (pendingAction) return;
    setPendingAction(`group:visibility:${group.id}`);
    try {
      const result = await updateSubstitutionGroupAction(tenantSlug, {
        id: group.id,
        visibleToPatient: !group.visibleToPatient,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.group_updated"));
      setGroups((current) => current.map((item) => (item.id === result.group.id ? result.group : item)));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteGroup(groupId: string) {
    if (pendingAction) return;
    setPendingAction(`group:delete:${groupId}`);
    try {
      const result = await deleteSubstitutionGroupAction(tenantSlug, groupId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.group_deleted"));
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setActiveGroupId((current) => (current === groupId ? null : current));
    } finally {
      setPendingAction(null);
    }
  }

  async function addTacoSubstitute(item: TacoSubstituteInput) {
    if (!activeGroup || pendingAction) return;
    setPendingAction(`item:add:${item.tacoFoodId}`);
    try {
      const result = await addSubstitutionItemAction(tenantSlug, { ...item, groupId: activeGroup.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.item_added"));
      setGroups((current) => current.map((group) => (
        group.id === activeGroup.id ? { ...group, items: [...group.items, result.item] } : group
      )));
    } finally {
      setPendingAction(null);
    }
  }

  async function addCustomSubstitute() {
    if (!activeGroup || !customName.trim() || pendingAction) return;
    setPendingAction("item:add:custom");
    try {
      const result = await addSubstitutionItemAction(tenantSlug, {
        groupId: activeGroup.id,
        foodName: customName.trim(),
        source: "CUSTOM",
        quantity: customQuantity ? Number(customQuantity) : undefined,
        unit: customUnit || undefined,
        calories: customCalories ? Number(customCalories) : undefined,
        protein: customProtein ? Number(customProtein) : undefined,
        carbs: customCarbs ? Number(customCarbs) : undefined,
        fat: customFat ? Number(customFat) : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.item_added"));
      setCustomName("");
      setCustomQuantity("");
      setCustomCalories("");
      setCustomProtein("");
      setCustomCarbs("");
      setCustomFat("");
      setGroups((current) => current.map((group) => (
        group.id === activeGroup.id ? { ...group, items: [...group.items, result.item] } : group
      )));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!activeGroup || pendingAction) return;
    setPendingAction(`item:delete:${itemId}`);
    try {
      const result = await deleteSubstitutionItemAction(tenantSlug, itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_substitutions.toasts.item_deleted"));
      setGroups((current) => current.map((group) => (
        group.id === activeGroup.id ? { ...group, items: group.items.filter((item) => item.id !== itemId) } : group
      )));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <SubstitutionBadge count={substitutionCount} onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto border-l border-border-neutral bg-white dark:bg-gray-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-border-neutral pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">{t("meal_substitutions.title")}</p>
                <h2 className="mt-1 text-lg font-bold text-text-primary leading-tight">{mealItem.foodName}</h2>
                <p className="mt-1 text-xs text-text-secondary">{t("meal_substitutions.patient_warning")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary"
                aria-label={t("common.close", { defaultValue: "Fechar" })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-brand-blue">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Create group form */}
                <section className="rounded-2xl border border-border-neutral bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Novo grupo</p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="block">
                      <span className="text-xs font-medium text-text-secondary">{t("meal_substitutions.group_title")}</span>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-border-neutral bg-white dark:bg-gray-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-text-secondary">{t("meal_substitutions.equivalence_basis")}</span>
                      <select
                        value={basis}
                        onChange={(event) => setBasis(event.target.value as SubstitutionBasis)}
                        className="mt-1 w-full rounded-xl border border-border-neutral bg-white dark:bg-gray-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                      >
                        {BASIS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{t(`meal_substitutions.basis.${option}`)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <AsyncButton
                    type="button"
                    onClick={createGroup}
                    pending={pendingAction === "group:create"}
                    pendingLabel={t("common.loading", { defaultValue: "Criando..." })}
                    disabled={pendingAction !== null && pendingAction !== "group:create"}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-blue-hover disabled:opacity-70"
                  >
                    <Plus className="h-4 w-4" />
                    {t("meal_substitutions.add_group")}
                  </AsyncButton>
                </section>

                {groups.length > 0 && (
                  <section className="space-y-3">
                    {/* Group tabs */}
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setActiveGroupId(group.id);
                            setBasis(group.equivalenceBasis);
                            setTitle(group.title);
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeGroup?.id === group.id
                              ? "bg-brand-blue text-white shadow-sm"
                              : "border border-border-neutral bg-white dark:bg-gray-800 text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {group.title}
                        </button>
                      ))}
                    </div>

                    {activeGroup && (
                      <div className="rounded-2xl border border-border-neutral bg-white dark:bg-gray-800 shadow-sm">
                        {/* Group header */}
                        <div className="flex items-center justify-between gap-3 border-b border-border-neutral px-4 py-3">
                          <div>
                            <h3 className="font-semibold text-text-primary">{activeGroup.title}</h3>
                            <p className="text-xs text-text-secondary">
                              {activeGroup.visibleToPatient
                                ? t("meal_substitutions.visible_to_patient")
                                : t("meal_substitutions.hidden_from_patient")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <AsyncButton
                              type="button"
                              onClick={() => toggleVisibility(activeGroup)}
                              pending={pendingAction === `group:visibility:${activeGroup.id}`}
                              pendingLabel={null}
                              disabled={pendingAction !== null && pendingAction !== `group:visibility:${activeGroup.id}`}
                              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-brand-blue"
                              aria-label={t("meal_substitutions.visible_to_patient")}
                            >
                              {activeGroup.visibleToPatient ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </AsyncButton>
                            <AsyncButton
                              type="button"
                              onClick={() => deleteGroup(activeGroup.id)}
                              pending={pendingAction === `group:delete:${activeGroup.id}`}
                              pendingLabel={null}
                              disabled={pendingAction !== null && pendingAction !== `group:delete:${activeGroup.id}`}
                              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                              aria-label={t("meal_substitutions.delete_group")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </AsyncButton>
                          </div>
                        </div>

                        <div className="p-4 space-y-5">
                          <SubstitutionItemList items={activeGroup.items} onDelete={deleteItem} disabled={pendingAction !== null} />

                          <div className="grid gap-5 lg:grid-cols-2">
                            {/* TACO search */}
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">{t("meal_substitutions.taco_food")}</p>
                              <EquivalentFoodSearch
                                baseItem={mealItem}
                                basis={activeGroup.equivalenceBasis}
                                onAdd={addTacoSubstitute}
                                disabled={pendingAction !== null}
                              />
                            </div>

                            {/* Custom food */}
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">{t("meal_substitutions.custom_food")}</p>
                              <div className="space-y-2">
                                <input
                                  value={customName}
                                  onChange={(e) => setCustomName(e.target.value)}
                                  placeholder={t("meal_substitutions.food_name")}
                                  className="w-full rounded-xl border border-border-neutral bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-text-secondary/60"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: customQuantity, setter: setCustomQuantity, placeholder: t("meal_substitutions.quantity"), type: "number" },
                                    { value: customUnit, setter: setCustomUnit, placeholder: t("meal_substitutions.unit"), type: "text" },
                                    { value: customCalories, setter: setCustomCalories, placeholder: t("meal_substitutions.calories"), type: "number" },
                                    { value: customProtein, setter: setCustomProtein, placeholder: t("meal_substitutions.protein"), type: "number" },
                                    { value: customCarbs, setter: setCustomCarbs, placeholder: t("meal_substitutions.carbs"), type: "number" },
                                    { value: customFat, setter: setCustomFat, placeholder: t("meal_substitutions.fat"), type: "number" },
                                  ].map(({ value, setter, placeholder, type }) => (
                                    <input
                                      key={placeholder}
                                      value={value}
                                      onChange={(e) => setter(e.target.value)}
                                      placeholder={placeholder}
                                      type={type}
                                      min={type === "number" ? "0" : undefined}
                                      className="rounded-xl border border-border-neutral bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-text-secondary/60"
                                    />
                                  ))}
                                </div>
                                <AsyncButton
                                  type="button"
                                  onClick={addCustomSubstitute}
                                  pending={pendingAction === "item:add:custom"}
                                  pendingLabel={t("common.loading", { defaultValue: "Adicionando..." })}
                                  disabled={(pendingAction !== null && pendingAction !== "item:add:custom") || !customName.trim()}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-blue-hover disabled:opacity-70"
                                >
                                  <Plus className="h-4 w-4" />
                                  {t("meal_substitutions.add_substitute")}
                                </AsyncButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
