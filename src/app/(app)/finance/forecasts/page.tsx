import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { PlanningDashboard } from "@/features/finance/planning/PlanningDashboard";
import { financialPlanningData, forecastSelection } from "@/features/finance/planning/query";
import { dayKey } from "@/lib/dates";
import { EmptyState } from "@/components/ui/PageHeader";

export default async function ForecastsPage({ searchParams }: { searchParams: Promise<{ month?: string; horizon?: string; tab?: string }> }) {
  const context = await financePageAccess();
  if (context.role !== "OWNER") return <EmptyState title="Planejamento pessoal do titular" description="Os detalhes de faturas e previsões são privados do titular deste espaço."/>;
  const params = await searchParams, today = dayKey(new Date(), context.workspace.timezone), selection = forecastSelection(params.month, params.horizon, today);
  const data = await financialPlanningData(context, today, selection.startsOn, selection.count);
  return <FinancePrivacyBoundary canWrite={context.canWrite}><PlanningDashboard data={data} mode="forecasts" tab={params.tab}/></FinancePrivacyBoundary>;
}
