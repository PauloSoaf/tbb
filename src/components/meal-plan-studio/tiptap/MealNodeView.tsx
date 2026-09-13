"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Clock, ImageIcon, Trash2, ChevronDown, ChevronUp, Plus, GripVertical, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { calculateMealTotals, roundNutritionValue, type PartialMealItem } from "@/lib/utils/nutrition";
import { FoodDatabaseSearch } from "@/components/meal-plans/FoodDatabaseSearch";
import { CustomFoodForm } from "@/components/meal-plans/CustomFoodForm";
import { updateMealAction, deleteMealAction, addMealItemAction, deleteMealItemAction } from "@/actions/meal-plans.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteMealPlanImage, MealPlanImageUploadError, uploadMealPlanImage } from "../meal-plan-image-upload";
import type { MealExtensionOptions } from "./MealExtension";
import { COMMON_HOUSEHOLD_MEASURE_SUGGESTIONS } from "@/lib/meal-plan/household-measures";
import { normalizeFoodImageLayout, normalizeFoodImagePlacement, normalizeMealImageLayout } from "@/lib/meal-plan/meal-image-layout";
import { MealImageEditor, type MealImageEditorValue } from "./MealImageEditor";
import { ImageTransformFrame, type ImageTransformPatch } from "./ImageTransformFrame";
import {
  formatHouseholdMeasureSuggestion,
  suggestBestHouseholdMeasure,
  type HouseholdLocale,
} from "@/lib/utils/household-measures";
import {
  MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE,
  parseLibraryDragPayload,
  savedFoodToCanvasItem,
} from "@/lib/meal-plan/library-canvas";
import type { MealPlanLibraryFoodSnapshot, MealPlanLibraryMealSnapshot } from "@/lib/meal-plan/library-types";

type StudioMealItem = PartialMealItem & {
  id: string;
  position?: number;
  householdMeasureSource?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  showImageInPdf?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  imageFit?: "COVER" | "CONTAIN";
  imageAlignment?: "LEFT" | "CENTER" | "RIGHT";
  imageLayer?: "INLINE" | "BEHIND" | "FRONT";
  imageX?: number;
  imageY?: number;
  imagePlacement?: "SIDE" | "ABOVE" | "BELOW";
};

type MealImageAttributes = {
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  showImageInPdf?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  imageFit?: "COVER" | "CONTAIN";
  imageAlignment?: "LEFT" | "CENTER" | "RIGHT";
  imageLayer?: "INLINE" | "BEHIND" | "FRONT";
  imageX?: number;
  imageY?: number;
};

type EditableNutrientField = "calories" | "carbs" | "protein" | "fat";

function getErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof MealPlanImageUploadError) {
    return error.message.startsWith("meal_plan_clinical.") ? t(error.message) : error.message;
  }
  return t("meal_plan_clinical.images.upload_error");
}

function isPersistedStructuredId(value: string) {
  return Boolean(value) && !/^(temp|ai|block)-/.test(value);
}

function inferAutomaticHouseholdMeasure(
  item: Pick<StudioMealItem, "foodName" | "tacoFoodId" | "quantity" | "unit">,
  locale: HouseholdLocale,
) {
  const normalizedUnit = item.unit
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const supportsConversion = ["g", "grama", "gramas", "ml", "mililitro", "mililitros"].includes(normalizedUnit);
  if (!supportsConversion || !Number.isFinite(item.quantity) || item.quantity <= 0) return null;

  try {
    const suggestion = suggestBestHouseholdMeasure({
      tacoFoodId: item.tacoFoodId,
      foodName: item.foodName,
      grams: item.quantity,
    });
    if (!suggestion) return null;
    return {
      value: formatHouseholdMeasureSuggestion(suggestion, locale),
      source: `AUTO:${suggestion.source}`,
    };
  } catch {
    return null;
  }
}

function scaleItemNutrition(item: StudioMealItem, nextQuantity: number): Partial<StudioMealItem> {
  const currentQuantity = Number(item.quantity);
  const ratio = currentQuantity > 0 ? nextQuantity / currentQuantity : 1;
  return {
    quantity: nextQuantity,
    calories: roundNutritionValue(item.calories * ratio),
    protein: roundNutritionValue(item.protein * ratio),
    carbs: roundNutritionValue(item.carbs * ratio),
    fat: roundNutritionValue(item.fat * ratio),
    ...(item.fiber !== undefined ? { fiber: roundNutritionValue(item.fiber * ratio) } : {}),
    ...(item.sodium !== undefined ? { sodium: roundNutritionValue(item.sodium * ratio) } : {}),
  };
}

const MEAL_DRAG_POSITION_TYPE = "application/x-nutriopus-meal-position";
const MEAL_ITEM_DRAG_TYPE = "application/x-nutriopus-meal-item";
let activeMealDragPosition: number | null = null;
let activeMealItemDrag: MealItemDragPayload | null = null;

interface MealItemDragPayload {
  sourceMealPosition: number;
  itemId: string;
}

type MealItemDropEdge = "BEFORE" | "AFTER";

interface FloatingStructuredImageProps {
  value: MealImageEditorValue;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: ImageTransformPatch) => void;
  resizeLabel: string;
  moveLabel: string;
}

function FloatingStructuredImage({
  value,
  selected,
  onSelect,
  onChange,
  resizeLabel,
  moveLabel,
}: FloatingStructuredImageProps) {
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
  if (value.layer === "INLINE") return null;
  return (
    <div className={`pointer-events-none absolute inset-0 ${value.layer === "FRONT" ? "z-40" : "z-0"}`}>
      <div
        className="pointer-events-auto absolute"
        style={{ transform: `translate(${value.x}px, ${value.y}px)` }}
      >
        <ImageTransformFrame
          width={value.width}
          height={value.height}
          x={value.x}
          y={value.y}
          aspectRatio={naturalAspectRatio}
          selected={selected}
          movable
          onSelect={onSelect}
          onChange={onChange}
          resizeLabel={resizeLabel}
          moveLabel={moveLabel}
          className="overflow-visible rounded-xl border border-border-neutral bg-warm-surface shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt={value.alt}
            draggable={false}
            className="pointer-events-none h-full w-full rounded-xl"
            style={{ objectFit: value.fit.toLowerCase() as "cover" | "contain" }}
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
                setNaturalAspectRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
              }
            }}
          />
        </ImageTransformFrame>
      </div>
    </div>
  );
}

export function MealNodeView(props: NodeViewProps) {
  const { t, locale } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const { node, updateAttributes, deleteNode, selected } = props;
  const options = props.extension.options as MealExtensionOptions;
  const planId = options.planId ?? "";
  const tenantSlug = options.tenantSlug ?? "";
  const onStructuredImageDetached = options.onStructuredImageDetached;
  const meal = node.attrs as Record<string, unknown>;
  const mealId = typeof meal.id === "string" ? meal.id : "";
  const mealName = typeof meal.name === "string" ? meal.name : "";
  const mealImageUrl = typeof meal.imageUrl === "string" ? meal.imageUrl : "";
  const mealImageAlt = typeof meal.imageAlt === "string" ? meal.imageAlt : "";
  const mealImageCaption = typeof meal.imageCaption === "string" ? meal.imageCaption : "";
  const mealShowImageInPdf = meal.showImageInPdf !== false;
  const mealImageLayout = normalizeMealImageLayout(meal);
  const mealItems = useMemo(() => {
    const items = (Array.isArray(meal.items) ? meal.items : []) as StudioMealItem[];
    return items.map((item, index) => ({
      ...item,
      id: typeof item.id === "string" && item.id ? item.id : `temp-${mealId || "meal"}-${index}`,
    }));
  }, [meal.items, mealId]);

  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [foodSourceForMeal, setFoodSourceForMeal] = useState<"TACO" | "CUSTOM">("TACO");
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [selectedImageTarget, setSelectedImageTarget] = useState<string | null>(null);
  const [isGapDropTarget, setIsGapDropTarget] = useState(false);
  const [itemDropTarget, setItemDropTarget] = useState<{ itemId: string; edge: MealItemDropEdge } | null>(null);
  const [isItemAppendDropTarget, setIsItemAppendDropTarget] = useState(false);
  const [savingLibraryTarget, setSavingLibraryTarget] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const mealFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const latestMealItemsRef = useRef<StudioMealItem[]>(mealItems);
  const temporaryItemCounterRef = useRef(0);
  const temporaryItemIdPrefix = useId();
  const householdMeasureListId = `household-measures-${temporaryItemIdPrefix}`;
  const foodUnitListId = `food-units-${temporaryItemIdPrefix}`;

  useEffect(() => {
    latestMealItemsRef.current = mealItems;
  }, [mealItems]);

  useEffect(() => {
    const persistedItems = Array.isArray(meal.items) ? meal.items as Array<Record<string, unknown>> : [];
    let changed = persistedItems.some((item) => typeof item.id !== "string" || !item.id);
    const nextItems = mealItems.map((item) => {
      if (item.householdMeasure || item.householdMeasureSource === "MANUAL") return item;
      const automaticMeasure = inferAutomaticHouseholdMeasure(item, locale);
      if (!automaticMeasure) return item;
      changed = true;
      return {
        ...item,
        householdMeasure: automaticMeasure.value,
        householdMeasureSource: automaticMeasure.source,
      };
    });

    if (changed) {
      latestMealItemsRef.current = nextItems;
      updateAttributes({ items: nextItems });
    }
  }, [locale, meal.items, mealItems, updateAttributes]);

  const mealTotals = calculateMealTotals(mealItems);

  const moveMealNode = (direction: "UP" | "DOWN") => {
    const position = props.getPos();
    if (typeof position !== "number") return;
    const { state, dispatch } = props.view;
    const currentNode = state.doc.nodeAt(position);
    if (!currentNode) return;

    if (direction === "UP") {
      const previousNode = state.doc.resolve(position).nodeBefore;
      if (!previousNode) return;
      dispatch(
        state.tr
          .delete(position, position + currentNode.nodeSize)
          .insert(position - previousNode.nodeSize, currentNode)
          .scrollIntoView(),
      );
      return;
    }

    const nextNode = state.doc.resolve(position + currentNode.nodeSize).nodeAfter;
    if (!nextNode) return;
    dispatch(
      state.tr
        .delete(position, position + currentNode.nodeSize)
        .insert(position + nextNode.nodeSize, currentNode)
        .scrollIntoView(),
    );
  };

  const readDraggedMealPosition = (event: React.DragEvent<HTMLElement>) => {
    const rawPosition = event.dataTransfer.getData(MEAL_DRAG_POSITION_TYPE);
    if (!rawPosition) return activeMealDragPosition;
    const parsed = Number(rawPosition);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : activeMealDragPosition;
  };

  const handleGapDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const sourcePosition = readDraggedMealPosition(event);
    const targetPosition = props.getPos();
    if (sourcePosition === null || typeof targetPosition !== "number" || sourcePosition === targetPosition) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setIsGapDropTarget(true);
  };

  const handleGapDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const sourcePosition = readDraggedMealPosition(event);
    const targetPosition = props.getPos();
    setIsGapDropTarget(false);
    activeMealDragPosition = null;
    if (sourcePosition === null || typeof targetPosition !== "number" || sourcePosition === targetPosition) return;

    event.preventDefault();
    event.stopPropagation();
    const { state, dispatch } = props.view;
    const sourceNode = state.doc.nodeAt(sourcePosition);
    const targetNode = state.doc.nodeAt(targetPosition);
    if (!sourceNode || !targetNode || sourceNode.type.name !== "meal" || targetNode.type.name !== "meal") return;

    // Crossing the first gap of the next card should already swap both cards.
    // Downward drags therefore insert after the hovered card; upward drags
    // insert before it.
    const insertionPosition = sourcePosition < targetPosition
      ? targetPosition + targetNode.nodeSize
      : targetPosition;
    const transaction = state.tr.delete(sourcePosition, sourcePosition + sourceNode.nodeSize);
    const mappedInsertionPosition = transaction.mapping.map(insertionPosition);
    dispatch(transaction.insert(mappedInsertionPosition, sourceNode).scrollIntoView());
  };

  const readDraggedMealItem = (event: React.DragEvent<HTMLElement>) => {
    const raw = event.dataTransfer.getData(MEAL_ITEM_DRAG_TYPE);
    if (!raw) return activeMealItemDrag;
    try {
      const parsed = JSON.parse(raw) as Partial<MealItemDragPayload>;
      return typeof parsed.sourceMealPosition === "number" && typeof parsed.itemId === "string"
        ? parsed as MealItemDragPayload
        : activeMealItemDrag;
    } catch {
      return activeMealItemDrag;
    }
  };

  const readDraggedLibraryFood = (event: React.DragEvent<HTMLElement>) => {
    const raw = event.dataTransfer.getData(MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE)
      || event.dataTransfer.getData("application/json");
    const payload = parseLibraryDragPayload(raw);
    return payload?.type === "meal-plan-library-food" ? payload.food : null;
  };

  const hasDraggedFood = (event: React.DragEvent<HTMLElement>) => {
    return event.dataTransfer.types.includes(MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE)
      || Boolean(readDraggedMealItem(event) || readDraggedLibraryFood(event));
  };

  const moveOrInsertMealItem = (
    event: React.DragEvent<HTMLElement>,
    targetItemId: string | null,
    edge: MealItemDropEdge = "AFTER",
  ) => {
    const sourcePayload = readDraggedMealItem(event);
    const libraryFood = readDraggedLibraryFood(event);
    const targetMealPosition = props.getPos();
    if ((!sourcePayload && !libraryFood) || typeof targetMealPosition !== "number") return;

    event.preventDefault();
    event.stopPropagation();
    const { state, dispatch } = props.view;
    const targetNode = state.doc.nodeAt(targetMealPosition);
    if (!targetNode || targetNode.type.name !== "meal") return;

    const withPositions = (items: StudioMealItem[]) => items.map((item, index) => ({ ...item, position: index }));
    const insertAtTarget = (items: StudioMealItem[], item: StudioMealItem) => {
      const targetIndex = targetItemId ? items.findIndex((candidate) => candidate.id === targetItemId) : -1;
      const insertionIndex = targetIndex < 0
        ? items.length
        : Math.min(items.length, targetIndex + (edge === "AFTER" ? 1 : 0));
      const next = items.slice();
      next.splice(insertionIndex, 0, item);
      return withPositions(next);
    };

    if (libraryFood) {
      const targetItems = (Array.isArray(targetNode.attrs.items) ? targetNode.attrs.items : []) as StudioMealItem[];
      const nextTargetItems = insertAtTarget(targetItems, savedFoodToCanvasItem(libraryFood) as StudioMealItem);
      dispatch(
        state.tr
          .setNodeMarkup(targetMealPosition, undefined, { ...targetNode.attrs, items: nextTargetItems })
          .scrollIntoView(),
      );
      options.onLibraryItemUsed?.("FOOD", libraryFood.id);
    } else if (sourcePayload) {
      const sourceNode = state.doc.nodeAt(sourcePayload.sourceMealPosition);
      if (!sourceNode || sourceNode.type.name !== "meal") return;
      if (sourcePayload.sourceMealPosition === targetMealPosition && targetItemId === sourcePayload.itemId) {
        activeMealItemDrag = null;
        setItemDropTarget(null);
        setIsItemAppendDropTarget(false);
        return;
      }
      const sourceItems = (Array.isArray(sourceNode.attrs.items) ? sourceNode.attrs.items : []) as StudioMealItem[];
      const draggedItem = sourceItems.find((item) => item.id === sourcePayload.itemId);
      if (!draggedItem) return;

      if (sourcePayload.sourceMealPosition === targetMealPosition) {
        const remaining = sourceItems.filter((item) => item.id !== sourcePayload.itemId);
        const nextItems = insertAtTarget(remaining, draggedItem);
        dispatch(
          state.tr
            .setNodeMarkup(targetMealPosition, undefined, { ...targetNode.attrs, items: nextItems })
            .scrollIntoView(),
        );
      } else {
        const targetItems = (Array.isArray(targetNode.attrs.items) ? targetNode.attrs.items : []) as StudioMealItem[];
        const nextSourceItems = withPositions(sourceItems.filter((item) => item.id !== sourcePayload.itemId));
        const nextTargetItems = insertAtTarget(targetItems, draggedItem);
        dispatch(
          state.tr
            .setNodeMarkup(sourcePayload.sourceMealPosition, undefined, { ...sourceNode.attrs, items: nextSourceItems })
            .setNodeMarkup(targetMealPosition, undefined, { ...targetNode.attrs, items: nextTargetItems })
            .scrollIntoView(),
        );
      }
    }

    activeMealItemDrag = null;
    setItemDropTarget(null);
    setIsItemAppendDropTarget(false);
  };

  const buildFoodLibrarySnapshot = (item: StudioMealItem): MealPlanLibraryFoodSnapshot => ({
    foodName: item.foodName,
    source: item.source,
    tacoFoodId: item.tacoFoodId,
    quantity: item.quantity,
    unit: item.unit,
    householdMeasure: item.householdMeasure,
    householdMeasureSource: item.householdMeasureSource,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
    sodium: item.sodium,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    imageCaption: item.imageCaption,
    showImageInPdf: item.showImageInPdf,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    imageFit: item.imageFit,
    imageAlignment: item.imageAlignment,
    imageLayer: item.imageLayer,
    imageX: item.imageX,
    imageY: item.imageY,
    imagePlacement: item.imagePlacement,
  });

  const saveFoodToLibrary = async (item: StudioMealItem) => {
    if (!options.onSaveFoodToLibrary || savingLibraryTarget) return;
    setSavingLibraryTarget(item.id);
    try {
      await options.onSaveFoodToLibrary(buildFoodLibrarySnapshot(item));
    } finally {
      setSavingLibraryTarget(null);
    }
  };

  const saveMealToLibrary = async () => {
    if (!options.onSaveMealToLibrary || savingLibraryTarget) return;
    setSavingLibraryTarget("meal");
    const snapshot: MealPlanLibraryMealSnapshot = {
      name: mealName || "Refeição",
      time: typeof meal.time === "string" ? meal.time : null,
      notes: typeof meal.notes === "string" ? meal.notes : null,
      imageUrl: mealImageUrl || null,
      imageAlt: mealImageAlt || null,
      imageCaption: mealImageCaption || null,
      showImageInPdf: mealShowImageInPdf,
      imageWidth: mealImageLayout.imageWidth,
      imageHeight: mealImageLayout.imageHeight,
      imageFit: mealImageLayout.imageFit,
      imageAlignment: mealImageLayout.imageAlignment,
      imageLayer: mealImageLayout.imageLayer,
      imageX: mealImageLayout.imageX,
      imageY: mealImageLayout.imageY,
      items: latestMealItemsRef.current.map((item, index) => ({
        ...buildFoodLibrarySnapshot(item),
        position: index,
      })),
    };
    try {
      await options.onSaveMealToLibrary(snapshot);
    } finally {
      setSavingLibraryTarget(null);
    }
  };

  const handleUpdateField = (field: string, value: string) => {
    updateAttributes({ [field]: value });
    if (isPersistedStructuredId(mealId) && tenantSlug) {
      startTransition(async () => {
        const result = await updateMealAction(tenantSlug, mealId, { [field]: value });
        if (result.error) toast.error(result.error);
      });
    }
  };

  const updateMealItems = (nextItems: StudioMealItem[]) => {
    latestMealItemsRef.current = nextItems;
    updateAttributes({ items: nextItems });
  };

  const updateItem = (itemId: string, patch: Partial<StudioMealItem>) => {
    updateMealItems(
      latestMealItemsRef.current.map((item) => item.id === itemId ? { ...item, ...patch } : item),
    );
  };

  const withAutomaticHouseholdMeasure = (
    item: StudioMealItem,
    patch: Partial<StudioMealItem>,
  ): Partial<StudioMealItem> => {
    if (item.householdMeasureSource === "MANUAL") return patch;
    const nextItem = { ...item, ...patch };
    const automaticMeasure = inferAutomaticHouseholdMeasure(nextItem, locale);
    return {
      ...patch,
      householdMeasure: automaticMeasure?.value,
      householdMeasureSource: automaticMeasure?.source ?? null,
    };
  };

  const handleItemQuantityChange = (item: StudioMealItem, rawValue: string) => {
    const nextQuantity = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return;
    updateItem(
      item.id,
      withAutomaticHouseholdMeasure(item, scaleItemNutrition(item, nextQuantity)),
    );
  };

  const handleItemIdentityChange = (
    item: StudioMealItem,
    patch: Pick<Partial<StudioMealItem>, "foodName" | "unit">,
  ) => {
    updateItem(item.id, withAutomaticHouseholdMeasure(item, patch));
  };

  const handleNutrientChange = (item: StudioMealItem, field: EditableNutrientField, rawValue: string) => {
    const value = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    updateItem(item.id, { [field]: roundNutritionValue(value) });
  };

  const restoreAutomaticHouseholdMeasure = (item: StudioMealItem) => {
    const automaticMeasure = inferAutomaticHouseholdMeasure(item, locale);
    updateItem(item.id, {
      householdMeasure: automaticMeasure?.value,
      householdMeasureSource: automaticMeasure?.source ?? null,
    });
  };

  const handleAddFood = (food: PartialMealItem | Record<string, unknown>) => {
    const candidate = food as PartialMealItem;
    temporaryItemCounterRef.current += 1;
    const newItem: StudioMealItem = {
      id: `temp-${temporaryItemIdPrefix}-${temporaryItemCounterRef.current}`,
      foodName: String(candidate.foodName ?? ("name" in food ? food.name : "") ?? ""),
      source: candidate.source === "TACO" ? "TACO" : foodSourceForMeal,
      tacoFoodId: candidate.tacoFoodId,
      quantity: Number(candidate.quantity ?? 100),
      unit: candidate.unit || "g",
      householdMeasure: candidate.householdMeasure,
      householdMeasureSource: candidate.householdMeasure ? "MANUAL" : null,
      calories: Number(candidate.calories ?? 0),
      protein: Number(candidate.protein ?? 0),
      carbs: Number(candidate.carbs ?? 0),
      fat: Number(candidate.fat ?? 0),
      fiber: candidate.fiber,
      sodium: candidate.sodium,
    };

    if (!newItem.householdMeasure) {
      const automaticMeasure = inferAutomaticHouseholdMeasure(newItem, locale);
      if (automaticMeasure) {
        newItem.householdMeasure = automaticMeasure.value;
        newItem.householdMeasureSource = automaticMeasure.source;
      }
    }

    const newItems = [...latestMealItemsRef.current, newItem];
    updateMealItems(newItems);
    setIsAddingFood(false);

    if (isPersistedStructuredId(mealId) && tenantSlug) {
      startTransition(async () => {
        const result = await addMealItemAction(tenantSlug, {
          mealId,
          foodName: newItem.foodName,
          source: newItem.source,
          tacoFoodId: newItem.tacoFoodId,
          quantity: newItem.quantity,
          unit: newItem.unit,
          householdMeasure: newItem.householdMeasure,
          calories: newItem.calories,
          protein: newItem.protein,
          carbs: newItem.carbs,
          fat: newItem.fat,
          fiber: newItem.fiber,
          sodium: newItem.sodium,
          position: newItems.length - 1,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.item) {
          const savedItem: StudioMealItem = {
            ...result.item,
            tacoFoodId: result.item.tacoFoodId ?? undefined,
            householdMeasure: result.item.householdMeasure ?? newItem.householdMeasure,
            householdMeasureSource: newItem.householdMeasureSource,
            fiber: result.item.fiber ?? undefined,
            sodium: result.item.sodium ?? undefined,
          };
          updateMealItems(
            latestMealItemsRef.current.map((item) => item.id === newItem.id ? savedItem : item),
          );
        }
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const removed = mealItems.find((item) => item.id === itemId);
    if (removed?.imageUrl) onStructuredImageDetached?.(removed.imageUrl);
    updateMealItems(latestMealItemsRef.current.filter((item) => item.id !== itemId));
    if (isPersistedStructuredId(mealId) && tenantSlug && isPersistedStructuredId(itemId)) {
      startTransition(async () => {
        const result = await deleteMealItemAction(tenantSlug, itemId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (removed?.imageUrl) {
          await cleanupPersistedStructuredImages([removed.imageUrl]);
        }
      });
    }
  };

  const handleRemoveMeal = async () => {
    const confirmed = await requestConfirmation({
      title: t("confirmations.remove_meal.title"),
      description: t("confirmations.remove_meal.description"),
      confirmLabel: t("confirmations.remove_meal.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;

    const detachedImageUrls = [mealImageUrl, ...mealItems.map((item) => item.imageUrl ?? "")]
      .filter((url): url is string => Boolean(url));
    detachedImageUrls.forEach((url) => onStructuredImageDetached?.(url));
    deleteNode();
    if (isPersistedStructuredId(mealId) && tenantSlug) {
      startTransition(async () => {
        const result = await deleteMealAction(tenantSlug, mealId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        await cleanupPersistedStructuredImages(detachedImageUrls);
      });
    }
  };

  const handleUploadMealImage = async (file: File) => {
    if (!planId) {
      toast.error(t("meal_plan_clinical.images.plan_required"));
      return;
    }

    setUploadingTarget("meal");
    try {
      const uploaded = await uploadMealPlanImage({
        file,
        planId,
        kind: "MEAL",
        targetId: isPersistedStructuredId(mealId) ? mealId : null,
      });
      if (mealImageUrl && mealImageUrl !== uploaded.url) onStructuredImageDetached?.(mealImageUrl);
      updateAttributes({
        imageUrl: uploaded.url,
        imageAlt: mealImageAlt || mealName || file.name,
        showImageInPdf: true,
      });
      setSelectedImageTarget("meal");
      toast.success(t("meal_plan_clinical.images.upload_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t));
    } finally {
      setUploadingTarget(null);
      if (mealFileInputRef.current) mealFileInputRef.current.value = "";
    }
  };

  const handleUploadItemImage = async (item: StudioMealItem, file: File) => {
    if (!planId) {
      toast.error(t("meal_plan_clinical.images.plan_required"));
      return;
    }

    setUploadingTarget(item.id);
    try {
      const uploaded = await uploadMealPlanImage({
        file,
        planId,
        kind: "FOOD_ITEM",
        targetId: isPersistedStructuredId(item.id) ? item.id : null,
      });
      if (item.imageUrl && item.imageUrl !== uploaded.url) onStructuredImageDetached?.(item.imageUrl);
      updateItem(item.id, {
        imageUrl: uploaded.url,
        imageAlt: item.imageAlt || item.foodName || file.name,
        showImageInPdf: true,
        imageWidth: item.imageWidth ?? 200,
        imageHeight: item.imageHeight ?? 120,
        imageFit: item.imageFit ?? "COVER",
        imageAlignment: item.imageAlignment ?? "LEFT",
        imageLayer: item.imageLayer ?? "INLINE",
        imageX: item.imageX ?? 24,
        imageY: item.imageY ?? 24,
        imagePlacement: item.imagePlacement ?? "SIDE",
      });
      setSelectedImageTarget(item.id);
      toast.success(t("meal_plan_clinical.images.upload_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t));
    } finally {
      setUploadingTarget(null);
      const input = itemFileInputRefs.current.get(item.id);
      if (input) input.value = "";
    }
  };

  const removeMealImage = () => {
    if (mealImageUrl) onStructuredImageDetached?.(mealImageUrl);
    updateAttributes({ imageUrl: null, imageAlt: null, imageCaption: null, showImageInPdf: true });
    setSelectedImageTarget((target) => target === "meal" ? null : target);
  };

  const removeItemImage = (item: StudioMealItem) => {
    if (item.imageUrl) onStructuredImageDetached?.(item.imageUrl);
    updateItem(item.id, { imageUrl: null, imageAlt: null, imageCaption: null, showImageInPdf: true });
    setSelectedImageTarget((target) => target === item.id ? null : target);
  };

  const updateMealImageAttributes = (patch: MealImageAttributes) => updateAttributes(patch);

  const updateMealImageEditor = (patch: Partial<MealImageEditorValue>) => {
    const attributes: MealImageAttributes = {};
    if ("alt" in patch) attributes.imageAlt = patch.alt;
    if ("caption" in patch) attributes.imageCaption = patch.caption;
    if ("showInPdf" in patch) attributes.showImageInPdf = patch.showInPdf;
    if ("width" in patch) attributes.imageWidth = patch.width;
    if ("height" in patch) attributes.imageHeight = patch.height;
    if ("fit" in patch) attributes.imageFit = patch.fit;
    if ("alignment" in patch) attributes.imageAlignment = patch.alignment;
    if ("layer" in patch) attributes.imageLayer = patch.layer;
    if ("x" in patch) attributes.imageX = patch.x;
    if ("y" in patch) attributes.imageY = patch.y;
    updateMealImageAttributes(attributes);
  };

  const updateItemImageEditor = (itemId: string, patch: Partial<MealImageEditorValue>) => {
    const attributes: Partial<StudioMealItem> = {};
    if ("alt" in patch) attributes.imageAlt = patch.alt;
    if ("caption" in patch) attributes.imageCaption = patch.caption;
    if ("showInPdf" in patch) attributes.showImageInPdf = patch.showInPdf;
    if ("width" in patch) attributes.imageWidth = patch.width;
    if ("height" in patch) attributes.imageHeight = patch.height;
    if ("fit" in patch) attributes.imageFit = patch.fit;
    if ("alignment" in patch) attributes.imageAlignment = patch.alignment;
    if ("layer" in patch) attributes.imageLayer = patch.layer;
    if ("x" in patch) attributes.imageX = patch.x;
    if ("y" in patch) attributes.imageY = patch.y;
    if ("placement" in patch) attributes.imagePlacement = patch.placement;
    updateItem(itemId, attributes);
  };

  const cleanupPersistedStructuredImages = async (urls: string[]) => {
    if (!planId || urls.length === 0) return;
    const results = await Promise.allSettled(urls.map((url) => deleteMealPlanImage({ planId, url })));
    if (results.some((result) => result.status === "rejected")) {
      toast.error(t("meal_plan_clinical.images.delete_error"));
    }
  };

  return (
    <NodeViewWrapper className="meal-node-view relative my-4">
      <div
        contentEditable={false}
        onDragEnter={handleGapDragOver}
        onDragOver={handleGapDragOver}
        onDragLeave={() => setIsGapDropTarget(false)}
        onDrop={handleGapDrop}
        className="absolute -top-4 left-0 right-0 z-[70] h-8"
        aria-hidden="true"
      >
        <div className={`pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-brand-blue transition-opacity ${isGapDropTarget ? "opacity-100" : "opacity-0"}`} />
      </div>
      <div className={`isolate bg-card-bg rounded-2xl border shadow-sm overflow-hidden relative group transition-[border-color,box-shadow] ${selected ? "border-brand-blue ring-2 ring-brand-blue/30" : "border-border-neutral"}`}>
        {mealImageUrl && (
          <FloatingStructuredImage
            value={{
            url: mealImageUrl,
            alt: mealImageAlt || mealName,
            caption: mealImageCaption,
            showInPdf: mealShowImageInPdf,
            width: mealImageLayout.imageWidth,
            height: mealImageLayout.imageHeight,
            fit: mealImageLayout.imageFit,
            alignment: mealImageLayout.imageAlignment,
            layer: mealImageLayout.imageLayer,
            x: mealImageLayout.imageX,
            y: mealImageLayout.imageY,
            }}
            selected={selectedImageTarget === "meal"}
            onSelect={() => setSelectedImageTarget("meal")}
            onChange={updateMealImageEditor}
            resizeLabel={t("meal_plan_clinical.images.resize")}
            moveLabel={t("meal_plan_clinical.images.move")}
          />
        )}
        {mealItems.map((item) => {
          if (!item.imageUrl) return null;
          const layout = normalizeFoodImageLayout(item as unknown as Record<string, unknown>);
          return (
            <FloatingStructuredImage
              key={`${item.id}-${item.position ?? 0}`}
              value={{
              url: item.imageUrl,
              alt: item.imageAlt || item.foodName,
              caption: item.imageCaption || "",
              showInPdf: item.showImageInPdf !== false,
              width: layout.imageWidth,
              height: layout.imageHeight,
              fit: layout.imageFit,
              alignment: layout.imageAlignment,
              layer: layout.imageLayer,
              x: layout.imageX,
              y: layout.imageY,
              }}
              selected={selectedImageTarget === item.id}
              onSelect={() => setSelectedImageTarget(item.id)}
              onChange={(patch) => updateItemImageEditor(item.id, patch)}
              resizeLabel={t("meal_plan_clinical.images.resize")}
              moveLabel={t("meal_plan_clinical.images.move")}
            />
          );
        })}
        <div
          className={`relative z-10 p-4 bg-warm-beige/90 border-b flex items-center gap-3 transition-colors ${isItemAppendDropTarget ? "border-brand-blue bg-brand-blue/10" : "border-border-neutral"}`}
          onDragOver={(event) => {
            if (!hasDraggedFood(event)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = readDraggedLibraryFood(event) ? "copy" : "move";
            setIsItemAppendDropTarget(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsItemAppendDropTarget(false);
          }}
          onDrop={(event) => moveOrInsertMealItem(event, null)}
        >
          <div
            className="cursor-grab hover:text-brand-blue text-text-secondary active:cursor-grabbing p-1"
            data-drag-handle
            draggable
            title={t("meal_plan_clinical.meals.drag")}
            onDragStart={(event) => {
              const position = props.getPos();
              if (typeof position !== "number") return;
              activeMealDragPosition = position;
              event.dataTransfer.setData(MEAL_DRAG_POSITION_TYPE, String(position));
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              activeMealDragPosition = null;
              setIsGapDropTarget(false);
            }}
          >
            <GripVertical className="w-5 h-5" />
          </div>
          {mealImageUrl && (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border-neutral/50 bg-card-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mealImageUrl} alt={mealImageAlt || mealName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <input
              value={mealName}
              onChange={(event) => updateAttributes({ name: event.target.value })}
              onBlur={(event) => handleUpdateField("name", event.target.value)}
              className="font-semibold text-text-primary bg-transparent border-none focus:outline-none w-full text-base"
              placeholder={t("meal_plan_clinical.meals.name_placeholder")}
            />
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-text-secondary" />
              <input
                type="time"
                value={(meal.time as string) || ""}
                onChange={(event) => updateAttributes({ time: event.target.value })}
                onBlur={(event) => handleUpdateField("time", event.target.value)}
                className="text-sm text-text-secondary bg-transparent border-none focus:outline-none"
                aria-label={t("meal_plan_clinical.meals.time")}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary mr-2">
              <span className="font-semibold text-amber-600">{mealTotals.calories}kcal</span>
            </div>
            {options.onSaveMealToLibrary && (
              <button type="button" onClick={() => void saveMealToLibrary()} disabled={savingLibraryTarget !== null} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary hover:text-brand-blue transition-colors disabled:opacity-50" title={t("meal_plan_clinical.library.save_meal") }>
                {savingLibraryTarget === "meal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={() => mealFileInputRef.current?.click()} disabled={uploadingTarget === "meal"} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary hover:text-brand-blue transition-colors disabled:opacity-50" title={t("meal_plan_clinical.images.meal_add") }>
              {uploadingTarget === "meal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => moveMealNode("UP")} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary hover:text-brand-blue transition-colors" title={t("meal_plan_clinical.meals.move_up")}>
              <ArrowUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => moveMealNode("DOWN")} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary hover:text-brand-blue transition-colors" title={t("meal_plan_clinical.meals.move_down")}>
              <ArrowDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setIsExpanded((value) => !value)} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary transition-colors" title={isExpanded ? t("meal_plan_clinical.meals.collapse") : t("meal_plan_clinical.meals.expand")}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button type="button" onClick={handleRemoveMeal} className="p-1.5 rounded-lg hover:bg-card-bg text-text-secondary hover:text-danger transition-colors" title={t("meal_plan_clinical.meals.remove")}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <input
          ref={mealFileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUploadMealImage(file);
          }}
        />

        {isExpanded && (
          <>
            <div className="relative z-10 p-4 bg-warm-surface/80 border-b border-border-neutral">
              <textarea
                value={(meal.notes as string) || ""}
                onChange={(event) => updateAttributes({ notes: event.target.value })}
                onBlur={(event) => handleUpdateField("notes", event.target.value)}
                placeholder={t("meal_plan_clinical.meals.notes_placeholder")}
                className="w-full text-sm text-text-secondary bg-transparent border-none focus:outline-none resize-none placeholder:text-gray-300"
                rows={1}
              />
            </div>

            {mealImageUrl && (
              <div className="relative z-10 border-b border-border-neutral bg-brand-blue/10 px-4 py-4">
                <MealImageEditor
                  value={{
                    url: mealImageUrl,
                    alt: mealImageAlt || mealName,
                    caption: mealImageCaption,
                    showInPdf: mealShowImageInPdf,
                    width: mealImageLayout.imageWidth,
                    height: mealImageLayout.imageHeight,
                    fit: mealImageLayout.imageFit,
                    alignment: mealImageLayout.imageAlignment,
                    layer: mealImageLayout.imageLayer,
                    x: mealImageLayout.imageX,
                    y: mealImageLayout.imageY,
                  }}
                  onChange={updateMealImageEditor}
                  onReplace={() => mealFileInputRef.current?.click()}
                  onRemove={removeMealImage}
                />
              </div>
            )}

            <div className="relative z-10 p-4 bg-card-bg/90">
              {mealItems.length > 0 ? (
                <>
                <div className="mb-4 space-y-3">
                  {mealItems.map((item) => {
                    const itemImageUrl = item.imageUrl || "";
                    const itemShowImageInPdf = item.showImageInPdf !== false;
                    const itemImageLayout = normalizeFoodImageLayout(item as unknown as Record<string, unknown>);
                    const itemImagePlacement = normalizeFoodImagePlacement(item.imagePlacement);
                    const hasAutomaticMeasure = item.householdMeasureSource?.startsWith("AUTO:") ?? false;
                    const nutrients: Array<{
                      field: EditableNutrientField;
                      label: string;
                      unit: "kcal" | "g";
                      color: string;
                      bg: string;
                    }> = [
                      { field: "calories", label: t("meal_plan_clinical.macros.calories"), unit: "kcal", color: "text-amber-600", bg: "bg-amber-500/10" },
                      { field: "carbs", label: t("meal_plan_clinical.macros.carbs"), unit: "g", color: "text-blue-600", bg: "bg-blue-500/10" },
                      { field: "protein", label: t("meal_plan_clinical.macros.protein"), unit: "g", color: "text-emerald-600", bg: "bg-emerald-500/10" },
                      { field: "fat", label: t("meal_plan_clinical.macros.fat"), unit: "g", color: "text-rose-500", bg: "bg-rose-500/10" },
                    ];
                    const imageEditor = itemImageUrl ? (
                      <div className="min-w-0 max-w-full rounded-xl bg-brand-blue/5 p-2.5 font-normal">
                        <MealImageEditor
                          title={null}
                          value={{
                            url: itemImageUrl,
                            alt: item.imageAlt || item.foodName,
                            caption: item.imageCaption || "",
                            showInPdf: itemShowImageInPdf,
                            width: itemImageLayout.imageWidth,
                            height: itemImageLayout.imageHeight,
                            fit: itemImageLayout.imageFit,
                            alignment: itemImageLayout.imageAlignment,
                            layer: itemImageLayout.imageLayer,
                            x: itemImageLayout.imageX,
                            y: itemImageLayout.imageY,
                            placement: itemImagePlacement,
                          }}
                          onChange={(patch) => updateItemImageEditor(item.id, patch)}
                          onReplace={() => itemFileInputRefs.current.get(item.id)?.click()}
                          onRemove={() => removeItemImage(item)}
                        />
                      </div>
                    ) : null;

                    return (
                      <article
                        key={`${item.id}-${item.position ?? 0}`}
                        onDragOver={(event) => {
                          if (!hasDraggedFood(event)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = readDraggedLibraryFood(event) ? "copy" : "move";
                          const bounds = event.currentTarget.getBoundingClientRect();
                          const edge: MealItemDropEdge = event.clientY < bounds.top + bounds.height / 2 ? "BEFORE" : "AFTER";
                          setItemDropTarget({ itemId: item.id, edge });
                          setIsItemAppendDropTarget(false);
                        }}
                        onDragLeave={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setItemDropTarget(null);
                        }}
                        onDrop={(event) => moveOrInsertMealItem(event, item.id, itemDropTarget?.edge ?? "AFTER")}
                        className="group relative rounded-2xl border border-border-neutral bg-card-bg p-3 shadow-sm transition-colors hover:border-brand-blue/30 hover:bg-warm-beige/20 sm:p-4"
                      >
                        {itemDropTarget?.itemId === item.id && (
                          <div className={`pointer-events-none absolute left-2 right-2 z-50 h-1 rounded-full bg-brand-blue shadow-[0_0_0_3px_rgba(37,99,235,0.15)] ${itemDropTarget.edge === "BEFORE" ? "-top-2" : "-bottom-2"}`} />
                        )}
                        <input
                          ref={(element) => {
                            if (element) itemFileInputRefs.current.set(item.id, element);
                            else itemFileInputRefs.current.delete(item.id);
                          }}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleUploadItemImage(item, file);
                          }}
                        />

                        {itemImagePlacement === "ABOVE" && imageEditor && (
                          <div className="mb-3">{imageEditor}</div>
                        )}

                        <div className={itemImagePlacement === "SIDE" && imageEditor ? "grid gap-4 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]" : ""}>
                          {itemImagePlacement === "SIDE" && imageEditor}

                          <div className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <label className="block">
                                  <span className="sr-only">{t("meal_plan_clinical.items.food")}</span>
                                  <input
                                    value={item.foodName}
                                    onChange={(event) => handleItemIdentityChange(item, { foodName: event.target.value })}
                                    className="-ml-2 h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-base font-semibold leading-tight text-text-primary outline-none transition hover:border-border-neutral hover:bg-warm-surface/60 focus:border-brand-blue focus:bg-card-bg focus:ring-2 focus:ring-brand-blue/20"
                                  />
                                </label>
                                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                                  <span>{t("meal_plan_clinical.items.quantity")}:</span>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.quantity}
                                    onFocus={(event) => event.currentTarget.select()}
                                    onChange={(event) => handleItemQuantityChange(item, event.target.value)}
                                    aria-label={t("meal_plan_clinical.items.quantity")}
                                    title={t("meal_plan_clinical.items.recalculation_hint")}
                                    className="h-7 w-20 rounded-md border border-transparent bg-transparent px-1.5 font-semibold text-text-primary outline-none transition hover:border-border-neutral hover:bg-warm-surface focus:border-brand-blue focus:bg-card-bg focus:ring-2 focus:ring-brand-blue/20"
                                  />
                                  <input
                                    value={item.unit}
                                    list={foodUnitListId}
                                    onFocus={(event) => event.currentTarget.select()}
                                    onChange={(event) => handleItemIdentityChange(item, { unit: event.target.value })}
                                    aria-label={t("meal_plan_clinical.items.unit")}
                                    className="h-7 w-24 rounded-md border border-transparent bg-transparent px-1.5 font-semibold text-text-primary outline-none transition hover:border-border-neutral hover:bg-warm-surface focus:border-brand-blue focus:bg-card-bg focus:ring-2 focus:ring-brand-blue/20"
                                  />
                                  <Sparkles className="h-3 w-3 text-brand-blue" aria-hidden="true" />
                                  <span className="sr-only">{t("meal_plan_clinical.items.recalculation_hint")}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <div
                                  draggable
                                  onDragStart={(event) => {
                                    const sourceMealPosition = props.getPos();
                                    if (typeof sourceMealPosition !== "number") return;
                                    const payload = { sourceMealPosition, itemId: item.id } satisfies MealItemDragPayload;
                                    activeMealItemDrag = payload;
                                    event.dataTransfer.setData(MEAL_ITEM_DRAG_TYPE, JSON.stringify(payload));
                                    event.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() => {
                                    activeMealItemDrag = null;
                                    setItemDropTarget(null);
                                    setIsItemAppendDropTarget(false);
                                  }}
                                  className="cursor-grab rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-brand-blue/10 hover:text-brand-blue active:cursor-grabbing"
                                  title={t("meal_plan_clinical.library.drag_food")}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                {options.onSaveFoodToLibrary && (
                                  <button type="button" onClick={() => void saveFoodToLibrary(item)} disabled={savingLibraryTarget !== null} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-brand-blue/10 hover:text-brand-blue disabled:opacity-50" title={t("meal_plan_clinical.library.save_food") }>
                                    {savingLibraryTarget === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                                  </button>
                                )}
                                {!itemImageUrl && (
                                  <button type="button" onClick={() => itemFileInputRefs.current.get(item.id)?.click()} disabled={uploadingTarget === item.id} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-50" title={t("meal_plan_clinical.images.food_add")}>
                                    {uploadingTarget === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                                    {t("meal_plan_clinical.images.food_add_short")}
                                  </button>
                                )}
                                <button type="button" onClick={() => handleRemoveItem(item.id)} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger" title={t("meal_plan_clinical.items.remove")}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <label className="block space-y-1.5">
                              <span className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                {t("meal_plan_clinical.household_measure.label")}
                                <span className="rounded-full bg-warm-beige px-2 py-0.5 text-[9px] font-medium normal-case tracking-normal text-text-secondary">
                                  {t("meal_plan_clinical.household_measure.optional")}
                                </span>
                                {hasAutomaticMeasure && (
                                  <span className="flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-brand-blue">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {t("meal_plan_clinical.household_measure.automatic")}
                                  </span>
                                )}
                              </span>
                              <div className="group/measure flex items-center gap-1 rounded-xl border border-transparent bg-warm-surface/40 px-1 transition hover:border-border-neutral focus-within:border-brand-blue focus-within:bg-card-bg focus-within:ring-2 focus-within:ring-brand-blue/20">
                                <input
                                  value={item.householdMeasure ?? ""}
                                  list={householdMeasureListId}
                                  onChange={(event) => updateItem(item.id, {
                                    householdMeasure: event.target.value || undefined,
                                    householdMeasureSource: "MANUAL",
                                  })}
                                  placeholder={t("meal_plan_clinical.household_measure.placeholder")}
                                  aria-label={t("meal_plan_clinical.household_measure.label")}
                                  className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary/60"
                                />
                                <button
                                  type="button"
                                  onClick={() => restoreAutomaticHouseholdMeasure(item)}
                                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-brand-blue opacity-70 transition hover:bg-brand-blue/10 hover:opacity-100 focus:opacity-100"
                                  title={t("meal_plan_clinical.household_measure.restore_automatic")}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span className="hidden sm:inline">{t("meal_plan_clinical.household_measure.auto_short")}</span>
                                </button>
                              </div>
                            </label>

                            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                              {nutrients.map((nutrient) => (
                                <label key={nutrient.field} className={`min-w-0 cursor-text rounded-xl px-2.5 py-2 transition hover:ring-1 hover:ring-current/20 focus-within:ring-2 focus-within:ring-brand-blue/25 ${nutrient.bg}`}>
                                  <p className="min-h-6 text-[10px] font-semibold uppercase leading-tight tracking-wide text-text-secondary">{nutrient.label}</p>
                                  <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={item[nutrient.field]}
                                      onFocus={(event) => event.currentTarget.select()}
                                      onChange={(event) => handleNutrientChange(item, nutrient.field, event.target.value)}
                                      aria-label={nutrient.label}
                                      className={`h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-base font-bold tabular-nums outline-none transition hover:bg-card-bg/60 focus:bg-card-bg ${nutrient.color}`}
                                    />
                                    <span className="shrink-0 text-[10px] font-semibold text-text-secondary">{nutrient.unit}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {itemImagePlacement === "BELOW" && imageEditor && (
                          <div className="mt-3">{imageEditor}</div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <datalist id={householdMeasureListId}>
                  {COMMON_HOUSEHOLD_MEASURE_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion.id} value={t(suggestion.labelKey)} />
                  ))}
                </datalist>
                <datalist id={foodUnitListId}>
                  {["g", "ml", "kg", "L", "unidade", "fatia", "colher", "xícara", "copo", "porção"].map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
                </>
              ) : (
                <p className="text-sm text-text-secondary italic text-center mb-4">{t("meal_plan_clinical.items.empty")}</p>
              )}

              <div
                onDragOver={(event) => {
                  if (!hasDraggedFood(event)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = readDraggedLibraryFood(event) ? "copy" : "move";
                  setItemDropTarget(null);
                  setIsItemAppendDropTarget(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsItemAppendDropTarget(false);
                }}
                onDrop={(event) => moveOrInsertMealItem(event, null)}
                className={`mb-3 flex min-h-3 items-center justify-center rounded-xl border border-dashed text-[11px] font-semibold transition-all ${isItemAppendDropTarget ? "min-h-12 border-brand-blue bg-brand-blue/10 text-brand-blue" : "border-transparent text-transparent"}`}
              >
                {t("meal_plan_clinical.library.drop_food_here")}
              </div>

              {!isAddingFood ? (
                <button type="button" onClick={() => setIsAddingFood(true)} className="text-sm font-medium text-brand-blue hover:text-brand-hover flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {t("meal_plan_clinical.items.add")}
                </button>
              ) : (
                <div className="border border-brand-blue/30 rounded-xl p-4 bg-brand-blue/5 mt-2">
                  <div className="flex gap-2 mb-3 border-b border-border-neutral pb-2">
                    <button type="button" className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${foodSourceForMeal === "TACO" ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige"}`} onClick={() => setFoodSourceForMeal("TACO")}>TACO</button>
                    <button type="button" className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${foodSourceForMeal === "CUSTOM" ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige"}`} onClick={() => setFoodSourceForMeal("CUSTOM")}>{t("meal_plan_clinical.items.custom")}</button>
                  </div>
                  {foodSourceForMeal === "TACO" ? <FoodDatabaseSearch onAdd={handleAddFood} /> : <CustomFoodForm onAdd={handleAddFood} />}
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => setIsAddingFood(false)} className="text-sm text-text-secondary hover:text-text-primary">{t("meal_plan_clinical.common.cancel")}</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {isExpanded && (
          <div className="relative z-10 bg-warm-surface/90 px-4 py-2 border-t border-border-neutral flex flex-wrap gap-4 text-xs">
            <span>{t("meal_plan_clinical.meals.total")}: <strong className="text-amber-600">{mealTotals.calories}kcal</strong></span>
            <span>{t("meal_plan_clinical.macros.carbs")}: <strong className="text-blue-600">{mealTotals.carbs}g</strong></span>
            <span>{t("meal_plan_clinical.macros.protein")}: <strong className="text-emerald-600">{mealTotals.protein}g</strong></span>
            <span>{t("meal_plan_clinical.macros.fat")}: <strong className="text-rose-500">{mealTotals.fat}g</strong></span>
          </div>
        )}
      </div>
      {confirmDialog}
    </NodeViewWrapper>
  );
}
