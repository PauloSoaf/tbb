"use client";
import { ActionForm } from "@/components/ui/ActionForm";
import { reconcileAccountBalance } from "./actions";

export function AccountBalanceForm({ id, balanceCents }: { id: string; balanceCents: number }) {
  return <ActionForm action={reconcileAccountBalance} className="stack"><input type="hidden" name="id" value={id}/><label>Saldo atual informado pelo banco<input name="balance" inputMode="decimal" required defaultValue={(balanceCents / 100).toFixed(2).replace(".", ",")}/></label><p className="muted">A diferença será registrada como ajuste de saldo hoje. Seus lançamentos anteriores e o saldo inicial serão preservados. Use o saldo deste produto, sem incluir limite de crédito ou saldos de outros produtos.</p><button className="button" type="submit">Atualizar saldo</button></ActionForm>;
}
