"use client";

import { FileSpreadsheet, Plus, StickyNote, X } from "lucide-react";
import { GridSelect } from "@/components/ui/GridSelect";
import type { FinanceGridRow } from "./FinanceDataGrid";
import { NOTE_MAX, notePreview } from "./transaction-notes";

type Option={id:string;name:string};
const fields=[
  {key:"date",letter:"A",label:"Data",width:126},
  {key:"description",letter:"B",label:"Descrição",width:220},
  {key:"merchant",letter:"C",label:"Estabelecimento",width:170},
  {key:"categoryId",letter:"D",label:"Categoria",width:165},
  {key:"accountId",letter:"E",label:"Conta",width:165},
  {key:"type",letter:"F",label:"Tipo",width:130},
  {key:"amount",letter:"G",label:"Valor",width:130},
  {key:"tags",letter:"H",label:"Tags",width:205},
  {key:"notes",letter:"I",label:"Observação",width:240},
  {key:"source",letter:"J",label:"Origem",width:110},
] as const;
const typeOptions=[{value:"EXPENSE",label:"Despesa"},{value:"INCOME",label:"Receita"},{value:"REFUND",label:"Reembolso"},{value:"ADJUSTMENT",label:"Ajuste"}];

export function CsvExcelGrid({rows,accounts,categories,invalid,onUpdate,onSmartFill,onAdd,onRemoveDraft,onOpenDetails}:{rows:FinanceGridRow[];accounts:Option[];categories:Option[];invalid:ReadonlyMap<string,string>;onUpdate:(id:string,key:string,value:string)=>void;onSmartFill:(id:string,value:string)=>void;onAdd:()=>void;onRemoveDraft:(id:string)=>void;onOpenDetails:(id:string)=>void}){
  const categoryOptions=[{value:"",label:"Sem categoria"},...categories.map(option=>({value:option.id,label:option.name}))];
  const accountOptions=[{value:"",label:"Sem conta · definir depois"},...accounts.map(option=>({value:option.id,label:option.name}))];
  const width=fields.reduce((total,field)=>total+field.width,46);

  return <section key="csv" className="excel-csv-view finance-sheet-view" aria-label="Visualização CSV no formato de planilha Excel">
    <div className="excel-formula-bar"><span className="excel-name-box">A1</span><span className="excel-fx">fx</span><span><FileSpreadsheet size={14}/>CSV editável · alterações entram na mesma fila para salvar</span></div>
    <div className="finance-grid excel-csv-grid"><table style={{width}}>
      <thead><tr className="excel-column-letters"><th className="excel-corner" aria-label="Canto da planilha"/>{fields.map(field=><th key={field.key} style={{width:field.width}}>{field.letter}</th>)}</tr><tr className="excel-header-row"><th className="excel-row-number">1</th>{fields.map(field=><th key={field.key} style={{width:field.width}}>{field.label}</th>)}</tr></thead>
      <tbody>{rows.map((row,index)=><tr key={row.id} data-draft={row.draft||undefined} data-smart={row.smartService||undefined} data-invalid={invalid.has(row.id)||undefined} title={invalid.get(row.id)}><th className="excel-row-number">{row.draft?<button type="button" className="excel-remove-draft" onClick={()=>onRemoveDraft(row.id)} aria-label="Descartar este rascunho" title="Descartar rascunho"><X size={12}/></button>:index+2}</th>{fields.map(field=><td key={field.key} style={{width:field.width}}>{field.key==="categoryId"?<GridSelect label="Categoria" value={row.categoryId||""} options={categoryOptions} onValueChange={value=>onUpdate(row.id,field.key,value)}/>:field.key==="accountId"?<GridSelect label="Conta" value={row.accountId||""} options={accountOptions} onValueChange={value=>onUpdate(row.id,field.key,value)}/>:field.key==="type"?<GridSelect label="Tipo" value={row.type} options={typeOptions} onValueChange={value=>onUpdate(row.id,field.key,value)}/>:field.key==="source"?<span className="badge">{row.draft?"Não salvo":row.source}</span>:field.key==="notes"&&(row.notes||"").includes("\n")?<button type="button" className="excel-note-multiline" onClick={()=>onOpenDetails(row.id)} title="Observação com várias linhas: edite no painel de detalhes"><StickyNote size={13}/>{notePreview(row.notes,40)}</button>:<input data-row-id={row.id} data-field={field.key} aria-label={`${field.letter}${index+2} ${field.label}`} type={field.key==="date"?"date":"text"} inputMode={field.key==="amount"?"decimal":undefined} maxLength={field.key==="notes"?NOTE_MAX:undefined} placeholder={field.key==="description"?"Ex.: Uber, 99, iFood…":field.key==="notes"?"Opcional":undefined} value={String(row[field.key]??"")} onChange={event=>onUpdate(row.id,field.key,event.target.value)} onBlur={field.key==="description"?event=>onSmartFill(row.id,event.target.value):undefined}/>}</td>)}</tr>)}</tbody>
    </table><button type="button" className="grid-add-row excel-add-row" onClick={onAdd}><span>{rows.length+2}</span><Plus size={14}/>Adicionar nova linha (no topo)</button></div>
  </section>;
}
