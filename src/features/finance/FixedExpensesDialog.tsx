"use client";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { archiveFixedExpense, saveFixedExpense } from "./actions";
import { money, moneyInput } from "./money";

export type FixedExpenseRow = { id: string; name: string; amountCents: number; dueDay: number | null; notes: string | null; endsOn: string | null; cardAccountId: string | null };
export type CardOption = { id: string; name: string };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2032-12-02" → "dez/2032", written by hand so the server and the browser can never format it differently. */
export const shortMonth = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1] ?? "?"}/${day.slice(0, 4)}`;

function ExpenseForm({ expense, cards }: { expense?: FixedExpenseRow; cards: CardOption[] }) {
  return <ActionForm action={saveFixedExpense} className="stack">
    {expense && <input type="hidden" name="id" value={expense.id}/>}
    <label>Gasto mensal<input name="name" placeholder="Gasolina, alimentação, cabelo, diarista…" defaultValue={expense?.name} required maxLength={200}/></label>
    <label>Valor previsto por mês<input name="amount" inputMode="decimal" defaultValue={expense ? moneyInput(expense.amountCents) : ""} required/></label>
    <label>Dia previsto (opcional)<input name="dueDay" type="number" min={1} max={31} defaultValue={expense?.dueDay || undefined}/></label>
    <label>Termina em (opcional)<input name="endsOn" type="date" min="2000-01-01" max="2100-12-31" defaultValue={expense?.endsOn ?? ""}/>
      <small className="muted">Até o mês dessa data o gasto conta nas previsões e nos gráficos; depois, sai. Deixe em branco se ele não tem fim.</small></label>
    {cards.length > 0 && <label>Cobrado no cartão (opcional)
      <select name="cardAccountId" defaultValue={expense?.cardAccountId ?? ""}><option value="">Não é no cartão</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
      <small className="muted">Se esse gasto cai na fatura de um cartão, escolha o cartão. Nos gráficos ele é descontado da fatura, em vez de ser contado duas vezes.</small></label>}
    <label>Observações<textarea name="notes" defaultValue={expense?.notes || ""} maxLength={1000}/></label>
    <small className="muted">É uma previsão mensal, mesmo que você pretenda pagar no cartão. O pagamento real deve ser registrado quando acontecer.</small>
    <button className="button" type="submit">Salvar gasto fixo</button>
  </ActionForm>;
}

/** `currentMonth` ("2032-10") comes from the server so that "encerrado" is decided in the workspace's time zone. */
export function FixedExpensesDialog({ expenses, cards = [], currentMonth }: { expenses: FixedExpenseRow[]; cards?: CardOption[]; currentMonth: string }) {
  return <Modal title="Gastos fixos previstos" trigger="Registrar gastos fixos"><div className="stack"><ExpenseForm cards={cards}/><h3>Previsões cadastradas</h3>
    {!expenses.length && <p className="muted">Cadastre os gastos que você espera ter todo mês.</p>}
    {expenses.map((expense) => {
      const ended = expense.endsOn !== null && expense.endsOn.slice(0, 7) < currentMonth;
      const card = expense.cardAccountId ? cards.find((option) => option.id === expense.cardAccountId) : null;
      return <div key={expense.id} className="stack bank-product" data-ended={ended || undefined}>
        <div className="row justify-between"><strong>{expense.name}</strong><b>{money(expense.amountCents)}</b></div>
        <small className="muted">{expense.dueDay ? `Previsto para dia ${expense.dueDay}` : "Dia não definido"}
          {expense.endsOn ? ` · ${ended ? "encerrado em" : "termina em"} ${shortMonth(expense.endsOn)}` : ""}
          {expense.cardAccountId ? ` · ${card ? `cobrado no cartão ${card.name}` : "cartão arquivado"}` : ""}</small>
        <div className="row"><Modal title={`Editar · ${expense.name}`} trigger="Editar"><ExpenseForm expense={expense} cards={cards}/></Modal><ActionForm action={archiveFixedExpense}><input type="hidden" name="id" value={expense.id}/><button className="button-secondary">Remover previsão</button></ActionForm></div>
      </div>;
    })}</div></Modal>;
}
