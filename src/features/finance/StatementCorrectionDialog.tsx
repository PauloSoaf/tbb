"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/ui/ActionForm";
import { correctCardStatement } from "./statement-actions";
import { money } from "./money";

export type EditableStatement = {
  id: string; accountId: string; accountName: string; kind: string; version: string;
  declaredCents: number; addedCents: number; dueDate: string | null;
  closingDate: string | null; closingDay: number | null; referenceMonth: string | null; notes: string | null;
};

export function StatementCorrectionDialog({ statement, compact = false }: { statement: EditableStatement; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const projection = statement.kind === "MONTHLY_PROJECTION";
  const [form, setForm] = useState({ dueDate: statement.dueDate || "", closingDate: statement.closingDate || "", closingDay: String(statement.closingDay || ""), referenceMonth: statement.referenceMonth || "", amount: (statement.declaredCents / 100).toFixed(2).replace(".", ","), notes: statement.notes || "" });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <>
    <button type="button" className={compact ? "icon-button" : "button-secondary"} aria-label={`Corrigir fatura de ${statement.accountName}${statement.dueDate ? `, vencimento ${statement.dueDate}` : ""}`} onClick={() => dialog.current?.showModal()}><Pencil size={15}/>{!compact && "Corrigir fatura"}</button>
    <dialog ref={dialog} className="modal statement-correction-dialog" aria-labelledby={`correction-title-${statement.id}-${compact}`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="modal-content">
        <div className="row justify-between"><h2 id={`correction-title-${statement.id}-${compact}`}>Corrigir fatura · {statement.accountName}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => dialog.current?.close()}><X size={18}/></button></div>
        <p className="muted">Corrija os dados deste registro. O ciclo habitual do cartão é editado separadamente.</p>
        <ActionForm action={async fd => { const result = await correctCardStatement(fd); if (!result.error) { dialog.current?.close(); router.refresh(); } return result; }} className="stack" resetOnSuccess={false}>
          <input type="hidden" name="id" value={statement.id}/><input type="hidden" name="version" value={statement.version}/>
          <div className="form-grid">
            {!projection && <><label>Vencimento desta fatura<input name="dueDate" type="date" value={form.dueDate} onChange={event => update("dueDate", event.target.value)} required/></label><label>Fechamento desta fatura<input name="closingDate" type="date" value={form.closingDate} onChange={event => update("closingDate", event.target.value)}/></label><label>Dia de fechamento, se a data for desconhecida<input name="closingDay" type="number" min={1} max={31} value={form.closingDay} onChange={event => update("closingDay", event.target.value)}/><small className="muted">A data completa tem prioridade sobre o dia.</small></label></>}
            <label>Competência<input name="referenceMonth" type="month" value={form.referenceMonth} onChange={event => update("referenceMonth", event.target.value)} required={projection}/></label>
            <label>Valor declarado pelo banco<input name="amount" inputMode="decimal" value={form.amount} onChange={event => update("amount", event.target.value)} required/></label>
          </div>
          {statement.addedCents > 0 && <p className="muted">{money(statement.addedCents)} de compras somadas permanecem acrescidos ao valor declarado.</p>}
          <label>Observação<textarea name="notes" value={form.notes} onChange={event => update("notes", event.target.value)} maxLength={2000}/></label>
          <p className="muted text-xs">O fechamento não pode ser depois do vencimento. Confira mês e ano. A correção preserva os gastos vinculados e não cria uma nova fatura.</p>
          <div className="row justify-between"><Link className="button-secondary" href={`/finance/accounts?edit=${statement.accountId}`}>Editar cartão</Link><button className="button" type="submit">Salvar correção</button></div>
        </ActionForm>
      </div>
    </dialog>
  </>;
}
