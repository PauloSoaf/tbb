import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { InvestmentOverview } from "@/features/investments/InvestmentOverview";
import { PartnerInvestmentSummary } from "@/features/investments/PartnerInvestmentSummary";
import { investmentOverview, investmentShellData } from "@/features/investments/queries";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getPartnerContext } from "@/lib/workspace";

export default async function InvestmentsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const context = await financePageAccess();
  const params = await searchParams;
  const scope = params.scope === "partner" || params.scope === "together" ? params.scope : "me";
  const today = dayKey(new Date(), context.workspace.timezone);
  if (scope !== "me") {
    const partnerAccess = await getPartnerContext("investments");
    if (!partnerAccess) return <FinancePrivacyBoundary canWrite={context.canWrite}><div className="stack"><PageHeader eyebrow="MONEY · INVESTMENTS" title={scope === "partner" ? "Parceiro" : "Juntos"}/><EmptyState title="Nada compartilhado aqui ainda" description="Conecte um parceiro em Configurações → Partner ou peça para ele compartilhar Investments."/></div></FinancePrivacyBoundary>;
    const [partner, partnerWorkspace, me] = await Promise.all([
      investmentOverview(partnerAccess.partnerWorkspaceId, today),
      prisma.workspace.findUnique({ where: { id: partnerAccess.partnerWorkspaceId }, select: { name: true } }),
      scope === "together" ? investmentOverview(context.workspaceId, today) : Promise.resolve(undefined),
    ]);
    return <FinancePrivacyBoundary canWrite={context.canWrite}><PartnerInvestmentSummary scope={scope} me={me} partner={partner} partnerName={partnerWorkspace?.name || "Parceiro"}/></FinancePrivacyBoundary>;
  }
  const [data, shell] = await Promise.all([
    investmentOverview(context.workspaceId, today),
    investmentShellData(context.workspaceId),
  ]);
  return <FinancePrivacyBoundary canWrite={context.canWrite}><InvestmentOverview data={data} shell={shell}/></FinancePrivacyBoundary>;
}
