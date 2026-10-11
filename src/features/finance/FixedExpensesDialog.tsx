"use client";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { archiveFixedExpense, saveFixedExpense } from "./actions";
import { money, moneyInput } from "./money";
type Expense={id:string;name:string;amountCents:number;dueDay:number|null;notes:string|null};
function ExpenseForm({expense}:{expense?:Expense}){
  return <ActionForm action={saveFixedExpense} className="stack">{expense&&<input type="hidden" name="id" value={expense.id}/>}<label>Gasto mensal<input name="name" placeholder="Gasolina, alimentação, cabelo, diarista…" defaultValue={expense?.name} required maxLength={200}/></label><label>Valor previsto por mês<input name="amount" inputMode="decimal" defaultValue={expense?moneyInput(expense.amountCents):""} required/></label><label>Dia previsto (opcional)<input name="dueDay" type="number" min={1} max={31} defaultValue={expense?.dueDay||undefined}/></label><label>Observações<textarea name="notes" defaultValue={expense?.notes||""} maxLength={1000}/></label><small className="muted">É uma previsão mensal, mesmo que você pretenda pagar no cartão. O pagamento real deve ser registrado quando acontecer.</small><button className="button" type="submit">Salvar gasto fixo</button></ActionForm>;
}
export function FixedExpensesDialog({expenses}:{expenses:Expense[]}){
  return <Modal title="Gastos fixos previstos" trigger="Registrar gastos fixos"><div className="stack"><ExpenseForm/><h3>Previsões cadastradas</h3>{!expenses.length&&<p className="muted">Cadastre os gastos que você espera ter todo mês.</p>}{expenses.map((expense)=><div key={expense.id} className="stack bank-product"><div className="row justify-between"><strong>{expense.name}</strong><b>{money(expense.amountCents)}</b></div><small className="muted">{expense.dueDay?`Previsto para dia ${expense.dueDay}`:"Dia não definido"}</small><div className="row"><Modal title={`Editar · ${expense.name}`} trigger="Editar"><ExpenseForm expense={expense}/></Modal><ActionForm action={archiveFixedExpense}><input type="hidden" name="id" value={expense.id}/><button className="button-secondary">Remover previsão</button></ActionForm></div></div>)}</div></Modal>;
}
