"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/ui/ActionForm";
import { formatDay } from "@/lib/dates";
import { saveAccount } from "./actions";
import { money } from "./money";

export type AccountFormValue = { id: string; name: string; type: string; institution: string | null; initialBalanceCents: number; creditLimitCents: number | null; closingDay: number | null; dueDay: number | null };
/** The bill being paid now. Its dates belong to the statement, not to the card's recurring cycle. */
export type AccountStatementInfo = { id: string; amountCents: number; closingDate: string | null; closingDay: number | null; dueDate: string; overdue: boolean };
export type AccountCycleSuggestion = { closingDay: number | null; dueDay: number | null; statements: number };

const types = [["CHECKING", "Conta corrente"], ["SAVINGS", "Poupança / cofrinho"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["INVESTMENT", "Investimento"], ["DIGITAL_WALLET", "Carteira digital"], ["OTHER", "Outro"]];
const moneyValue = (value?: number | null) => (value == null ? "" : (value / 100).toFixed(2).replace(".", ","));
const day = (value: string) => formatDay(value, "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AccountForm({ account, statement, cycle, defaults }: { account?: AccountFormValue; statement?: AccountStatementInfo | null; cycle?: AccountCycleSuggestion | null; defaults?: { name: string; institution: string; type: string } }) {
  const [type, setType] = useState(account?.type || defaults?.type || "CHECKING");
  const [closingDay, setClosingDay] = useState(account?.closingDay ? String(account.closingDay) : "");
  const [dueDay, setDueDay] = useState(account?.dueDay ? String(account.dueDay) : "");
  const isCard = type === "CREDIT_CARD";
  const suggested = { closing: cycle?.closingDay ? String(cycle.closingDay) : "", due: cycle?.dueDay ? String(cycle.dueDay) : "" };
  const offerSuggestion = isCard && cycle && (!account?.closingDay || !account?.dueDay) && (suggested.closing || suggested.due) && (suggested.closing !== closingDay || suggested.due !== dueDay);
  const statementClosing = statement?.closingDate ? day(statement.closingDate) : statement?.closingDay ? `dia ${statement.closingDay} (mês não informado)` : "não informado";
  return <ActionForm action={saveAccount} className="account-form" resetOnSuccess={!account}>
    {account && <input type="hidden" name="id" value={account.id}/>}
    <fieldset className="account-form-section">
      <legend>{isCard ? "Dados do cartão" : "Dados da conta"}</legend>
      <div className="form-grid">
        <label>Nome<input name="name" defaultValue={account?.name ?? defaults?.name} required maxLength={200}/></label>
        <label>Tipo<select name="type" value={type} onChange={(event) => setType(event.target.value)}>{types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Instituição<input name="institution" defaultValue={account?.institution ?? defaults?.institution ?? ""}/></label>
        {isCard
          ? <label>Limite de crédito<input name="creditLimit" inputMode="decimal" defaultValue={moneyValue(account?.creditLimitCents)} placeholder="Não informado"/></label>
          : <label>{account ? "Saldo inicial" : "Saldo atual ao cadastrar"}<input name="initialBalance" inputMode="decimal" defaultValue={moneyValue(account?.initialBalanceCents ?? 0)} required/><small className="muted">{account ? "Base anterior aos lançamentos registrados; não é o saldo atual." : "Use o saldo de hoje. Registre apenas movimentações posteriores para não contar valores duas vezes."}</small></label>}
      </div>
    </fieldset>
    {isCard && <fieldset className="account-form-section">
      <legend>Ciclo recorrente</legend>
      <p className="muted text-xs">Dias habituais do cartão. Mudar aqui não altera as datas das faturas já registradas.</p>
      <div className="form-grid">
        <label>Fechamento habitual<input name="closingDay" type="number" min={1} max={31} value={closingDay} onChange={(event) => setClosingDay(event.target.value)} placeholder="Dia"/></label>
        <label>Vencimento habitual<input name="dueDay" type="number" min={1} max={31} value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="Dia"/></label>
      </div>
      {offerSuggestion && <div className="account-form-suggestion" role="note">
        <span>{statement ? `Fatura registrada: fechamento ${statementClosing} e vencimento ${day(statement.dueDate)}. ` : ""}Nas {cycle!.statements} faturas do cartão, o padrão é {suggested.closing ? `fechar dia ${suggested.closing}` : "fechamento não informado"}{suggested.due ? ` e vencer dia ${suggested.due}` : ""}.</span>
        <button type="button" className="button-secondary" onClick={() => { if (suggested.closing) setClosingDay(suggested.closing); if (suggested.due) setDueDay(suggested.due); }}>Usar como padrão</button>
      </div>}
    </fieldset>}
    {isCard && statement && <section className="account-form-section account-form-statement" aria-label="Fatura atual">
      <h3>Fatura atual</h3>
      <dl>
        <div><dt>Valor</dt><dd>{money(statement.amountCents)}</dd></div>
        <div><dt>Fechamento</dt><dd>{statementClosing}</dd></div>
        <div><dt>Vencimento</dt><dd>{day(statement.dueDate)}</dd></div>
        <div><dt>Status</dt><dd><span className="statement-chip" data-tone={statement.overdue ? "danger" : "open"}>{statement.overdue ? "Vencida" : "Aberta"}</span></dd></div>
      </dl>
      <small className="muted">Datas desta fatura vêm do registro importado e não mudam ao editar o cartão. <Link href={`/finance/statements#fatura-${statement.id}`}>Ver fatura completa</Link></small>
    </section>}
    {isCard && <details className="account-form-advanced"><summary>Ajuste avançado</summary>
      <label>Saldo inicial da fatura<input name="initialBalance" inputMode="decimal" defaultValue={moneyValue(account?.initialBalanceCents ?? 0)} required/></label>
      <small className="muted">Usado só para lançamentos anteriores ao TBB. Faturas importadas não dependem dele.</small>
    </details>}
    <button className="button" type="submit">Salvar</button>
  </ActionForm>;
}
