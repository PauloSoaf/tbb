"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Apple, BookOpen, ChevronDown, Clock, Plus, Eye, Copy, Utensils, Search, Upload, Trash2, Loader2, ImageIcon, GripVertical } from "lucide-react";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { nativeMealPlanTemplates } from "@/data/meal-plan-templates";
import { getCustomStickersAction, addCustomStickerAction, deleteCustomStickerAction } from "@/actions/stickers.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  createLibraryDragPayload,
  MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE,
  MEAL_PLAN_LIBRARY_MEAL_DRAG_TYPE,
} from "@/lib/meal-plan/library-canvas";
import type { SavedMealPlanLibraryFood, SavedMealPlanLibraryMeal } from "@/lib/meal-plan/library-types";

interface StudioLibraryPanelProps {
  tenantSlug: string;
  customTemplates: { id: string; title: string; objective?: string | null; meals?: Record<string, unknown>[] }[];
  savedMeals: SavedMealPlanLibraryMeal[];
  savedFoods: SavedMealPlanLibraryFood[];
  onInsertSavedMeal: (meal: SavedMealPlanLibraryMeal) => void;
  onDeleteSavedMeal: (id: string) => Promise<void>;
  onDeleteSavedFood: (id: string) => Promise<void>;
  onImportTemplate: (templateId: string, isNative: boolean, mealsOverride?: Record<string, unknown>[]) => Promise<void>;
  onDeleteTemplate?: (templateId: string) => Promise<void>;
  selectedSection: "templates" | "taco" | "blocks";
  onSectionChange: (s: "templates" | "taco" | "blocks") => void;
  onAddBlock?: (type: "text" | "checklist" | "alert" | "divider") => void;
  onUploadImage?: (file: File) => Promise<string | null>;
}

interface CustomSticker {
  id: string;
  imageUrl: string;
}

const BLOCK_TYPES = [
  { id: "text", label: "Texto / Orientação", icon: "📝", description: "Parágrafo livre ou instruções" },
  { id: "checklist", label: "Checklist", icon: "✅", description: "Lista de verificação" },
  { id: "divider", label: "Divisor", icon: "➖", description: "Linha separadora" },
  { id: "alert", label: "Alerta", icon: "⚠️", description: "Destaque importante" },
];

export function StudioLibraryPanel({
  tenantSlug,
  customTemplates,
  savedMeals,
  savedFoods,
  onInsertSavedMeal,
  onDeleteSavedMeal,
  onDeleteSavedFood,
  onImportTemplate,
  onDeleteTemplate,
  selectedSection,
  onSectionChange,
  onAddBlock,
  onUploadImage,
}: StudioLibraryPanelProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [libraryView, setLibraryView] = useState<"models" | "meals" | "foods">("models");
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingStickerId, setDeletingStickerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedSection === "blocks") {
      getCustomStickersAction(tenantSlug).then(res => {
        if (res.stickers) setCustomStickers(res.stickers);
      });
    }
  }, [selectedSection, tenantSlug]);

  const handleUploadSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;

    setIsUploading(true);
    const url = await onUploadImage(file);
    if (url) {
      const res = await addCustomStickerAction(tenantSlug, url);
      if (res.sticker) {
        setCustomStickers(prev => [res.sticker, ...prev]);
        toast.success("Adesivo salvo no seu banco!");
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteSticker = async (stickerId: string) => {
    if (deletingStickerId) return;

    setDeletingStickerId(stickerId);
    try {
      const res = await deleteCustomStickerAction(tenantSlug, stickerId);
      if (res.success) {
        setCustomStickers(prev => prev.filter(s => s.id !== stickerId));
      } else {
        toast.error("Não foi possível excluir o adesivo.");
      }
    } catch {
      toast.error("Não foi possível excluir o adesivo.");
    } finally {
      setDeletingStickerId(null);
    }
  };

  const filteredNative = nativeMealPlanTemplates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCustom = customTemplates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredSavedMeals = savedMeals.filter((meal) => meal.name.toLocaleLowerCase().includes(normalizedSearch));
  const filteredSavedFoods = savedFoods.filter((food) => food.foodName.toLocaleLowerCase().includes(normalizedSearch));

  const STICKERS = ["🥑", "🥗", "🥩", "💧", "⏰", "💪", "🔥", "⚠️", "🍽️", "🥚", "🍌", "🍎", "🍗"];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-card-bg border-r border-border-neutral">
      {/* Section tabs */}
      <div className="flex border-b border-border-neutral bg-card-bg shrink-0">
        {[
          { id: "templates" as const, label: "Modelos", icon: BookOpen },
          { id: "blocks" as const, label: "Adesivos & Blocos", icon: Plus },
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => onSectionChange(sec.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
              selectedSection === sec.id
                ? "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10"
                : "text-text-secondary hover:text-text-primary hover:bg-gray-50 hover:bg-warm-beige"
            }`}
          >
            <sec.icon className="w-4 h-4" />
            {sec.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-card-bg">
        {selectedSection === "templates" ? (
          <>
            <div className="grid grid-cols-3 gap-1 border-b border-border-neutral bg-card-bg p-2">
              {([
                { id: "models", label: t("meal_plan_clinical.library.models"), icon: BookOpen, count: customTemplates.length + nativeMealPlanTemplates.length },
                { id: "meals", label: t("meal_plan_clinical.library.meals"), icon: Utensils, count: savedMeals.length },
                { id: "foods", label: t("meal_plan_clinical.library.foods"), icon: Apple, count: savedFoods.length },
              ] as const).map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => {
                    setLibraryView(view.id);
                    setSearch("");
                  }}
                  className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-semibold transition ${libraryView === view.id ? "bg-brand-blue/10 text-brand-blue" : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"}`}
                >
                  <view.icon className="h-4 w-4" />
                  <span className="truncate">{view.label}</span>
                  <span className="rounded-full bg-card-bg px-1.5 text-[9px] text-text-secondary">{view.count}</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-b border-border-neutral shrink-0 bg-gray-50 dark:bg-card-bg/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder={t(`meal_plan_clinical.library.search_${libraryView}`)}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {libraryView === "models" && (
                <>
              {filteredCustom.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 px-1 tracking-wider">Seus Modelos</p>
                  <div className="space-y-1.5">
                    {filteredCustom.map((template) => (
                      <TemplateCard
                        key={template.id}
                        id={template.id}
                        title={template.title}
                        objective={template.objective ?? ""}
                        meals={(template.meals as Record<string, unknown>[]) ?? []}
                        isOwn
                        tenantSlug={tenantSlug}
                        onImport={() => onImportTemplate(template.id, false)}
                        onImportMeal={(meal) => onImportTemplate(template.id, false, [meal])}
                        onDelete={onDeleteTemplate ? () => onDeleteTemplate(template.id) : undefined}
                        deleteLabel={t("meal_plan_workshop.card.delete")}
                        deletingLabel={t("meal_plan_workshop.card.deleting")}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1.5 px-1 tracking-wider">Modelos Nativos</p>
                <div className="space-y-1.5">
                  {filteredNative.map(t => (
                    <TemplateCard
                      key={t.id}
                      id={t.id}
                      title={t.title}
                      objective={t.objective}
                      meals={t.meals}
                      tenantSlug={tenantSlug}
                      onImport={() => onImportTemplate(t.id, true)}
                      onImportMeal={(meal) => onImportTemplate(t.id, true, [meal])}
                    />
                  ))}
                </div>
              </div>

              <Link
                href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos`}
                className="flex items-center justify-center gap-1.5 text-xs text-brand-blue hover:text-brand-hover font-medium mt-4 p-2 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-lg transition-colors"
              >
                Ver todos os modelos →
              </Link>
                </>
              )}

              {libraryView === "meals" && (
                <SavedMealsLibrary
                  meals={filteredSavedMeals}
                  onInsert={onInsertSavedMeal}
                  onDelete={onDeleteSavedMeal}
                />
              )}

              {libraryView === "foods" && (
                <SavedFoodsLibrary foods={filteredSavedFoods} onDelete={onDeleteSavedFood} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-border-neutral"></span>
                  Meus Adesivos
                  <span className="flex-1 h-[1px] bg-border-neutral"></span>
                </p>
                <input type="file" ref={fileInputRef} onChange={handleUploadSticker} className="hidden" accept="image/*, image/svg+xml" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand-blue hover:text-brand-hover disabled:opacity-50 transition-colors"
                >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Enviar
                </button>
              </div>
              
              {customStickers.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {customStickers.map(sticker => (
                    <div
                      key={sticker.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'custom-sticker',
                          url: sticker.imageUrl
                        }));
                      }}
                      className="group relative aspect-square flex items-center justify-center bg-card-bg border border-border-neutral rounded-xl cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-brand-blue/30 transition-all overflow-hidden"
                      title="Arrastar Adesivo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sticker.imageUrl} alt="Adesivo" className="w-full h-full object-contain p-1" />
                      <button
                        onClick={() => handleDeleteSticker(sticker.id)}
                        disabled={deletingStickerId !== null}
                        className={`absolute top-1 right-1 p-1 bg-black/50 text-white rounded transition-opacity hover:bg-danger disabled:cursor-wait ${
                          deletingStickerId === sticker.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                        title={deletingStickerId === sticker.id ? "Excluindo" : "Excluir"}
                      >
                        {deletingStickerId === sticker.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-border-neutral rounded-xl text-center flex flex-col items-center justify-center text-text-secondary">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                  <p className="text-xs">Nenhum adesivo salvo</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold mb-3 tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border-neutral"></span>
                Emojis
                <span className="flex-1 h-[1px] bg-border-neutral"></span>
              </p>
              <p className="text-xs text-text-secondary mb-3 italic text-center">Arraste para o texto para decorar</p>
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map(emoji => (
                  <div
                    key={emoji}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'sticker',
                        content: emoji
                      }));
                    }}
                    className="aspect-square flex items-center justify-center text-2xl bg-gray-50 dark:bg-card-bg border border-border-neutral rounded-xl cursor-grab active:cursor-grabbing hover:scale-110 hover:shadow-sm hover:border-brand-blue/30 transition-all"
                    title="Arrastar Adesivo"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold mb-3 tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border-neutral"></span>
                Blocos Estruturais
                <span className="flex-1 h-[1px] bg-border-neutral"></span>
              </p>
              <div className="space-y-2">
                {BLOCK_TYPES.map(b => (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'block',
                        id: b.id
                      }));
                    }}
                    onClick={() => onAddBlock?.(b.id as "text" | "checklist" | "alert" | "divider")}
                    className="bg-card-bg border border-border-neutral rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand-blue hover:shadow-sm transition-all group"
                    title={`Arrastar ${b.label}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-gray-50 dark:bg-slate-700 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">{b.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-text-primary group-hover:text-brand-blue transition-colors">{b.label}</p>
                        <p className="text-[10px] text-text-secondary leading-tight mt-0.5">{b.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedMealsLibrary({
  meals,
  onInsert,
  onDelete,
}: {
  meals: SavedMealPlanLibraryMeal[];
  onInsert: (meal: SavedMealPlanLibraryMeal) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (meals.length === 0) {
    return <LibraryEmptyState icon={Utensils} text={t("meal_plan_clinical.library.no_saved_meals")} />;
  }

  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-brand-blue/5 p-2 text-[10px] leading-relaxed text-text-secondary">
        {t("meal_plan_clinical.library.meal_drag_hint")}
      </p>
      {meals.map((meal) => {
        const totals = meal.items.reduce(
          (total, item) => ({
            calories: total.calories + (Number(item.calories) || 0),
            carbs: total.carbs + (Number(item.carbs) || 0),
            protein: total.protein + (Number(item.protein) || 0),
            fat: total.fat + (Number(item.fat) || 0),
          }),
          { calories: 0, carbs: 0, protein: 0, fat: 0 },
        );
        const isExpanded = expandedId === meal.id;
        const visibleItems = meal.items.slice(0, 5);
        const hiddenItemCount = Math.max(0, meal.items.length - visibleItems.length);
        const previewId = `saved-meal-foods-${meal.id}`;

        return (
          <div
            key={meal.id}
            draggable
            tabIndex={0}
            role="group"
            aria-label={meal.name}
            onDragStart={(event) => {
              const payload = JSON.stringify(createLibraryDragPayload({ type: "MEAL", meal }));
              event.dataTransfer.setData(MEAL_PLAN_LIBRARY_MEAL_DRAG_TYPE, payload);
              event.dataTransfer.setData("application/json", payload);
              event.dataTransfer.effectAllowed = "copy";
            }}
            className="group cursor-grab rounded-xl border border-border-neutral bg-card-bg p-3 transition hover:border-brand-blue/50 hover:shadow-sm focus-within:border-brand-blue/50 focus-within:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35 active:cursor-grabbing"
          >
            <div className="flex items-start gap-2">
              <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary group-hover:text-brand-blue" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-bold leading-tight text-text-primary">{meal.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-text-secondary">
                  {meal.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{meal.time}</span>}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={previewId}
                    onClick={() => setExpandedId((current) => current === meal.id ? null : meal.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-1.5 py-0.5 font-semibold text-brand-blue transition hover:bg-brand-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35"
                    title={t(isExpanded ? "meal_plan_clinical.library.hide_meal_foods" : "meal_plan_clinical.library.show_meal_foods")}
                  >
                    {meal.items.length} {t("meal_plan_clinical.library.food_count")}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : "group-hover:rotate-180 group-focus-within:rotate-180"}`} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInsert(meal)}
                className="rounded-lg p-1.5 text-brand-blue transition hover:bg-brand-blue/10"
                title={t("meal_plan_clinical.library.insert_meal")}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={async () => {
                  setDeletingId(meal.id);
                  try {
                    await onDelete(meal.id);
                  } finally {
                    setDeletingId(null);
                  }
                }}
                className="rounded-lg p-1.5 text-text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                title={t("meal_plan_clinical.library.delete_saved_meal")}
              >
                {deletingId === meal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1 pl-6 text-[9px]">
              <MealTotalBadge
                label={t("meal_plan_clinical.library.calories_short")}
                value={formatLibraryNumber(totals.calories)}
                unit="kcal"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
              />
              <MealTotalBadge
                label={t("meal_plan_clinical.library.carbs_short")}
                value={formatLibraryNumber(totals.carbs)}
                unit="g"
                className="bg-blue-500/10 text-blue-700 dark:text-blue-300"
              />
              <MealTotalBadge
                label={t("meal_plan_clinical.library.protein_short")}
                value={formatLibraryNumber(totals.protein)}
                unit="g"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              />
              <MealTotalBadge
                label={t("meal_plan_clinical.library.fat_short")}
                value={formatLibraryNumber(totals.fat)}
                unit="g"
                className="bg-rose-500/10 text-rose-700 dark:text-rose-300"
              />
            </div>

            <div
              id={previewId}
              className={`grid pl-6 transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                isExpanded
                  ? "mt-2 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 group-hover:mt-2 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:mt-2 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <ul className="space-y-1 rounded-lg border border-border-neutral/70 bg-surface-neutral/45 p-1.5">
                  {visibleItems.map((item, itemIndex) => (
                    <li
                      key={`${meal.id}-${itemIndex}-${item.foodName}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-card-bg/75 px-2 py-1 text-[10px]"
                    >
                      <span className="min-w-0 flex-1 break-words font-medium leading-tight text-text-primary" title={item.foodName}>
                        {item.foodName}
                      </span>
                      <span
                        className="shrink-0 whitespace-nowrap text-right text-text-secondary"
                        title={item.householdMeasure || undefined}
                      >
                        {formatLibraryNumber(item.quantity)} {item.unit}
                      </span>
                    </li>
                  ))}
                  {hiddenItemCount > 0 && (
                    <li className="px-2 py-0.5 text-center text-[9px] font-semibold text-text-secondary">
                      +{hiddenItemCount} {t("meal_plan_clinical.library.food_count")}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MealTotalBadge({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  className: string;
}) {
  return (
    <span className={`flex min-w-0 flex-col items-start rounded-md px-2 py-1 ${className}`}>
      <span className="text-[8px] font-semibold uppercase leading-tight tracking-wide">{label}</span>
      <span className="font-bold leading-tight">{value} {unit}</span>
    </span>
  );
}

function formatLibraryNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 10) / 10);
}

function SavedFoodsLibrary({
  foods,
  onDelete,
}: {
  foods: SavedMealPlanLibraryFood[];
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (foods.length === 0) {
    return <LibraryEmptyState icon={Apple} text={t("meal_plan_clinical.library.no_saved_foods")} />;
  }

  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-brand-blue/5 p-2 text-[10px] leading-relaxed text-text-secondary">
        {t("meal_plan_clinical.library.food_drag_hint")}
      </p>
      {foods.map((food) => (
        <div
          key={food.id}
          draggable
          onDragStart={(event) => {
            const payload = JSON.stringify(createLibraryDragPayload({ type: "FOOD", food }));
            event.dataTransfer.setData(MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE, payload);
            event.dataTransfer.setData("application/json", payload);
            event.dataTransfer.effectAllowed = "copy";
          }}
          className="group cursor-grab rounded-xl border border-border-neutral bg-card-bg p-3 transition hover:border-brand-blue/50 hover:shadow-sm active:cursor-grabbing"
        >
          <div className="flex items-start gap-2">
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary group-hover:text-brand-blue" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-text-primary">{food.foodName}</p>
              <p className="mt-1 text-[10px] text-text-secondary">
                {food.quantity} {food.unit}
                {food.householdMeasure ? ` · ${food.householdMeasure}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] font-semibold">
                <span className="text-amber-600">{food.calories} kcal</span>
                <span className="text-blue-600">C {food.carbs}g</span>
                <span className="text-emerald-600">P {food.protein}g</span>
                <span className="text-rose-500">G {food.fat}g</span>
              </div>
            </div>
            <button
              type="button"
              disabled={deletingId !== null}
              onClick={async () => {
                setDeletingId(food.id);
                try {
                  await onDelete(food.id);
                } finally {
                  setDeletingId(null);
                }
              }}
              className="rounded-lg p-1.5 text-text-secondary transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              title={t("meal_plan_clinical.library.delete_saved_food")}
            >
              {deletingId === food.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LibraryEmptyState({ icon: Icon, text }: { icon: typeof Utensils; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-neutral p-5 text-center text-text-secondary">
      <Icon className="mx-auto h-6 w-6 opacity-50" />
      <p className="mt-2 text-xs">{text}</p>
    </div>
  );
}

function TemplateCard({ id, title, objective, meals, isOwn, tenantSlug, onImport, onImportMeal, onDelete, deleteLabel = "Excluir modelo", deletingLabel = "Excluindo..." }: {
  id: string; title: string; objective: string; meals: Record<string, unknown>[]; isOwn?: boolean; tenantSlug: string; 
  onImport: () => Promise<void>; onImportMeal: (meal: Record<string, unknown>) => Promise<void>; onDelete?: () => Promise<void>;
  deleteLabel?: string; deletingLabel?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (isCopying || isDeleting) return;

    setIsCopying(true);
    try {
      await onImport();
    } finally {
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-card-bg border border-border-neutral rounded-lg p-2.5 hover:border-brand-blue/50 hover:shadow-sm transition-all group">
      <div 
        className="flex items-start justify-between gap-1 mb-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">{title}</p>
          <p className="text-[10px] text-text-secondary truncate">{objective}</p>
        </div>
        {isOwn && (
          <span className="text-[9px] bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5">SEU</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-secondary flex items-center gap-0.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <Utensils className="w-2.5 h-2.5" /> {meals.length} refeições
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${id}`}
            className="p-1 rounded text-text-secondary hover:text-brand-blue hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 transition-colors"
            title="Visualizar"
          >
            <Eye className="w-3 h-3" />
          </Link>
          <button
            onClick={handleCopy}
            disabled={isCopying || isDeleting}
            className="p-1 rounded text-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:cursor-wait disabled:text-emerald-600"
            title={isCopying ? t("meal_plan_workshop.card.copying") : t("meal_plan_workshop.card.copy_to_studio")}
            aria-label={isCopying ? t("meal_plan_workshop.card.copying") : t("meal_plan_workshop.card.copy_to_studio")}
          >
            {isCopying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
          {isOwn && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isCopying}
              className="p-1 rounded text-text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:cursor-wait disabled:text-rose-600"
              title={isDeleting ? deletingLabel : deleteLabel}
              aria-label={isDeleting ? deletingLabel : deleteLabel}
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && meals.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-neutral/50 space-y-1">
          {meals.map((meal, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 px-1.5 hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 rounded text-[10px]">
              <span className="text-text-secondary truncate pr-2" title={String(meal.name ?? "")}>{String(meal.name ?? "")}</span>
              <AsyncButton
                onClick={() => onImportMeal(meal)}
                pendingLabel={null}
                disabled={isCopying || isDeleting}
                className="shrink-0 p-0.5 text-brand-blue hover:text-brand-hover disabled:cursor-wait"
                title="Adicionar esta refeição ao plano"
              >
                <Plus className="w-3 h-3" />
              </AsyncButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
