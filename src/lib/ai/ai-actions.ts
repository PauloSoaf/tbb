import { NUTRIOPUS_KNOWLEDGE } from "./nutriopus-knowledge";

export type AIAssistantAction =
  | { type: "NAVIGATE"; label: string; href: string }
  | { type: "OPEN_TOOL"; label: string; toolId: string }
  | { type: "OPEN_PATIENT"; label: string; patientId: string; href: string }
  | { type: "NONE" };

const FLOATING_TOOL_KEYWORDS: { toolId: string; label: string; keywords: string[] }[] = [
  { toolId: "taco", label: "Abrir TACO rápida", keywords: ["taco", "alimento", "alimentos", "composição nutricional", "tabela nutricional"] },
  { toolId: "bmi", label: "Calcular IMC", keywords: ["imc", "indice de massa", "sobrepeso", "obesidade", "eutrofia"] },
  { toolId: "macros", label: "Calcular Macros", keywords: ["macro", "macros", "proteina", "carboidrato", "gordura", "distribuicao", "distribuição calorica"] },
  { toolId: "water", label: "Calcular Água", keywords: ["agua", "água", "hidratacao", "hidratação", "liquido", "ml/kg"] },
  { toolId: "tmb", label: "Calcular TMB/GET", keywords: ["tmb", "get", "metabolismo", "taxa metabolica", "gasto energetico", "harris", "mifflin"] },
];

export function inferSafeActions(message: string, tenant: string, patientId?: string | null): AIAssistantAction[] {
  const normalized = message.toLowerCase();
  const actions: AIAssistantAction[] = [];

  for (const item of NUTRIOPUS_KNOWLEDGE) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      const href = item.href(tenant);
      const label = item.id === "taco" ? "Abrir TACO" : `Ir para ${item.title}`;
      actions.push({ type: "NAVIGATE", label, href });
    }
  }

  for (const tool of FLOATING_TOOL_KEYWORDS) {
    if (tool.keywords.some((keyword) => normalized.includes(keyword))) {
      actions.push({ type: "OPEN_TOOL", label: tool.label, toolId: tool.toolId });
    }
  }

  if (patientId && (normalized.includes("paciente") || normalized.includes("prontuario"))) {
    actions.push({
      type: "OPEN_PATIENT",
      label: "Abrir paciente atual",
      patientId,
      href: `/dashboard/${tenant}/pacientes/${patientId}`,
    });
  }

  return validateAssistantActions(actions, tenant);
}

export function validateAssistantActions(actions: AIAssistantAction[], tenant: string): AIAssistantAction[] {
  const allowedPrefix = `/dashboard/${tenant}`;
  const seen = new Set<string>();

  return actions.filter((action) => {
    if (action.type === "NONE") return false;
    if (action.type === "OPEN_TOOL") return Boolean(action.toolId);
    if (!("href" in action) || !action.href.startsWith(allowedPrefix)) return false;
    if (action.href.includes("://") || action.href.includes("..")) return false;
    const key = `${action.type}:${action.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}
