"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEventHandler,
  type KeyboardEvent,
} from "react";
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
import { Check, ClipboardPaste, FileSpreadsheet, List, Minus, Plus, RotateCcw, Save, Sparkles, Table2, Trash2 } from "lucide-react";
import { GridSelect } from "@/components/ui/GridSelect";
import { bulkTransactions, saveGridTransactions, type GridTransactionInput } from "./actions";
import { clipboardDrafts, parseClipboardTable } from "./clipboard-parser";
import { CsvExcelGrid } from "./CsvExcelGrid";
import { money } from "./money";
import { SmartEntryPreferences, type SmartEntryAccount } from "./SmartEntryPreferences";
import { smartEntryPatch, type SmartAccountPreferences, type SmartServiceId } from "./smart-entry";

export type FinanceGridRow = GridTransactionInput & { id: string; source: string; draft?: boolean; smartService?:SmartServiceId };
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
const typeOptions=[{value:"EXPENSE",label:"Despesa"},{value:"INCOME",label:"Receita"},{value:"REFUND",label:"Reembolso"},{value:"ADJUSTMENT",label:"Ajuste"}];

function GridCheckbox({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="grid-checkbox" onMouseDown={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <span className="grid-checkbox-control" aria-hidden="true">
        {indeterminate ? <Minus size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
      </span>
    </label>
  );
}

export function FinanceDataGrid({ initialRows, accounts, categories, today }: { initialRows: FinanceGridRow[]; accounts: Option[]; categories: Option[]; today: string }) {
  const router=useRouter();
  const [rows,setRows]=useState(initialRows);
  const [rowSelection,setRowSelection]=useState<RowSelectionState>({});
  const [cellSelection,setCellSelection]=useState<CellSelectionState>([]);
  const [dirty,setDirty]=useState(new Set<string>());
  const [pending,startTransition]=useTransition();
  const [mode,setMode]=useState<"sheet"|"ledger"|"csv">("sheet");
  const [smartOpen,setSmartOpen]=useState(false);
  const [smartLoading,setSmartLoading]=useState(true);
  const [smartAccounts,setSmartAccounts]=useState<SmartEntryAccount[]>([]);
  const [smartPreferences,setSmartPreferences]=useState<SmartAccountPreferences>({});
  useEffect(()=>{
    const stored=localStorage.getItem("tbb-finance-view");
    if(stored==="ledger"||stored==="csv")setMode(stored);
    let active=true;
    fetch("/api/finance/smart-entry").then(async response=>{if(!response.ok)throw new Error("preferences");return response.json()}).then(result=>{if(active){setSmartAccounts(result.accounts);setSmartPreferences(result.preferences)}}).catch(()=>{}).finally(()=>{if(active)setSmartLoading(false)});
    return()=>{active=false};
  },[]);
  const table=useTable({features,columns,data:rows,getRowId:row=>row.id,state:{rowSelection,cellSelection},onRowSelectionChange:setRowSelection,onCellSelectionChange:setCellSelection,columnResizeMode:"onChange",enableSubRowSelection:false,autoResetCellSelection:false});
  const selectedIds=table.getSelectedRowIds();
  const selected=rows.filter(row=>selectedIds.includes(row.id));
  const totals=selected.reduce((sum,row)=>{const raw=Number(row.amount.replace(/\./g,"").replace(",","."))||0;const cents=Math.round(Math.abs(raw)*100);if(row.type==="INCOME")sum.income+=cents;else if(row.type==="EXPENSE")sum.expenses+=cents;return sum;},{income:0,expenses:0});
  function update(id:string,key:string,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[key]:value}:row));setDirty(current=>new Set(current).add(id));}
  function addDraft(seed:Partial<FinanceGridRow>={}){const id=`draft-${crypto.randomUUID()}`;setRows(current=>[...current,{id,date:today,description:"",merchant:"",categoryId:"",accountId:"",type:"EXPENSE",amount:"",tags:"",source:"DRAFT",draft:true,...seed}]);setDirty(current=>new Set(current).add(id));}
  function changeMode(next:"sheet"|"ledger"|"csv"){setMode(next);localStorage.setItem("tbb-finance-view",next);}
  function smartFill(id:string,value:string){
    const current=rows.find(row=>row.id===id);
    if(!current)return;
    const suggestion=smartEntryPatch(value,categories,smartPreferences,current.tags);
    if(!suggestion)return;
    setRows(all=>all.map(row=>row.id===id?{...row,description:suggestion.description,merchant:row.merchant||suggestion.merchant,categoryId:row.categoryId||suggestion.categoryId,accountId:row.accountId||suggestion.accountId,type:"EXPENSE",amount:row.amount||suggestion.amount,tags:suggestion.tags,smartService:suggestion.service.id}:row));
    setDirty(all=>new Set(all).add(id));
    if(current.smartService!==suggestion.service.id)toast.success(`${suggestion.service.name} reconhecido`,{description:"Descrição, estabelecimento, categoria, tipo e tags foram preenchidos."});
  }
  async function saveSmartPreference(serviceId:SmartServiceId,accountId:string){
    try{
      const response=await fetch("/api/finance/smart-entry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({serviceId,accountId:accountId||null})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível salvar a associação.");
      setSmartPreferences(current=>{const next={...current};if(accountId)next[serviceId]=accountId;else delete next[serviceId];return next});
      toast.success(result.message);
    }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível salvar a associação.")}
  }
  function saveAll(){const changed=rows.filter(row=>dirty.has(row.id)).map(row=>({id:row.id,date:row.date,description:row.description,merchant:row.merchant,categoryId:row.categoryId,accountId:row.accountId,type:row.type,amount:row.amount,tags:row.tags}));if(!changed.length)return;startTransition(async()=>{const result=await saveGridTransactions(changed);if("error" in result)toast.error(result.error);else{toast.success(result.success);setDirty(new Set());router.refresh();}});}
  function discard(){setRows(initialRows);setDirty(new Set());table.resetCellSelection(true);table.resetRowSelection(true);}
  async function copySelection(){const grids=table.getSelectedCellRangesData();if(!grids.length)return;const safe=(value:unknown)=>{const text=String(value??"");const escaped=/^[\t\r ]*[=+@-]/.test(text)?`'${text}`:text;return /["\t\n\r]/.test(escaped)?`"${escaped.replace(/"/g,'""')}"`:escaped;};await navigator.clipboard.writeText(grids.map(grid=>grid.map(row=>row.map(safe).join("\t")).join("\n")).join("\n\n"));toast.success("Seleção copiada.");}
  function paste(event:React.ClipboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;event.preventDefault();try{const text=event.clipboardData.getData("text");const parsed=parseClipboardTable(text);const focus=table.getFocusedCell();if(focus&&editable.includes(focus.column.id as typeof editable[number])){const displayRows=table.getRowModel().rows;const startRow=displayRows.findIndex(row=>row.id===focus.row.id);const visible=table.getVisibleLeafColumns().map(column=>column.id).filter(id=>editable.includes(id as typeof editable[number]));const startColumn=visible.indexOf(focus.column.id);const matrix=parsed.hasHeader?parsed.rows.slice(1):parsed.rows;matrix.forEach((values,rowOffset)=>values.forEach((value,columnOffset)=>{const target=displayRows[startRow+rowOffset];const key=visible[startColumn+columnOffset];if(target&&key)update(target.id,key,value);}));toast.message(`${matrix.length} linha(s) colada(s). Revise e salve.`);}else{const drafts=clipboardDrafts(text,today,accounts[0]?.id||"").map(row=>({...row,source:"DRAFT"}));setRows(current=>[...current,...drafts]);setDirty(current=>new Set([...current,...drafts.map(row=>row.id)]));toast.message(`${drafts.length} rascunho(s) criado(s). Revise antes de salvar.`);}}catch(error){toast.error(error instanceof Error?error.message:"Não foi possível ler a área de transferência.");}}
  function keyboard(event:KeyboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="c"){event.preventDefault();void copySelection();return;}if(event.key==="Escape"){table.resetCellSelection(true);return;}const direction=event.key==="ArrowUp"?"up":event.key==="ArrowDown"?"down":event.key==="ArrowLeft"?"left":event.key==="ArrowRight"?"right":null;if(direction){event.preventDefault();if(event.shiftKey)table.extendCellSelection(direction);else table.moveCellSelection(direction);}}
  function bulkDelete(){if(!selectedIds.length)return;startTransition(async()=>{const fd=new FormData();selectedIds.forEach(id=>fd.append("ids",id));fd.set("operation","DELETE");fd.set("confirmation","EXCLUIR");const result=await bulkTransactions(fd);if("error" in result)toast.error(result.error);else{toast.success(result.success);setRows(current=>current.filter(row=>!selectedIds.includes(row.id)));table.resetRowSelection(true);router.refresh();}});}
  const visibleRows=table.getRowModel().rows;
  const allRowsSelected=table.getIsAllRowsSelected();
  const someRowsSelected=table.getIsSomeRowsSelected()&&!allRowsSelected;
  return <section className="stack" onPaste={paste} onKeyDown={keyboard} aria-busy={pending}>
    <div className="row justify-between"><div className="finance-view-switch" data-mode={mode} role="tablist" aria-label="Visualização das transações"><span className="finance-view-indicator" aria-hidden="true"/><button type="button" role="tab" aria-selected={mode==="ledger"} onClick={()=>changeMode("ledger")}><List size={14}/><span>Lista</span></button><button type="button" role="tab" aria-selected={mode==="sheet"} onClick={()=>changeMode("sheet")}><Table2 size={14}/><span>Planilha</span></button><button type="button" role="tab" aria-selected={mode==="csv"} onClick={()=>changeMode("csv")}><FileSpreadsheet size={14}/><span>CSV / Excel</span></button></div><div className="row"><button type="button" className="button-secondary smart-entry-toggle" data-active={smartOpen||undefined} onClick={()=>setSmartOpen(value=>!value)} aria-expanded={smartOpen}><Sparkles size={14}/>Preenchimento inteligente{Object.keys(smartPreferences).length>0&&<b>{Object.keys(smartPreferences).length}</b>}</button><button type="button" className="button-secondary" onClick={()=>addDraft()}><Plus size={14}/>Adicionar linha</button><button type="button" className="button-secondary" onClick={discard} disabled={!dirty.size}><RotateCcw size={14}/>Descartar</button><button type="button" className="button" onClick={saveAll} disabled={!dirty.size||pending}><Save size={14}/>Salvar {dirty.size||""}</button></div></div>
    {smartOpen&&<SmartEntryPreferences accounts={smartAccounts} preferences={smartPreferences} loading={smartLoading} onClose={()=>setSmartOpen(false)} onPreferenceChange={saveSmartPreference}/>}
    {selectedIds.length>0&&<div className="panel row justify-between"><span><strong>{selectedIds.length}</strong> linhas selecionadas · Receitas {money(totals.income)} · Despesas {money(totals.expenses)} · Líquido {money(totals.income-totals.expenses)}</span><button className="button-secondary text-danger" onClick={bulkDelete}><Trash2 size={14}/>Excluir selecionadas</button></div>}
    {mode==="ledger"?<div key="ledger" className="panel finance-ledger-view">{visibleRows.map(({original:row})=><div className="list-item" key={row.id}><div><h3>{row.description}</h3><small>{row.date} · {accounts.find(a=>a.id===row.accountId)?.name} · {categories.find(c=>c.id===row.categoryId)?.name||"Sem categoria"}</small></div><div className="text-right"><strong className={row.type==="INCOME"?"text-success":row.type==="EXPENSE"?"text-danger":""}>{row.type==="EXPENSE"?"− ":"+ "}{row.amount}</strong><small className="block">{row.source}</small></div></div>)}</div>:mode==="csv"?<CsvExcelGrid rows={rows} accounts={accounts} categories={categories} onUpdate={update} onSmartFill={smartFill} onAdd={()=>addDraft()}/>:
    <div key="sheet" className="finance-grid finance-sheet-view" tabIndex={0} aria-label="Planilha de transações; use as setas para navegar e Shift para estender a seleção"><table style={{width:table.getTotalSize()}}><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} style={{width:header.getSize()}}>{header.column.id==="select"?<div className="grid-select-all"><GridCheckbox checked={allRowsSelected} indeterminate={someRowsSelected} label="Selecionar todas as transações" onChange={table.getToggleAllRowsSelectedHandler()}/></div>:<button className="grid-header" onClick={header.column.getToggleSortingHandler()}>{String(header.column.columnDef.header)} {header.column.getIsSorted()==="asc"?"↑":header.column.getIsSorted()==="desc"?"↓":""}</button>}{header.column.getCanResize()&&<span className={`resize-handle ${header.column.getIsResizing()?"active":""}`} onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}/>}</th>)}</tr>)}</thead><tbody>{visibleRows.map(row=><tr key={row.id} data-draft={row.original.draft||undefined} data-dirty={dirty.has(row.id)||undefined} data-smart={row.original.smartService||undefined}>{row.getVisibleCells().map(cell=>{const id=cell.column.id;const selected=cell.getIsSelected();const edges=selected?cell.getSelectionEdges():null;return <td key={cell.id} tabIndex={cell.getTabIndex()} onMouseDown={cell.getSelectionStartHandler()} onMouseEnter={cell.getSelectionExtendHandler()} className={[id==="select"&&"grid-select-cell",selected&&"cell-selected",cell.getIsFocused()&&"cell-focused",edges?.top&&"cell-edge-top",edges?.right&&"cell-edge-right",edges?.bottom&&"cell-edge-bottom",edges?.left&&"cell-edge-left"].filter(Boolean).join(" ")} style={{width:cell.column.getSize()}}>{id==="select"?<GridCheckbox label={`Selecionar ${row.original.description||"rascunho"}`} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()}/>:id==="categoryId"?<GridSelect label="Categoria" value={row.original.categoryId||""} options={[{value:"",label:"Sem categoria"},...categories.map(option=>({value:option.id,label:option.name}))]} onValueChange={value=>update(row.id,id,value)}/>:id==="accountId"?<GridSelect label="Conta" value={row.original.accountId||""} options={[{value:"",label:"Sem conta · definir depois"},...accounts.map(option=>({value:option.id,label:option.name}))]} onValueChange={value=>update(row.id,id,value)}/>:id==="type"?<GridSelect label="Tipo" value={row.original.type} options={typeOptions} onValueChange={value=>update(row.id,id,value)}/>:id==="source"?<span className="badge">{row.original.source}</span>:<input aria-label={String(cell.column.columnDef.header)} type={id==="date"?"date":"text"} inputMode={id==="amount"?"decimal":undefined} placeholder={id==="description"?"Ex.: Uber, 99, iFood…":undefined} value={String(cell.getValue()??"")} onChange={event=>update(row.id,id,event.target.value)} onBlur={id==="description"?event=>smartFill(row.id,event.target.value):undefined}/>}</td>;})}</tr>)}</tbody></table><button className="grid-add-row" onClick={()=>addDraft()}><Plus size={14}/>Adicionar transação</button></div>}
    <p className="muted text-xs"><ClipboardPaste size={13} className="inline mr-1"/>Cole TSV/CSV fora de uma célula para criar rascunhos. Selecione uma célula e cole uma matriz para preencher um intervalo. Nada entra nos totais antes de “Salvar”.</p>
  </section>;
}
