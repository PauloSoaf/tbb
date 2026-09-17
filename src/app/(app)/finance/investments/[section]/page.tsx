import { notFound } from "next/navigation";
import { InvestmentSectionPage } from "@/features/investments/InvestmentSectionPage";
import { PartnerInvestmentSummary } from "@/features/investments/PartnerInvestmentSummary";
import { investmentSections, isInvestmentSectionId } from "@/features/investments/investment-sections";
import { investmentOverview, investmentShellData } from "@/features/investments/queries";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getPartnerContext, getWorkspaceContext } from "@/lib/workspace";

export function generateStaticParams() {
  return investmentSections.filter((section) => section.id !== "overview").map((section) => ({ section: section.id }));
}

export default async function InvestmentSectionRoute({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ scope?: string }> }) {
  const { section } = await params;
  const query = await searchParams;
  if (!isInvestmentSectionId(section)) notFound();
  const context = await getWorkspaceContext();
  const today = dayKey(new Date(), context.workspace.timezone);
  const scope = query.scope === "partner" || query.scope === "together" ? query.scope : "me";
  if (scope !== "me") {
    const partnerAccess = await getPartnerContext("investments");
    if (!partnerAccess) return <div className="stack"><PageHeader eyebrow="MONEY · INVESTMENTS" title={scope === "partner" ? "Parceiro" : "Juntos"}/><EmptyState title="Nada compartilhado aqui ainda" description="O parceiro ainda não compartilhou Investments."/></div>;
    const [partner, partnerWorkspace, me] = await Promise.all([investmentOverview(partnerAccess.partnerWorkspaceId, today), prisma.workspace.findUnique({ where: { id: partnerAccess.partnerWorkspaceId }, select: { name: true } }), scope === "together" ? investmentOverview(context.workspaceId, today) : Promise.resolve(undefined)]);
    return <PartnerInvestmentSummary scope={scope} me={me} partner={partner} partnerName={partnerWorkspace?.name || "Parceiro"}/>;
  }
  const [data, shell] = await Promise.all([
    investmentOverview(context.workspaceId, today),
    investmentShellData(context.workspaceId),
  ]);
  return <InvestmentSectionPage section={section} data={data} shell={shell}/>;
}
