import { MealTotals } from "@/lib/utils/nutrition";

export interface MealPlanTemplate {
  id: string;
  title: string;
  objective: string;
  description: string;
  color: string; // Tailwind color class for styling
  totals: MealTotals;
  meals: {
    name: string;
    time: string;
    notes?: string;
    items: {
      foodName: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  }[];
}

export const nativeMealPlanTemplates: MealPlanTemplate[] = [
  {
    id: "hipertrofia-basica",
    title: "Hipertrofia Clássica",
    objective: "Ganho de Massa Muscular",
    description: "Plano focado em superávit calórico moderado com alta ingestão de proteínas e carboidratos limpos para suportar treinos intensos de força.",
    color: "from-blue-500 to-cyan-500",
    totals: { calories: 2850, protein: 180, carbs: 350, fat: 81 },
    meals: [
      {
        name: "Café da Manhã",
        time: "07:30",
        notes: "Pré-treino",
        items: [
          { foodName: "Ovo de galinha, cozido", quantity: 4, unit: "unid", calories: 292, protein: 26.6, carbs: 1.2, fat: 19 },
          { foodName: "Aveia em flocos", quantity: 60, unit: "g", calories: 236, protein: 8.3, carbs: 39.9, fat: 5.1 },
          { foodName: "Banana prata", quantity: 150, unit: "g", calories: 147, protein: 1.9, carbs: 39, fat: 0.1 },
        ],
      },
      {
        name: "Almoço",
        time: "12:30",
        notes: "Refeição principal",
        items: [
          { foodName: "Arroz branco cozido", quantity: 200, unit: "g", calories: 256, protein: 5, carbs: 56.2, fat: 0.4 },
          { foodName: "Feijão carioca cozido", quantity: 100, unit: "g", calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
          { foodName: "Peito de frango grelhado", quantity: 150, unit: "g", calories: 238, protein: 47.8, carbs: 0, fat: 3.7 },
        ],
      },
    ],
  },
  {
    id: "emagrecimento-lowcarb",
    title: "Emagrecimento Low Carb",
    objective: "Redução de Gordura Corporal",
    description: "Plano com restrição inteligente de carboidratos, priorizando gorduras boas e proteínas para manter a saciedade durante o déficit calórico.",
    color: "from-emerald-500 to-teal-600",
    totals: { calories: 1500, protein: 140, carbs: 80, fat: 68 },
    meals: [
      {
        name: "Desjejum",
        time: "08:00",
        items: [
          { foodName: "Ovo mexido", quantity: 3, unit: "unid", calories: 219, protein: 19.9, carbs: 0.9, fat: 14.2 },
          { foodName: "Abacate", quantity: 100, unit: "g", calories: 160, protein: 2, carbs: 8.5, fat: 14.6 },
        ],
      },
      {
        name: "Almoço",
        time: "13:00",
        items: [
          { foodName: "Patinho bovino grelhado", quantity: 150, unit: "g", calories: 328, protein: 53.8, carbs: 0, fat: 10.9 },
          { foodName: "Brócolis cozido", quantity: 150, unit: "g", calories: 37, protein: 3.1, carbs: 6.6, fat: 0.7 },
        ],
      },
    ],
  },
  {
    id: "vegano-equilibrado",
    title: "Vegano Equilibrado",
    objective: "Manutenção / Saúde",
    description: "Dieta 100% plant-based com excelente combinação de aminoácidos através de leguminosas, cereais e suplementação adequada.",
    color: "from-green-400 to-emerald-500",
    totals: { calories: 2100, protein: 110, carbs: 280, fat: 60 },
    meals: [
      {
        name: "Vitamina Matinal",
        time: "07:00",
        items: [
          { foodName: "Leite de Soja", quantity: 200, unit: "ml", calories: 80, protein: 7, carbs: 4, fat: 4 },
          { foodName: "Proteína de Ervilha (Whey Vegano)", quantity: 30, unit: "g", calories: 120, protein: 24, carbs: 2, fat: 2 },
          { foodName: "Morango", quantity: 100, unit: "g", calories: 32, protein: 0.6, carbs: 7.6, fat: 0.3 },
        ],
      },
      {
        name: "Almoço",
        time: "12:30",
        items: [
          { foodName: "Lentilha cozida", quantity: 150, unit: "g", calories: 174, protein: 13.5, carbs: 30.1, fat: 0.5 },
          { foodName: "Arroz integral", quantity: 150, unit: "g", calories: 186, protein: 3.9, carbs: 38.7, fat: 1.5 },
          { foodName: "Tofu grelhado", quantity: 100, unit: "g", calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
        ],
      },
    ],
  },
  {
    id: "manutencao-saudavel",
    title: "Manutenção Saudável",
    objective: "Manutenção de Peso",
    description: "Plano equilibrado para manutenção do peso com distribuição de macros balanceada, priorizando alimentos integrais e naturais.",
    color: "from-amber-400 to-orange-500",
    totals: { calories: 2000, protein: 120, carbs: 230, fat: 67 },
    meals: [
      {
        name: "Café da Manhã",
        time: "07:00",
        items: [
          { foodName: "Pão integral", quantity: 60, unit: "g", calories: 152, protein: 4.9, carbs: 29.3, fat: 1.9 },
          { foodName: "Ovo mexido", quantity: 100, unit: "g", calories: 146, protein: 11.7, carbs: 0.7, fat: 10.5 },
          { foodName: "Mamão papaia", quantity: 150, unit: "g", calories: 68, protein: 0.8, carbs: 17.7, fat: 0.2 },
        ],
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        items: [
          { foodName: "Iogurte grego natural", quantity: 170, unit: "g", calories: 165, protein: 15.3, carbs: 6.1, fat: 8.5 },
          { foodName: "Granola", quantity: 30, unit: "g", calories: 119, protein: 2.3, carbs: 21.9, fat: 2.5 },
        ],
      },
      {
        name: "Almoço",
        time: "12:30",
        notes: "Refeição principal",
        items: [
          { foodName: "Arroz branco cozido", quantity: 150, unit: "g", calories: 192, protein: 3.8, carbs: 42.2, fat: 0.3 },
          { foodName: "Feijão carioca cozido", quantity: 100, unit: "g", calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
          { foodName: "Frango grelhado", quantity: 120, unit: "g", calories: 196, protein: 37.8, carbs: 0.0, fat: 3.8 },
          { foodName: "Salada mista", quantity: 150, unit: "g", calories: 30, protein: 1.5, carbs: 5.0, fat: 0.5 },
        ],
      },
      {
        name: "Lanche da Tarde",
        time: "16:00",
        items: [
          { foodName: "Banana prata", quantity: 100, unit: "g", calories: 98, protein: 1.3, carbs: 26.0, fat: 0.1 },
          { foodName: "Castanha-do-pará", quantity: 20, unit: "g", calories: 131, protein: 2.9, carbs: 3.0, fat: 12.7 },
        ],
      },
      {
        name: "Jantar",
        time: "19:30",
        items: [
          { foodName: "Batata-doce cozida", quantity: 150, unit: "g", calories: 116, protein: 0.9, carbs: 27.6, fat: 0.2 },
          { foodName: "Peixe tilápia assado", quantity: 150, unit: "g", calories: 192, protein: 39.3, carbs: 0.0, fat: 4.1 },
          { foodName: "Brócolis cozido", quantity: 100, unit: "g", calories: 25, protein: 2.9, carbs: 4.4, fat: 0.3 },
        ],
      },
    ],
  },
  {
    id: "diabetes-hipocalorico",
    title: "Controle Glicêmico",
    objective: "Diabetes / Resistência Insulínica",
    description: "Plano de baixo índice glicêmico para controle da glicemia, com prioridade em carboidratos complexos, fibras e proteínas magras.",
    color: "from-purple-500 to-violet-600",
    totals: { calories: 1600, protein: 110, carbs: 160, fat: 55 },
    meals: [
      {
        name: "Café da Manhã",
        time: "07:00",
        notes: "Evitar frutas de alto IG pela manhã",
        items: [
          { foodName: "Aveia em flocos", quantity: 40, unit: "g", calories: 158, protein: 5.6, carbs: 26.6, fat: 3.4 },
          { foodName: "Leite desnatado", quantity: 200, unit: "ml", calories: 70, protein: 7.0, carbs: 9.8, fat: 0.2 },
          { foodName: "Ovo cozido", quantity: 50, unit: "g", calories: 73, protein: 6.7, carbs: 0.3, fat: 4.8 },
        ],
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        items: [
          { foodName: "Amendoim torrado sem sal", quantity: 30, unit: "g", calories: 182, protein: 8.6, carbs: 4.0, fat: 15.8 },
          { foodName: "Iogurte natural desnatado", quantity: 100, unit: "g", calories: 44, protein: 5.0, carbs: 5.0, fat: 0.1 },
        ],
      },
      {
        name: "Almoço",
        time: "12:00",
        items: [
          { foodName: "Arroz integral cozido", quantity: 100, unit: "g", calories: 124, protein: 2.6, carbs: 25.8, fat: 1.0 },
          { foodName: "Feijão preto cozido", quantity: 100, unit: "g", calories: 77, protein: 4.5, carbs: 14.0, fat: 0.5 },
          { foodName: "Carne bovina magra grelhada", quantity: 100, unit: "g", calories: 219, protein: 35.9, carbs: 0.0, fat: 7.3 },
          { foodName: "Legumes no vapor", quantity: 200, unit: "g", calories: 60, protein: 2.5, carbs: 13.0, fat: 0.5 },
        ],
      },
      {
        name: "Lanche da Tarde",
        time: "16:00",
        items: [
          { foodName: "Queijo cottage", quantity: 100, unit: "g", calories: 97, protein: 12.4, carbs: 2.7, fat: 4.3 },
          { foodName: "Pepino com azeite", quantity: 150, unit: "g", calories: 35, protein: 1.1, carbs: 4.1, fat: 1.5 },
        ],
      },
      {
        name: "Jantar",
        time: "19:00",
        items: [
          { foodName: "Frango peito grelhado", quantity: 130, unit: "g", calories: 212, protein: 40.9, carbs: 0.0, fat: 4.2 },
          { foodName: "Mandioca cozida", quantity: 100, unit: "g", calories: 125, protein: 0.6, carbs: 30.1, fat: 0.3 },
          { foodName: "Couve refogada no alho", quantity: 80, unit: "g", calories: 40, protein: 2.5, carbs: 6.0, fat: 1.5 },
        ],
      },
    ],
  }
];
