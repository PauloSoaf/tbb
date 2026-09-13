"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Copy,
  UserPlus,
  Star,
  Trash2,
  Sparkles,
  Flame,
  Utensils,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { routes } from "@/lib/navigation/routes";
import type { WorkshopTemplateItem } from "./PlanTemplateCompactCard";
import { StudioNavigationLink } from "./StudioNavigationLink";

interface PlanTemplateListRowProps {
  template: WorkshopTemplateItem;
  tenantSlug: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onUseForPatient: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function PlanTemplateListRow({
  template,
  tenantSlug,
  isFavorite,
  onToggleFavorite,
  onDuplicate,
  onUseForPatient,
  onDelete,
}: PlanTemplateListRowProps) {
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
    <tr className="border-b border-border-neutral/60 hover:bg-surface-neutral/50 transition-colors group">
      {/* Name & Favorite */}
      <td className="py-4 px-5 max-w-[260px]">
        <div className="flex items-center gap-2.5">
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
                className="text-text-secondary hover:text-amber-500 transition-colors shrink-0 p-1 rounded-md"
              >
                <Star
                  className={`w-4 h-4 ${
                    isFavorite ? "fill-amber-400 text-amber-500" : "opacity-40"
                  }`}
                />
              </button>
            </span>
          </AppTooltip>

          <Link
            href={routes.oficinaStudio(tenantSlug, template.id)}
            className="font-bold text-text-primary hover:text-brand-blue transition-colors truncate block text-sm"
          >
            {template.title || "Sem título"}
          </Link>

          {isDraft && (
            <AppTooltip content={t("meal_plan_workshop.card.draft_tooltip")} delayMs={100}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <AlertCircle className="w-3 h-3" />
                <span>{t("meal_plan_workshop.card.draft")}</span>
              </span>
            </AppTooltip>
          )}
        </div>
      </td>

      {/* Objective */}
      <td className="py-4 px-5 text-xs text-text-secondary max-w-[200px] truncate font-medium">
        {template.objective || "—"}
      </td>

      {/* Kcal */}
      <td className="py-4 px-5 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-3 h-3" />
          </div>
          {template.totalCalories > 0 ? (
            <span className="font-bold text-text-primary">
              {Math.round(template.totalCalories)}{" "}
              <span className="font-medium text-text-secondary">kcal</span>
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {t("meal_plan_workshop.card.not_calculated")}
            </span>
          )}
        </div>
      </td>

      {/* Meals */}
      <td className="py-4 px-5 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Utensils className="w-3 h-3" />
          </div>
          <span className="font-bold text-text-primary">{template.mealsCount}</span>
        </div>
      </td>

      {/* Type Badge */}
      <td className="py-4 px-5 whitespace-nowrap">
        {template.isNative ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-brand-blue border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            {t("meal_plan_workshop.card.system_model")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-neutral text-text-secondary border border-border-neutral">
            {t("meal_plan_workshop.card.my_model")}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 px-5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <StudioNavigationLink
            href={routes.oficinaStudio(tenantSlug, template.id)}
            label={
              isDraft
                ? t("meal_plan_workshop.card.complete_model")
                : t("meal_plan_workshop.card.open_studio")
            }
            pendingLabel={t("meal_plan_workshop.card.opening_studio")}
            iconClassName="h-3 w-3"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-blue/25 bg-brand-blue/5 px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:border-brand-blue/45 hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/20"
          />

          <div className="relative" ref={menuRef}>
            <AppTooltip content={t("meal_plan_workshop.card.more_actions")} delayMs={100}>
              <span className="inline-flex">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  disabled={loadingAction !== null}
                  className="p-1.5 rounded-xl hover:bg-surface-neutral text-text-secondary hover:text-text-primary transition-colors border border-border-neutral bg-card-bg disabled:opacity-50"
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
              <div className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl border border-border-neutral bg-card-bg p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-left">
                <AppTooltip content={t("meal_plan_workshop.card.duplicate_tooltip")} side="left" delayMs={100}>
                  <span className="block w-full">
                    <button
                      onClick={handleDuplicateClick}
                      disabled={loadingAction !== null}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-primary hover:bg-surface-neutral transition-colors font-medium disabled:opacity-50"
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

                <AppTooltip content={t("meal_plan_workshop.card.use_for_patient_tooltip")} side="left" delayMs={100}>
                  <span className="block w-full">
                    <button
                      onClick={handleUseForPatientClick}
                      disabled={loadingAction !== null}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-text-primary hover:bg-surface-neutral transition-colors font-medium disabled:opacity-50 mt-0.5"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      <span>{t("meal_plan_workshop.card.use_for_patient")}</span>
                    </button>
                  </span>
                </AppTooltip>

                {!template.isNative && (
                  <>
                    <div className="my-1.5 border-t border-border-neutral/60" />
                    <button
                      onClick={handleDeleteClick}
                      disabled={loadingAction !== null}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-semibold disabled:opacity-50"
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
      </td>
    </tr>
  );
}
