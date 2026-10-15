"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { FinanceGridRow } from "./FinanceDataGrid";
import { NOTE_MAX } from "./transaction-notes";

type Option = { id: string; name: string };
const typeLabel: Record<string, string> = { EXPENSE: "Despesa", INCOME: "Receita", REFUND: "Reembolso", ADJUSTMENT: "Ajuste" };

/** One dialog for the whole grid: opens on the chosen row and edits the same queue as the grid, so
 * nothing is stored until the user presses "Salvar" there. */
export function TransactionDetailsDrawer({ row, accounts, categories, timeZone, onChange, onClose }: {
  row: FinanceGridRow | null; accounts: Option[]; categories: Option[]; timeZone: string;
  onChange: (id: string, key: string, value: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = row?.id;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (id && !element.open) element.showModal();
    if (!id && element.open) element.close();
  }, [id]);
  const moment = (iso?: string) => (iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(iso)) : "—");
  const noteLength = row?.notes?.length ?? 0;
  return <dialog ref={dialog} className="modal drawer transaction-details" aria-labelledby="transaction-details-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    {row && <div className="modal-content">
      <div className="row justify-between"><h2 id="transaction-details-title">Detalhes do lançamento</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => dialog.current?.close()}><X size={18}/></button></div>
      <p className="muted text-xs">{row.draft ? "Rascunho ainda não salvo. " : ""}As alterações entram na fila da grade e só são gravadas ao clicar em “Salvar”. Observação, estabelecimento e tags não alteram valor, conta, categoria nem data.</p>
      <dl className="transaction-facts">
        <div><dt>Data</dt><dd>{row.date || "—"}</dd></div>
        <div><dt>Valor</dt><dd>{row.type === "EXPENSE" ? "− " : "+ "}{row.amount || "—"}</dd></div>
        <div><dt>Tipo</dt><dd>{typeLabel[row.type] ?? row.type}</dd></div>
        <div><dt>Conta</dt><dd>{accounts.find((account) => account.id === row.accountId)?.name || "Sem conta"}</dd></div>
        <div><dt>Categoria</dt><dd>{categories.find((category) => category.id === row.categoryId)?.name || "Sem categoria"}</dd></div>
        <div><dt>Origem</dt><dd>{row.draft ? "Rascunho" : row.source}</dd></div>
        {!row.draft && <><div><dt>Criado em</dt><dd>{moment(row.createdAt)}</dd></div><div><dt>Atualizado em</dt><dd>{moment(row.updatedAt)}</dd></div></>}
      </dl>
      <div className="form-grid">
        <label>Descrição<input value={row.description} maxLength={300} onChange={(event) => onChange(row.id, "description", event.target.value)}/></label>
        <label>Estabelecimento<input value={row.merchant ?? ""} maxLength={200} onChange={(event) => onChange(row.id, "merchant", event.target.value)}/></label>
        <label className="transaction-details-wide">Tags<input value={row.tags ?? ""} maxLength={1000} onChange={(event) => onChange(row.id, "tags", event.target.value)} placeholder="separadas por vírgula"/></label>
        <label className="transaction-details-wide">Observação (opcional)
          <textarea value={row.notes ?? ""} rows={5} maxLength={NOTE_MAX} aria-describedby="transaction-note-count" onChange={(event) => onChange(row.id, "notes", event.target.value)} placeholder="Ex.: dividido com Alexandre"/>
          <small id="transaction-note-count" className="muted" aria-live="polite">{noteLength}/{NOTE_MAX}</small>
        </label>
      </div>
      <div className="row justify-between"><span className="muted text-xs">Esc fecha sem perder o que já foi digitado.</span><button type="button" className="button" onClick={() => dialog.current?.close()}>Concluir</button></div>
    </div>}
  </dialog>;
}
