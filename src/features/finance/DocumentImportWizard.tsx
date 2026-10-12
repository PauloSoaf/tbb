"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileCheck, RefreshCw } from "lucide-react";
import { appendFinancialTranscription, confirmFinancialReview, refreshFinancialReview, updateFinancialCandidate, uploadFinancialSources } from "./document-import-actions";
import { candidateSchema, eventLabels, type EvidencePreview, type ImportCandidate } from "./import-candidates";
import { localPurchaseInstant } from "./import-dates";
import { FinancialSnapshotForm, type SnapshotStatement } from "./FinancialSnapshotForm";
import type { EvidenceDecision } from "./document-import";
import { money, moneyInput, parseMoney } from "./money";

type Review = { sourceIds: string[]; rows: EvidencePreview[]; token: string; documents: { id: string; accountId: string; fileName: string; metadata: Record<string, unknown> }[]; counts: { create: number; keep: number; review: number; ignore: number } };
type Source = { id: string; fileName: string; accountId: string };
export function DocumentImportWizard({ accounts, sources, statements, timezone }: { accounts: { id: string; name: string }[]; sources: Source[]; statements: SnapshotStatement[]; timezone: string }) {
  const [pending, start] = useTransition(), router = useRouter();
  const [accountId, setAccount] = useState(accounts[0]?.id || ""), [review, setReview] = useState<Review | null>(null);
  const [choices, setChoices] = useState<Record<string, EvidenceDecision>>({}), [editor, setEditor] = useState<EvidencePreview | null>(null);
  const [transcriptSource, setTranscriptSource] = useState(""), [transcript, setTranscript] = useState("");
  function receive(value: Review | { error: string }) {
    if ("error" in value) { toast.error(value.error); return; }
    setReview(value); setChoices({});
  }
  function load(ids: string[]) {
    const fd = new FormData(); fd.set("sourceIds", JSON.stringify(ids));
    start(async () => { const result = await refreshFinancialReview(fd); receive("error" in result ? result : { sourceIds: ids, ...result }); });
  }
  function upload(fd: FormData) { start(async () => { receive(await uploadFinancialSources(fd)); router.refresh(); }); }
  function confirm() {
    if (!review) return;
    const fd = new FormData(); fd.set("sourceIds", JSON.stringify(review.sourceIds)); fd.set("token", review.token); fd.set("decisions", JSON.stringify(Object.values(choices)));
    start(async () => {
      const result = await confirmFinancialReview(fd);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(`${result.applied.created} lançamentos e ${result.applied.payments} pagamentos registrados; ${result.applied.linked + result.applied.enriched} evidências vinculadas.`);
      receive({ sourceIds: review.sourceIds, ...result }); router.refresh();
    });
  }
  function saveEditor(fd: FormData) {
    if (!editor) return;
    try {
      const get = (key: string) => String(fd.get(key) || "").trim() || null;
      const purchase = get("purchasedDate"), posted = get("postedDate"), effective = purchase || posted || get("effectiveDate");
      const candidate: ImportCandidate = { ...editor.candidate, description: String(fd.get("description") || ""), amountCents: parseMoney(String(fd.get("amount") || "0")), eventKind: String(fd.get("eventKind")) as ImportCandidate["eventKind"],
        purchasedDate: purchase, postedDate: posted, effectiveDate: effective, dateBasis: purchase ? "PURCHASE_DATE" : posted ? "POSTED_DATE" : "CYCLE_CONFIRMED", statementId: get("statementId"),
        confidence: "CONFIRMED", problems: [], occurredAt: get("localTime") && purchase ? localPurchaseInstant(purchase, get("localTime")!, get("timezone") || timezone) : null, timezone: get("localTime") ? get("timezone") || timezone : null,
        originalCurrency: get("originalCurrency"), originalAmountCents: get("originalAmount") ? parseMoney(get("originalAmount")!) : null, exchangeRate: get("exchangeRate") };
      if (fd.get("verified") !== "on") throw new Error("Confira o original e confirme os dados.");
      const data = new FormData(); data.set("id", editor.id); data.set("version", String(editor.version)); data.set("candidate", JSON.stringify(candidate));
      start(async () => { const result = await updateFinancialCandidate(data); if ("error" in result) toast.error(result.error); else { toast.success(result.success); setEditor(null); if (review) load(review.sourceIds); } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Dados inválidos"); }
  }
  function addTranscription(fd: FormData) {
    try {
      if (fd.get("verified") !== "on") throw new Error("Confira a foto antes de enviar.");
      const day = String(fd.get("date") || ""), time = String(fd.get("time") || ""), description = String(fd.get("description") || "");
      const row = candidateSchema.parse({ locator: `image:row:${String(fd.get("row"))}`, description, rawDescription: description, rawDate: `${day}${time ? ` ${time}` : ""}`, effectiveDate: day, purchasedDate: day, dateBasis: "PURCHASE_DATE", amountCents: parseMoney(String(fd.get("amount"))), eventKind: fd.get("eventKind"), confidence: "CONFIRMED", occurredAt: time ? localPurchaseInstant(day, time, timezone) : null, timezone: time ? timezone : null });
      const data = new FormData(); data.set("sourceId", String(fd.get("sourceId"))); data.set("rows", JSON.stringify([row]));
      start(async () => { const result = await appendFinancialTranscription(data); if ("error" in result) toast.error(result.error); else { toast.success(result.success); if (review) load(review.sourceIds); } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Dados inválidos"); }
  }
  return <section className="panel stack" aria-busy={pending}>
    <div><h2><FileCheck size={19}/> Documentos e conciliação</h2><p className="muted">CSV de cartão, XLSX com várias abas, PDF com texto, imagens e ZIP. Pagamentos não são receita. Cada ocorrência fica em revisão antes de salvar.</p></div>
    <form action={upload} className="stack"><div className="form-grid"><label>Conta/cartão existente<select name="accountId" required value={accountId} onChange={e => setAccount(e.target.value)}><option value="">Escolha a conta</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Arquivos<input type="file" name="files" required multiple accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.zip,.json"/></label></div><small className="muted">5 MB por arquivo · 20 MB por envio. Fotos exigem transcrição conferida quando OCR não estiver disponível. JSON revisado usa o formato finance-evidence/1.</small><button className="button" disabled={pending || !accountId}><Upload size={15}/>Preparar revisão</button></form>
    {sources.length > 0 && <details><summary>Retomar revisão de um original</summary><ul className="stack">{sources.map(s => <li key={s.id} className="row"><button className="button-secondary" disabled={pending} onClick={() => load([s.id])}>{s.fileName}</button><a href={`/api/finance/sources/${s.id}`} target="_blank" rel="noreferrer">Ver original</a></li>)}</ul></details>}
    {review && <>
      {review.documents.map(document => <FinancialSnapshotForm key={document.id} document={document} statements={statements} onSaved={() => load(review.sourceIds)}/>)}
      <div className="row justify-between"><p>{review.counts.create} novas · {review.counts.keep} mantidas · {review.counts.review} precisam de revisão · {review.counts.ignore} ignoradas</p><button className="button-secondary" onClick={() => load(review.sourceIds)} disabled={pending}><RefreshCw size={15}/>Atualizar prévia</button></div>
      <p className="muted">Selecione apenas as ocorrências aprovadas. Vincular evidência conserva o lançamento existente; enriquecer preenche somente metadados vazios. Possíveis duplicatas exigem uma decisão.</p>
      <div className="table-wrap"><table><thead><tr><th>Aprovar</th><th>Evento e fonte</th><th>Compra / lançamento</th><th>Valor</th><th>Decisão</th></tr></thead><tbody>{review.rows.map(row => <tr key={row.id}>
        <td><input type="checkbox" aria-label={`Aprovar ${row.candidate.description}`} checked={Boolean(choices[row.id])} disabled={pending || ["KEEP", "IGNORE", "CONFLICT"].includes(row.action)} onChange={e => setChoices(current => { const next = { ...current }; if (e.target.checked) next[row.id] = row.action === "ENRICH_METADATA" ? { id: row.id, action: "ENRICH_METADATA", targetId: row.matches[0]?.id } : { id: row.id, action: "CREATE" }; else delete next[row.id]; return next; })}/></td>
        <td><strong>{row.candidate.description}</strong><br/><span className="badge">{eventLabels[row.candidate.eventKind]}</span><small className="muted"> {row.candidate.confidence} · {row.candidate.locator}</small><br/><a href={`/api/finance/sources/${row.sourceId}`} target="_blank" rel="noreferrer">{row.fileName}</a></td>
        <td>{row.candidate.purchasedDate || "Compra: desconhecida"}<br/><small>Lançamento: {row.candidate.postedDate || "não informado"}</small><small><br/>Hora: {row.candidate.occurredAt ? new Date(row.candidate.occurredAt).toLocaleTimeString("pt-BR", { timeZone: row.candidate.timezone || timezone, hour: "2-digit", minute: "2-digit" }) : "desconhecida"}{row.candidate.occurredAt ? ` · ${row.candidate.timezone}` : ""}<br/>Fatura: {statements.find(s => s.id === row.candidate.statementId)?.label || "Sem vínculo confirmado"}</small></td>
        <td>{row.candidate.amountCents ? money(row.candidate.amountCents) : "Não lido"}{row.candidate.originalCurrency && <small><br/>{row.candidate.originalCurrency} {row.candidate.originalAmountCents ? row.candidate.originalAmountCents / 100 : "?"} · câmbio {row.candidate.exchangeRate || "não informado"}</small>}</td>
        <td><span className="badge">{row.action}</span><p>{row.reason}</p>{!["KEEP", "IGNORE"].includes(row.action) && <button className="button-secondary" onClick={() => setEditor(row)} disabled={pending}>Corrigir dados</button>}{row.action === "AMBIGUOUS" && <select aria-label={`Decisão para ${row.candidate.description}`} value={choices[row.id]?.targetId || (choices[row.id]?.confirmedSeparate ? "separate" : "")} onChange={e => setChoices(c => ({ ...c, [row.id]: e.target.value === "separate" ? { id: row.id, action: "CREATE", confirmedSeparate: true } : { id: row.id, action: "ENRICH_METADATA", targetId: e.target.value } }))}><option value="">Escolha o vínculo</option><option value="separate">Confirmo: é outra ocorrência</option>{row.matches.map(t => <option key={t.id} value={t.id}>Vincular: {t.date} · {t.description}</option>)}</select>}{row.action === "CONFLICT" && <button className="button-secondary" onClick={() => setChoices(c => ({ ...c, [row.id]: { id: row.id, action: "IGNORE" } }))}>Ignorar explicitamente</button>}</td>
      </tr>)}</tbody></table></div>
      <button className="button" disabled={pending || !Object.keys(choices).length} onClick={confirm}>Confirmar {Object.keys(choices).length} ocorrência(s) selecionada(s)</button>
      <details><summary>Adicionar ocorrência de uma foto</summary>
        <form action={addTranscription} className="stack"><div className="form-grid">
          <label>Original<select name="sourceId" required><option value="">Escolha</option>{[...new Map(review.rows.map(r => [r.sourceId, r.fileName])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Linha/posição no original<input name="row" type="number" min="1" max="5000" required/></label>
          <label>Descrição<input name="description" maxLength={300} required/></label><label>Valor em reais<input name="amount" required placeholder="0,00"/></label>
          <label>Data confirmada<input type="date" name="date" required/></label><label>Hora local (se visível)<input type="time" name="time"/><small>{timezone}</small></label>
          <label>Natureza<select name="eventKind">{Object.entries(eventLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div><label className="row"><input type="checkbox" name="verified" required/>Conferi esta ocorrência no original.</label><button className="button-secondary" disabled={pending}>Adicionar à revisão</button></form>
      </details>
      <details><summary>Importar transcrição em JSON</summary><p>Use o original para conferir cada linha. A transcrição entra na revisão, sem salvar compras automaticamente.</p><label>Original<select value={transcriptSource} onChange={e => setTranscriptSource(e.target.value)}><option value="">Escolha</option>{[...new Map(review.rows.map(r => [r.sourceId, r.fileName])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Linhas revisadas em JSON<textarea rows={6} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder='[{"locator":"image:row:1",...}]'/></label><button className="button-secondary" disabled={pending || !transcriptSource || !transcript} onClick={() => { const fd = new FormData(); fd.set("sourceId", transcriptSource); fd.set("rows", transcript); start(async () => { const result = await appendFinancialTranscription(fd); if ("error" in result) toast.error(result.error); else { toast.success(result.success); setTranscript(""); load(review.sourceIds); } }); }}>Adicionar à revisão</button></details>
    </>}
    {editor && <form className="panel stack" action={saveEditor}><h3>Conferir ocorrência no original</h3><a href={`/api/finance/sources/${editor.sourceId}`} target="_blank" rel="noreferrer">Abrir original</a><div className="form-grid"><label>Descrição<input name="description" required maxLength={300} defaultValue={editor.candidate.description}/></label><label>Valor em reais<input name="amount" required defaultValue={moneyInput(editor.candidate.amountCents || 0)}/></label><label>Natureza<select name="eventKind" defaultValue={editor.candidate.eventKind}>{Object.entries(eventLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>Data da compra (se confirmada)<input name="purchasedDate" type="date" defaultValue={editor.candidate.purchasedDate || ""}/></label><label>Data do lançamento no banco<input name="postedDate" type="date" defaultValue={editor.candidate.postedDate || ""}/></label><label>Data efetiva confirmada pelo ciclo<input name="effectiveDate" type="date" defaultValue={editor.candidate.effectiveDate || ""}/></label><label>Hora local da compra (opcional)<input name="localTime" type="time" defaultValue={editor.candidate.occurredAt ? new Date(editor.candidate.occurredAt).toLocaleTimeString("en-GB", { timeZone: editor.candidate.timezone || timezone, hour: "2-digit", minute: "2-digit" }) : ""}/></label><label>Timezone da compra<input name="timezone" defaultValue={editor.candidate.timezone || timezone} placeholder="America/Manaus"/></label><label>Moeda original (se informada)<input name="originalCurrency" maxLength={3} defaultValue={editor.candidate.originalCurrency || ""} placeholder="USD"/></label><label>Valor na moeda original<input name="originalAmount" defaultValue={editor.candidate.originalAmountCents ? moneyInput(editor.candidate.originalAmountCents) : ""}/></label><label>Cotação confirmada (vazio se desconhecida)<input name="exchangeRate" defaultValue={editor.candidate.exchangeRate || ""}/></label><label>Fatura<select name="statementId" defaultValue={editor.candidate.statementId || ""}><option value="">Sem vínculo confirmado</option>{statements.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label></div><label className="row"><input type="checkbox" name="verified" required/>Conferi o original e confirmo estes dados.</label><div className="row"><button className="button" disabled={pending}>Salvar revisão</button><button className="button-secondary" type="button" onClick={() => setEditor(null)}>Fechar</button></div></form>}
  </section>;
}
