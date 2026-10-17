import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { LoanSimulator, type SavedComparison, type StatementOption } from "@/features/finance/LoanSimulator";
import { comparisonPayloadSchema } from "@/features/finance/loan-comparison";
import { financeOverview } from "@/features/finance/overview-query";
import { canReadCardStatements, cardStatementRows } from "@/features/finance/queries";
import { dayKey, formatDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { debtGoalPreset } from "@/features/finance/planning/debt-goal-preset";

export const metadata = { title: "Simulador de crédito" };

/** Owner only: it reads the bills, and what it saves is the owner's own study of their debt. */
export default async function LoanSimulatorPage({ searchParams }: { searchParams?: Promise<{ goal?: string }> }) {
  const c = await financePageAccess();
  if (!canReadCardStatements(c)) return <FinancePrivacyBoundary canWrite={c.canWrite}><div className="stack">
    <PageHeader eyebrow="MONEY · DEBTS" title="Simulador de crédito."/>
    <div className="panel"><EmptyState title="Simulador visível só para o titular" description="O simulador usa as faturas de cartão deste espaço, que são dados pessoais do titular e não aparecem para outros membros."/></div>
  </div></FinancePrivacyBoundary>;

  const today = dayKey(new Date(), c.workspace.timezone);
  const goalId = (await searchParams)?.goal;
  const goal = goalId ? await prisma.savingsGoal.findFirst({where:{id:goalId,workspaceId:c.workspaceId,kind:{in:["DEBT_AMORTIZATION","EARLY_PAYOFF"]}},include:{debt:true}}) : null;
  const [rows, overview, stored] = await Promise.all([
    cardStatementRows(c),
    financeOverview(c.workspaceId, today, { statementViewer: c }),
    prisma.loanComparison.findMany({ where: { workspaceId: c.workspaceId }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  const day = (value: string) => formatDay(value, c.workspace.locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  // Bills still to be paid: open ones, and known future ones. A bill whose balance moved into another is not listed twice.
  const statements: StatementOption[] = rows
    .filter((row) => row.kind === "STATEMENT" && (row.status === "OPEN" || row.status === "FUTURE_KNOWN") && !row.rolledIntoStatementId && row.dueDate && row.amountCents > 0)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.accountName.localeCompare(b.accountName))
    .map((row) => ({ id: row.id, label: `${row.accountName} · vence ${day(row.dueDate!)}${row.status === "FUTURE_KNOWN" ? " (futura)" : ""}`, outstandingCents: row.amountCents }));
  // Only what passes the same validation used on save is shown, so a damaged row can never break the page.
  const saved: SavedComparison[] = stored.flatMap((row) => {
    const payload = comparisonPayloadSchema.safeParse(row.payload);
    return payload.success ? [{ id: row.id, name: row.name, updatedOn: dayKey(row.updatedAt, c.workspace.timezone), payload: payload.data }] : [];
  });

  return <FinancePrivacyBoundary canWrite={c.canWrite}><div className="stack">
    <PageHeader eyebrow="MONEY · DEBTS" title="Compare antes de decidir." description="Simule pagar à vista, parcelar a fatura ou pegar um empréstimo e veja custo e impacto no mês lado a lado. Nada aqui contrata ou altera suas dívidas.">
      <Link className="button-secondary" href="/finance/statements"><FileText size={15}/>Faturas</Link>
    </PageHeader>
    {goal?.debt && <p className="salary-note">Simulação de {goal.name}. Confira prazo restante, taxa mensal, primeira parcela e data da amortização antes de comparar. Os dados da dívida servem como referência; campos não confirmados ficam em branco. Nenhum pagamento será executado.</p>}
    <LoanSimulator today={today} locale={c.workspace.locale} statements={statements} suggestedIncomeCents={overview.salary.incomeCents} suggestedCommitmentsCents={overview.salary.fixedCents} saved={saved} goalPreset={goal?.debt ? debtGoalPreset({...goal,targetDate:goal.targetDate?.toISOString().slice(0,10)??null},goal.debt,today,overview.salary.incomeCents,overview.salary.fixedCents) : undefined}/>
  </div></FinancePrivacyBoundary>;
}
