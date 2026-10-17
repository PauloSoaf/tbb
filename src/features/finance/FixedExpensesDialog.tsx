"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { archiveFixedExpense, saveFixedExpense } from "./actions";
import { money, moneyInput } from "./money";

export type FixedExpenseRow = { id: string; name: string; amountCents: number; dueDay: number | null; notes: string | null; endsOn: string | null; cardAccountId: string | null;
  startsOn?: string | null; paymentMethod?: string; paymentAccountId?: string | null; beneficiary?: string | null; hasPixKey?: boolean;
  confirmationStatus?: string; amountIsEstimate?: boolean; expectedMinCents?: number | null; expectedMaxCents?: number | null; safetyMarginCents?: number; version?: number;
};
export type CardOption = { id: string; name: string };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2032-12-02" → "dez/2032", written by hand so the server and the browser can never format it differently. */
export const shortMonth = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1] ?? "?"}/${day.slice(0, 4)}`;

function ExpenseForm({ expense, cards, paymentAccounts }: { expense?: FixedExpenseRow; cards: CardOption[]; paymentAccounts: CardOption[] }) {
  const [method,setMethod]=useState(expense?.paymentMethod && expense.paymentMethod!=="UNKNOWN" ? expense.paymentMethod : expense?.cardAccountId ? "CREDIT_CARD" : "UNKNOWN");
  return <ActionForm action={saveFixedExpense} className="stack">
    {expense && <input type="hidden" name="id" value={expense.id}/>}
    {expense?.version && <input type="hidden" name="version" value={expense.version}/>}
    <label>Gasto mensal<input name="name" placeholder="Gasolina, alimentação, cabelo, diarista…" defaultValue={expense?.name} required maxLength={200}/></label>
    <label>Valor previsto por mês<input name="amount" inputMode="decimal" defaultValue={expense ? moneyInput(expense.amountCents) : ""} required/></label>
    <label>Dia previsto (opcional)<input name="dueDay" type="number" min={1} max={31} defaultValue={expense?.dueDay || undefined}/></label>
    <label>Começa em (opcional)<input name="startsOn" type="date" min="2000-01-01" max="2100-12-31" defaultValue={expense?.startsOn??""}/></label>
    <label>Termina em (opcional)<input name="endsOn" type="date" min="2000-01-01" max="2100-12-31" defaultValue={expense?.endsOn ?? ""}/>
      <small className="muted">Até o mês dessa data o gasto conta nas previsões e nos gráficos; depois, sai. Deixe em branco se ele não tem fim.</small></label>
    <label>Como será pago<select name="paymentMethod" value={method} onChange={event=>setMethod(event.target.value)}><option value="UNKNOWN">Não informado</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="PIX">PIX</option><option value="BANK_DEBIT">Débito em conta</option><option value="BOLETO">Boleto</option><option value="CASH">Dinheiro</option><option value="OTHER">Outro</option></select></label>
    {cards.length > 0 && <label>Cobrado no cartão (opcional)
      <select name="cardAccountId" disabled={method!=="CREDIT_CARD"} defaultValue={expense?.cardAccountId ?? ""} required={method==="CREDIT_CARD"}><option value="">Não é no cartão</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
      <small className="muted">A fatura mantém seu valor integral. Só uma compra vinculada comprova que este fixo já está incluído nela.</small></label>}
    {["PIX","BANK_DEBIT","BOLETO","OTHER"].includes(method)&&<label>Conta de origem (opcional)<select name="paymentAccountId" defaultValue={expense?.paymentAccountId??""}><option value="">Ainda não confirmada</option>{paymentAccounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
    {method==="PIX"&&<><label>Beneficiário (opcional)<input name="beneficiary" maxLength={200} defaultValue={expense?.beneficiary??""}/></label><label>Chave PIX (opcional)<input name="pixKey" autoComplete="off" maxLength={200} placeholder={expense?.hasPixKey?"Chave protegida cadastrada · preencha para substituir":"Não será usada para enviar dinheiro"}/></label>{expense?.hasPixKey&&<label><input type="checkbox" name="clearPixKey"/>Remover chave cadastrada</label>}</>}
    <details className="stack"><summary>Estimativa e margem de segurança</summary><label><input name="amountIsEstimate" type="checkbox" defaultChecked={expense?.amountIsEstimate}/>O valor é uma estimativa</label>
      <label>Mínimo esperado<input name="expectedMin" inputMode="decimal" defaultValue={expense?.expectedMinCents==null?"":moneyInput(expense.expectedMinCents)}/></label><label>Máximo esperado<input name="expectedMax" inputMode="decimal" defaultValue={expense?.expectedMaxCents==null?"":moneyInput(expense.expectedMaxCents)}/></label>
      <label>Margem adicional<input name="safetyMargin" inputMode="decimal" defaultValue={expense?.safetyMarginCents?moneyInput(expense.safetyMarginCents):""}/></label>
    </details>
    <label>Confirmação<select name="confirmationStatus" defaultValue={expense?.confirmationStatus??"CONFIRMED"}><option value="CONFIRMED">Previsão confirmada</option><option value="PENDING">Precisa de conferência</option></select></label>
    <label>Observações<textarea name="notes" defaultValue={expense?.notes || ""} maxLength={1000}/></label>
    {!expense && <label><input name="independent" type="checkbox"/>Se houver um compromisso semelhante, confirmo que são gastos independentes.</label>}
    <small className="muted">É uma previsão mensal, mesmo que você pretenda pagar no cartão. O pagamento real deve ser registrado quando acontecer.</small>
    <button className="button" type="submit">Salvar gasto fixo</button>
  </ActionForm>;
}

/** `currentMonth` ("2032-10") comes from the server so that "encerrado" is decided in the workspace's time zone. */
export function FixedExpensesDialog({ expenses, cards = [], paymentAccounts = [], currentMonth }: { expenses: FixedExpenseRow[]; cards?: CardOption[]; paymentAccounts?: CardOption[]; currentMonth: string }) {
  return <Modal title="Gastos fixos previstos" trigger="Registrar gastos fixos"><div className="stack"><ExpenseForm cards={cards} paymentAccounts={paymentAccounts}/><h3>Previsões cadastradas</h3>
    {!expenses.length && <p className="muted">Cadastre os gastos que você espera ter todo mês.</p>}
    {expenses.map((expense) => {
      const ended = expense.endsOn !== null && expense.endsOn.slice(0, 7) < currentMonth;
      const card = expense.cardAccountId ? cards.find((option) => option.id === expense.cardAccountId) : null;
      return <div key={expense.id} className="stack bank-product" data-ended={ended || undefined}>
        <div className="row justify-between"><strong>{expense.name}</strong><b>{money(expense.amountCents)}</b></div>
        <small className="muted">{expense.dueDay ? `Previsto para dia ${expense.dueDay}` : "Dia não definido"}
          {expense.endsOn ? ` · ${ended ? "encerrado em" : "termina em"} ${shortMonth(expense.endsOn)}` : ""}
          {expense.cardAccountId ? ` · ${card ? `cobrado no cartão ${card.name}` : "cartão arquivado"}` : ""}</small>
        <div className="row"><Modal title={`Editar · ${expense.name}`} trigger="Editar"><ExpenseForm expense={expense} cards={cards} paymentAccounts={paymentAccounts}/></Modal><ActionForm action={archiveFixedExpense}><input type="hidden" name="id" value={expense.id}/><button className="button-secondary">Remover previsão</button></ActionForm></div>
      </div>;
    })}</div></Modal>;
}
