"use client";

import { StickyNote, Trash2 } from "lucide-react";
import { GridSelect } from "@/components/ui/GridSelect";
import type { FinanceGridRow } from "./FinanceDataGrid";
import { NOTE_MAX, hasNote, notePreview } from "./transaction-notes";

type Option = { id: string; name: string };
const typeOptions = [{ value: "EXPENSE", label: "Despesa" }, { value: "INCOME", label: "Receita" }, { value: "REFUND", label: "Reembolso" }, { value: "ADJUSTMENT", label: "Ajuste" }];

/** "Lista" view. Saved rows expand to show their details and note; unsaved drafts are editable cards
 * placed first, so a new transaction is never added out of sight. */
export function LedgerView({ rows, accounts, categories, timeZone, invalid, onUpdate, onRemoveDraft }: {
  rows: FinanceGridRow[]; accounts: Option[]; categories: Option[]; timeZone: string; invalid: ReadonlyMap<string, string>;
  onUpdate: (id: string, key: string, value: string) => void; onRemoveDraft: (id: string) => void;
}) {
  const accountName = (id?: string) => accounts.find((account) => account.id === id)?.name || "Sem conta";
  const categoryName = (id?: string) => categories.find((category) => category.id === id)?.name || "Sem categoria";
  const moment = (iso?: string) => (iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(iso)) : "—");
  const amountClass = (type: string) => (type === "INCOME" ? "text-success" : type === "EXPENSE" ? "text-danger" : "");
  return <div key="ledger" className="panel finance-ledger-view">
    {rows.map((row) => row.draft
      ? <article className="ledger-draft" key={row.id} data-draft data-invalid={invalid.has(row.id) || undefined}>
        <header><strong>Nova transação</strong><span className="badge">Não salvo</span><button type="button" className="icon-button" onClick={() => onRemoveDraft(row.id)} aria-label="Descartar este rascunho"><Trash2 size={15}/></button></header>
        <div className="form-grid">
          <label>Data<input type="date" value={row.date} onChange={(event) => onUpdate(row.id, "date", event.target.value)}/></label>
          <label>Descrição<input data-row-id={row.id} data-field="description" value={row.description} maxLength={300} placeholder="Ex.: Uber, 99, iFood…" onChange={(event) => onUpdate(row.id, "description", event.target.value)}/></label>
          <label>Valor<input data-row-id={row.id} data-field="amount" inputMode="decimal" value={row.amount} placeholder="0,00" onChange={(event) => onUpdate(row.id, "amount", event.target.value)}/></label>
          <label>Tipo<GridSelect label="Tipo" value={row.type} options={typeOptions} onValueChange={(value) => onUpdate(row.id, "type", value)}/></label>
          <label>Conta<GridSelect label="Conta" value={row.accountId || ""} options={[{ value: "", label: "Sem conta · definir depois" }, ...accounts.map((option) => ({ value: option.id, label: option.name }))]} onValueChange={(value) => onUpdate(row.id, "accountId", value)}/></label>
          <label>Categoria<GridSelect label="Categoria" value={row.categoryId || ""} options={[{ value: "", label: "Sem categoria" }, ...categories.map((option) => ({ value: option.id, label: option.name }))]} onValueChange={(value) => onUpdate(row.id, "categoryId", value)}/></label>
          <label className="ledger-wide">Observação (opcional)<textarea rows={2} maxLength={NOTE_MAX} value={row.notes ?? ""} onChange={(event) => onUpdate(row.id, "notes", event.target.value)} placeholder="Ex.: dividido com Alexandre"/></label>
        </div>
        {invalid.has(row.id) && <p role="alert" className="form-error">{invalid.get(row.id)}</p>}
      </article>
      : <details className="ledger-row" key={row.id} data-invalid={invalid.has(row.id) || undefined}>
        <summary className="list-item">
          <div><h3>{row.description}</h3><small>{row.date} · {accountName(row.accountId)} · {categoryName(row.categoryId)}</small>{hasNote(row.notes) && <small className="ledger-note-preview"><StickyNote size={12} aria-hidden="true"/>{notePreview(row.notes, 90)}</small>}</div>
          <div className="text-right"><strong className={amountClass(row.type)}>{row.type === "EXPENSE" ? "− " : "+ "}{row.amount}</strong><small className="block">{row.originLabel || row.source}</small></div>
        </summary>
        <div className="ledger-details">
          <dl className="transaction-facts">
            <div><dt>Estabelecimento</dt><dd>{row.merchant || "—"}</dd></div>
            <div><dt>Tags</dt><dd>{row.tags || "—"}</dd></div>
            <div><dt>Criado em</dt><dd>{moment(row.createdAt)}</dd></div>
            <div><dt>Atualizado em</dt><dd>{moment(row.updatedAt)}</dd></div>
          </dl>
          <label>Observação (opcional)<textarea rows={3} maxLength={NOTE_MAX} value={row.notes ?? ""} onChange={(event) => onUpdate(row.id, "notes", event.target.value)} placeholder="Ex.: dividido com Alexandre"/></label>
          <small className="muted">A observação entra na fila e é gravada ao clicar em “Salvar”.</small>
        </div>
      </details>)}
    {!rows.length && <p className="empty-state muted">Nenhuma transação encontrada.</p>}
  </div>;
}
