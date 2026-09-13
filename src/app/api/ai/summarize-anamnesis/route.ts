import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "dummy",
});

export async function POST(req: NextRequest) {
  const { getSessionFromCookies } = await import("@/lib/auth/cookies");
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { anamnesisData } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      // Mocked response se a key nao existir
      return NextResponse.json({
        summary: `**[SIMULAÇÃO IA] Resumo Clínico:**\n\n- **Alertas Críticos:** Paciente relatou alergia a frutos do mar e intolerância a lactose.\n- **Principais Queixas:** Fadiga excessiva à tarde e dificuldade em perder peso.\n- **Sugestão de Abordagem:** Focar em reeducação alimentar, substitutos de cálcio sem lactose e lanches estratégicos à tarde.\n\n*(Adicione GROQ_API_KEY no .env para gerar com LLaMa real)*`
      });
    }

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Você é um Nutricionista Clínico especialista avaliando uma nova ficha de anamnese.
      O paciente forneceu as seguintes respostas:
      
      ${JSON.stringify(anamnesisData, null, 2)}
      
      Por favor, forneça um resumo clínico conciso formatado em Markdown focado EXATAMENTE nestes três tópicos (use **negrito** para destacar doenças, alimentos alergênicos e metas importantes):
      
      1. **Alertas Críticos:** (Alergias, Intolerâncias, Histórico de Doenças Familiares/Próprias, Medicamentos em uso)
      2. **Principais Queixas e Hábitos:** (O que está atrapalhando o paciente, problemas digestivos, sono, ingestão de água, consumo de álcool/doces)
      3. **Sugestão de Abordagem Inicial:** (Foco principal para a primeira consulta e prescrição dietética)
      
      IMPORTANTE: Retorne apenas o resumo em Markdown. Não adicione saudações iniciais (como 'Aqui está o resumo') nem assinaturas finais. Seja direto e clínico.`,
    });

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("Erro ao resumir anamnese:", error);
    return NextResponse.json({ error: "Falha ao gerar resumo" }, { status: 500 });
  }
}
