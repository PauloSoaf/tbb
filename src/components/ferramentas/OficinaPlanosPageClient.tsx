"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, FolderOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { nativeMealPlanTemplates } from "@/data/meal-plan-templates";
import {
  deleteMealPlanTemplateAction,
  duplicateTemplateAction,
  applyTemplateToPatientAction,
} from "@/actions/template.action";
import {
  WorkshopToolbar,
  type WorkshopTab,
  type WorkshopViewMode,
  type WorkshopSort,
} from "./oficina-planos/WorkshopToolbar";
import {
  PlanTemplateCompactCard,
  type WorkshopTemplateItem,
} from "./oficina-planos/PlanTemplateCompactCard";
import { PlanTemplateListRow } from "./oficina-planos/PlanTemplateListRow";
import { WorkshopHelpPanel } from "./oficina-planos/WorkshopHelpPanel";

type CustomTemplate = {
  id: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  totalCalories: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
  mealsCount?: number;
  itemsCount?: number;
  updatedAt?: string;
  meals?: { items: unknown[] }[];
};

interface OficinaPlanosPageClientProps {
  tenant: string;
  customTemplates: CustomTemplate[];
  patients?: { id: string; name: string }[];
}

function readStoredFavorites(tenant: string) {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(`workshop_favorites_${tenant}`);
    return saved ? JSON.parse(saved) as string[] : [];
  } catch {
    return [];
  }
}

function readStoredViewMode(tenant: string): WorkshopViewMode {
  if (typeof window === "undefined") return "compact";

  const saved = localStorage.getItem(`workshop_viewmode_${tenant}`);
  return saved === "compact" || saved === "grid" || saved === "list"
    ? saved
    : "compact";
}

function readStoredHelpPreference(tenant: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`workshop_showhelp_${tenant}`) === "true";
}

export function OficinaPlanosPageClient({
  tenant,
  customTemplates,
  patients = [],
}: OficinaPlanosPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<WorkshopTab>("all");
  const [viewMode, setViewMode] = useState<WorkshopViewMode>("compact");
  const [sortBy, setSortBy] = useState<WorkshopSort>("recent");
  const [showHelp, setShowHelp] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Patient selection modal state
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [selectedTemplateForPatient, setSelectedTemplateForPatient] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isApplyingToPatient, setIsApplyingToPatient] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setFavorites(readStoredFavorites(tenant));
      setViewMode(readStoredViewMode(tenant));
      setShowHelp(readStoredHelpPreference(tenant));
    });
  }, [tenant]);

  // Save favorites to localStorage
  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(`workshop_favorites_${tenant}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Save viewMode to localStorage
  const handleViewModeChange = (mode: WorkshopViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(`workshop_viewmode_${tenant}`, mode);
    } catch {
      // ignore
    }
  };

  // Save showHelp to localStorage
  const handleToggleHelp = () => {
    setShowHelp((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`workshop_showhelp_${tenant}`, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Build unified items list
  const allTemplates: WorkshopTemplateItem[] = useMemo(() => {
    const customs: WorkshopTemplateItem[] = customTemplates.map((ct) => ({
      id: ct.id,
      title: ct.title,
      objective: ct.objective,
      description: ct.description,
      totalCalories: ct.totalCalories || 0,
      totalCarbs: ct.totalCarbs || 0,
      totalProtein: ct.totalProtein || 0,
      totalFat: ct.totalFat || 0,
      mealsCount: ct.mealsCount ?? (ct.meals ? ct.meals.length : 0),
      itemsCount: ct.itemsCount ?? (ct.meals ? ct.meals.reduce((acc, m) => acc + (m.items ? m.items.length : 0), 0) : 0),
      isNative: false,
      updatedAt: ct.updatedAt || null,
    }));

    const natives: WorkshopTemplateItem[] = nativeMealPlanTemplates.map((nt) => ({
      id: nt.id,
      title: nt.title,
      objective: nt.objective,
      description: nt.description,
      totalCalories: nt.totals.calories || 0,
      totalCarbs: nt.totals.carbs || 0,
      totalProtein: nt.totals.protein || 0,
      totalFat: nt.totals.fat || 0,
      mealsCount: nt.meals.length,
      itemsCount: nt.meals.reduce((acc, m) => acc + m.items.length, 0),
      isNative: true,
      color: nt.color,
    }));

    return [...customs, ...natives];
  }, [customTemplates]);

  // Filter and Sort
  const filteredTemplates = useMemo(() => {
    return allTemplates
      .filter((item) => {
        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(term);
          const matchObj = item.objective ? item.objective.toLowerCase().includes(term) : false;
          const matchDesc = item.description ? item.description.toLowerCase().includes(term) : false;
          if (!matchTitle && !matchObj && !matchDesc) return false;
        }

        // Tab filter
        if (activeTab === "custom") return !item.isNative;
        if (activeTab === "native") return item.isNative;
        if (activeTab === "favorites") return favorites.includes(item.id);
        if (activeTab === "recent") {
          // Keep items that were updated recently or have non-zero calories
          return true;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "kcal_high") {
          return b.totalCalories - a.totalCalories;
        }
        if (sortBy === "kcal_low") {
          return a.totalCalories - b.totalCalories;
        }
        if (sortBy === "meals_high") {
          return b.mealsCount - a.mealsCount;
        }
        if (sortBy === "meals_low") {
          return a.mealsCount - b.mealsCount;
        }
        // default: "recent" (custom templates first by updatedAt, then natives)
        if (a.isNative !== b.isNative) {
          return a.isNative ? 1 : -1;
        }
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        return 0;
      });
  }, [allTemplates, searchTerm, activeTab, favorites, sortBy]);

  // Actions
  const handleDelete = async (id: string) => {
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_template.title"),
      description: t("confirmations.delete_template.description"),
      confirmLabel: t("confirmations.delete_template.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await deleteMealPlanTemplateAction(tenant, id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_plan_workshop.card.deleted_toast"));
      router.refresh();
    } catch {
      toast.error(t("meal_plan_workshop.card.delete_error"));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const result = await duplicateTemplateAction(tenant, id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.newTemplateId) {
        toast.success(t("meal_plan_workshop.card.duplicated_toast"));
        router.push(routes.oficinaStudio(tenant, result.newTemplateId));
      }
    } catch {
      toast.error(t("meal_plan_workshop.card.duplicate_error"));
    }
  };

  const handleOpenPatientModal = (id: string) => {
    setSelectedTemplateForPatient(id);
    setSelectedPatientId("");
    setPatientModalOpen(true);
  };

  const handleConfirmUseForPatient = async () => {
    if (isApplyingToPatient || !selectedTemplateForPatient || !selectedPatientId) return;

    setIsApplyingToPatient(true);
    let navigationStarted = false;
    try {
      const result = await applyTemplateToPatientAction(
        tenant,
        selectedTemplateForPatient,
        selectedPatientId
      );
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(t("meal_plan_workshop.card.patient_plan_created"));
        const destination = result.patientHref
          ? `${result.patientHref}/planos/${result.newPlanId}`
          : `/dashboard/${tenant}/pacientes/${selectedPatientId}/planos/${result.newPlanId}`;
        router.push(destination);
        navigationStarted = true;
      }
    } catch {
      toast.error(t("meal_plan_workshop.card.patient_plan_error"));
    } finally {
      // Keep the modal and its spinner visible until the destination replaces
      // this screen. On validation/error the user can retry immediately.
      if (!navigationStarted) setIsApplyingToPatient(false);
    }
  };

  const customCount = useMemo(
    () => allTemplates.filter((item) => !item.isNative).length,
    [allTemplates]
  );
  const nativeCount = useMemo(
    () => allTemplates.filter((item) => item.isNative).length,
    [allTemplates]
  );

  return (
    <div className="space-y-8 pb-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      {confirmDialog}

      {/* 1. Standard System Header */}
      <DashboardHeader
        title={t("meal_plan_workshop.title")}
        subtitle={t("meal_plan_workshop.subtitle")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.tools"), href: routes.ferramentas(tenant) },
          { label: t("meal_plan_workshop.title"), current: true },
        ]}
      />

      {/* 2. Interactive Tutorial Help Panel */}
      {showHelp && <WorkshopHelpPanel onClose={() => handleToggleHelp()} />}

      {/* 3. Workshop Toolbar */}
      <WorkshopToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showHelp={showHelp}
        onToggleHelp={handleToggleHelp}
        tenantSlug={tenant}
        customCount={customCount}
        nativeCount={nativeCount}
      />

      {/* 4. Content Area: Grid / Compact / List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border-neutral p-12 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-neutral flex items-center justify-center mx-auto mb-3 text-text-secondary">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary">
            {searchTerm
              ? t("meal_plan_workshop.no_results", { term: searchTerm })
              : t("meal_plan_workshop.no_results_empty")}
          </h3>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-3 text-xs text-brand-blue font-bold hover:underline"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-card-bg rounded-2xl border border-border-neutral overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-neutral bg-surface-neutral/80 text-text-secondary text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5">{t("meal_plan_workshop.list.name")}</th>
                  <th className="py-3.5 px-5">{t("meal_plan_workshop.list.objective")}</th>
                  <th className="py-3.5 px-5">{t("meal_plan_workshop.list.kcal")}</th>
                  <th className="py-3.5 px-5">{t("meal_plan_workshop.list.meals")}</th>
                  <th className="py-3.5 px-5">{t("meal_plan_workshop.list.type")}</th>
                  <th className="py-3.5 px-5 text-right">{t("meal_plan_workshop.list.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <PlanTemplateListRow
                    key={template.id}
                    template={template}
                    tenantSlug={tenant}
                    isFavorite={favorites.includes(template.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onDuplicate={handleDuplicate}
                    onUseForPatient={handleOpenPatientModal}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-5 sm:gap-6 animate-in fade-in duration-300 ${
            viewMode === "compact"
              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {filteredTemplates.map((template) => (
            <PlanTemplateCompactCard
              key={template.id}
              template={template}
              tenantSlug={tenant}
              isFavorite={favorites.includes(template.id)}
              onToggleFavorite={handleToggleFavorite}
              onDuplicate={handleDuplicate}
              onUseForPatient={handleOpenPatientModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 5. Patient Selection Modal */}
      {patientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card-bg rounded-2xl border border-border-neutral shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-blue-soft text-brand-blue">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Aplicar Modelo ao Paciente
                </h3>
                <p className="text-xs text-text-secondary">
                  Crie um plano alimentar personalizado com base neste modelo.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-text-primary">
                Selecione o Paciente
              </label>
              {patients.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-neutral text-xs text-text-secondary text-center">
                  Nenhum paciente ativo cadastrado no sistema.
                </div>
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={isApplyingToPatient}
                  className="w-full px-3.5 py-2.5 border border-border-neutral rounded-xl bg-card-bg text-text-primary text-sm focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-neutral/60">
              <button
                onClick={() => setPatientModalOpen(false)}
                disabled={isApplyingToPatient}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <AsyncButton
                onClick={handleConfirmUseForPatient}
                pending={isApplyingToPatient}
                pendingLabel={t("meal_plan_workshop.card.creating_patient_plan")}
                disabled={!selectedPatientId || patients.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("meal_plan_workshop.card.create_patient_plan")}</span>
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
