// Instant, hand-written answers for the suggested-prompt buttons
// (AIAssistantSuggestedPrompts / suggested-prompts.ts). These questions are
// known in advance and don't need a real AI round-trip — keying off the
// exact prompt text lets us answer them immediately, with the same
// AIAssistantAction navigation/tool links the real AI would infer via
// inferSafeActions, so the UX stays consistent either way.
//
// "Resuma este paciente." is intentionally NOT here — it's genuinely
// dynamic per patient and must go through the real AI.

import type { AIAssistantAction } from "@/lib/ai/ai-actions";

export interface CannedResponse {
  content: string;
  actions: AIAssistantAction[];
}

export function getCannedResponse(prompt: string, tenant: string): CannedResponse | null {
  switch (prompt) {
    case "Onde vejo a agenda?":
      return {
        content:
          "Sua agenda mostra consultas presenciais e online, com status, notas e acesso rápido às salas de atendimento.",
        actions: [{ type: "NAVIGATE", label: "Ir para Agenda", href: `/dashboard/${tenant}/agenda` }],
      };

    case "Abrir Tabela TACO.":
      return {
        content: "A Tabela TACO permite buscar a composição nutricional dos alimentos rapidamente.",
        actions: [{ type: "NAVIGATE", label: "Abrir TACO", href: `/dashboard/${tenant}/ferramentas/taco` }],
      };

    case "Como crio um plano alimentar?":
      return {
        content:
          'Você pode criar um plano na Oficina de Planos (a partir de um modelo ou do zero), ou direto na página do paciente em "Planos Alimentares" → "Novo Plano".',
        actions: [
          { type: "NAVIGATE", label: "Abrir Oficina de Planos", href: `/dashboard/${tenant}/ferramentas/oficina-planos` },
        ],
      };

    case "Como gero link de atendimento?":
      return {
        content:
          "Em Atendimentos, crie uma nova sessão com o paciente — o link de acesso (paciente e nutricionista) é gerado automaticamente e pode ser copiado para enviar por WhatsApp ou e-mail.",
        actions: [{ type: "NAVIGATE", label: "Ir para Atendimentos", href: `/dashboard/${tenant}/atendimentos` }],
      };

    case "Calcular IMC.":
      return {
        content: "Abrindo a calculadora de IMC — informe peso e altura para ver o resultado com a classificação da OMS.",
        actions: [{ type: "OPEN_TOOL", label: "Calculadora de IMC", toolId: "bmi" }],
      };

    case "Calcular TMB.":
      return {
        content:
          "Abrindo a calculadora de TMB/GET — calcula a taxa metabólica basal (Mifflin-St Jeor) e o gasto energético total por nível de atividade.",
        actions: [{ type: "OPEN_TOOL", label: "Calculadora de TMB/GET", toolId: "tmb" }],
      };

    case "Distribuição de macros.":
      return {
        content:
          "Abrindo a calculadora de macros — distribui proteína, carboidrato e gordura em gramas a partir da meta calórica.",
        actions: [{ type: "OPEN_TOOL", label: "Distribuição de Macros", toolId: "macros" }],
      };

    default:
      return null;
  }
}
