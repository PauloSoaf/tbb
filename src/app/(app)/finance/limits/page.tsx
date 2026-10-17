import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { PlanningDashboard } from "@/features/finance/planning/PlanningDashboard";
import { financialPlanningData } from "@/features/finance/planning/query";
import { dayKey } from "@/lib/dates";
import { EmptyState } from "@/components/ui/PageHeader";

export default async function SpendingLimitsPage() {
  const context = await financePageAccess();
  if (context.role !== "OWNER") return <EmptyState title="Planejamento pessoal do titular" description="Os limites detalhados são privados do titular deste espaço."/>;
  const today = dayKey(new Date(), context.workspace.timezone), data = await financialPlanningData(context, today, today.slice(0, 7) + "-01", 3);
  return <FinancePrivacyBoundary canWrite={context.canWrite}><PlanningDashboard data={data} mode="limits"/></FinancePrivacyBoundary>;
}
