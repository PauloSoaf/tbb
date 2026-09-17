import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { getAssistantProvider } from "@/lib/assistant/provider";
import { prisma } from "@/lib/prisma";
import { dayKey, addDays, dateKeyToUTC } from "@/lib/dates";
import { extractExpenseText } from "@/features/finance/natural-language";
import { fixedIncomeProjection } from "@/features/investments/calculations";
import { getMacroProvider } from "@/features/investments/providers";

const requestSchema = z.object({ prompt: z.string().trim().min(1).max(1_000), route: z.string().max(300).default("/today") });
type LifeAction = { kind: "task"; title: string; dueDate: string | null } | { kind: "goal"; name: string; target: number; unit: string; targetDate: string | null };

function lifeAction(prompt: string, today: string): LifeAction | null {
  const task = prompt.match(/\b(?:crie|criar|adicione|adicionar|anote|lembrar)\s+(?:uma?\s+)?tarefa\s+(?:de\s+)?(.+)/i);
  if (task) {
    const title = task[1].replace(/\s+(?:para\s+)?(?:hoje|amanh[ãa])\.?$/i, "").trim();
    return title ? { kind: "task", title, dueDate: /amanh[ãa]/i.test(prompt) ? addDays(today, 1) : /hoje/i.test(prompt) ? today : null } : null;
  }
  const goal = prompt.match(/\b(?:crie|criar|adicione|adicionar)\s+(?:uma?\s+)?meta\s+(?:de\s+)?(.+)/i);
  if (goal) {
    const content = goal[1].trim();
    const quantity = content.match(/\b(\d+(?:[.,]\d+)?)\s+([^\s]+)/);
    return { kind: "goal", name: content, target: quantity ? Number(quantity[1].replace(",", ".")) : 1, unit: quantity?.[2] || "conclusão", targetDate: null };
  }
  return null;
}

const investmentIntent = /\b(?:invest(?:imento|ir|ido|imentos)?|carteira|portf[oó]lio|aporte|ações?|etfs?|fiis?|fundos?|cripto|bitcoin|btc|renda\s+fixa|cdb|lci|lca|tesouro|selic|cdi|dividendos?|vencimentos?)\b/i;
const currency = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function promptMoney(prompt: string) {
  const match = prompt.match(/R\$\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*(?:reais?|brl)\b/i);
  const raw = match?.[1] || match?.[2];
  if (!raw) return null;
  return Math.round(Number(raw.replace(/\./g, "").replace(",", ".")) * 100);
}

async function investmentAnswer(prompt: string, workspaceId: string, today: string) {
  if (!investmentIntent.test(prompt)) return null;
  const monthStart = dateKeyToUTC(`${today.slice(0, 7)}-01`);
  const [positions, monthIncome, maturities, budget] = await Promise.all([
    prisma.investmentPosition.findMany({ where: { workspaceId, account: { archivedAt: null }, asset: { archivedAt: null } }, include: { asset: { select: { name: true, ticker: true, type: true } }, account: { select: { name: true } } }, orderBy: { currentValueCents: "desc" } }),
    prisma.investmentIncome.aggregate({ where: { workspaceId, paymentDate: { gte: monthStart, lte: dateKeyToUTC(today) } }, _sum: { amountCents: true } }),
    prisma.investmentFixedIncomeProfile.findMany({ where: { asset: { workspaceId, archivedAt: null }, maturityDate: { gte: dateKeyToUTC(today) } }, select: { maturityDate: true, principalCents: true, indexer: true, asset: { select: { name: true, ticker: true } } }, orderBy: { maturityDate: "asc" }, take: 5 }),
    prisma.investmentBudget.findUnique({ where: { workspaceId_month: { workspaceId, month: today.slice(0, 7) } } }),
  ]);
  const total = positions.reduce((sum, item) => sum + item.currentValueCents, 0);
  const cost = positions.reduce((sum, item) => sum + item.bookCostCents, 0);
  const result = positions.reduce((sum, item) => sum + item.currentValueCents - item.bookCostCents + item.realizedPnlCents, 0);

  if (/\b(?:simul|quanto\s+rende|proje(?:ção|tar))/.test(prompt.toLowerCase())) {
    const principalCents = promptMoney(prompt);
    const percentage = prompt.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:do\s*)?cdi/i);
    const monthMatch = prompt.match(/(\d+)\s*mes(?:es)?/i);
    const yearMatch = prompt.match(/(\d+)\s*anos?/i);
    const months = monthMatch ? Number(monthMatch[1]) : yearMatch ? Number(yearMatch[1]) * 12 : 12;
    if (principalCents) {
      const macro = await getMacroProvider().getIndicators().catch(() => []);
      const selic = macro.find((item) => item.code === "SELIC");
      if (selic) {
        const projection = fixedIncomeProjection({ principalCents, months, indexAnnualBasisPoints: Math.round(selic.value * 100), indexerPercentageBasisPoints: Math.round(Number(percentage?.[1]?.replace(",", ".") || 100) * 100) });
        return `Cenário calculado: ${currency(principalCents)} por ${months} meses a ${percentage?.[1] || "100"}% do CDI, usando a meta Selic de ${selic.value.toLocaleString("pt-BR")}% a.a. como aproximação do indexador. Valor bruto: ${currency(projection.grossCents)}; IR estimado: ${currency(projection.taxCents)}; valor líquido: ${currency(projection.netCents)}. Fonte macro: ${selic.source}, referência ${selic.asOf.slice(0, 10)}. Abra Money → Investments → Simuladores para comparar outras premissas. Isto é uma simulação, não uma recomendação.`;
      }
    }
    return "Posso calcular renda fixa, juros compostos, poupança, imóvel e rebalanceamento. Informe um valor, prazo e taxa, ou abra Money → Investments → Simuladores para ajustar todas as premissas.";
  }
  if (/venc/i.test(prompt)) return maturities.length ? `Próximos vencimentos: ${maturities.map((item) => `${item.asset.ticker || item.asset.name} em ${item.maturityDate?.toISOString().slice(0, 10)} (${currency(item.principalCents)})`).join("; ")}. Eles também aparecem no Calendário.` : "Não há vencimentos futuros registrados na sua renda fixa.";
  if (/renda|divid|jcp|juros|rendiment/i.test(prompt)) return `Seus rendimentos registrados neste mês somam ${currency(monthIncome._sum.amountCents || 0)}. A tela Money → Investments → Rendimentos mostra a série de 12 meses e permite registrar dividendos, JCP, juros, cupons e aluguéis.`;
  if (!positions.length) return "Sua carteira ainda não tem posições. Em Money → Investments, crie uma conta, cadastre ou pesquise o ativo e registre o primeiro aporte. A carteira manual funciona mesmo sem provider de mercado.";
  const top = positions.slice(0, 3).map((item) => `${item.asset.ticker || item.asset.name} ${currency(item.currentValueCents)}`).join(", ");
  const budgetText = budget ? ` A verba de aportes do mês é ${currency(budget.amountCents)}.` : " A verba mensal de aportes ainda não foi configurada.";
  return `Sua carteira tem ${positions.length} posições e vale ${currency(total)}, contra ${currency(cost)} aplicados. O resultado registrado é ${currency(result)}. Maiores posições: ${top}.${budgetText} Posso detalhar rendimentos, vencimentos ou simular um cenário com premissas explícitas.`;
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
  const today = dayKey(new Date(), context.workspace.timezone);
  const investmentReply = await investmentAnswer(parsed.data.prompt, context.workspaceId, today);
  const hasMoney = !investmentReply && /(?:R\$\s*\d|\d+(?:[.,]\d+)?\s*(?:reais?|brl)\b)/i.test(parsed.data.prompt);
  const allAccounts = hasMoney ? await prisma.account.findMany({ where: { workspaceId: context.workspaceId, isArchived: false }, select: { id: true, name: true, institution: true, type: true } }) : [];
  const accounts = allAccounts.filter((account) => account.institution !== "__TBB_UNASSIGNED__");
  const capture = hasMoney ? await extractExpenseText(parsed.data.prompt, today, accounts) : null;
  const action = capture?.transactions.length ? { kind: "transactions" as const, transactions: capture.transactions.slice(0, 20) } : lifeAction(parsed.data.prompt, today);
  const answer = investmentReply || (action?.kind === "transactions" ? `Encontrei ${action.transactions.length} transação(ões). Revise a proposta abaixo e confirme para adicionar ao Finance.` : action?.kind === "task" ? "Preparei a tarefa. Confira e confirme para adicioná-la ao TBB." : action?.kind === "goal" ? "Preparei a meta. Confira e confirme para adicioná-la ao TBB." : await getAssistantProvider().reply(parsed.data.prompt, { workspaceId: context.workspaceId, userId: context.userId, route: parsed.data.route }));
  const encoder = new TextEncoder();
  const words = answer.match(/\S+\s*/g) || [answer];
  const stream = new ReadableStream({ async start(controller) { for (const word of words) { controller.enqueue(encoder.encode(word)); await new Promise((resolve) => setTimeout(resolve, 8)); } controller.close(); } });
  const headers: Record<string, string> = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };
  if (action) headers["x-tbb-action"] = encodeURIComponent(JSON.stringify(action));
  return new Response(stream, { headers });
}
