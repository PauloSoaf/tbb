import {
  DEFAULT_MEAL_IMAGE_LAYOUT,
  DEFAULT_FOOD_IMAGE_PLACEMENT,
  DEFAULT_FOOD_IMAGE_LAYOUT,
  normalizeMealImageLayout,
  normalizeFoodImagePlacement,
  normalizeFoodImageLayout,
} from "@/lib/meal-plan/meal-image-layout";

export type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson };

export interface StudioMealItemDraft {
  id?: string;
  foodName: string;
  source: "TACO" | "CUSTOM";
  tacoFoodId?: string | null;
  quantity: number;
  unit: string;
  householdMeasure?: string | null;
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
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sodium?: number | null;
  notes?: string | null;
  position: number;
}

export interface StudioMealDraft {
  id?: string;
  name: string;
  time?: string | null;
  notes?: string | null;
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
  position: number;
  items: StudioMealItemDraft[];
}

export interface StudioMealRecordInput {
  id?: unknown;
  name?: unknown;
  time?: unknown;
  notes?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  imageCaption?: unknown;
  showImageInPdf?: unknown;
  imageWidth?: unknown;
  imageHeight?: unknown;
  imageFit?: unknown;
  imageAlignment?: unknown;
  imageLayer?: unknown;
  imageX?: unknown;
  imageY?: unknown;
  position?: unknown;
  items?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function toSerializableJson(value: unknown, depth = 0): SerializableJson | undefined {
  if (depth > 60) return undefined;
  if (value === null) return null;

  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    return undefined;
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const sanitized = value
      .map((entry) => toSerializableJson(entry, depth + 1))
      .filter((entry): entry is SerializableJson => entry !== undefined);
    return sanitized;
  }

  if (!isPlainObject(value)) return undefined;

  const output: { [key: string]: SerializableJson } = {};
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") continue;
    const sanitized = toSerializableJson(value[key], depth + 1);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? value : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNonNegativeNumber(value: unknown): number {
  return Math.max(0, readNumber(value, 0));
}

function readPositiveNumber(value: unknown, fallback = 1): number {
  const parsed = readNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function keepStableId(value: unknown): string | undefined {
  const id = readString(value);
  if (!id || id.startsWith("temp-") || id.startsWith("ai-") || id.startsWith("block-")) return undefined;
  return id;
}

function normalizeMealItem(value: unknown, position: number): StudioMealItemDraft | null {
  const item = readRecord(value);
  if (!item) return null;

  const foodName = readString(item.foodName ?? item.name);
  if (!foodName) return null;

  const source = item.source === "TACO" ? "TACO" : "CUSTOM";
  const imageLayout = normalizeFoodImageLayout(item);
  return {
    id: keepStableId(item.id),
    foodName,
    source,
    tacoFoodId: readNullableString(item.tacoFoodId),
    quantity: readPositiveNumber(item.quantity, 1),
    unit: readString(item.unit) ?? "g",
    householdMeasure: readNullableString(item.householdMeasure),
    householdMeasureSource: readNullableString(item.householdMeasureSource),
    imageUrl: readNullableString(item.imageUrl),
    imageAlt: readNullableString(item.imageAlt),
    imageCaption: readNullableString(item.imageCaption),
    showImageInPdf: readBoolean(item.showImageInPdf, true),
    ...imageLayout,
    imagePlacement: normalizeFoodImagePlacement(item.imagePlacement),
    calories: readNonNegativeNumber(item.calories),
    protein: readNonNegativeNumber(item.protein),
    carbs: readNonNegativeNumber(item.carbs),
    fat: readNonNegativeNumber(item.fat),
    fiber: item.fiber == null ? null : readNonNegativeNumber(item.fiber),
    sodium: item.sodium == null ? null : readNonNegativeNumber(item.sodium),
    notes: readNullableString(item.notes),
    position,
  };
}

function normalizeMeal(attrs: Record<string, unknown>, position: number): StudioMealDraft | null {
  const name = readString(attrs.name) ?? "Refeicao";
  const items = readArray(attrs.items)
    .map((item, index) => normalizeMealItem(item, index))
    .filter((item): item is StudioMealItemDraft => item !== null);

  const imageLayout = normalizeMealImageLayout(attrs);

  return {
    id: keepStableId(attrs.id),
    name,
    time: readNullableString(attrs.time),
    notes: readNullableString(attrs.notes),
    imageUrl: readNullableString(attrs.imageUrl),
    imageAlt: readNullableString(attrs.imageAlt),
    imageCaption: readNullableString(attrs.imageCaption),
    showImageInPdf: readBoolean(attrs.showImageInPdf, true),
    ...imageLayout,
    position,
    items,
  };
}

export function normalizeStudioMealDraftsFromRecords(meals: unknown): StudioMealDraft[] {
  return readArray(meals)
    .map((value, index) => {
      const meal = readRecord(value) as StudioMealRecordInput | null;
      if (!meal) return null;

      return normalizeMeal(
        {
          id: meal.id,
          name: meal.name,
          time: meal.time,
          notes: meal.notes,
          imageUrl: meal.imageUrl,
          imageAlt: meal.imageAlt,
          imageCaption: meal.imageCaption,
          showImageInPdf: meal.showImageInPdf,
          imageWidth: meal.imageWidth,
          imageHeight: meal.imageHeight,
          imageFit: meal.imageFit,
          imageAlignment: meal.imageAlignment,
          imageLayer: meal.imageLayer,
          imageX: meal.imageX,
          imageY: meal.imageY,
          position: meal.position,
          items: meal.items,
        },
        readNumber(meal.position, index)
      );
    })
    .filter((meal): meal is StudioMealDraft => meal !== null)
    .sort((a, b) => a.position - b.position);
}

export function buildStudioDocumentFromMealDrafts(meals: StudioMealDraft[]): Record<string, SerializableJson> {
  return {
    type: "doc",
    content: meals.map((meal) => ({
      type: "meal",
      attrs: {
        id: meal.id ?? null,
        name: meal.name,
        time: meal.time ?? null,
        notes: meal.notes ?? null,
        imageUrl: meal.imageUrl ?? null,
        imageAlt: meal.imageAlt ?? null,
        imageCaption: meal.imageCaption ?? null,
        showImageInPdf: meal.showImageInPdf ?? true,
        imageWidth: meal.imageWidth ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageWidth,
        imageHeight: meal.imageHeight ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageHeight,
        imageFit: meal.imageFit ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageFit,
        imageAlignment: meal.imageAlignment ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageAlignment,
        imageLayer: meal.imageLayer ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageLayer,
        imageX: meal.imageX ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageX,
        imageY: meal.imageY ?? DEFAULT_MEAL_IMAGE_LAYOUT.imageY,
        items: meal.items.map((item) => ({
          id: item.id ?? null,
          foodName: item.foodName,
          source: item.source,
          tacoFoodId: item.tacoFoodId ?? null,
          quantity: item.quantity,
          unit: item.unit,
          householdMeasure: item.householdMeasure ?? null,
          householdMeasureSource: item.householdMeasureSource ?? null,
          imageUrl: item.imageUrl ?? null,
          imageAlt: item.imageAlt ?? null,
          imageCaption: item.imageCaption ?? null,
          showImageInPdf: item.showImageInPdf ?? true,
          imageWidth: item.imageWidth ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageWidth,
          imageHeight: item.imageHeight ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageHeight,
          imageFit: item.imageFit ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageFit,
          imageAlignment: item.imageAlignment ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageAlignment,
          imageLayer: item.imageLayer ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageLayer,
          imageX: item.imageX ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageX,
          imageY: item.imageY ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageY,
          imagePlacement: item.imagePlacement ?? DEFAULT_FOOD_IMAGE_PLACEMENT,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber ?? null,
          sodium: item.sodium ?? null,
          notes: item.notes ?? null,
          position: item.position,
        })),
      },
    })),
  };
}

export function replaceMealNodesInStudioDocument(
  contentBlocks: unknown,
  meals: StudioMealDraft[]
): Record<string, SerializableJson> {
  const safeContent = toSerializableJson(contentBlocks);
  const mealDocument = buildStudioDocumentFromMealDrafts(meals);
  if (!isPlainObject(safeContent) || safeContent.type !== "doc") {
    return mealDocument;
  }

  const removeMealNodes = (nodes: SerializableJson[]): SerializableJson[] => nodes.flatMap((node) => {
    if (!isPlainObject(node)) return [node];
    if (node.type === "meal") return [];

    if (!Array.isArray(node.content)) return [node];
    return [{
      ...node,
      content: removeMealNodes(node.content),
    }];
  });

  const currentContent = Array.isArray(safeContent.content) ? safeContent.content : [];
  const mealContent = Array.isArray(mealDocument.content) ? mealDocument.content : [];
  return {
    ...safeContent,
    content: [...removeMealNodes(currentContent), ...mealContent],
  };
}

export function resolveStudioContentBlocks(contentBlocks: unknown, meals: unknown): Record<string, SerializableJson> {
  const safeContent = toSerializableJson(contentBlocks);
  const existingMealNodes = extractMealDraftsFromContentBlocks(safeContent);
  if (existingMealNodes.length > 0 && isPlainObject(safeContent)) {
    return safeContent as Record<string, SerializableJson>;
  }

  const mealDrafts = normalizeStudioMealDraftsFromRecords(meals);
  if (mealDrafts.length === 0) {
    return isPlainObject(safeContent) ? (safeContent as Record<string, SerializableJson>) : { type: "doc", content: [] };
  }

  const mealDocument = buildStudioDocumentFromMealDrafts(mealDrafts);
  if (!isPlainObject(safeContent) || safeContent.type !== "doc") {
    return mealDocument;
  }

  const currentContent = Array.isArray(safeContent.content) ? safeContent.content : [];
  const mealContent = Array.isArray(mealDocument.content) ? mealDocument.content : [];
  return {
    ...safeContent,
    content: [...currentContent, ...mealContent],
  };
}

export function extractMealDraftsFromContentBlocks(contentBlocks: unknown): StudioMealDraft[] {
  const meals: StudioMealDraft[] = [];

  const walk = (node: unknown) => {
    const record = readRecord(node);
    if (!record) return;

    if (record.type === "meal") {
      const attrs = readRecord(record.attrs);
      if (attrs) {
        const meal = normalizeMeal(attrs, meals.length);
        if (meal) meals.push(meal);
      }
    }

    for (const child of readArray(record.content)) {
      walk(child);
    }
  };

  const safeContent = toSerializableJson(contentBlocks);
  if (Array.isArray(safeContent)) {
    safeContent.forEach(walk);
  } else {
    walk(safeContent);
  }

  return meals;
}

/**
 * Returns only image URLs owned by structured meal nodes. Free editor images
 * deliberately do not participate in this list because their lifecycle is
 * controlled by the editor document itself.
 */
export function collectStudioStructuredImageUrls(contentBlocks: unknown): Set<string> {
  const urls = new Set<string>();
  for (const meal of extractMealDraftsFromContentBlocks(contentBlocks)) {
    if (meal.imageUrl) urls.add(meal.imageUrl);
    for (const item of meal.items) {
      if (item.imageUrl) urls.add(item.imageUrl);
    }
  }
  return urls;
}
