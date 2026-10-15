import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { AccountForm, CategoryForm } from "@/features/finance/forms";
import { archiveFinanceEntity, createDefaultCategories } from "@/features/finance/actions";
import { BankBadge } from "@/features/finance/BankBadge";
import { CreditLimitBreakdown } from "@/features/finance/CreditLimitBreakdown";
import { cardCycleSuggestion } from "@/features/finance/card-statements";
import { cardStatementRows, creditCardPositions, financeSummary } from "@/features/finance/queries";
import { StatementProvenanceTooltip } from "@/features/finance/StatementProvenanceTooltip";
import { describeProvenance } from "@/features/finance/statement-provenance";
import { money } from "@/features/finance/money";
import { dayKey, formatDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { isUnassignedAccount } from "@/features/finance/unassigned-account";
import { groupBankAccounts } from "@/features/finance/bank-accounts";
import { AccountBalanceForm } from "@/features/finance/AccountBalanceForm";

export default async function AccountsPage() {
  const c = await getWorkspaceContext();
  const today = dayKey(new Date(), c.workspace.timezone);
  const [s, categories, statementRows] = await Promise.all([
    financeSummary(c.workspaceId, today),
    prisma.financeCategory.findMany({ where: { workspaceId: c.workspaceId, isArchived: false }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    cardStatementRows(c),
  ]);
  const cards = new Map((await creditCardPositions(c.workspaceId, today, statementRows)).map((card) => [card.id, card]));
  const day = (value: string) => formatDay(value, c.workspace.locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  return <FinancePrivacyBoundary><div className="stack">
    <PageHeader eyebrow="MONEY · ACCOUNTS" title="Onde seu dinheiro vive." description="Conta, cofrinhos e cartão juntos por banco. Saldo é seu dinheiro; limite é crédito disponível."><Modal title="Criar conta" trigger={<><Plus size={15}/>Nova conta</>}><AccountForm/></Modal></PageHeader>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groupBankAccounts(s.accounts).map((bank) => <article className="panel stack bank-account-panel" key={bank.id} id={`banco-${bank.id}`}>
      <div className="account-card-title"><BankBadge institution={bank.institution} name={bank.name}/><div><h2>{bank.name}</h2><p className="muted">Seu dinheiro e seus cartões</p></div></div>
      <div className="bank-balances"><div><small>Saldo da conta · débito</small><strong>{bank.hasCash ? money(bank.cashCents) : "Não informado"}</strong></div><div><small>Cofrinhos e poupança</small><strong>{bank.accounts.some((a) => a.type === "SAVINGS") ? money(bank.reserveCents) : "Não cadastrado"}</strong></div></div>
      <div className="row"><Modal title={`Adicionar conta · ${bank.name}`} trigger={bank.hasCash ? "+ Outra conta" : "+ Saldo da conta"}><AccountForm defaults={{ name: `${bank.name} · Conta`, institution: bank.institution || bank.name, type: "CHECKING" }}/></Modal><Modal title={`Adicionar cofrinho · ${bank.name}`} trigger="+ Cofrinho / poupança"><AccountForm defaults={{ name: `${bank.name} · Cofrinho`, institution: bank.institution || bank.name, type: "SAVINGS" }}/></Modal>{!bank.accounts.some((a) => a.type === "CREDIT_CARD") && <Modal title={`Adicionar cartão · ${bank.name}`} trigger="+ Cartão"><AccountForm defaults={{ name: `${bank.name} · Cartão`, institution: bank.institution || bank.name, type: "CREDIT_CARD" }}/></Modal>}</div>
      {bank.accounts.map((a) => {
      const unassigned = isUnassignedAccount(a);
      const card = cards.get(a.id);
      const open = card?.statements.filter((row) => row.status === "OPEN").sort((x, y) => (x.dueDate || "").localeCompare(y.dueDate || ""))[0];
      const statement = open ? { id: open.id, amountCents: open.amountCents, closingDate: open.closingDate, closingDay: open.closingDay, dueDate: open.dueDate!, overdue: open.dueDate! < today } : null;
      const actions = !unassigned && <div className="row">
        {["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"].includes(a.type) && <Modal title={`Atualizar saldo · ${a.name}`} trigger="Atualizar saldo"><AccountBalanceForm id={a.id} balanceCents={a.balanceCents}/></Modal>}
        <Modal title="Editar conta" trigger="Editar" openWhen={{ param: "edit", value: a.id }}><AccountForm account={a} statement={statement} cycle={card ? cardCycleSuggestion(card.statements) : null}/></Modal>
        <ActionForm action={archiveFinanceEntity}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="entity" value="ACCOUNT"/><button className="button-secondary">Arquivar</button></ActionForm>
      </div>;
      if (card) {
        const cycle = statement
          ? `Fecha ${statement.closingDate ? day(statement.closingDate) : statement.closingDay ? `dia ${statement.closingDay}` : "—"} · Vence ${day(statement.dueDate)}`
          : a.closingDay || a.dueDay ? `Fecha dia ${a.closingDay ?? "—"} · Vence dia ${a.dueDay ?? "—"}` : "Ciclo não configurado";
        return <section className="stack bank-product account-card-panel" key={a.id} id={`conta-${a.id}`}>
          <div className="row justify-between"><span className="badge">CARTÃO DE CRÉDITO</span><span className="muted text-xs">{cycle}</span></div>
          <h3>{a.name}</h3>
          <div className="account-card-invoice">
            <div><small>{statement?.overdue ? "Fatura vencida" : "Fatura atual"}{open && <StatementProvenanceTooltip subject={`${a.name} com vencimento ${day(open.dueDate!)}`} view={describeProvenance(open.provenance, { timeZone: c.workspace.timezone, today, now: new Date(), status: open.status })}/>}</small><strong>{money(card.breakdown.openCents)}</strong></div>
            <div><small>Futuras</small><strong>{money(card.breakdown.futureCents)}</strong></div>
            <div><small>Limite</small><strong>{card.breakdown.limitCents ? money(card.breakdown.limitCents) : "Não informado"}</strong></div>
          </div>
          <CreditLimitBreakdown breakdown={card.breakdown}/>
          {card.totals && <Link href="/finance/statements" className="muted text-xs">Faturas abertas, histórico quitado e previsões →</Link>}
          {actions}
        </section>;
      }
      return <section className="stack bank-product" key={a.id} id={`conta-${a.id}`}><div className="row justify-between"><h3>{a.name}</h3><strong>{money(a.balanceCents)}</strong></div><small className="muted">{a.type === "SAVINGS" ? "Cofrinho / poupança · reserva separada" : a.type === "CHECKING" ? "Conta corrente · saldo para débito" : a.type === "DIGITAL_WALLET" ? "Carteira digital" : a.type === "INVESTMENT" ? "Investimento" : a.type === "CASH" ? "Dinheiro" : "Outra conta"}</small>{actions}</section>;
    })}</article>)}{s.accounts.filter(isUnassignedAccount).map((a) => <article className="panel stack" key={a.id}><h2>{a.name}</h2><p className="muted">Transações aguardando vínculo</p><Link href="/finance/transactions">Vincular lançamentos →</Link></article>)}{!s.accounts.length && <div className="panel"><EmptyState title="Crie sua primeira conta" description="Ela será a origem dos seus lançamentos e importações."/></div>}</div>
    <section className="panel stack"><div className="row justify-between"><div><h2>Categorias</h2><p className="muted">Personalize classificação e regras.</p></div><div className="row"><Modal title="Criar categoria" trigger="Nova categoria"><CategoryForm categories={categories}/></Modal>{!categories.length && <ActionForm action={createDefaultCategories}><button className="button-secondary">Adicionar categorias iniciais</button></ActionForm>}</div></div><div className="row">{categories.map((category) => <span className="badge" key={category.id} style={{ borderColor: category.color }}>{category.name} · {category.type}</span>)}</div></section>
  </div></FinancePrivacyBoundary>;
}
