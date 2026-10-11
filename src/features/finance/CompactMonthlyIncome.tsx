"use client";
import { CalendarClock, PencilLine } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { receiveMonthlyIncome, saveMonthlyIncome } from "./actions";
import { money, moneyInput } from "./money";

type Account = { id: string; name: string };
export function CompactMonthlyIncome({ accounts, today, amountCents, accountId, accountName, payDay, legacy }: { accounts: Account[]; today: string; amountCents: number; accountId: string; accountName: string | null; payDay: number | null; legacy: boolean }) {
  return <section id="renda" className="finance-income-compact" data-configured={amountCents>0||undefined}>
    <div className="finance-income-leading"><span className="finance-income-icon"><CalendarClock size={18}/></span><div><span>Renda mensal prevista</span><strong>{money(amountCents)}</strong></div></div>
    <div className="finance-income-context"><span>Referência para planejar o mês. Ainda não é dinheiro recebido.</span><small>{payDay?`Prevista para dia ${payDay} · `:""}Conta: <b>{accountName||"Escolha uma conta de dinheiro"}</b></small>{legacy&&<small>Previsão anterior preservada. Confirme o recebimento somente quando o dinheiro entrar.</small>}</div>
    <div className="row"><Modal title="Renda mensal prevista" trigger={<><PencilLine size={15}/>Editar previsão</>}><ActionForm action={saveMonthlyIncome} className="stack"><label>Valor previsto<input name="amount" inputMode="decimal" defaultValue={moneyInput(amountCents)} required/></label><label>Dia previsto de recebimento<input name="payDay" type="number" min={1} max={31} defaultValue={payDay||undefined}/></label><label>Conta para receber<select name="accountId" defaultValue={accountId}><option value="">Não definida</option>{accounts.map((a)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><p className="muted">Salvar esta previsão não cria uma receita nem muda o saldo das contas.</p><button type="submit" className="button">Salvar previsão</button></ActionForm></Modal>
    <Modal title="Confirmar dinheiro recebido" trigger="Registrar recebimento"><ActionForm action={receiveMonthlyIncome} className="stack"><label>Valor recebido<input name="amount" inputMode="decimal" defaultValue={amountCents?moneyInput(amountCents):""} required/></label><label>Data do recebimento<input name="date" type="date" defaultValue={today} max={today} required/></label><label>Conta que recebeu<select name="accountId" defaultValue={accountId} required><option value="">Selecione</option>{accounts.map((a)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><p className="muted">Use quando o dinheiro já estiver na conta. Não registre novamente se o recebimento já estiver no extrato.</p><button type="submit" className="button">Confirmar recebimento</button></ActionForm></Modal></div>
  </section>;
}
