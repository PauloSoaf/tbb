/**
 * shopping-list.ts
 * Utilitários para geração, agregação e formatação de listas de compras.
 */

import { ShoppingListCategory, ShoppingListItemSource } from "@prisma/client";
import { normalizeFoodName, inferShoppingCategory } from "./food-normalization";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ShoppingSourceItem {
  foodName: string;
  quantity: number | null;
  unit: string | null;
  householdMeasure?: string | null;
  mealItemId?: string | null;
  tacoFoodId?: string | null;
}

export interface ShoppingListItemDraft {
  name: string;
  normalizedName: string;
  category: ShoppingListCategory;
  quantity: number | null;
  unit: string | null;
  householdMeasure: string | null;
  source: ShoppingListItemSource;
  mealItemId: string | null;
  tacoFoodId: string | null;
  position: number;
}

export interface MealPlanForShopping {
  id: string;
  title: string;
  patientId: string | null;
  meals: {
    name: string;
    items: ShoppingSourceItem[];
  }[];
}

export interface ShoppingListDraft {
  title: string;
  mealPlanId: string;
  patientId: string;
  periodDays: number;
  items: ShoppingListItemDraft[];
}

// ─── Normalizar unidade ───────────────────────────────────────────────────────

/**
 * Normaliza unidade para facilitar comparação e exibição.
 * Retorna null se não houver unidade reconhecível.
 */
export function normalizeShoppingUnit(unit?: string | null): string | null {
  if (!unit) return null;
  const u = unit.toLowerCase().trim();

  // Mapeamento de variações comuns
  const map: Record<string, string> = {
    "g": "g", "grama": "g", "gramas": "g",
    "kg": "kg", "kilograma": "kg", "quilograma": "kg",
    "ml": "ml", "mililitro": "ml", "mililitros": "ml",
    "l": "L", "litro": "L", "litros": "L",
    "unidade": "un", "unidades": "un", "un": "un", "und": "un", "uni": "un",
    "colher": "colher", "colheres": "colher",
    "colher de sopa": "colher de sopa", "colher de chá": "colher de chá",
    "copo": "copo", "copos": "copo",
    "xicara": "xícara", "xicara de cha": "xícara", "xicaras": "xícara",
    "fatia": "fatia", "fatias": "fatia",
    "porção": "porção", "porcao": "porção",
  };

  return map[u] ?? unit.trim();
}

// ─── Chave de agregação ───────────────────────────────────────────────────────

function aggregationKey(name: string, unit: string | null): string {
  return `${normalizeFoodName(name)}__${unit ?? ""}`;
}

// ─── Agregar itens ────────────────────────────────────────────────────────────

/**
 * Agrupa itens pelo nome normalizado e unidade, somando quantidades compatíveis.
 * Não soma unidades incompatíveis.
 */
export function aggregateShoppingItems(
  items: ShoppingSourceItem[]
): ShoppingListItemDraft[] {
  const map = new Map<string, ShoppingListItemDraft>();

  let position = 0;

  for (const item of items) {
    const normUnit = normalizeShoppingUnit(item.unit);
    const key = aggregationKey(item.foodName, normUnit);

    if (map.has(key)) {
      const existing = map.get(key)!;
      if (existing.quantity !== null && item.quantity !== null) {
        existing.quantity = parseFloat(
          (existing.quantity + item.quantity).toFixed(2)
        );
      }
      // Se um tem quantidade e outro não, manter a que tem
      if (existing.quantity === null && item.quantity !== null) {
        existing.quantity = item.quantity;
      }
    } else {
      map.set(key, {
        name: item.foodName,
        normalizedName: normalizeFoodName(item.foodName),
        category: inferShoppingCategory(item.foodName),
        quantity: item.quantity,
        unit: normUnit,
        householdMeasure: item.householdMeasure ?? null,
        source: ShoppingListItemSource.MEAL_PLAN,
        mealItemId: item.mealItemId ?? null,
        tacoFoodId: item.tacoFoodId ?? null,
        position: position++,
      });
    }
  }

  return Array.from(map.values());
}

// ─── Gerar lista a partir do plano alimentar ──────────────────────────────────

/**
 * Gera um draft de lista de compras a partir de um plano alimentar.
 * Considera repetição do plano diário pelo número de dias escolhido.
 */
export function generateShoppingListFromMealPlan(input: {
  mealPlan: MealPlanForShopping;
  periodDays: number;
  title?: string;
}): ShoppingListDraft {
  const { mealPlan, periodDays } = input;

  // Collect all items from all meals
  const sourceItems: ShoppingSourceItem[] = [];
  for (const meal of mealPlan.meals) {
    for (const item of meal.items) {
      sourceItems.push({
        ...item,
        // Multiply quantity by period days
        quantity: item.quantity != null ? parseFloat((item.quantity * periodDays).toFixed(2)) : null,
      });
    }
  }

  // Aggregate (group by name+unit)
  const aggregated = aggregateShoppingItems(sourceItems);

  const title =
    input.title?.trim() ||
    `Lista de compras — ${mealPlan.title} (${periodDays} dias)`;

  return {
    title,
    mealPlanId: mealPlan.id,
    patientId: mealPlan.patientId ?? "",
    periodDays,
    items: aggregated,
  };
}

// ─── Formatar lista como texto ────────────────────────────────────────────────

export interface ShoppingListForFormat {
  title: string;
  periodDays: number;
  items: {
    name: string;
    quantity: number | null;
    unit: string | null;
    category: ShoppingListCategory;
    checked: boolean;
  }[];
}

const CATEGORY_ORDER: ShoppingListCategory[] = [
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

const CATEGORY_LABELS_PT: Record<ShoppingListCategory, string> = {
  FRUITS: "Frutas",
  VEGETABLES: "Verduras e legumes",
  PROTEINS: "Proteínas",
  GRAINS: "Grãos e cereais",
  DAIRY: "Laticínios",
  LEGUMES: "Leguminosas",
  OILS: "Óleos e gorduras",
  SEASONINGS: "Temperos",
  BEVERAGES: "Bebidas",
  SUPPLEMENTS: "Suplementos",
  OTHER: "Outros",
};

/**
 * Formata a lista de compras como texto legível para copiar/compartilhar.
 */
export function formatShoppingListText(list: ShoppingListForFormat): string {
  const lines: string[] = [
    "🛒 Lista de compras NutriOpus",
    "",
    `Período: ${list.periodDays} dia${list.periodDays !== 1 ? "s" : ""}`,
    `Nota: Esta lista é uma estimativa baseada no plano alimentar.`,
    "",
  ];

  // Group by category
  const byCategory = new Map<ShoppingListCategory, typeof list.items>();
  for (const item of list.items) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category)!.push(item);
  }

  for (const cat of CATEGORY_ORDER) {
    const items = byCategory.get(cat);
    if (!items || items.length === 0) continue;

    lines.push(CATEGORY_LABELS_PT[cat]);

    for (const item of items) {
      const check = item.checked ? "[x]" : "[ ]";
      const qty = item.quantity != null ? ` - ${item.quantity}${item.unit ? item.unit : ""}` : "";
      lines.push(`${check} ${item.name}${qty}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
