export type NutriopusKnowledgeItem = {
  id: string;
  title: string;
  description: string;
  href: (tenant: string) => string;
  keywords: string[];
};

export const NUTRIOPUS_KNOWLEDGE: NutriopusKnowledgeItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visao geral da clinica, proximas consultas, aniversarios e alertas.",
    href: (tenant) => `/dashboard/${tenant}`,
    keywords: ["inicio", "dashboard", "visao geral", "home"],
  },
  {
    id: "patients",
    title: "Pacientes",
    description: "Lista, cadastro, prontuario, tags, arquivos, medidas, planos e historico dos pacientes.",
    href: (tenant) => `/dashboard/${tenant}/pacientes`,
    keywords: ["paciente", "pacientes", "prontuario", "cadastro"],
  },
  {
    id: "agenda",
    title: "Agenda",
    description: "Consultas presenciais e online, status, notas e acesso a salas de atendimento.",
    href: (tenant) => `/dashboard/${tenant}/agenda`,
    keywords: ["agenda", "consulta", "consultas", "horario"],
  },
  {
    id: "tools",
    title: "Ferramentas",
    description: "Central de calculadoras, TACO, modelos, oficina de planos e relatorios.",
    href: (tenant) => `/dashboard/${tenant}/ferramentas`,
    keywords: ["ferramentas", "calculadora", "taco", "relatorio"],
  },
  {
    id: "taco",
    title: "Tabela TACO",
    description: "Busca nutricional de alimentos para consulta rapida.",
    href: (tenant) => `/dashboard/${tenant}/ferramentas/taco`,
    keywords: ["taco", "alimento", "alimentos", "tabela"],
  },
  {
    id: "meal-studio",
    title: "Oficina de Planos",
    description: "Crie, edite e organize planos alimentares e modelos.",
    href: (tenant) => `/dashboard/${tenant}/ferramentas/oficina-planos`,
    keywords: ["plano", "planos", "cardapio", "oficina"],
  },
  {
    id: "appointments",
    title: "Atendimentos Online",
    description: "Crie e acesse sessoes de atendimento com video e chat.",
    href: (tenant) => `/dashboard/${tenant}/atendimentos`,
    keywords: ["atendimento", "online", "video", "sala"],
  },
  {
    id: "config",
    title: "Configuracoes",
    description: "Ajustes da conta, integracoes, Google Calendar e identidade.",
    href: (tenant) => `/dashboard/${tenant}/config`,
    keywords: ["config", "configuracao", "google", "integracao"],
  },
  {
    id: "team",
    title: "Equipe",
    description: "Gerencie assistentes e colaboradores da clinica.",
    href: (tenant) => `/dashboard/${tenant}/equipe`,
    keywords: ["equipe", "assistente", "colaborador", "membro"],
  },
  {
    id: "clinic-report",
    title: "Relatorio da Clinica",
    description: "KPIs, engajamento, check-ins, planos ativos e metricas da clinica.",
    href: (tenant) => `/dashboard/${tenant}/ferramentas/relatorio-clinica`,
    keywords: ["relatorio", "kpi", "metricas", "engajamento", "relatorio da clinica"],
  },
  {
    id: "calculadoras",
    title: "Calculadoras Clinicas",
    description: "Calculadoras de RCQ, risco de cintura e outras metricas antropometricas.",
    href: (tenant) => `/dashboard/${tenant}/ferramentas/calculadoras`,
    keywords: ["calculadora", "calculadoras", "rcq", "cintura", "antropometria"],
  },
  {
    id: "comparar-pacientes",
    title: "Comparar Pacientes",
    description: "Comparativo side-by-side de dois pacientes (IMC, peso, consultas, metas, diario).",
    href: (tenant) => `/dashboard/${tenant}/ferramentas/comparar-pacientes`,
    keywords: ["comparar", "comparativo", "comparacao", "lado a lado"],
  },
];

export const FLOATING_TOOLS_KNOWLEDGE = [
  { id: "taco", titulo: "TACO rápida", descricao: "Busca nutricional de alimentos sem sair da tela. Abre como janela flutuante." },
  { id: "bmi", titulo: "Calculadora de IMC", descricao: "Calcula IMC por peso e altura com classificação OMS. Abre como janela flutuante." },
  { id: "macros", titulo: "Distribuição de Macros", descricao: "Distribui proteína, carboidrato e gordura por meta calórica em gramas. Abre como janela flutuante." },
  { id: "water", titulo: "Água diária", descricao: "Estima necessidade hídrica por peso (30-35 ml/kg). Abre como janela flutuante." },
  { id: "tmb", titulo: "TMB e GET", descricao: "Calcula taxa metabólica basal (Mifflin-St Jeor) e gasto energético total por nível de atividade. Abre como janela flutuante." },
];

export function getKnowledgeForPrompt(tenant: string) {
  return {
    modulos: NUTRIOPUS_KNOWLEDGE.map((item) => ({
      id: item.id,
      titulo: item.title,
      descricao: item.description,
      rota: item.href(tenant),
    })),
    ferramentasFlutuantes: FLOATING_TOOLS_KNOWLEDGE,
  };
}
