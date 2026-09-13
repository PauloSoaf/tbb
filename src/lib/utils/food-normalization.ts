/**
 * food-normalization.ts
 * Helpers para normalizar nomes de alimentos e inferir categorias de compra.
 */

import { ShoppingListCategory } from "@prisma/client";

/**
 * Normaliza o nome de um alimento:
 * - lowercase
 * - remove acentos
 * - remove pontuação simples
 * - trim e remove espaços duplicados
 */
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s]/g, " ") // replace punctuation with space
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Mapa de palavras-chave por categoria de compra.
 * A busca é feita no nome normalizado.
 */
const CATEGORY_KEYWORDS: Record<ShoppingListCategory, string[]> = {
  FRUITS: [
    "banana", "maca", "mamao", "manga", "uva", "laranja", "limao", "abacaxi",
    "morango", "pera", "pesca", "kiwi", "melao", "melancia", "coco",
    "ameixa", "cereja", "tangerina", "goiaba", "acerola", "jabuticaba",
    "maracuja", "abacate", "caju", "lichia", "framboesa", "mirtilo",
    "fruta", "frutas", "suco natural",
  ],
  VEGETABLES: [
    "alface", "espinafre", "couve", "brocolis", "cenoura", "tomate",
    "pepino", "abobrinha", "berinjela", "pimentao", "cebola", "alho",
    "beterraba", "repolho", "acelga", "rucula", "agriao", "chicoria",
    "rabanete", "nabo", "jiló", "quiabo", "chuchu", "vagem",
    "aspargo", "palmito", "milho", "ervilha", "batata doce", "abobora",
    "mandioca", "macaxeira", "aipim", "inhame", "cara",
    "verdura", "legume", "hortalica",
  ],
  PROTEINS: [
    "frango", "peito de frango", "coxa", "sobrecoxa", "ovo", "ova",
    "carne", "boi", "vaca", "peixe", "salmao", "atum", "tilapia",
    "sardinha", "camarao", "bacalhau", "peru", "porco", "suino",
    "linguica", "presunto", "peito de peru", "patinho", "alcatra",
    "file", "contrafile", "costela", "carne moida", "proteina",
    "whey", "albumina", "proteina de soja",
  ],
  GRAINS: [
    "arroz", "aveia", "trigo", "macarrao", "massa", "pao", "biscoito",
    "cereal", "granola", "milho", "flocado", "farinha", "farelo",
    "cuscuz", "tapioca", "quisoa", "quinoa", "amaranto", "centeio",
    "cevada", "polenta", "corn flakes", "muesli",
  ],
  DAIRY: [
    "leite", "iogurte", "queijo", "requeijao", "manteiga", "nata",
    "creme de leite", "ricota", "cottage", "mussarela", "parmesao",
    "cheddar", "coalhada", "kefir", "bebida lactea",
  ],
  LEGUMES: [
    "feijao", "lentilha", "grao de bico", "soja", "ervilha seca",
    "amendoim", "ervilha", "fava", "mungo", "azuki",
  ],
  OILS: [
    "azeite", "oleo", "oliva", "coco", "girassol", "canola",
    "linhaça", "amendoa", "macadamia", "ghee", "banha",
    "margarina", "gordura",
  ],
  SEASONINGS: [
    "sal", "pimenta", "acucar", "mel", "stevia", "canela", "cominho",
    "oregano", "tempero", "alho em po", "cebola em po", "curry",
    "curcuma", "paprica", "gengibr", "noz moscada", "erva", "cravo",
    "louro", "coentro", "salsinha", "cebolinha", "hortelã", "manjericao",
    "vinagre", "molho", "catchup", "mostarda", "maionese", "shoyu",
    "extrato de tomate",
  ],
  BEVERAGES: [
    "agua", "suco", "cha", "cafe", "leite vegetal", "bebida",
    "refrigerante", "energetico", "isotônico", "agua de coco",
    "smoothie", "vitamina",
  ],
  SUPPLEMENTS: [
    "whey", "creatina", "bcaa", "glutamina", "suplemento", "vitamina",
    "minerais", "omega", "colágeno", "probiotico", "prebiotico",
    "magnesio", "calcio", "vitamina c", "vitamina d", "zinco",
    "ferro", "multivitaminico",
  ],
  OTHER: [],
};

/**
 * Infere a categoria de compra com base no nome normalizado do alimento.
 * Retorna `OTHER` se não encontrar correspondência.
 */
export function inferShoppingCategory(foodName: string): ShoppingListCategory {
  const normalized = normalizeFoodName(foodName);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "OTHER") continue;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category as ShoppingListCategory;
      }
    }
  }

  return ShoppingListCategory.OTHER;
}
