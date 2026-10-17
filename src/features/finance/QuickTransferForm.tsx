"use client";
import { useEffect, useRef, useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { transferBetweenAccounts } from "./actions";
import { POSSIBLE_DUPLICATE_PREFIX, sortCashAccounts, type CashAccount } from "./balance-sync";
import { money } from "./money";

/** A PIX between the person's own accounts: moves the balance, and is neither income nor spending. */
export function QuickTransferForm({ accounts, today }: { accounts: CashAccount[]; today: string }) {
  const list = sortCashAccounts(accounts);
  const options = list.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.balanceCents)}</option>);
  // Controlled on purpose: React clears uncontrolled fields after every form action, even a refused one, and a refusal
  // must not make the person type the accounts and the amount again.
  const empty = { from: "", to: "", amount: "", date: today, description: "", sure: false };
  const [values, setValues] = useState(empty);
  const [confirming, setConfirming] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scope.current;
    const clear = () => { setValues({ from: "", to: "", amount: "", date: today, description: "", sure: false }); setConfirming(false); };
    // The native reset that follows every form action would also blank the selects of a refused request.
    const keep = (event: Event) => event.preventDefault();
    element?.addEventListener("tbb:form-success", clear);
    element?.addEventListener("reset", keep);
    return () => { element?.removeEventListener("tbb:form-success", clear); element?.removeEventListener("reset", keep); };
  }, [today]);
  const set = (patch: Partial<typeof empty>) => setValues((current) => ({ ...current, ...patch }));
  // A refused duplicate unlocks an explicit confirmation instead of silently double counting the PIX.
  const action = async (data: FormData) => {
    const result = await transferBetweenAccounts(data);
    setConfirming("error" in result && result.error.startsWith(POSSIBLE_DUPLICATE_PREFIX));
    return result;
  };
  return <div ref={scope} className="balance-sync">
    <ActionForm action={action} className="balance-sync" resetOnSuccess={false}>
      <p className="muted text-sm">Mandou dinheiro de uma conta sua para outra? Registre aqui. O saldo das duas contas muda e nada entra como gasto ou receita.</p>
      <div className="form-grid">
        <label>Saiu de<select name="fromAccountId" required value={values.from} onChange={(event) => set({ from: event.target.value })}><option value="" disabled>Escolha a conta</option>{options}</select></label>
        <label>Entrou em<select name="toAccountId" required value={values.to} onChange={(event) => set({ to: event.target.value })}><option value="" disabled>Escolha a conta</option>{options}</select></label>
        <label>Valor<input name="amount" inputMode="decimal" required autoComplete="off" placeholder="30,00" value={values.amount} onChange={(event) => set({ amount: event.target.value })}/></label>
        <label>Data<input name="date" type="date" max={today} required value={values.date} onChange={(event) => set({ date: event.target.value })}/></label>
      </div>
      <label>Observação (opcional)<input name="description" maxLength={200} autoComplete="off" placeholder="Ex.: PIX para o Nubank" value={values.description} onChange={(event) => set({ description: event.target.value })}/></label>
      {confirming && <label className="balance-sync-pair"><input type="checkbox" name="confirmDuplicate" checked={values.sure} onChange={(event) => set({ sure: event.target.checked })}/><span><strong>É outro movimento</strong><small>Registrar mesmo existindo uma entrada ou saída de valor igual nesses dias.</small></span></label>}
      <button className="button" type="submit">Registrar transferência</button>
    </ActionForm>
  </div>;
}
