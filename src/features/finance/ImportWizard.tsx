"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { cancelImport, confirmCsvImport, prepareCsvPreview, uploadFinanceDocument, uploadPastedData } from "./actions";

type Option = { id: string; name: string };
type UploadResult = { batchId: string; headers: string[]; rows: string[][]; count: number; delimiter: string; source?: string };
type PreviewRow = { row: number; data: { date: string; description: string; merchant: string | null; amountCents: number; type: string; source: string } | null; errors: string[]; duplicate: boolean; appliedRules: string[] };
type PreviewResult = { preview: PreviewRow[]; count: number; duplicates: number; failed: number; ready: number };

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const guess = (headers: string[], words: string[]) => headers.find(header => words.some(word => normalize(header).includes(word))) || "";

export function ImportWizard({ accounts }: { accounts: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paste, setPaste] = useState("");
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");

  function receive(result: UploadResult | { error: string }) {
    if ("error" in result) return toast.error(result.error);
    setUpload(result); setPreview(null);
    toast.success(`${result.count} linha(s) detectada(s). Agora confira o mapeamento.`);
  }
  function sendFile(file: File) {
    const fd = new FormData(); fd.set("accountId", accountId); fd.set("file", file);
    startTransition(async () => { receive(await uploadFinanceDocument(fd)); });
  }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); const file=event.dataTransfer.files[0]; if(file)sendFile(file); }
  function sendPaste() {
    const fd = new FormData(); fd.set("accountId", accountId); fd.set("content", paste);
    startTransition(async () => { receive(await uploadPastedData(fd)); });
  }
  function map(fd: FormData) {
    if (!upload) return; fd.set("batchId",upload.batchId);
    startTransition(async()=>{const result=await prepareCsvPreview(fd);if("error" in result)toast.error(result.error);else setPreview(result);});
  }
  function confirm(acceptErrors: boolean) {
    if (!upload) return; const fd=new FormData();fd.set("batchId",upload.batchId);if(acceptErrors)fd.set("acceptErrors","on");
    startTransition(async()=>{const result=await confirmCsvImport(fd);if("error" in result)toast.error(result.error);else{toast.success(result.success);setUpload(null);setPreview(null);setPaste("");router.refresh();}});
  }
  function cancel() { if(!upload)return;const fd=new FormData();fd.set("batchId",upload.batchId);startTransition(async()=>{await cancelImport(fd);setUpload(null);setPreview(null);router.refresh();}); }
  const headers=upload?.headers||[];
  return <section className="stack" aria-busy={pending}>
    <details className="panel import-guide" open><summary><strong>Formatos aceitos e como montar o arquivo</strong><span className="muted">CSV flexível · PDF com texto</span></summary><div className="import-guide-grid"><div><h3>CSV do banco ou planilha</h3><ul><li>Cabeçalho obrigatório e pelo menos uma transação.</li><li>Separador por vírgula, ponto e vírgula ou tabulação.</li><li>Datas: <code>13/09/2026</code>, <code>13-09-26</code> ou <code>2026-09-13</code>.</li><li>Valores: <code>-29,90</code>, <code>R$ 29,90</code>, <code>1.234,56</code> ou <code>1234.56</code>.</li><li>Os nomes das colunas podem variar; você escolhe Data, Descrição, Valor, Tipo e Estabelecimento no mapeamento.</li></ul><pre>Data;Descrição;Valor;Tipo<br/>13/09/2026;Uber;-29,00;Despesa</pre></div><div><h3>PDF de fatura ou extrato</h3><ul><li>Até 5 MB e 100 páginas.</li><li>Precisa conter texto selecionável; cada lançamento deve ter data, descrição e valor na mesma linha.</li><li>Layouts diferentes são normalizados para a mesma prévia antes de salvar.</li><li>PDF digitalizado precisa primeiro de OCR. O sistema avisa quando não existe camada de texto.</li></ul><p className="muted">Nenhum arquivo grava direto: revise o mapeamento, duplicatas e linhas inválidas antes de confirmar.</p></div></div></details>
    <div className="panel stack"><div><h2>Entrada</h2><p className="muted">CSV, PDF com camada de texto ou dados copiados usam a mesma área de revisão.</p></div><label>Conta de destino (opcional)<select value={accountId} onChange={e=>setAccountId(e.target.value)} disabled={!accounts.length}><option value="">Sem conta · definir depois</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <div className="split-grid"><div className={`import-dropzone ${dragging?"active":""}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={drop}><Upload size={26}/><strong>Arraste CSV ou PDF</strong><span className="muted">ou escolha um arquivo de até 5 MB</span><label className="button-secondary">Escolher arquivo<input className="sr-only" type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={e=>{const file=e.target.files?.[0];if(file)sendFile(file)}}/></label></div><div className="stack"><label>Colar transações<textarea rows={7} value={paste} onChange={e=>setPaste(e.target.value)} placeholder={'Data;Descrição;Valor\n13/09/2026;Uber;-27,50'}/></label><button className="button-secondary" onClick={sendPaste} disabled={!paste.trim()||pending}><FileSpreadsheet size={15}/>Detectar dados colados</button></div></div>
    </div>
    {upload&&!preview&&<form className="panel stack" action={map}><div className="row justify-between"><div><h2>Mapeamento</h2><p className="muted">{upload.count} linhas · {upload.source||"CSV"} · delimitador <code>{upload.delimiter}</code></p></div><FileText/></div><div className="form-grid">{[["date","Data",["data","date","dt"]],["description","Descrição",["descricao","description","historico","lancamento","memo","detalhe"]],["amount","Valor",["valor","amount","value","montante"]],["merchant","Estabelecimento",["merchant","estabelecimento","favorecido","local"]],["type","Tipo",["tipo","type","natureza","operacao"]]].map(([name,label,words])=><label key={String(name)}>{String(label)}<select name={String(name)} required={["date","description","amount"].includes(String(name))} defaultValue={guess(headers,words as string[])}><option value="">Não mapear</option>{headers.map(h=><option key={h} value={h}>{h}</option>)}</select></label>)}<label>Sinal do valor<select name="direction" defaultValue="SIGNED"><option value="SIGNED">Positivo receita, negativo despesa</option><option value="EXPENSE">Todos são despesas</option><option value="INCOME">Todos são receitas</option></select></label><label>Salvar mapeamento como<input name="mappingName" placeholder="Ex.: Banco principal"/></label></div><div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{upload.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell||<span className="muted">vazio</span>}</td>)}</tr>)}</tbody></table></div><div className="row justify-between"><button type="button" className="button-secondary" onClick={cancel}>Cancelar</button><button className="button" disabled={pending}>Gerar prévia</button></div></form>}
    {upload&&preview&&<section className="panel stack"><div className="stat-grid"><div className="stat-card"><span>Detectadas</span><strong>{preview.count}</strong></div><div className="stat-card"><span>Prontas</span><strong>{preview.ready}</strong></div><div className="stat-card"><span>Duplicadas</span><strong>{preview.duplicates}</strong></div><div className="stat-card"><span>Inválidas</span><strong>{preview.failed}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Linha</th><th>Status</th><th>Data</th><th>Descrição</th><th>Valor</th><th>Regras</th></tr></thead><tbody>{preview.preview.map(row=><tr key={row.row}><td>{row.row}</td><td><span className="badge">{row.errors.length?"Precisa revisão":row.duplicate?"Duplicada":"Pronta"}</span></td><td>{row.data?.date||"—"}</td><td>{row.data?.description||row.errors.join(" ")}</td><td>{row.data?(row.data.amountCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"—"}</td><td>{row.appliedRules.join(", ")||"—"}</td></tr>)}</tbody></table></div>{preview.failed>0&&<p className="form-error">Linhas inválidas serão ignoradas; os dados originais permanecem no lote até a confirmação.</p>}<div className="row justify-between"><button className="button-secondary" onClick={cancel}>Cancelar</button><button className="button" onClick={()=>confirm(preview.failed>0)} disabled={pending||preview.ready===0}>Confirmar {preview.ready} lançamento(s)</button></div></section>}
  </section>;
}
