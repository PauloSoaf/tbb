import { FinanceOverview } from "@/features/finance/FinanceOverview";
import { PartnerFinanceSummary, type FinanceScopeMetrics } from "@/features/finance/PartnerFinanceSummary";
import { financeOverview } from "@/features/finance/overview-query";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext, getPartnerContext } from "@/lib/workspace";

function toScopeMetrics(overview: Awaited<ReturnType<typeof financeOverview>>): FinanceScopeMetrics {
  return { netWorthCents: overview.metrics.netWorthCents, incomeCents: overview.metrics.incomeCents, expensesCents: overview.metrics.expensesCents, balanceCents: overview.metrics.balanceCents };
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const context = await getWorkspaceContext();
  const { scope: rawScope } = await searchParams;
  const scope = rawScope === "partner" || rawScope === "together" ? rawScope : "me";
  const today = dayKey(new Date(), context.workspace.timezone);

  if (scope !== "me") {
    const partnerAccess = await getPartnerContext("finance");
    if (!partnerAccess) {
      return <div className="stack">
        <PageHeader eyebrow="FINANCE" title={scope === "partner" ? "Parceiro" : "Juntos"}/>
        <EmptyState title="Nada para ver aqui ainda" description="Conecte-se a um parceiro em Configurações → Partner, ou peça para ele compartilhar o módulo Finance."/>
      </div>;
    }
    const [partnerOverview, partnerWorkspace] = await Promise.all([
      financeOverview(partnerAccess.partnerWorkspaceId, today),
      prisma.workspace.findUnique({ where: { id: partnerAccess.partnerWorkspaceId }, select: { name: true } }),
    ]);
    const partnerMetrics = toScopeMetrics(partnerOverview);
    const partnerName = partnerWorkspace?.name || "Parceiro";
    if (scope === "partner") {
      return <div className="stack">
        <PageHeader eyebrow="FINANCE" title="Parceiro" description="Visão somente leitura dos dados que seu parceiro compartilhou."/>
        <PartnerFinanceSummary scope="partner" me={partnerMetrics} partner={partnerMetrics} partnerName={partnerName}/>
      </div>;
    }
    const meOverview = await financeOverview(context.workspaceId, today);
    return <div className="stack">
      <PageHeader eyebrow="FINANCE" title="Juntos" description="Renda, despesas e saldo somados. Cada workspace continua com seus próprios registros."/>
      <PartnerFinanceSummary scope="together" me={toScopeMetrics(meOverview)} partner={partnerMetrics} partnerName={partnerName}/>
    </div>;
  }

  const overview = await financeOverview(context.workspaceId, today, { cardStatements: true });
  const captureAccounts = overview.accounts.filter((account) => !account.unassigned).map(({ id, name, institution, type }) => ({ id, name, institution, type }));
  return <FinanceOverview data={overview} captureAccounts={captureAccounts}/>;
}
