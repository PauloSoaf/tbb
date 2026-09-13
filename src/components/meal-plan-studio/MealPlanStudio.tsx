"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { StudioToolbar } from "./StudioToolbar";
import { StudioLibraryPanel } from "./StudioLibraryPanel";
import { TiptapCanvas } from "./TiptapCanvas";
import { MealPlanPdfStylePanel } from "./MealPlanPdfStylePanel";
import { SmartPasteModal, ParsedMeal } from "./SmartPasteModal";
import {
  saveDraftAction,
  saveLayoutAction,
  addMealAction,
  addMealItemAction,
  replaceMealPlanFromTemplateAction,
} from "@/actions/meal-plans.action";
import { duplicateTemplateAction, applyTemplateToPatientAction, deleteMealPlanTemplateAction } from "@/actions/template.action";
import { calculateMealTotals } from "@/lib/utils/nutrition";
import { generateMarkdown, getMealItems } from "./generate-markdown";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  collectStudioStructuredImageUrls,
  extractMealDraftsFromContentBlocks,
  resolveStudioContentBlocks,
  toSerializableJson,
  type SerializableJson,
} from "@/lib/meal-plan/studio-content";
import { parseMealPlanPdfStyle, type MealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";
import { deleteMealPlanImage } from "./meal-plan-image-upload";
import {
  deleteMealPlanLibraryFoodAction,
  deleteMealPlanLibraryMealAction,
  registerMealPlanLibraryUseAction,
  saveMealPlanLibraryFoodAction,
  saveMealPlanLibraryMealAction,
} from "@/actions/meal-plan-library.action";
import { savedMealToCanvasNode } from "@/lib/meal-plan/library-canvas";
import type {
  MealPlanLibraryData,
  MealPlanLibraryFoodSnapshot,
  MealPlanLibraryMealSnapshot,
  SavedMealPlanLibraryMeal,
} from "@/lib/meal-plan/library-types";

type LayoutMode = "CLINICAL" | "VISUAL" | "COMPACT";

interface StudioPlan {
  id: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  notes?: string | null;
  isTemplate: boolean;
  layoutMode?: string | null;
  targetCalories?: number | null;
  patient?: { id: string; name: string } | null;
  nutritionist?: { name?: string | null; crn?: string | null; profileImageUrl?: string | null } | null;
  meals: Record<string, unknown>[];
  contentBlocks?: unknown;
  pdfStyle?: unknown;
}

interface MealPlanStudioProps {
  tenantSlug: string;
  plan: StudioPlan;
  patients: { id: string; name: string }[];
  customTemplates: { id: string; title: string; objective?: string | null; meals?: Record<string, unknown>[] }[];
  initialLibrary: MealPlanLibraryData;
}


export function MealPlanStudio({ tenantSlug, plan: initialPlan, patients, customTemplates, initialLibrary }: MealPlanStudioProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"save" | "template" | "duplicate" | "apply" | "delete" | null>(null);

  const [plan, setPlan] = useState(() => ({
    ...initialPlan,
    contentBlocks: resolveStudioContentBlocks(initialPlan.contentBlocks, initialPlan.meals),
    pdfStyle: parseMealPlanPdfStyle(initialPlan.pdfStyle),
  }));
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>((initialPlan.layoutMode as LayoutMode) ?? "CLINICAL");
  const [librarySection, setLibrarySection] = useState<"templates" | "taco" | "blocks">("templates");
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [panelOpen] = useState(true);
  const [editorRevision, setEditorRevision] = useState(0);
  const [pendingImageDeletes, setPendingImageDeletes] = useState<string[]>([]);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [library, setLibrary] = useState(initialLibrary);

  useEffect(() => {
    // Dynamic Studio pages may preserve this client component while the route
    // payload changes. Reset navigation feedback only after the URL changed.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setPendingAction(null);
      setIsPreviewingPdf(false);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleMetaChange = (field: string, value: unknown) => {
    setPlan(prev => ({ ...prev, [field]: value }) as typeof prev);
    setIsDirty(true);
  };

  const handleStructuredImageDetached = useCallback((url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    setPendingImageDeletes((current) => current.includes(normalizedUrl) ? current : [...current, normalizedUrl]);
  }, []);

  const handleSaveFoodToLibrary = useCallback(async (food: MealPlanLibraryFoodSnapshot) => {
    const result = await saveMealPlanLibraryFoodAction(tenantSlug, food);
    if ("error" in result) {
      toast.error(result.error || t("meal_plan_clinical.library.save_error"));
      return;
    }
    setLibrary((current) => ({ ...current, foods: [result.food, ...current.foods] }));
    toast.success(t("meal_plan_clinical.library.food_saved"));
  }, [t, tenantSlug]);

  const handleSaveMealToLibrary = useCallback(async (meal: MealPlanLibraryMealSnapshot) => {
    const result = await saveMealPlanLibraryMealAction(tenantSlug, meal);
    if ("error" in result) {
      toast.error(result.error || t("meal_plan_clinical.library.save_error"));
      return;
    }
    setLibrary((current) => ({ ...current, meals: [result.meal, ...current.meals] }));
    toast.success(t("meal_plan_clinical.library.meal_saved"));
  }, [t, tenantSlug]);

  const handleDeleteLibraryFood = useCallback(async (id: string) => {
    const result = await deleteMealPlanLibraryFoodAction(tenantSlug, id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setLibrary((current) => ({ ...current, foods: current.foods.filter((food) => food.id !== id) }));
  }, [tenantSlug]);

  const handleDeleteLibraryMeal = useCallback(async (id: string) => {
    const result = await deleteMealPlanLibraryMealAction(tenantSlug, id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setLibrary((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id) }));
  }, [tenantSlug]);

  const handleLibraryItemUsed = useCallback((type: "MEAL" | "FOOD", id: string) => {
    void registerMealPlanLibraryUseAction(tenantSlug, { type, id });
  }, [tenantSlug]);

  const handleInsertSavedMeal = useCallback((savedMeal: SavedMealPlanLibraryMeal) => {
    const node = savedMealToCanvasNode(savedMeal);
    setPlan((current) => {
      const document = current.contentBlocks && typeof current.contentBlocks === "object" && !Array.isArray(current.contentBlocks)
        ? current.contentBlocks as Record<string, unknown>
        : { type: "doc", content: [] };
      const content = Array.isArray(document.content) ? document.content : [];
      return {
        ...current,
        contentBlocks: { ...document, type: "doc", content: [...content, node] },
      };
    });
    setIsDirty(true);
    setEditorRevision((revision) => revision + 1);
    handleLibraryItemUsed("MEAL", savedMeal.id);
    toast.success(t("meal_plan_clinical.library.meal_inserted"));
  }, [handleLibraryItemUsed, t]);

  const buildSavePayload = (overrides?: { isTemplate?: boolean; patientId?: string | null }) => {
    const contentBlocks = toSerializableJson(plan.contentBlocks);
    const meals = extractMealDraftsFromContentBlocks(contentBlocks);

    return {
      title: plan.title || "Plano sem titulo",
      objective: plan.objective ?? undefined,
      description: plan.description ?? undefined,
      notes: plan.notes ?? undefined,
      layoutMode,
      targetCalories: typeof plan.targetCalories === "number" ? plan.targetCalories : undefined,
      contentBlocks: contentBlocks && !Array.isArray(contentBlocks) ? (contentBlocks as Record<string, SerializableJson>) : undefined,
      pdfStyle: plan.pdfStyle,
      meals,
      ...overrides,
    };
  };

  const cleanupDetachedImages = async (
    contentBlocks: Record<string, SerializableJson> | undefined,
    pdfStyle: MealPlanPdfStyle,
  ) => {
    const referencedUrls = collectStudioStructuredImageUrls(contentBlocks);
    if (pdfStyle.logoUrl) referencedUrls.add(pdfStyle.logoUrl);
    if (pdfStyle.watermarkImageUrl) referencedUrls.add(pdfStyle.watermarkImageUrl);

    const snapshot = pendingImageDeletes;
    const removableUrls = snapshot.filter((url) => !referencedUrls.has(url));
    if (removableUrls.length === 0) return;

    const results = await Promise.allSettled(
      removableUrls.map((url) => deleteMealPlanImage({ planId: plan.id, url })),
    );
    const failedUrls = removableUrls.filter((_, index) => results[index].status === "rejected");

    setPendingImageDeletes((current) => {
      const untouched = current.filter((url) => !removableUrls.includes(url));
      return [...new Set([...untouched, ...failedUrls])];
    });

    if (failedUrls.length > 0) {
      toast.error(t("meal_plan_clinical.images.delete_error"));
    }
  };

  const saveCurrentDraft = async (overrides?: { isTemplate?: boolean; patientId?: string | null }) => {
    const payload = buildSavePayload(overrides);
    const result = await saveDraftAction(tenantSlug, plan.id, payload);
    if (!result.error) {
      await cleanupDetachedImages(payload.contentBlocks, payload.pdfStyle);
    }
    return result;
  };

  const handlePreviewPdfStyle = () => {
    if (isPreviewingPdf || pendingAction) return;
    setIsPreviewingPdf(true);
    startTransition(async () => {
      let navigationStarted = false;
      try {
        const result = await saveCurrentDraft();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setIsDirty(false);
        setLastSaved(new Date());
        router.push(`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${plan.id}/pdf`);
        navigationStarted = true;
      } finally {
        if (!navigationStarted) setIsPreviewingPdf(false);
      }
    });
  };



  const handleSaveDraft = () => {
    if (pendingAction) return;
    setPendingAction("save");
    startTransition(async () => {
      try {
        const result = await saveCurrentDraft();
        if (result.error) { toast.error(result.error); return; }
        setIsDirty(false);
        setLastSaved(new Date());
        toast.success("Rascunho salvo!");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleSaveAsTemplate = () => {
    if (pendingAction) return;
    setPendingAction("template");
    startTransition(async () => {
      try {
        const result = await saveCurrentDraft({ isTemplate: true, patientId: null });
        if (result.error) { toast.error(result.error); return; }
        setPlan(prev => ({ ...prev, isTemplate: true }));
        setIsDirty(false);
        setLastSaved(new Date());
        toast.success("Salvo como modelo!");
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleDuplicate = () => {
    if (pendingAction) return;
    setPendingAction("duplicate");
    startTransition(async () => {
      let navigationStarted = false;
      try {
        const result = await duplicateTemplateAction(tenantSlug, plan.id);
        if (result.error) { toast.error(result.error); return; }
        toast.success("Duplicado com sucesso!");
        router.push(`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${result.newTemplateId}`);
        navigationStarted = true;
      } finally {
        if (!navigationStarted) setPendingAction(null);
      }
    });
  };

  const handleUseForPatient = (patientId: string) => {
    if (pendingAction) return;
    setPendingAction("apply");
    startTransition(async () => {
      let navigationStarted = false;
      try {
        if (isDirty) {
          const saveResult = await saveCurrentDraft();
          if (saveResult.error) { toast.error(saveResult.error); return; }
        }
        const result = await applyTemplateToPatientAction(tenantSlug, plan.id, patientId);
        if (result.error) { toast.error(result.error); return; }
        toast.success("Plano criado para o paciente!");
        router.push(`${result.patientHref}/planos/${result.newPlanId}`);
        navigationStarted = true;
      } finally {
        if (!navigationStarted) setPendingAction(null);
      }
    });
  };

  const handleDeleteTemplate = async () => {
    if (pendingAction) return;
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_template.title"),
      description: t("confirmations.delete_template.description"),
      confirmLabel: t("confirmations.delete_template.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;

    setPendingAction("delete");
    let navigationStarted = false;
    try {
      const result = await deleteMealPlanTemplateAction(tenantSlug, plan.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meal_plan_workshop.card.deleted_toast"));
      router.push(`/dashboard/${tenantSlug}/ferramentas/oficina-planos`);
      navigationStarted = true;
    } catch {
      toast.error(t("meal_plan_workshop.card.delete_error"));
    } finally {
      if (!navigationStarted) setPendingAction(null);
    }
  };

  const handleLayoutChange = (mode: string) => {
    setLayoutMode(mode as LayoutMode);
    startTransition(async () => {
      await saveLayoutAction(tenantSlug, plan.id, mode);
    });
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = generateMarkdown(plan);
      await navigator.clipboard.writeText(md);
      toast.success("Copiado como Markdown!");
    } catch {
      toast.error("Não foi possível copiar. Tente manualmente.");
    }
  };

  const handleSmartPasteImport = async (meals: ParsedMeal[]) => {
    startTransition(async () => {
      let successCount = 0;
      const newImportedMeals: Record<string, unknown>[] = [];
      for (let i = 0; i < meals.length; i++) {
        const m = meals[i];
        const result = await addMealAction(tenantSlug, {
          mealPlanId: plan.id,
          name: m.name,
          time: m.time || undefined,
          notes: m.notes || undefined,
          position: plan.meals.length + i,
        });
        if (result.meal) {
          successCount++;
          newImportedMeals.push({ ...result.meal, items: [] });
        }
      }
      if (successCount > 0) {
        setPlan(prev => ({ ...prev, meals: [...prev.meals, ...newImportedMeals] }));
        setIsDirty(true);
        toast.success(`${successCount} refeição(ões) importada(s)!`);
      } else {
        toast.error("Nenhuma refeição foi importada.");
      }
    });
  };

  const handleImportTemplate = async (templateId: string, isNative: boolean, mealsOverride?: Record<string, unknown>[]) => {
    if (!mealsOverride) {
      const confirmed = await requestConfirmation({
        title: t("confirmations.copy_template.title"),
        description: t("confirmations.copy_template.description"),
        confirmLabel: t("confirmations.copy_template.confirm"),
        tone: "warning",
      });
      if (!confirmed) return;

      try {
        const result = await replaceMealPlanFromTemplateAction(
          tenantSlug,
          plan.id,
          templateId,
          isNative,
        );
        if (result.error || !result.plan) {
          toast.error(result.error ?? t("meal_plan_workshop.card.copy_error"));
          return;
        }

        setPlan((currentPlan) => ({
          ...currentPlan,
          ...result.plan,
          meals: result.plan.meals as unknown as Record<string, unknown>[],
        }));
        setIsDirty(false);
        setLastSaved(new Date());
        setEditorRevision((revision) => revision + 1);
        toast.success(t("meal_plan_workshop.card.copied_to_studio"));
      } catch {
        toast.error(t("meal_plan_workshop.card.copy_error"));
      }
      return;
    }

    let mealsToImport: Record<string, unknown>[] = [];
    mealsToImport = mealsOverride;

    if (!mealsToImport || mealsToImport.length === 0) {
      toast.error("Este modelo não possui refeições.");
      return;
    }

    startTransition(async () => {
      const newImportedMeals: Record<string, unknown>[] = [];
      for (const m of mealsToImport) {
        const result = await addMealAction(tenantSlug, {
          mealPlanId: plan.id,
          name: String(m.name ?? "Refeição"),
          time: typeof m.time === "string" ? m.time : undefined,
          position: typeof m.position === "number" ? m.position : 0,
        });
        if (result.meal) {
          // Add the items to the returned meal structure
          newImportedMeals.push({ ...result.meal, items: m.items || [] });
          // Also we should ideally add items to DB here, but for phase 1 this was copying empty meals or we need an addMealWithItems action. 
          // Wait, addMealAction doesn't create items! We need to create them.
          for (const item of (m.items as Record<string, unknown>[]) || []) {
             await addMealItemAction(tenantSlug, {
               mealId: result.meal.id,
               foodName: item.foodName as string,
               source: item.source === "TACO" ? "TACO" : "CUSTOM",
               quantity: item.quantity as number,
               unit: item.unit as string,
               calories: item.calories as number,
               protein: item.protein as number,
               carbs: item.carbs as number,
               fat: item.fat as number,
               position: (item.position as number) || 0,
             });
          }
        }
      }
      setPlan(prev => ({ ...prev, meals: [...prev.meals, ...newImportedMeals] }));
      setIsDirty(true);
      toast.success("Estrutura importada!");
    });
  };

  const editorContent = resolveStudioContentBlocks(plan.contentBlocks, plan.meals);
  const activeMeals = extractMealDraftsFromContentBlocks(editorContent) as unknown as Record<string, unknown>[];
  const totalNutrition = calculateMealTotals(activeMeals.flatMap((m) => getMealItems(m)));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <StudioToolbar
        tenantSlug={tenantSlug}
        planId={plan.id}
        planTitle={plan.title}
        isTemplate={plan.isTemplate}
        isSaving={isPending && pendingAction === "save"}
        pendingAction={pendingAction}
        lastSaved={lastSaved}
        isDirty={isDirty}
        layoutMode={layoutMode}
        patients={patients}
        onSaveDraft={handleSaveDraft}
        onSaveAsTemplate={handleSaveAsTemplate}
        onDuplicate={handleDuplicate}
        onUseForPatient={handleUseForPatient}
        onDeleteTemplate={handleDeleteTemplate}
        onLayoutChange={handleLayoutChange}
        onCopyMarkdown={handleCopyMarkdown}
        onSmartPaste={() => setShowSmartPaste(true)}
      />

      {/* 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`hidden lg:flex flex-col w-64 shrink-0 transition-all duration-300 ${panelOpen ? "w-64" : "w-0 overflow-hidden"}`}>
          <StudioLibraryPanel
            tenantSlug={tenantSlug}
            customTemplates={customTemplates}
            savedMeals={library.meals}
            savedFoods={library.foods}
            onInsertSavedMeal={handleInsertSavedMeal}
            onDeleteSavedMeal={handleDeleteLibraryMeal}
            onDeleteSavedFood={handleDeleteLibraryFood}
            onImportTemplate={handleImportTemplate}
            onDeleteTemplate={async (templateId) => {
              if (templateId === plan.id) {
                await handleDeleteTemplate();
                return;
              }

              const confirmed = await requestConfirmation({
                title: t("confirmations.delete_template.title"),
                description: t("confirmations.delete_template.description"),
                confirmLabel: t("confirmations.delete_template.confirm"),
                tone: "danger",
              });
              if (!confirmed) return;
              try {
                const result = await deleteMealPlanTemplateAction(tenantSlug, templateId);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(t("meal_plan_workshop.card.deleted_toast"));
                router.refresh();
              } catch {
                toast.error(t("meal_plan_workshop.card.delete_error"));
              }
            }}
            selectedSection={librarySection}
            onSectionChange={setLibrarySection}
            onAddBlock={(type) => {
              const blocksArray = Array.isArray((plan as unknown as { contentBlocks: Record<string, unknown>[] }).contentBlocks) ? (plan as unknown as { contentBlocks: Record<string, unknown>[] }).contentBlocks : [];
              const newBlock = {
                id: `block-${Date.now()}`,
                type,
                position: plan.meals.length + blocksArray.length,
                content: type === "text" ? "" : type === "checklist" ? [] : null,
              };
              handleMetaChange("contentBlocks", [...blocksArray, newBlock]);
            }}
          />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto relative">
          <TiptapCanvas
            key={`${plan.id}-${editorRevision}`}
            tenantSlug={tenantSlug}
            planId={plan.id}
            planTitle={plan.title}
            planObjective={plan.objective}
            nutritionistName={plan.nutritionist?.name}
            nutritionistCrn={plan.nutritionist?.crn}
            onSaveMealToLibrary={handleSaveMealToLibrary}
            onSaveFoodToLibrary={handleSaveFoodToLibrary}
            onLibraryItemUsed={handleLibraryItemUsed}
            onMetaChange={handleMetaChange}
            onStructuredImageDetached={handleStructuredImageDetached}
            initialContent={editorContent}
            onChange={(json) => handleMetaChange("contentBlocks", json)}
          />
        </div>

        {/* Right: Inspector / Summary */}
        <div className="hidden xl:flex flex-col w-72 shrink-0 border-l border-border-neutral bg-card-bg overflow-y-auto">
          <div className="p-4 border-b border-border-neutral">
            <h3 className="text-sm font-bold text-text-primary">Resumo do Plano</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase mb-2">Configurações</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-secondary">Layout</label>
                  <select
                    value={layoutMode}
                    onChange={e => handleLayoutChange(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-card-bg"
                  >
                    <option value="CLINICAL">Clínico</option>
                    <option value="VISUAL">Visual com Imagens</option>
                    <option value="COMPACT">Compacto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Status</label>
                  <div className="mt-1 px-3 py-1.5 border border-border-neutral rounded-lg text-sm text-text-secondary bg-gray-50 dark:bg-card-bg">
                    {plan.isTemplate ? "Modelo" : "Rascunho"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Meta Calórica (kcal)</label>
                  <input
                    type="number"
                    value={plan.targetCalories || ""}
                    onChange={e => handleMetaChange("targetCalories", e.target.value ? Number(e.target.value) : "")}
                    placeholder="Ex: 2000"
                    className="w-full mt-1 px-3 py-1.5 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-card-bg"
                  />
                </div>
              </div>
            </div>

            <MealPlanPdfStylePanel
              planId={plan.id}
              value={plan.pdfStyle}
              fallbackLogoUrl={plan.nutritionist?.profileImageUrl}
              onChange={(pdfStyle) => handleMetaChange("pdfStyle", pdfStyle)}
              onStructuredImageDetached={handleStructuredImageDetached}
              onPreview={handlePreviewPdfStyle}
              isPreviewing={isPreviewingPdf}
              previewDisabled={pendingAction !== null}
            />

            <div>
              <p className="text-xs font-bold text-text-secondary uppercase mb-2">Nutrição Total</p>
              {plan.targetCalories ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-card-bg border border-border-neutral rounded-lg p-3 text-center flex flex-col gap-1">
                    <span className="text-xs text-text-secondary uppercase font-semibold">Meta Calórica</span>
                    <span className="text-lg font-bold text-text-primary">{plan.targetCalories} kcal</span>
                    {totalNutrition.calories < plan.targetCalories && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Déficit de {plan.targetCalories - totalNutrition.calories} kcal</span>
                    )}
                    {totalNutrition.calories > plan.targetCalories && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Superávit de {totalNutrition.calories - plan.targetCalories} kcal</span>
                    )}
                    {totalNutrition.calories === plan.targetCalories && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Na meta</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Calorias", value: `${totalNutrition.calories} kcal`, pct: Math.round((totalNutrition.calories / plan.targetCalories) * 100), color: "bg-amber-400" },
                      { label: "Carboidratos", value: `${totalNutrition.carbs}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.carbs * 4 / totalNutrition.calories) * 100) : 0, color: "bg-blue-400" },
                      { label: "Proteínas", value: `${totalNutrition.protein}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.protein * 4 / totalNutrition.calories) * 100) : 0, color: "bg-emerald-400" },
                      { label: "Gorduras", value: `${totalNutrition.fat}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.fat * 9 / totalNutrition.calories) * 100) : 0, color: "bg-rose-400" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-text-secondary">{item.label}</span>
                          <span className="font-semibold text-text-primary">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Calorias", value: `${totalNutrition.calories} kcal`, pct: 100, color: "bg-amber-400" },
                    { label: "Carboidratos", value: `${totalNutrition.carbs}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.carbs * 4 / totalNutrition.calories) * 100) : 0, color: "bg-blue-400" },
                    { label: "Proteínas", value: `${totalNutrition.protein}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.protein * 4 / totalNutrition.calories) * 100) : 0, color: "bg-emerald-400" },
                    { label: "Gorduras", value: `${totalNutrition.fat}g`, pct: totalNutrition.calories > 0 ? Math.round((totalNutrition.fat * 9 / totalNutrition.calories) * 100) : 0, color: "bg-rose-400" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className="font-semibold text-text-primary">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-text-secondary uppercase mb-2">Refeições</p>
              <div className="space-y-1">
                {activeMeals.map((m, index) => (
                  <div key={typeof m.id === "string" && m.id ? m.id : `meal-summary-${String(m.position ?? index)}-${index}`} className="flex justify-between text-xs">
                    <span className="text-text-secondary truncate flex-1">{String(m.name ?? "")}</span>
                    <span className="text-text-primary font-medium ml-2 shrink-0">
                      {calculateMealTotals(getMealItems(m)).calories}kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border-neutral">
              <p className="text-[10px] text-text-secondary text-center italic">
                Resumo atualizado automaticamente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Paste Modal */}
      <SmartPasteModal
        isOpen={showSmartPaste}
        onClose={() => setShowSmartPaste(false)}
        onImport={handleSmartPasteImport}
      />
      {confirmDialog}
    </div>
  );
}
