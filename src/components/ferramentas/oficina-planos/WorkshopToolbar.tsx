"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  Grid,
  List,
  FilePlus,
  BookOpen,
  ArrowUpDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AppTooltip } from "@/components/ui/AppTooltip";

export type WorkshopTab = "all" | "custom" | "native" | "favorites" | "recent";
export type WorkshopViewMode = "compact" | "grid" | "list";
export type WorkshopSort =
  | "recent"
  | "name"
  | "kcal_high"
  | "kcal_low"
  | "meals_high"
  | "meals_low";

interface WorkshopToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeTab: WorkshopTab;
  onTabChange: (tab: WorkshopTab) => void;
  viewMode: WorkshopViewMode;
  onViewModeChange: (mode: WorkshopViewMode) => void;
  sortBy: WorkshopSort;
  onSortChange: (sort: WorkshopSort) => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  tenantSlug: string;
  customCount: number;
  nativeCount: number;
}

export function WorkshopToolbar({
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  showHelp,
  onToggleHelp,
  tenantSlug,
  customCount,
  nativeCount,
}: WorkshopToolbarProps) {
  const { t } = useI18n();
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setNewMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tabs: { id: WorkshopTab; label: string; count?: number }[] = [
    { id: "all", label: t("meal_plan_workshop.all"), count: customCount + nativeCount },
    { id: "custom", label: t("meal_plan_workshop.my_models"), count: customCount },
    { id: "native", label: t("meal_plan_workshop.nutriopus_models"), count: nativeCount },
    { id: "favorites", label: t("meal_plan_workshop.favorites") },
    { id: "recent", label: t("meal_plan_workshop.recent") },
  ];

  const sortOptions: { value: WorkshopSort; label: string }[] = [
    { value: "recent", label: t("meal_plan_workshop.sort.recent") },
    { value: "name", label: t("meal_plan_workshop.sort.name") },
    { value: "kcal_high", label: t("meal_plan_workshop.sort.kcal_high") },
    { value: "kcal_low", label: t("meal_plan_workshop.sort.kcal_low") },
    { value: "meals_high", label: t("meal_plan_workshop.sort.meals_high") },
    { value: "meals_low", label: t("meal_plan_workshop.sort.meals_low") },
  ];

  return (
    <div className="space-y-5 bg-card-bg rounded-2xl p-5 border border-border-neutral shadow-sm my-6">
      {/* Top Row: Search, Help, New Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("meal_plan_workshop.search_placeholder")}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-neutral bg-surface-neutral/50 text-text-primary placeholder:text-text-secondary/60 text-sm focus:bg-card-bg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all duration-200 outline-none shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-lg bg-card-bg border border-border-neutral font-semibold shadow-2xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Help Button */}
          <AppTooltip content={t("meal_plan_workshop.how_to_use")} delayMs={100}>
            <span className="inline-flex">
              <button
                onClick={onToggleHelp}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 shadow-2xs ${
                  showHelp
                    ? "bg-brand-blue-soft border-brand-blue/30 text-brand-blue shadow-sm"
                    : "border-border-neutral bg-card-bg text-text-secondary hover:text-text-primary hover:bg-surface-neutral"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>{t("meal_plan_workshop.how_to_use")}</span>
              </button>
            </span>
          </AppTooltip>

          {/* New Plan Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setNewMenuOpen(!newMenuOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-hover transition-all duration-200 font-bold text-sm shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>{t("meal_plan_workshop.new")}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${newMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {newMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-64 rounded-2xl border border-border-neutral bg-card-bg p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <AppTooltip content={t("meal_plan_workshop.blank_studio_tooltip")} side="left" delayMs={100}>
                  <Link
                    href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos/novo`}
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-neutral transition-colors text-left w-full group block"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-brand-blue mt-0.5 group-hover:scale-105 transition-transform">
                      <FilePlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        {t("meal_plan_workshop.blank_studio")}
                      </div>
                      <div className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                        Crie do zero e salve como modelo
                      </div>
                    </div>
                  </Link>
                </AppTooltip>

                <AppTooltip content={t("meal_plan_workshop.create_reusable_model_tooltip")} side="left" delayMs={100}>
                  <Link
                    href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos/novo`}
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-neutral transition-colors text-left w-full group block mt-1"
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        {t("meal_plan_workshop.create_reusable_model")}
                      </div>
                      <div className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                        Estrutura padrão para vários pacientes
                      </div>
                    </div>
                  </Link>
                </AppTooltip>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Tabs, Sort, View Mode */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 mt-2 border-t border-border-neutral/60">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-neutral/80"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-border-neutral text-text-secondary"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Controls: Sort and View Mode */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as WorkshopSort)}
              className="pl-9 pr-8 py-2 rounded-xl border border-border-neutral bg-surface-neutral/50 text-text-primary text-xs font-semibold focus:bg-card-bg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none appearance-none cursor-pointer transition-all shadow-2xs"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 w-3 h-3 text-text-secondary pointer-events-none" />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl border border-border-neutral bg-surface-neutral/60 shadow-2xs">
            <AppTooltip content={t("meal_plan_workshop.view.compact")} delayMs={100}>
              <span className="inline-flex">
                <button
                  onClick={() => onViewModeChange("compact")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "compact"
                      ? "bg-card-bg text-brand-blue shadow-sm font-bold scale-105"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  aria-label={t("meal_plan_workshop.view.compact")}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </span>
            </AppTooltip>

            <AppTooltip content={t("meal_plan_workshop.view.grid")} delayMs={100}>
              <span className="inline-flex">
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-card-bg text-brand-blue shadow-sm font-bold scale-105"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  aria-label={t("meal_plan_workshop.view.grid")}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </span>
            </AppTooltip>

            <AppTooltip content={t("meal_plan_workshop.view.list")} delayMs={100}>
              <span className="inline-flex">
                <button
                  onClick={() => onViewModeChange("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-card-bg text-brand-blue shadow-sm font-bold scale-105"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  aria-label={t("meal_plan_workshop.view.list")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </span>
            </AppTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
