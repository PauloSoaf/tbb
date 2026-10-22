import { PageHeader } from "@/components/ui/PageHeader";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { financePageAccess } from "@/features/finance/finance-page-access";
import { financeSummary } from "@/features/finance/queries";
import { CASH_ACCOUNT_TYPES } from "@/features/finance/own-transfers";
import { isUnassignedAccount } from "@/features/finance/unassigned-account";
import { OpenFinancePanel } from "@/features/open-finance/OpenFinancePanel";
import { openFinanceOverview } from "@/features/open-finance/queries";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function OpenFinancePage() {
  const context = await financePageAccess();
  if (context.role !== "OWNER") return <div className="stack"><PageHeader eyebrow="INTEGRATIONS · OPEN FINANCE" title="Bancos conectados" description="Somente o titular do espaço acessa as integrações bancárias."/></div>;
  const today = dayKey(new Date(), context.workspace.timezone);
  const [overview, summary] = await Promise.all([openFinanceOverview(prisma, context.workspaceId), financeSummary(context.workspaceId, today)]);
  const tbbAccounts = summary.accounts.filter((account) => !isUnassignedAccount(account) && (account.type === "CREDIT_CARD" || (CASH_ACCOUNT_TYPES as readonly string[]).includes(account.type)) && !account.isArchived)
    .map(({ id, name, balanceCents, type }) => ({ id, name, balanceCents, kind: type === "CREDIT_CARD" ? "CREDIT" as const : "BANK" as const }));
  return <FinancePrivacyBoundary canWrite={context.canWrite}><div className="stack">
    <PageHeader eyebrow="INTEGRATIONS · OPEN FINANCE" title="Bancos conectados pelo Meu Pluggy." description="Importe saldos e movimentos das suas contas pelo Open Finance, sem lançar nada duas vezes."/>
    <OpenFinancePanel overview={overview} tbbAccounts={tbbAccounts} migrationReady={overview.ready}/>
  </div></FinancePrivacyBoundary>;
}
