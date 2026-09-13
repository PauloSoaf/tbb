// Demo Mode — fictional seed data. Everything here is invented: no real
// patients, no real clinical data. This module is imported ONLY by /demo
// routes and never touches Prisma/Supabase/server actions.

export interface DemoWeightEntry {
  date: string; // ISO yyyy-mm-dd
  weight: number;
  bodyFat?: number;
}

export interface DemoEvaluation {
  id: string;
  date: string;
  weight: number;
  bmi: number;
  bodyFat?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  notes?: string;
}

export interface DemoPatient {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: "F" | "M";
  objective: string;
  tags: string[];
  goalWeight: number;
  heightCm: number;
  weights: DemoWeightEntry[];
  evaluations: DemoEvaluation[];
  clinicalAlert?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface DemoTimelineEvent {
  id: string;
  patientId: string;
  date: string;
  kind: "note" | "evaluation" | "plan" | "appointment" | "anamnese" | "file";
  title: string;
  description: string;
}

export interface DemoGoal {
  id: string;
  patientId: string;
  title: string;
  progress: number; // 0-100
  target: string;
}

export interface DemoReminder {
  id: string;
  patientId: string;
  title: string;
  done: boolean;
}

export interface DemoMealItem {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  substitutions?: string[];
}

export interface DemoMeal {
  id: string;
  name: string;
  time: string;
  items: DemoMealItem[];
  notes?: string;
}

export interface DemoMealPlan {
  id: string;
  patientId: string;
  title: string;
  objective: string;
  status: "ACTIVE" | "DRAFT";
  createdAt: string;
  meals: DemoMeal[];
}

export interface DemoAppointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  mode: "ONLINE" | "IN_PERSON";
  status: "SCHEDULED" | "DONE" | "CANCELED";
  title: string;
}

export interface DemoMessage {
  id: string;
  patientId: string;
  sender: "NUTRITIONIST" | "PATIENT";
  body: string;
  at: string;
}

export interface DemoShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  bought: boolean;
}

export interface DemoDiaryEntry {
  id: string;
  date: string;
  meal: string;
  description: string;
  feeling?: string;
}

export interface DemoTacoFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per: string;
}

export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  at: string;
}

// ─── Nutricionista / clínica ────────────────────────────────────────────────

export const demoNutritionist = {
  name: "Dra. Fabíola Amorim",
  clinic: "Clínica NutriVida Demo",
  city: "Manaus",
  crn: "CRN-1 00000",
};

export const demoPatientUser = {
  name: "Débora Almeida",
  patientId: "demo-patient-deborah",
};

// ─── Pacientes ──────────────────────────────────────────────────────────────

export const demoPatients: DemoPatient[] = [
  {
    id: "demo-patient-deborah",
    name: "Débora Almeida",
    phone: "(92) 99999-0001",
    email: "debora.demo@exemplo.com",
    age: 31,
    gender: "F",
    objective: "Redução de gordura com manutenção de massa magra",
    tags: ["Em acompanhamento", "Plano ativo"],
    goalWeight: 64,
    heightCm: 166,
    clinicalAlert: "Intolerância à lactose. Evitar laticínios com lactose nos planos.",
    weights: [
      { date: "2026-03-02", weight: 73.8, bodyFat: 31.2 },
      { date: "2026-04-01", weight: 72.1, bodyFat: 30.1 },
      { date: "2026-05-02", weight: 70.6, bodyFat: 29.0 },
      { date: "2026-06-01", weight: 69.4, bodyFat: 28.2 },
      { date: "2026-07-01", weight: 68.4, bodyFat: 27.5 },
    ],
    evaluations: [
      { id: "ev-d1", date: "2026-05-02", weight: 70.6, bmi: 25.6, bodyFat: 29.0, waist: 78, hip: 102, arm: 29, notes: "Boa adesão ao plano. Aumentado aporte proteico." },
      { id: "ev-d2", date: "2026-06-01", weight: 69.4, bmi: 25.2, bodyFat: 28.2, waist: 76, hip: 100, arm: 29, notes: "Evolução consistente. Mantida conduta." },
      { id: "ev-d3", date: "2026-07-01", weight: 68.4, bmi: 24.8, bodyFat: 27.5, waist: 75, hip: 99, arm: 28.5, notes: "Meta parcial atingida. Ajustado déficit calórico." },
    ],
  },
  {
    id: "demo-patient-mariana",
    name: "Mariana Costa",
    phone: "(92) 99999-0002",
    email: "mariana.demo@exemplo.com",
    age: 27,
    gender: "F",
    objective: "Reeducação alimentar",
    tags: ["Pré-consulta"],
    goalWeight: 68,
    heightCm: 165,
    weights: [
      { date: "2026-06-20", weight: 72.1, bodyFat: 30.5 },
    ],
    evaluations: [
      { id: "ev-m1", date: "2026-06-20", weight: 72.1, bmi: 26.2, bodyFat: 30.5, waist: 82, hip: 104, arm: 30, notes: "Primeira avaliação. Anamnese recebida via pré-consulta." },
    ],
  },
  {
    id: "demo-patient-carlos",
    name: "Carlos Mendes",
    phone: "(92) 99999-0003",
    email: "carlos.demo@exemplo.com",
    age: 42,
    gender: "M",
    objective: "Hipertrofia e melhora de exames lipídicos",
    tags: ["Plano ativo", "Atleta"],
    goalWeight: 84,
    heightCm: 180,
    weights: [
      { date: "2026-04-10", weight: 79.2 },
      { date: "2026-05-12", weight: 80.4 },
      { date: "2026-06-10", weight: 81.6 },
      { date: "2026-07-01", weight: 82.3 },
    ],
    evaluations: [
      { id: "ev-c1", date: "2026-06-10", weight: 81.6, bmi: 25.2, bodyFat: 17.8, waist: 84, arm: 36, notes: "Ganho de massa dentro do esperado." },
    ],
  },
  {
    id: "demo-patient-julia",
    name: "Júlia Ferreira",
    phone: "(92) 99999-0004",
    email: "julia.demo@exemplo.com",
    age: 55,
    gender: "F",
    objective: "Controle glicêmico (pré-diabetes)",
    tags: ["Atenção", "Retorno pendente"],
    goalWeight: 70,
    heightCm: 160,
    clinicalAlert: "Pré-diabetes. Priorizar baixo índice glicêmico.",
    weights: [
      { date: "2026-05-15", weight: 78.9 },
      { date: "2026-06-15", weight: 77.8 },
    ],
    evaluations: [
      { id: "ev-j1", date: "2026-06-15", weight: 77.8, bmi: 30.4, bodyFat: 34.1, waist: 92, hip: 108, notes: "Encaminhada para retorno mensal com foco glicêmico." },
    ],
  },
];

// ─── Prontuário / timeline ──────────────────────────────────────────────────

export const demoTimeline: DemoTimelineEvent[] = [
  { id: "tl-1", patientId: "demo-patient-deborah", date: "2026-07-01", kind: "evaluation", title: "Avaliação antropométrica", description: "Peso 68,4 kg · IMC 24,8 · %G 27,5. Meta parcial atingida." },
  { id: "tl-2", patientId: "demo-patient-deborah", date: "2026-06-24", kind: "plan", title: "Plano alimentar atualizado", description: "Plano de emagrecimento v3 ativado com 1.650 kcal." },
  { id: "tl-3", patientId: "demo-patient-deborah", date: "2026-06-18", kind: "appointment", title: "Consulta de retorno", description: "Retorno online concluído. Boa adesão relatada." },
  { id: "tl-4", patientId: "demo-patient-deborah", date: "2026-06-02", kind: "note", title: "Nota clínica", description: "Relatou compulsão noturna reduzida após ajuste do jantar." },
  { id: "tl-5", patientId: "demo-patient-deborah", date: "2026-05-20", kind: "anamnese", title: "Anamnese revisada", description: "Anamnese de acompanhamento revisada e arquivada." },
  { id: "tl-6", patientId: "demo-patient-deborah", date: "2026-05-02", kind: "file", title: "Exames laboratoriais", description: "Hemograma + perfil lipídico anexados ao prontuário." },
  { id: "tl-7", patientId: "demo-patient-carlos", date: "2026-06-10", kind: "evaluation", title: "Avaliação antropométrica", description: "Peso 81,6 kg · ganho de massa dentro do esperado." },
  { id: "tl-8", patientId: "demo-patient-julia", date: "2026-06-15", kind: "note", title: "Nota clínica", description: "Glicemia de jejum 108 mg/dL. Reforçado plano de baixo IG." },
];

// ─── Metas e lembretes ──────────────────────────────────────────────────────

export const demoGoals: DemoGoal[] = [
  { id: "goal-1", patientId: "demo-patient-deborah", title: "Chegar a 64 kg", progress: 55, target: "64 kg até out/2026" },
  { id: "goal-2", patientId: "demo-patient-deborah", title: "Beber 2,5L de água/dia", progress: 80, target: "Diário" },
  { id: "goal-3", patientId: "demo-patient-carlos", title: "Ganhar 3 kg de massa magra", progress: 40, target: "dez/2026" },
];

export const demoReminders: DemoReminder[] = [
  { id: "rem-1", patientId: "demo-patient-deborah", title: "Enviar fotos de progresso", done: false },
  { id: "rem-2", patientId: "demo-patient-deborah", title: "Registrar diário 5x na semana", done: true },
  { id: "rem-3", patientId: "demo-patient-julia", title: "Repetir glicemia de jejum", done: false },
];

// ─── Plano alimentar ────────────────────────────────────────────────────────

export const demoMealPlans: DemoMealPlan[] = [
  {
    id: "plan-deborah-1",
    patientId: "demo-patient-deborah",
    title: "Plano de emagrecimento — fase 3",
    objective: "Déficit calórico moderado com alta proteína",
    status: "ACTIVE",
    createdAt: "2026-06-24",
    meals: [
      {
        id: "meal-1",
        name: "Café da manhã",
        time: "07:00",
        items: [
          { id: "mi-1", foodName: "Ovos mexidos", quantity: 2, unit: "un", calories: 156, protein: 13, carbs: 1, fat: 11, substitutions: ["Omelete de claras (3 claras + 1 ovo)", "Queijo minas sem lactose (60 g)"] },
          { id: "mi-2", foodName: "Pão integral", quantity: 2, unit: "fatias", calories: 140, protein: 6, carbs: 24, fat: 2, substitutions: ["Tapioca (60 g)", "Aveia em flocos (40 g)"] },
          { id: "mi-3", foodName: "Mamão papaia", quantity: 150, unit: "g", calories: 60, protein: 1, carbs: 15, fat: 0 },
        ],
      },
      {
        id: "meal-2",
        name: "Almoço",
        time: "12:30",
        items: [
          { id: "mi-4", foodName: "Frango grelhado", quantity: 120, unit: "g", calories: 198, protein: 37, carbs: 0, fat: 5, substitutions: ["Peixe branco grelhado (150 g)", "Carne magra (110 g)"] },
          { id: "mi-5", foodName: "Arroz integral", quantity: 100, unit: "g", calories: 124, protein: 3, carbs: 26, fat: 1 },
          { id: "mi-6", foodName: "Feijão", quantity: 80, unit: "g", calories: 61, protein: 4, carbs: 11, fat: 0 },
          { id: "mi-7", foodName: "Salada verde + azeite", quantity: 1, unit: "porção", calories: 85, protein: 2, carbs: 6, fat: 6 },
        ],
        notes: "Priorizar mastigação lenta. Água antes da refeição.",
      },
      {
        id: "meal-3",
        name: "Lanche da tarde",
        time: "16:00",
        items: [
          { id: "mi-8", foodName: "Iogurte sem lactose", quantity: 170, unit: "g", calories: 95, protein: 10, carbs: 8, fat: 3, substitutions: ["Whey protein (1 scoop) + água"] },
          { id: "mi-9", foodName: "Banana", quantity: 1, unit: "un", calories: 90, protein: 1, carbs: 23, fat: 0 },
        ],
      },
      {
        id: "meal-4",
        name: "Jantar",
        time: "19:30",
        items: [
          { id: "mi-10", foodName: "Omelete de legumes", quantity: 1, unit: "porção", calories: 220, protein: 16, carbs: 8, fat: 14 },
          { id: "mi-11", foodName: "Sopa de legumes", quantity: 250, unit: "ml", calories: 110, protein: 4, carbs: 18, fat: 2 },
        ],
        notes: "Jantar leve para reduzir episódios de compulsão noturna.",
      },
    ],
  },
];

// ─── Agenda / atendimentos ──────────────────────────────────────────────────

export const demoAppointments: DemoAppointment[] = [
  { id: "apt-1", patientId: "demo-patient-deborah", date: "2026-07-08", time: "09:00", mode: "ONLINE", status: "SCHEDULED", title: "Retorno mensal" },
  { id: "apt-2", patientId: "demo-patient-mariana", date: "2026-07-08", time: "10:30", mode: "IN_PERSON", status: "SCHEDULED", title: "Primeira consulta" },
  { id: "apt-3", patientId: "demo-patient-julia", date: "2026-07-09", time: "14:00", mode: "ONLINE", status: "SCHEDULED", title: "Acompanhamento glicêmico" },
  { id: "apt-4", patientId: "demo-patient-carlos", date: "2026-07-11", time: "08:00", mode: "IN_PERSON", status: "SCHEDULED", title: "Avaliação física" },
  { id: "apt-5", patientId: "demo-patient-deborah", date: "2026-06-18", time: "09:00", mode: "ONLINE", status: "DONE", title: "Consulta de retorno" },
  { id: "apt-6", patientId: "demo-patient-julia", date: "2026-06-15", time: "15:00", mode: "IN_PERSON", status: "DONE", title: "Consulta de retorno" },
];

// ─── Chat ───────────────────────────────────────────────────────────────────

export const demoMessages: DemoMessage[] = [
  { id: "msg-1", patientId: "demo-patient-deborah", sender: "PATIENT", body: "Dra., posso trocar o iogurte do lanche por whey?", at: "2026-07-05T14:12:00" },
  { id: "msg-2", patientId: "demo-patient-deborah", sender: "NUTRITIONIST", body: "Pode sim, Débora! 1 scoop com água. Já deixei como substituição no seu plano. 😊", at: "2026-07-05T14:40:00" },
  { id: "msg-3", patientId: "demo-patient-deborah", sender: "PATIENT", body: "Perfeito, obrigada!", at: "2026-07-05T14:52:00" },
];

// ─── Lista de compras ───────────────────────────────────────────────────────

export const demoShoppingItems: DemoShoppingItem[] = [
  { id: "shop-1", name: "Ovos", quantity: "1 dúzia", category: "Proteínas", bought: true },
  { id: "shop-2", name: "Frango (peito)", quantity: "1 kg", category: "Proteínas", bought: false },
  { id: "shop-3", name: "Iogurte sem lactose", quantity: "6 un", category: "Laticínios", bought: false },
  { id: "shop-4", name: "Arroz integral", quantity: "1 kg", category: "Grãos e cereais", bought: true },
  { id: "shop-5", name: "Aveia em flocos", quantity: "500 g", category: "Grãos e cereais", bought: false },
  { id: "shop-6", name: "Banana", quantity: "1 cacho", category: "Frutas", bought: false },
  { id: "shop-7", name: "Mamão papaia", quantity: "2 un", category: "Frutas", bought: false },
  { id: "shop-8", name: "Folhas para salada", quantity: "2 maços", category: "Hortaliças", bought: false },
  { id: "shop-9", name: "Azeite extravirgem", quantity: "500 ml", category: "Óleos", bought: true },
];

// ─── Diário alimentar ───────────────────────────────────────────────────────

export const demoDiaryEntries: DemoDiaryEntry[] = [
  { id: "diary-1", date: "2026-07-06", meal: "Café da manhã", description: "Ovos mexidos, 2 fatias de pão integral e mamão", feeling: "😊" },
  { id: "diary-2", date: "2026-07-06", meal: "Almoço", description: "Frango grelhado, arroz integral, feijão e salada", feeling: "😊" },
  { id: "diary-3", date: "2026-07-06", meal: "Jantar", description: "Sopa de legumes", feeling: "😌" },
  { id: "diary-4", date: "2026-07-05", meal: "Lanche", description: "Whey com água e uma banana", feeling: "⚡" },
];

// ─── TACO (subset demo) ─────────────────────────────────────────────────────

export const demoTacoFoods: DemoTacoFood[] = [
  { id: "taco-1", name: "Arroz integral cozido", calories: 124, protein: 2.6, carbs: 25.8, fat: 1.0, per: "100 g" },
  { id: "taco-2", name: "Feijão carioca cozido", calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5, per: "100 g" },
  { id: "taco-3", name: "Peito de frango grelhado", calories: 165, protein: 31.0, carbs: 0, fat: 3.6, per: "100 g" },
  { id: "taco-4", name: "Ovo de galinha cozido", calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5, per: "100 g" },
  { id: "taco-5", name: "Banana prata", calories: 98, protein: 1.3, carbs: 26.0, fat: 0.1, per: "100 g" },
  { id: "taco-6", name: "Mamão papaia", calories: 40, protein: 0.5, carbs: 10.4, fat: 0.1, per: "100 g" },
  { id: "taco-7", name: "Aveia em flocos", calories: 394, protein: 13.9, carbs: 66.6, fat: 8.5, per: "100 g" },
  { id: "taco-8", name: "Batata-doce cozida", calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1, per: "100 g" },
  { id: "taco-9", name: "Tilápia grelhada", calories: 96, protein: 20.1, carbs: 0, fat: 1.7, per: "100 g" },
  { id: "taco-10", name: "Azeite de oliva", calories: 884, protein: 0, carbs: 0, fat: 100, per: "100 g" },
];

export const demoHouseholdMeasures = [
  { id: "hm-1", label: "Colher de sopa", grams: 15 },
  { id: "hm-2", label: "Colher de chá", grams: 5 },
  { id: "hm-3", label: "Xícara de chá", grams: 240 },
  { id: "hm-4", label: "Copo americano", grams: 190 },
  { id: "hm-5", label: "Concha média", grams: 80 },
  { id: "hm-6", label: "Escumadeira", grams: 100 },
];

// ─── Notificações / anamnese ────────────────────────────────────────────────

export const demoNotifications: DemoNotification[] = [
  { id: "not-1", title: "Nova anamnese recebida", description: "Mariana Costa preencheu a pré-consulta.", at: "2026-07-06T09:12:00" },
  { id: "not-2", title: "Check-in registrado", description: "Débora Almeida registrou o diário de hoje.", at: "2026-07-06T08:03:00" },
  { id: "not-3", title: "Consulta amanhã", description: "Retorno online com Débora Almeida às 09:00.", at: "2026-07-07T07:00:00" },
];

export const demoAnamneseSummary = {
  patientId: "demo-patient-mariana",
  patientName: "Mariana Costa",
  receivedAt: "2026-07-06",
  highlights: [
    "Objetivo: reeducação alimentar",
    "Rotina: trabalho em turnos, refeições irregulares",
    "Sem alergias relatadas",
    "Consumo de água estimado: 1L/dia",
  ],
};

export const demoTranscriptionExcerpt = {
  careSessionTitle: "Consulta de retorno — Débora Almeida",
  date: "2026-06-18",
  segments: [
    { speaker: "NUTRITIONIST", text: "Como você se sentiu com o novo jantar mais leve?" },
    { speaker: "PATIENT", text: "Bem melhor, a vontade de beliscar à noite diminuiu bastante." },
    { speaker: "NUTRITIONIST", text: "Ótimo. Vamos manter e reavaliar as porções do almoço." },
  ],
};
