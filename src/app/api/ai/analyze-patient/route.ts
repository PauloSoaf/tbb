import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "dummy",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { patientId } = await req.json();
    if (!patientId) return NextResponse.json({ error: "patientId obrigatório" }, { status: 400 });

    const thirtyDaysAgo = subDays(new Date(), 30);

    const [patient, measurements, goals, diaryCount, activePlan] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, nutritionistId: session.nutritionistId },
        select: { name: true, goal: true, birthDate: true, weight: true, height: true },
      }),
      prisma.patientMeasurement.findMany({
        where: { patientId, nutritionistId: session.nutritionistId, measuredAt: { gte: thirtyDaysAgo } },
        orderBy: { measuredAt: "asc" },
        select: { weight: true, bmi: true, bodyFatPercentage: true, measuredAt: true },
        take: 10,
      }),
      prisma.patientGoal.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        include: { checkIns: { orderBy: { checkedAt: "desc" }, take: 3 } },
        take: 5,
      }),
      prisma.foodDiaryEntry.count({
        where: { patientId, nutritionistId: session.nutritionistId, loggedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.mealPlan.findFirst({
        where: { patientId, nutritionistId: session.nutritionistId, status: "ACTIVE" },
        select: { title: true },
      }),
    ]);

    if (!patient) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        analysis: `**[SIMULAÇÃO IA] Análise de Progresso — ${patient.name}**\n\n- **Engajamento:** ${diaryCount} registros de diário nos últimos 30 dias — ${diaryCount >= 10 ? "bom engajamento" : "engajamento baixo, considere motivar o paciente"}.\n- **Medidas:** ${measurements.length > 0 ? "há dados recentes para análise" : "sem medidas recentes"}.\n- **Metas:** ${goals.filter((g) => g.status === "ACTIVE").length} meta(s) ativa(s).\n\n*(Adicione GROQ_API_KEY no .env para análise real com LLaMa)*`,
      });
    }

    const context = {
      nome: patient.name,
      objetivo: patient.goal,
      diarioUltimos30Dias: diaryCount,
      planoAtivo: activePlan?.title ?? "nenhum",
      medidas: measurements.map((m) => ({
        data: new Date(m.measuredAt).toLocaleDateString("pt-BR"),
        peso: m.weight,
        bmi: m.bmi,
        gordura: m.bodyFatPercentage,
      })),
      metas: goals.map((g) => ({
        titulo: g.title,
        tipo: g.type,
        status: g.status,
        valorAtual: g.currentValue,
        valorAlvo: g.targetValue,
        totalCheckIns: g.checkIns.length,
      })),
    };

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Você é um nutricionista clínico. Analise o progresso do paciente e gere um relatório conciso em Markdown PT-BR.

Dados do paciente:
${JSON.stringify(context, null, 2)}

Gere uma análise com:
1. **Resumo do Progresso** (evolução de peso/composição corporal se houver dados)
2. **Engajamento** (adesão ao diário alimentar)
3. **Metas** (progresso em relação às metas estabelecidas)
4. **Recomendações** (2-3 sugestões práticas para a próxima consulta)

Seja direto, clínico e em português. Sem saudações ou assinaturas.`,
    });

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("Erro ao analisar paciente:", error);
    return NextResponse.json({ error: "Falha ao gerar análise" }, { status: 500 });
  }
}
