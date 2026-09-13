"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  cellSelectionFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type CellSelectionState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ClipboardPaste, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { bulkTransactions, saveGridTransactions, type GridTransactionInput } from "./actions";
import { clipboardDrafts, parseClipboardTable } from "./clipboard-parser";
import { money } from "./money";

export type FinanceGridRow = GridTransactionInput & { id: string; source: string; draft?: boolean };
type Option = { id: string; name: string };
const features = tableFeatures({
  cellSelectionFeature,
  rowSelectionFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
});
const helper = createColumnHelper<typeof features, FinanceGridRow>();
const columns = helper.columns([
  helper.display({ id: "select", header: "✓", size: 42, enableCellSelection: false, enableResizing: false }),
  helper.accessor("date", { header: "Data", size: 118, sortFn: "alphanumeric" }),
  helper.accessor("description", { header: "Descrição", size: 210, sortFn: "alphanumeric" }),
  helper.accessor("merchant", { header: "Estabelecimento", size: 160, sortFn: "alphanumeric" }),
  helper.accessor("categoryId", { header: "Categoria", size: 155, sortFn: "alphanumeric" }),
  helper.accessor("accountId", { header: "Conta", size: 145, sortFn: "alphanumeric" }),
  helper.accessor("type", { header: "Tipo", size: 122, sortFn: "alphanumeric" }),
  helper.accessor("amount", { header: "Valor", size: 125, sortFn: "alphanumeric" }),
  helper.accessor("tags", { header: "Tags", size: 170, sortFn: "alphanumeric" }),
  helper.accessor("source", { header: "Origem", size: 95, sortFn: "alphanumeric" }),
]);
const editable = ["date","description","merchant","categoryId","accountId","type","amount","tags"] as const;

export function FinanceDataGrid({ initialRows, accounts, categories, today }: { initialRows: FinanceGridRow[]; accounts: Option[]; categories: Option[]; today: string }) {
  const router=useRouter(); const [rows,setRows]=useState(initialRows); const [rowSelection,setRowSelection]=useState<RowSelectionState>({}); const [cellSelection,setCellSelection]=useState<CellSelectionState>([]); const [dirty,setDirty]=useState(new Set<string>()); const [pending,startTransition]=useTransition(); const [mode,setMode]=useState<"sheet"|"ledger">(()=>typeof window!=="undefined"&&localStorage.getItem("tbb-finance-view")==="ledger"?"ledger":"sheet");
  const table=useTable({features,columns,data:rows,getRowId:row=>row.id,state:{rowSelection,cellSelection},onRowSelectionChange:setRowSelection,onCellSelectionChange:setCellSelection,columnResizeMode:"onChange",enableSubRowSelection:false,autoResetCellSelection:false});
  const selectedIds=table.getSelectedRowIds();
  const selected=rows.filter(row=>selectedIds.includes(row.id));
  const totals=selected.reduce((sum,row)=>{const raw=Number(row.amount.replace(/\./g,"").replace(",","."))||0;const cents=Math.round(Math.abs(raw)*100);if(row.type==="INCOME")sum.income+=cents;else if(row.type==="EXPENSE")sum.expenses+=cents;return sum;},{income:0,expenses:0});
  function update(id:string,key:string,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[key]:value}:row));setDirty(current=>new Set(current).add(id));}
  function addDraft(seed:Partial<FinanceGridRow>={}){const id=`draft-${crypto.randomUUID()}`;setRows(current=>[...current,{id,date:today,description:"",merchant:"",categoryId:"",accountId:accounts[0]?.id||"",type:"EXPENSE",amount:"",tags:"",source:"DRAFT",draft:true,...seed}]);setDirty(current=>new Set(current).add(id));}
  function changeMode(next:"sheet"|"ledger"){setMode(next);localStorage.setItem("tbb-finance-view",next);}
  function saveAll(){const changed=rows.filter(row=>dirty.has(row.id)).map(row=>({id:row.id,date:row.date,description:row.description,merchant:row.merchant,categoryId:row.categoryId,accountId:row.accountId,type:row.type,amount:row.amount,tags:row.tags}));if(!changed.length)return;startTransition(async()=>{const result=await saveGridTransactions(changed);if("error" in result)toast.error(result.error);else{toast.success(result.success);setDirty(new Set());router.refresh();}});}
  function discard(){setRows(initialRows);setDirty(new Set());table.resetCellSelection(true);table.resetRowSelection(true);}
  async function copySelection(){const grids=table.getSelectedCellRangesData();if(!grids.length)return;const safe=(value:unknown)=>{const text=String(value??"");const escaped=/^[\t\r ]*[=+@-]/.test(text)?`'${text}`:text;return /["\t\n\r]/.test(escaped)?`"${escaped.replace(/"/g,'""')}"`:escaped;};await navigator.clipboard.writeText(grids.map(grid=>grid.map(row=>row.map(safe).join("\t")).join("\n")).join("\n\n"));toast.success("Seleção copiada.");}
  function paste(event:React.ClipboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;event.preventDefault();try{const text=event.clipboardData.getData("text");const parsed=parseClipboardTable(text);const focus=table.getFocusedCell();if(focus&&editable.includes(focus.column.id as typeof editable[number])){const displayRows=table.getRowModel().rows;const startRow=displayRows.findIndex(row=>row.id===focus.row.id);const visible=table.getVisibleLeafColumns().map(column=>column.id).filter(id=>editable.includes(id as typeof editable[number]));const startColumn=visible.indexOf(focus.column.id);const matrix=parsed.hasHeader?parsed.rows.slice(1):parsed.rows;matrix.forEach((values,rowOffset)=>values.forEach((value,columnOffset)=>{const target=displayRows[startRow+rowOffset];const key=visible[startColumn+columnOffset];if(target&&key)update(target.id,key,value);}));toast.message(`${matrix.length} linha(s) colada(s). Revise e salve.`);}else{const drafts=clipboardDrafts(text,today,accounts[0]?.id||"").map(row=>({...row,source:"DRAFT"}));setRows(current=>[...current,...drafts]);setDirty(current=>new Set([...current,...drafts.map(row=>row.id)]));toast.message(`${drafts.length} rascunho(s) criado(s). Revise antes de salvar.`);}}catch(error){toast.error(error instanceof Error?error.message:"Não foi possível ler a área de transferência.");}}
  function keyboard(event:KeyboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="c"){event.preventDefault();void copySelection();return;}if(event.key==="Escape"){table.resetCellSelection(true);return;}const direction=event.key==="ArrowUp"?"up":event.key==="ArrowDown"?"down":event.key==="ArrowLeft"?"left":event.key==="ArrowRight"?"right":null;if(direction){event.preventDefault();if(event.shiftKey)table.extendCellSelection(direction);else table.moveCellSelection(direction);}}
  function bulkDelete(){if(!selectedIds.length)return;startTransition(async()=>{const fd=new FormData();selectedIds.forEach(id=>fd.append("ids",id));fd.set("operation","DELETE");fd.set("confirmation","EXCLUIR");const result=await bulkTransactions(fd);if("error" in result)toast.error(result.error);else{toast.success(result.success);setRows(current=>current.filter(row=>!selectedIds.includes(row.id)));table.resetRowSelection(true);router.refresh();}});}
  const visibleRows=table.getRowModel().rows;
  return <section className="stack" onPaste={paste} onKeyDown={keyboard} aria-busy={pending}>
    <div className="row justify-between"><div className="tabs !m-0"><button aria-pressed={mode==="ledger"} onClick={()=>changeMode("ledger")}>Ledger</button><button aria-pressed={mode==="sheet"} onClick={()=>changeMode("sheet")}>Sheet</button></div><div className="row"><button className="button-secondary" onClick={()=>addDraft()} disabled={!accounts.length}><Plus size={14}/>Adicionar linha</button><button className="button-secondary" onClick={discard} disabled={!dirty.size}><RotateCcw size={14}/>Descartar</button><button className="button" onClick={saveAll} disabled={!dirty.size||pending}><Save size={14}/>Salvar {dirty.size||""}</button></div></div>
    {!accounts.length&&<p className="form-error">Crie uma conta antes de adicionar transações.</p>}
    {selectedIds.length>0&&<div className="panel row justify-between"><span><strong>{selectedIds.length}</strong> linhas selecionadas · Receitas {money(totals.income)} · Despesas {money(totals.expenses)} · Líquido {money(totals.income-totals.expenses)}</span><button className="button-secondary text-danger" onClick={bulkDelete}><Trash2 size={14}/>Excluir selecionadas</button></div>}
    {mode==="ledger"?<div className="panel">{visibleRows.map(({original:row})=><div className="list-item" key={row.id}><div><h3>{row.description}</h3><small>{row.date} · {accounts.find(a=>a.id===row.accountId)?.name} · {categories.find(c=>c.id===row.categoryId)?.name||"Sem categoria"}</small></div><div className="text-right"><strong className={row.type==="INCOME"?"text-success":row.type==="EXPENSE"?"text-danger":""}>{row.type==="EXPENSE"?"− ":"+ "}{row.amount}</strong><small className="block">{row.source}</small></div></div>)}</div>:
    <div className="finance-grid" tabIndex={0} aria-label="Planilha de transações; use as setas para navegar e Shift para estender a seleção"><table style={{width:table.getTotalSize()}}><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} style={{width:header.getSize()}}><button className="grid-header" onClick={header.column.getToggleSortingHandler()}>{String(header.column.columnDef.header)} {header.column.getIsSorted()==="asc"?"↑":header.column.getIsSorted()==="desc"?"↓":""}</button>{header.column.getCanResize()&&<span className={`resize-handle ${header.column.getIsResizing()?"active":""}`} onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}/>}</th>)}</tr>)}</thead><tbody>{visibleRows.map(row=><tr key={row.id} data-draft={row.original.draft||undefined} data-dirty={dirty.has(row.id)||undefined}>{row.getVisibleCells().map(cell=>{const id=cell.column.id;const selected=cell.getIsSelected();const edges=selected?cell.getSelectionEdges():null;return <td key={cell.id} tabIndex={cell.getTabIndex()} onMouseDown={cell.getSelectionStartHandler()} onMouseEnter={cell.getSelectionExtendHandler()} className={[selected&&"cell-selected",cell.getIsFocused()&&"cell-focused",edges?.top&&"cell-edge-top",edges?.right&&"cell-edge-right",edges?.bottom&&"cell-edge-bottom",edges?.left&&"cell-edge-left"].filter(Boolean).join(" ")} style={{width:cell.column.getSize()}}>{id==="select"?<input type="checkbox" aria-label={`Selecionar ${row.original.description||"rascunho"}`} checked={row.getIsSelected()} onClick={row.getToggleSelectedHandler()} onChange={()=>{}}/>:id==="categoryId"?<select aria-label="Categoria" value={row.original.categoryId||""} onChange={event=>update(row.id,id,event.target.value)}><option value="">Sem categoria</option>{categories.map(option=><option value={option.id} key={option.id}>{option.name}</option>)}</select>:id==="accountId"?<select aria-label="Conta" value={row.original.accountId} onChange={event=>update(row.id,id,event.target.value)}>{accounts.map(option=><option value={option.id} key={option.id}>{option.name}</option>)}</select>:id==="type"?<select aria-label="Tipo" value={row.original.type} onChange={event=>update(row.id,id,event.target.value)}>{[["EXPENSE","Despesa"],["INCOME","Receita"],["REFUND","Reembolso"],["ADJUSTMENT","Ajuste"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>:id==="source"?<span className="badge">{row.original.source}</span>:<input aria-label={String(cell.column.columnDef.header)} type={id==="date"?"date":"text"} inputMode={id==="amount"?"decimal":undefined} value={String(cell.getValue()??"")} onChange={event=>update(row.id,id,event.target.value)}/>}</td>;})}</tr>)}</tbody></table><button className="grid-add-row" onClick={()=>addDraft()} disabled={!accounts.length}><Plus size={14}/>Adicionar transação</button></div>}
    <p className="muted text-xs"><ClipboardPaste size={13} className="inline mr-1"/>Cole TSV/CSV fora de uma célula para criar rascunhos. Selecione uma célula e cole uma matriz para preencher um intervalo. Nada entra nos totais antes de “Salvar”.</p>
  </section>;
}
