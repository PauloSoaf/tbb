"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileJson } from "lucide-react";
import { toast } from "sonner";
import { formatDay } from "@/lib/dates";
import { confirmCardStatements, previewCardStatements } from "./actions";
import type { CardStatementImportReport } from "./card-statement-import";
import { money } from "./money";

const actionLabel = { CREATE: "Criar", UPDATE: "Atualizar", KEEP: "Manter", CONFLICT: "Conflito" } as const;
const typeLabel = { PAST_STATEMENT: "Histórico", CURRENT_STATEMENT: "Atual", FUTURE_STATEMENT: "Futura conhecida", FUTURE_MONTHLY_PROJECTION: "Previsão mensal" } as const;
const statusLabel = { PAID: "Paga", OPEN: "Aberta", FUTURE_KNOWN: "Futura", FORECAST: "Prevista" } as const;
const day = (value: string | null) => (value ? formatDay(value, "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

export function CardStatementImport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<CardStatementImportReport | null>(null);
  const [acceptConflicts, setAcceptConflicts] = useState(false);

  function preview(next: File) {
    setFile(next); setReport(null); setAcceptConflicts(false);
    const fd = new FormData(); fd.set("file", next);
    startTransition(async () => {
      const result = await previewCardStatements(fd);
      if ("error" in result) toast.error(result.error); else setReport(result.report);
    });
  }
  function reset() { setFile(null); setReport(null); setAcceptConflicts(false); }
  function confirm() {
    if (!file || !report?.fingerprint) return;
    const fd = new FormData(); fd.set("file", file); fd.set("fingerprint", report.fingerprint);
    if (acceptConflicts) fd.set("acceptConflicts", "on");
    startTransition(async () => {
      const result = await confirmCardStatements(fd);
      if ("error" in result) toast.error(result.error);
      else { toast.success(`Importação concluída: ${result.success}`); reset(); router.refresh(); }
    });
  }

  const totals = report?.totals, counts = report?.counts;
  return <section className="panel stack" aria-busy={pending}>
    <div className="row justify-between"><div><h2>Importar faturas (JSON)</h2><p className="muted">A prévia não grava nada. Os dados entram somente neste espaço, da sua sessão; o arquivo não é armazenado.</p></div><FileJson/></div>
    <label className="button-secondary" style={{ width: "fit-content" }}>{file ? `Trocar arquivo · ${file.name}` : "Escolher arquivo JSON"}<input className="sr-only" type="file" accept=".json,application/json" disabled={pending} onChange={(event) => { const next = event.target.files?.[0]; event.target.value = ""; if (next) preview(next); }}/></label>
    {pending && <p role="status" className="muted text-xs">Processando…</p>}

    {report && <>
      {report.errors.length > 0 && <div role="alert" className="stack" style={{ gap: 4 }}>
        <strong className="form-error">Nada será importado até corrigir:</strong>
        <ul>{report.errors.map((error) => <li key={error} className="form-error">{error}</li>)}</ul>
      </div>}
      {counts && <div className="stat-grid">
        <div className="stat-card"><span>Serão criadas</span><strong>{counts.create}</strong></div>
        <div className="stat-card"><span>Serão atualizadas</span><strong>{counts.update}</strong></div>
        <div className="stat-card"><span>Mantidas como estão</span><strong>{counts.keep}</strong></div>
        <div className="stat-card"><span>Conflitos (preservados)</span><strong>{counts.conflict}</strong></div>
      </div>}
      {totals && <div className="stack" style={{ gap: 6 }}>
        <h3>Conferência do arquivo · data-base {day(report.asOfDate)}</h3>
        <p><strong>{totals.recordCount}</strong> registros · cartões: {report.accounts.map((account) => `${account.issuer} (${account.action === "REUSE" ? `usa “${account.accountName}”` : "novo cartão"})`).join(", ")}</p>
        <p>Dívida atual (abertas): <strong>{money(totals.currentOutstandingCents)}</strong> · {totals.openCount} fatura(s), vencem {totals.dueDates.map(day).join(" · ")}</p>
        <p>Histórico quitado: {totals.paidCount} fatura(s), {money(totals.paidHistoricCents)} em valor histórico ({totals.paidZeroCount} de R$ 0,00) · não é dívida</p>
        <p>Futuras conhecidas: {totals.futureKnownCount} · {money(totals.futureKnownCents)}</p>
        <p>Previsões mensais: {totals.forecastCount} · {money(totals.forecastCents)}{totals.forecastPendingCents ? `, das quais ${money(totals.forecastPendingCents)} pendentes de conciliação (fora dos totais)` : ""}</p>
        {report.afterImport && <p className="muted">Depois de importar, a dívida atual deste espaço será {money(report.afterImport.openCents)}.{report.untouchedExisting ? ` ${report.untouchedExisting} fatura(s) já salvas fora do arquivo continuam intactas.` : ""}</p>}
      </div>}
      {report.items.length > 0 && <div className="table-wrap"><table><thead><tr><th>Ação</th><th>Cartão</th><th>Tipo</th><th>Vencimento ou competência</th><th>Valor</th><th>Status</th><th>Detalhe</th></tr></thead><tbody>
        {report.items.map((item) => <tr key={item.externalKey}>
          <td><span className="badge">{actionLabel[item.action]}</span></td><td>{item.issuer}</td><td>{typeLabel[item.recordType]}</td>
          <td>{item.dueDate ? day(item.dueDate) : `${item.referenceMonth} · sem vencimento`}</td><td>{money(item.amountCents)}</td><td>{statusLabel[item.status]}</td>
          <td>{[item.reason, item.changes.length ? `Muda: ${item.changes.join(", ")}` : "", item.pendingReconciliation ? "Pendente de conciliação" : "", item.status === "PAID" && !item.paidAt ? "Pagamento sem data informada" : ""].filter(Boolean).join(" · ") || "—"}</td>
        </tr>)}
      </tbody></table></div>}
      {counts && counts.conflict > 0 && <label className="row" style={{ flexDirection: "row" }}><input type="checkbox" checked={acceptConflicts} onChange={(event) => setAcceptConflicts(event.target.checked)}/>Manter os {counts.conflict} registro(s) em conflito como já estão salvos</label>}
      <div className="row justify-between">
        <button type="button" className="button-secondary" onClick={reset} disabled={pending}>Cancelar</button>
        <button type="button" className="button" onClick={confirm} disabled={pending || !report.ok || !report.fingerprint || (!!counts?.conflict && !acceptConflicts) || !!(counts && counts.create + counts.update === 0)}>
          {counts && counts.create + counts.update === 0 ? "Nada a importar" : `Confirmar importação (${(counts?.create || 0) + (counts?.update || 0)})`}
        </button>
      </div>
    </>}
  </section>;
}
