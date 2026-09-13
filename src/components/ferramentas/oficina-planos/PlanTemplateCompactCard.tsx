"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  Copy,
  UserPlus,
  Star,
  Trash2,
  Sparkles,
  Utensils,
  Flame,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { routes } from "@/lib/navigation/routes";
import { StudioNavigationLink } from "./StudioNavigationLink";

export interface WorkshopTemplateItem {
  id: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  totalCalories: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
  mealsCount: number;
  itemsCount?: number;
  isNative: boolean;
  color?: string;
  updatedAt?: string | Date | null;
}

interface PlanTemplateCompactCardProps {
  template: WorkshopTemplateItem;
  tenantSlug: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onUseForPatient: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function PlanTemplateCompactCard({
  template,
  tenantSlug,
  isFavorite,
  onToggleFavorite,
  onDuplicate,
  onUseForPatient,
  onDelete,
}: PlanTemplateCompactCardProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"duplicate" | "delete" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDraft =
    !template.title ||
    template.title === "Plano sem título" ||
    template.totalCalories === 0 ||
    template.mealsCount === 0;

  const hasMacros =
    (template.totalProtein ?? 0) > 0 ||
    (template.totalCarbs ?? 0) > 0 ||
    (template.totalFat ?? 0) > 0;

  const handleDuplicateClick = async () => {
    setLoadingAction("duplicate");
    setMenuOpen(false);
    try {
      await onDuplicate(template.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUseForPatientClick = () => {
    setMenuOpen(false);
    onUseForPatient(template.id);
  };

  const handleDeleteClick = async () => {
    setLoadingAction("delete");
    setMenuOpen(false);
    try {
      await onDelete(template.id);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-card-bg rounded-2xl border border-border-neutral p-5 flex flex-col justify-between hover:border-brand-blue/50 hover:shadow-xl transition-all duration-300 relative group min-h-[190px] overflow-hidden">
      {/* Top Accent for NutriOpus Native Models */}
      {template.isNative && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-indigo-500 to-cyan-400" />
      )}

      {/* Top Section: Title, Objective, Badges */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <AppTooltip content={template.title || "Sem título"} delayMs={200}>
                <h3 className="text-base font-bold text-text-primary truncate group-hover:text-brand-blue transition-colors">
                  {template.title || "Sem título"}
                </h3>
              </AppTooltip>

              {isDraft && (
                <AppTooltip content={t("meal_plan_workshop.card.draft_tooltip")} delayMs={100}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {t("meal_plan_workshop.card.draft")}
                  </span>
                </AppTooltip>
              )}
            </div>

            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1 font-normal">
              {template.objective || "Objetivo geral"}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {template.isNative ? (
              <AppTooltip content={t("meal_plan_workshop.card.system_model_tooltip")} delayMs={100}>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-brand-blue border border-blue-500/20 shadow-2xs">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  {t("meal_plan_workshop.card.system_model")}
                </span>
              </AppTooltip>
            ) : (
              <AppTooltip content={t("meal_plan_workshop.card.my_model_tooltip")} delayMs={100}>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-neutral text-text-secondary border border-border-neutral">
                  {t("meal_plan_workshop.card.my_model")}
                </span>
              </AppTooltip>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: Indicators Box (Kcal, Meals, Macros) */}
      <div className="my-4 py-2.5 px-3.5 rounded-xl bg-surface-neutral/80 dark:bg-surface-neutral/40 border border-border-neutral/60 flex items-center justify-between gap-2 text-xs shadow-2xs">
        {/* Kcal */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            {template.totalCalories > 0 ? (
              <AppTooltip content={t("meal_plan_workshop.card.kcal_tooltip")} delayMs={150}>
                <span className="font-bold text-text-primary">
                  {Math.round(template.totalCalories)}{" "}
                  <span className="font-medium text-text-secondary text-[11px]">
                    {t("meal_plan_workshop.card.kcal_label")}
                  </span>
                </span>
              </AppTooltip>
            ) : (
              <AppTooltip content={t("meal_plan_workshop.card.not_calculated_tooltip")} delayMs={150}>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {t("meal_plan_workshop.card.not_calculated")}
                </span>
              </AppTooltip>
            )}
          </div>
        </div>

        {/* Meals Count */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Utensils className="w-3.5 h-3.5" />
          </div>
          <AppTooltip content={t("meal_plan_workshop.card.meals_tooltip")} delayMs={150}>
            <span className="font-bold text-text-primary">
              {template.mealsCount}{" "}
              <span className="font-medium text-text-secondary text-[11px]">
                {t("meal_plan_workshop.card.meals_label")}
              </span>
            </span>
          </AppTooltip>
        </div>

        {/* Macros */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 text-[11px] font-medium text-text-secondary">
          {hasMacros ? (
            <AppTooltip content={t("meal_plan_workshop.card.macros_tooltip")} delayMs={150}>
              <span className="bg-card-bg px-2 py-1 rounded-md border border-border-neutral/60 shadow-2xs">
                <span className="text-blue-600 dark:text-blue-400 font-bold">P:</span> {Math.round(template.totalProtein || 0)}g ·{" "}
                <span className="text-amber-600 dark:text-amber-400 font-bold">C:</span> {Math.round(template.totalCarbs || 0)}g ·{" "}
                <span className="text-rose-600 dark:text-rose-400 font-bold">G:</span> {Math.round(template.totalFat || 0)}g
              </span>
            </AppTooltip>
          ) : (
            <AppTooltip content={t("meal_plan_workshop.card.macros_not_available")} delayMs={150}>
              <span className="text-text-secondary/60 italic">Sem macros</span>
            </AppTooltip>
          )}
        </div>
      </div>

      {/* Bottom Section: Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Primary Action Button */}
        <StudioNavigationLink
          href={routes.oficinaStudio(tenantSlug, template.id)}
          label={
            isDraft
              ? t("meal_plan_workshop.card.complete_model")
              : t("meal_plan_workshop.card.open_studio")
          }
          pendingLabel={t("meal_plan_workshop.card.opening_studio")}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-brand-blue/25 bg-brand-blue/5 px-3.5 py-2 text-xs font-semibold text-brand-blue transition-colors duration-200 hover:border-brand-blue/45 hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/20"
        />

        {/* Favorite Button */}
        <AppTooltip
          content={
            isFavorite
              ? t("meal_plan_workshop.card.unfavorite")
              : t("meal_plan_workshop.card.favorite")
          }
          delayMs={100}
        >
          <span className="inline-flex">
            <button
              onClick={() => onToggleFavorite(template.id)}
              className={`p-2 rounded-xl border transition-all duration-200 ${
                isFavorite
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-2xs"
                  : "border-border-neutral bg-card-bg text-text-secondary hover:text-amber-500 hover:bg-surface-neutral hover:border-amber-500/30"
              }`}
              aria-label="Favoritar"
            >
              <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
            </button>
          </span>
        </AppTooltip>

        {/* More Actions Dropdown */}
        <div className="relative" ref={menuRef}>
          <AppTooltip content={t("meal_plan_workshop.card.more_actions")} delayMs={100}>
            <span className="inline-flex">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                disabled={loadingAction !== null}
                className="p-2 rounded-xl border border-border-neutral bg-card-bg text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors disabled:opacity-50"
                aria-label={t("meal_plan_workshop.card.more_actions")}
              >
                {loadingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
                ) : (
                  <MoreHorizontal className="w-4 h-4" />
                )}
              </button>
            </span>
          </AppTooltip>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl border border-border-neutral bg-card-bg p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              {/* Duplicate */}
              <AppTooltip content={t("meal_plan_workshop.card.duplicate_tooltip")} side="left" delayMs={100}>
                <span className="block w-full">
                  <button
                    onClick={handleDuplicateClick}
                    disabled={loadingAction !== null}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-primary hover:bg-surface-neutral transition-colors text-left font-medium disabled:opacity-50"
                  >
                    {loadingAction === "duplicate" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-blue shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                    )}
                    <span>{t("meal_plan_workshop.card.duplicate")}</span>
                  </button>
                </span>
              </AppTooltip>

              {/* Use for patient */}
              <AppTooltip content={t("meal_plan_workshop.card.use_for_patient_tooltip")} side="left" delayMs={100}>
                <span className="block w-full">
                  <button
                    onClick={handleUseForPatientClick}
                    disabled={loadingAction !== null}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-primary hover:bg-surface-neutral transition-colors text-left font-medium disabled:opacity-50 mt-0.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    <span>{t("meal_plan_workshop.card.use_for_patient")}</span>
                  </button>
                </span>
              </AppTooltip>

              {/* Delete (only for custom templates) */}
              {!template.isNative && (
                <>
                  <div className="my-1.5 border-t border-border-neutral/60" />
                  <button
                    onClick={handleDeleteClick}
                    disabled={loadingAction !== null}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-semibold disabled:opacity-50"
                  >
                    {loadingAction === "delete" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500 shrink-0" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{t("meal_plan_workshop.card.delete")}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
