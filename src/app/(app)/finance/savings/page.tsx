import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { FutureGoals } from "@/features/finance/planning/FutureGoals";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function SavingsPage() {
  const context = await financePageAccess(), today = dayKey(new Date(), context.workspace.timezone);
  const [goals, accounts, debts] = await Promise.all([
    prisma.savingsGoal.findMany({ where: { workspaceId: context.workspaceId }, include: { contributions: { select: { amountCents: true, date: true, kind: true }, orderBy: { date: "desc" } } }, orderBy: [{ priority: "asc" }, { targetDate: "asc" }] }),
    prisma.account.findMany({ where: { workspaceId: context.workspaceId, isArchived: false, type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } }, select: { id: true, name: true, type: true } }),
    prisma.debt.findMany({ where: { workspaceId: context.workspaceId }, select: { id: true, name: true } }),
  ]);
  return <FinancePrivacyBoundary canWrite={context.canWrite}><FutureGoals today={today} accounts={accounts} debts={debts} goals={goals.map(row => ({ ...row, targetDate: row.targetDate?.toISOString().slice(0, 10) ?? null, contributions: row.contributions.map(contribution => ({ ...contribution, date: contribution.date.toISOString().slice(0, 10) })) }))}/></FinancePrivacyBoundary>;
}
