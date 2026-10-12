"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { applyFinancialStatementSnapshot } from "./document-import-actions";
import { moneyInput } from "./money";

export type SnapshotStatement = { id: string; accountId: string; label: string; version: string };
export function FinancialSnapshotForm({ document, statements, onSaved }: { document: { id: string; accountId: string; fileName: string; metadata: Record<string, unknown> }; statements: SnapshotStatement[]; onSaved: () => void }) {
  const [pending, start] = useTransition(), [selected, setSelected] = useState(""), router = useRouter();
  const metadata = document.metadata, dueDate = typeof metadata.dueDate === "string" ? metadata.dueDate : "", amount = typeof metadata.amountCents === "number" ? metadata.amountCents : null;
  function save(fd: FormData) {
    fd.set("sourceId", document.id); fd.set("version", statements.find(s => s.id === selected)?.version || "");
    start(async () => { const result = await applyFinancialStatementSnapshot(fd); if ("error" in result) toast.error(result.error); else { toast.success(result.success); router.refresh(); onSaved(); } });
  }
  return <details><summary>Conciliar total da fatura: {document.fileName}</summary><p className="muted">Confira o total no original. O detalhamento pode ser parcial. Escolha a fatura existente para preservar seu ID; versões antigas e duplicidades serão bloqueadas.</p>
    <form action={save} className="stack"><div className="form-grid"><label>Fatura existente<select name="statementId" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Nova fatura, sem correspondente</option>{statements.filter(s => s.accountId === document.accountId).map(s => <option value={s.id} key={s.id}>{s.label}</option>)}</select></label>
      <label>Valor do snapshot<input name="amount" required defaultValue={amount === null ? "" : moneyInput(amount)}/></label><label>Competência<input name="referenceMonth" type="month" required defaultValue={dueDate.slice(0, 7)}/></label>
      <label>Vencimento confirmado<input name="dueDate" type="date" defaultValue={dueDate}/><small>Obrigatório para faturas abertas; deixe vazio se a data exata não consta de um futuro ou histórico pago.</small></label><label>Data de referência do documento<input name="asOfDate" type="date" required defaultValue={typeof metadata.asOfDate === "string" ? metadata.asOfDate : ""}/></label>
      <label>Situação<select name="status" defaultValue="OPEN"><option value="OPEN">Aberta / parcialmente paga</option><option value="PAID">Quitada, confirmada na fonte</option><option value="FUTURE_KNOWN">Futura com valor conhecido</option></select></label>
    </div><label className="row"><input type="checkbox" name="amountIsOutstanding" defaultChecked/>Este valor já é o saldo atual informado pelo banco, após pagamentos e saldo anterior.</label><small className="muted">Para o total original de uma fatura histórica parcialmente paga, desmarque: os pagamentos vinculados serão descontados dessa base.</small>
    <label className="row"><input name="linkPurchases" type="checkbox" defaultChecked/>Vincular compras ainda sem fatura deste arquivo como já incluídas no total. Pagamentos exigem conferir sua fatura de destino separadamente.</label>
    <label className="row"><input name="verified" type="checkbox" required/>Conferi valor, situação e datas no original.</label><button className="button-secondary" disabled={pending}>Confirmar snapshot da fatura</button></form>
  </details>;
}
