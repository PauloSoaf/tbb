"use client";

import { useState, type DragEvent } from "react";
import { CheckCircle2, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { importInvestmentCsv } from "./actions";
import { INVESTMENT_ASSET_METADATA, INVESTMENT_ASSET_TYPES } from "./asset-metadata";
import type { InvestmentFormAccount } from "./forms";

function previewCsv(content: string) {
  const clean = content.replace(/^\uFEFF/, "");
  const first = clean.split(/\r?\n/, 1)[0] || "";
  const delimiter = first.split(";").length > first.split(",").length ? ";" : first.includes("\t") ? "\t" : ",";
  return clean.split(/\r?\n/).filter(Boolean).slice(0, 9).map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export function InvestmentCsvImport({ accounts }: { accounts: InvestmentFormAccount[] }) {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const preview = content ? previewCsv(content) : [];
  async function select(file?: File) {
    if (!file) return;
    if (file.size > 5_000_000 || !file.name.toLowerCase().endsWith(".csv")) { setContent(""); setFileName("Use um CSV UTF-8 de até 5 MB."); return; }
    setContent(await file.text()); setFileName(file.name);
  }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void select(event.dataTransfer.files[0]); }
  return <div className="investment-import-layout">
    <section className="investment-section-card investment-import-guide">
      <header className="investment-section-title"><span><FileSpreadsheet size={16}/></span><h2>Formatos aceitos</h2></header>
      <div><h3>CSV genérico</h3><p>Use cabeçalho e uma operação por linha. Separadores: vírgula, ponto e vírgula ou tab.</p><pre>Data;Tipo;Ticker;Quantidade;Preço;Valor;Instituição<br/>15/09/2026;Compra;PETR4;10;31,25;312,50;XP</pre></div>
      <div><h3>Exportação B3 / corretora</h3><p>Também reconhece Data do Negócio, Tipo de Movimentação, Código de Negociação, Quantidade, Preço e Valor da Operação.</p></div>
      <ul><li><strong>Obrigatórias:</strong> data, tipo, ticker e quantidade.</li><li>Inclua preço ou valor total. Taxas, impostos, nome, instituição e ID externo são opcionais.</li><li>Compras, vendas, depósitos, retiradas e desdobramentos são reconhecidos.</li><li>IDs externos ou a combinação da linha impedem duplicação.</li></ul>
      <div className="investment-import-deferred"><ShieldCheck size={17}/><p><strong>PDF e OCR</strong><span>Notas e extratos em PDF ficam para uma etapa posterior com OCR e revisão. Nenhum valor é inventado quando o documento não pode ser lido com segurança.</span></p></div>
    </section>
    <section className="investment-section-card">
      <header className="investment-section-toolbar"><div><h2>Revisar e importar</h2><p>O arquivo só é gravado depois desta revisão.</p></div>{content && <span className="badge"><CheckCircle2 size={12}/>{Math.max(0, previewCsv(content).length - 1)}+ linhas detectadas</span>}</header>
      <ActionForm action={importInvestmentCsv} className="investment-import-form" resetOnSuccess={false}>
        <input type="hidden" name="content" value={content}/>
        <div className="investment-import-options"><label><span>Conta padrão</span><select name="accountId"><option value="">Usar instituição do arquivo / criar carteira</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label><span>Classe para novos ativos</span><select name="defaultAssetType" defaultValue="STOCK">{INVESTMENT_ASSET_TYPES.map((type) => <option value={type} key={type}>{INVESTMENT_ASSET_METADATA[type].label.pt}</option>)}</select></label></div>
        <div className="investment-import-drop" data-dragging={dragging || undefined} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><Upload size={27}/><strong>{fileName || "Arraste o CSV aqui"}</strong><span>ou selecione um arquivo de até 5 MB</span><label className="button-secondary">Escolher CSV<input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void select(event.target.files?.[0])}/></label></div>
        {preview.length > 0 && <div className="investment-import-preview"><table><thead><tr>{preview[0].map((cell, index) => <th key={`${cell}:${index}`}>{cell}</th>)}</tr></thead><tbody>{preview.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || <span>vazio</span>}</td>)}</tr>)}</tbody></table></div>}
        <button className="button" type="submit" disabled={!content}><Upload size={14}/>Confirmar importação</button>
      </ActionForm>
    </section>
  </div>;
}
