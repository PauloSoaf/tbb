"use client";

import {
  useEffect,
  useMemo,
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
  type SortingState,
} from "@tanstack/react-table";
import { Check, ClipboardPaste, FileSpreadsheet, List, MessageSquarePlus, MessageSquareText, Minus, Plus, RotateCcw, Save, Sparkles, Table2, Trash2 } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { GridSelect } from "@/components/ui/GridSelect";
import { useLocalStorageString } from "@/lib/use-local-storage-string";
import { bulkTransactions, saveGridTransactions, type GridTransactionInput } from "./actions";
import { clipboardDrafts, parseClipboardTable } from "./clipboard-parser";
import { CsvExcelGrid } from "./CsvExcelGrid";
import { mergeServerRows, newDraftId, orderGridRows, validateGridRow } from "./grid-order";
import { LedgerView } from "./LedgerView";
import { TransactionDetailsDrawer } from "./TransactionDetailsDrawer";
import { hasNote, notePreview } from "./transaction-notes";
import { money } from "./money";
import { SmartEntryPreferences, type SmartEntryAccount } from "./SmartEntryPreferences";
import { smartEntryPatch, type SmartAccountPreferences, type SmartServiceId } from "./smart-entry";

export type FinanceGridRow = GridTransactionInput & { id: string; source: string; draft?: boolean; smartService?:SmartServiceId; createdAt?: string; updatedAt?: string; originLabel?: string };
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
  helper.display({ id: "notes", header: "Obs.", size: 64, enableCellSelection: false, enableResizing: false, enableSorting: false }),
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

/** Opens the details panel. The note icon is shown only when the row actually has a note. */
function NoteCell({ row, onOpen }: { row: FinanceGridRow; onOpen: () => void }) {
  const noted = hasNote(row.notes);
  const label = noted ? `Observação de ${row.description || "rascunho"}: ${notePreview(row.notes, 120)}` : `Adicionar observação a ${row.description || "rascunho"}`;
  const button = <button type="button" className="grid-note-button" data-has-note={noted || undefined} aria-label={label} onClick={onOpen}>{noted ? <MessageSquareText size={15} /> : <MessageSquarePlus size={15} />}</button>;
  return noted ? <AppTooltip content={notePreview(row.notes, 160)} side="left">{button}</AppTooltip> : button;
}

export function FinanceDataGrid({ initialRows, accounts, categories, today, timeZone = "America/Manaus" }: { initialRows: FinanceGridRow[]; accounts: Option[]; categories: Option[]; today: string; timeZone?: string }) {
  const router=useRouter();
  const [rows,setRows]=useState(initialRows);
  const [rowSelection,setRowSelection]=useState<RowSelectionState>({});
  const [cellSelection,setCellSelection]=useState<CellSelectionState>([]);
  const [dirty,setDirty]=useState(new Set<string>());
  const [sorting,setSorting]=useState<SortingState>([]);
  const [detailsId,setDetailsId]=useState<string|null>(null);
  const [invalid,setInvalid]=useState<Map<string,string>>(new Map());
  const [serverRows,setServerRows]=useState(initialRows);
  const focusRequest=useRef<{id:string;field:string}|null>(null);
  // After a refresh the server rows replace saved drafts; unsaved drafts and edits survive, once.
  if(serverRows!==initialRows){const merged=mergeServerRows(rows,initialRows,dirty);setServerRows(initialRows);setRows(merged.rows);setDirty(merged.dirty);}
  const [pending,startTransition]=useTransition();
  const [storedMode,setStoredMode]=useLocalStorageString("tbb-finance-view","sheet");
  const mode=storedMode==="ledger"||storedMode==="csv"?storedMode:"sheet";
  const [smartOpen,setSmartOpen]=useState(false);
  const [smartLoading,setSmartLoading]=useState(true);
  const [smartAccounts,setSmartAccounts]=useState<SmartEntryAccount[]>([]);
  const [smartPreferences,setSmartPreferences]=useState<SmartAccountPreferences>({});
  useEffect(()=>{
    let active=true;
    fetch("/api/finance/smart-entry").then(async response=>{if(!response.ok)throw new Error("preferences");return response.json()}).then(result=>{if(active){setSmartAccounts(result.accounts);setSmartPreferences(result.preferences)}}).catch(()=>{}).finally(()=>{if(active)setSmartLoading(false)});
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    // Focus the field of a row that was just added, unless a dialog already owns the focus.
    const request=focusRequest.current;
    if(!request)return;
    if(document.querySelector("dialog[open]")){focusRequest.current=null;return;}
    const target=document.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(request.id)}"][data-field="${request.field}"]`);
    if(target){focusRequest.current=null;target.focus();}
  });
  const labels=useMemo(()=>({categoryId:(id:string)=>categories.find(option=>option.id===id)?.name??"",accountId:(id:string)=>accounts.find(option=>option.id===id)?.name??""}),[accounts,categories]);
  // Drafts stay on top whichever column is sorted, so we order the rows ourselves.
  const ordered=useMemo(()=>orderGridRows(rows,sorting,labels),[rows,sorting,labels]);
  const table=useTable({features,columns,data:ordered,getRowId:row=>row.id,manualSorting:true,state:{rowSelection,cellSelection,sorting},onSortingChange:setSorting,onRowSelectionChange:setRowSelection,onCellSelectionChange:setCellSelection,columnResizeMode:"onChange",enableSubRowSelection:false,autoResetCellSelection:false});
  const selectedIds=table.getSelectedRowIds();
  const selected=rows.filter(row=>selectedIds.includes(row.id));
  const totals=selected.reduce((sum,row)=>{const raw=Number(row.amount.replace(/\./g,"").replace(",","."))||0;const cents=Math.round(Math.abs(raw)*100);if(row.type==="INCOME")sum.income+=cents;else if(row.type==="EXPENSE")sum.expenses+=cents;return sum;},{income:0,expenses:0});
  function update(id:string,key:string,value:string){setRows(current=>current.map(row=>row.id===id?{...row,[key]:value}:row));setDirty(current=>new Set(current).add(id));setInvalid(current=>{if(!current.has(id))return current;const next=new Map(current);next.delete(id);return next;});}
  // A new row always goes on top, where it is seen, and takes the focus. Nothing is stored until "Salvar".
  function addDraft(seed:Partial<FinanceGridRow>={}){const id=newDraftId();setRows(current=>[{id,date:today,description:"",merchant:"",categoryId:"",accountId:"",type:"EXPENSE",amount:"",tags:"",notes:"",source:"DRAFT",draft:true,...seed},...current]);setDirty(current=>new Set(current).add(id));focusRequest.current={id,field:"description"};}
  function removeDrafts(ids:string[]){const gone=new Set(ids);setRows(current=>current.filter(row=>!gone.has(row.id)));setDirty(current=>new Set([...current].filter(id=>!gone.has(id))));setInvalid(current=>new Map([...current].filter(([id])=>!gone.has(id))));}
  function changeMode(next:"sheet"|"ledger"|"csv"){setStoredMode(next);}
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
  function saveAll(){
    const pendingRows=rows.filter(row=>dirty.has(row.id));
    if(!pendingRows.length)return;
    // Incomplete rows can be left alone while typing, but they are never sent to the server.
    const problems=new Map<string,string>();
    for(const row of pendingRows){const message=validateGridRow(row);if(message)problems.set(row.id,message);}
    if(problems.size){
      setInvalid(problems);
      const first=pendingRows.find(row=>problems.has(row.id))!;
      const message=problems.get(first.id)!;
      focusRequest.current={id:first.id,field:/descri/i.test(message)?"description":/data/i.test(message)?"date":"amount"};
      toast.error(`${message} (${first.description.trim()||"rascunho sem descrição"})${problems.size>1?` · mais ${problems.size-1} linha(s) com problema`:""}`);
      return;
    }
    setInvalid(new Map());
    const changed=pendingRows.map(row=>({id:row.id,date:row.date,description:row.description,merchant:row.merchant,categoryId:row.categoryId,accountId:row.accountId,type:row.type,amount:row.amount,tags:row.tags,notes:row.notes??""}));
    startTransition(async()=>{const result=await saveGridTransactions(changed);if("error" in result)toast.error(result.error);else{toast.success(result.success);setDirty(new Set());router.refresh();}});
  }
  function discard(){setRows(initialRows);setDirty(new Set());setInvalid(new Map());table.resetCellSelection(true);table.resetRowSelection(true);}
  async function copySelection(){const grids=table.getSelectedCellRangesData();if(!grids.length)return;const safe=(value:unknown)=>{const text=String(value??"");const escaped=/^[\t\r ]*[=+@-]/.test(text)?`'${text}`:text;return /["\t\n\r]/.test(escaped)?`"${escaped.replace(/"/g,'""')}"`:escaped;};await navigator.clipboard.writeText(grids.map(grid=>grid.map(row=>row.map(safe).join("\t")).join("\n")).join("\n\n"));toast.success("Seleção copiada.");}
  function paste(event:React.ClipboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;event.preventDefault();try{const text=event.clipboardData.getData("text");const parsed=parseClipboardTable(text);const focus=table.getFocusedCell();if(focus&&editable.includes(focus.column.id as typeof editable[number])){const displayRows=table.getRowModel().rows;const startRow=displayRows.findIndex(row=>row.id===focus.row.id);const visible=table.getVisibleLeafColumns().map(column=>column.id).filter(id=>editable.includes(id as typeof editable[number]));const startColumn=visible.indexOf(focus.column.id);const matrix=parsed.hasHeader?parsed.rows.slice(1):parsed.rows;matrix.forEach((values,rowOffset)=>values.forEach((value,columnOffset)=>{const target=displayRows[startRow+rowOffset];const key=visible[startColumn+columnOffset];if(target&&key)update(target.id,key,value);}));toast.message(`${matrix.length} linha(s) colada(s). Revise e salve.`);}else{const drafts=clipboardDrafts(text,today,accounts[0]?.id||"").map(row=>({...row,notes:"",source:"DRAFT"}));setRows(current=>[...drafts,...current]);setDirty(current=>new Set([...current,...drafts.map(row=>row.id)]));if(drafts[0])focusRequest.current={id:drafts[0].id,field:"description"};toast.message(`${drafts.length} rascunho(s) criado(s). Revise antes de salvar.`);}}catch(error){toast.error(error instanceof Error?error.message:"Não foi possível ler a área de transferência.");}}
  function keyboard(event:KeyboardEvent<HTMLDivElement>){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="c"){event.preventDefault();void copySelection();return;}if(event.key==="Escape"){table.resetCellSelection(true);return;}const direction=event.key==="ArrowUp"?"up":event.key==="ArrowDown"?"down":event.key==="ArrowLeft"?"left":event.key==="ArrowRight"?"right":null;if(direction){event.preventDefault();if(event.shiftKey)table.extendCellSelection(direction);else table.moveCellSelection(direction);}}
  function bulkDelete(){
    if(!selectedIds.length)return;
    // Drafts only exist in this browser: discard them locally and delete just the saved rows on the server.
    const draftIds=selectedIds.filter(id=>id.startsWith("draft-"));
    const savedIds=selectedIds.filter(id=>!id.startsWith("draft-"));
    if(draftIds.length)removeDrafts(draftIds);
    if(!savedIds.length){table.resetRowSelection(true);toast.success(`${draftIds.length} rascunho(s) descartado(s).`);return;}
    startTransition(async()=>{const fd=new FormData();savedIds.forEach(id=>fd.append("ids",id));fd.set("operation","DELETE");fd.set("confirmation","EXCLUIR");const result=await bulkTransactions(fd);if("error" in result)toast.error(result.error);else{toast.success(result.success);setRows(current=>current.filter(row=>!savedIds.includes(row.id)));table.resetRowSelection(true);router.refresh();}});
  }
  const visibleRows=table.getRowModel().rows;
  const allRowsSelected=table.getIsAllRowsSelected();
  const someRowsSelected=table.getIsSomeRowsSelected()&&!allRowsSelected;
  return <section className="stack" onPaste={paste} onKeyDown={keyboard} aria-busy={pending}>
    <div className="row justify-between"><div className="finance-view-switch" data-mode={mode} role="tablist" aria-label="Visualização das transações"><span className="finance-view-indicator" aria-hidden="true"/><button type="button" role="tab" aria-selected={mode==="ledger"} onClick={()=>changeMode("ledger")}><List size={14}/><span>Lista</span></button><button type="button" role="tab" aria-selected={mode==="sheet"} onClick={()=>changeMode("sheet")}><Table2 size={14}/><span>Planilha</span></button><button type="button" role="tab" aria-selected={mode==="csv"} onClick={()=>changeMode("csv")}><FileSpreadsheet size={14}/><span>CSV / Excel</span></button></div><div className="row"><button type="button" className="button-secondary smart-entry-toggle" data-active={smartOpen||undefined} onClick={()=>setSmartOpen(value=>!value)} aria-expanded={smartOpen}><Sparkles size={14}/>Preenchimento inteligente{Object.keys(smartPreferences).length>0&&<b>{Object.keys(smartPreferences).length}</b>}</button><button type="button" className="button-secondary" onClick={()=>addDraft()}><Plus size={14}/>Adicionar linha</button><button type="button" className="button-secondary" onClick={discard} disabled={!dirty.size}><RotateCcw size={14}/>Descartar</button><button type="button" className="button" onClick={saveAll} disabled={!dirty.size||pending}><Save size={14}/>Salvar {dirty.size||""}</button></div></div>
    {smartOpen&&<SmartEntryPreferences accounts={smartAccounts} preferences={smartPreferences} loading={smartLoading} onClose={()=>setSmartOpen(false)} onPreferenceChange={saveSmartPreference}/>}
    {selectedIds.length>0&&<div className="panel row justify-between"><span><strong>{selectedIds.length}</strong> linhas selecionadas · Receitas {money(totals.income)} · Despesas {money(totals.expenses)} · Líquido {money(totals.income-totals.expenses)}</span><button className="button-secondary text-danger" onClick={bulkDelete}><Trash2 size={14}/>Excluir selecionadas</button></div>}
    {mode==="ledger"?<LedgerView rows={ordered} accounts={accounts} categories={categories} timeZone={timeZone} invalid={invalid} onUpdate={update} onRemoveDraft={id=>removeDrafts([id])}/>:mode==="csv"?<CsvExcelGrid rows={ordered} accounts={accounts} categories={categories} invalid={invalid} onUpdate={update} onSmartFill={smartFill} onAdd={()=>addDraft()} onRemoveDraft={id=>removeDrafts([id])} onOpenDetails={setDetailsId}/>:
    <div key="sheet" className="finance-grid finance-sheet-view" tabIndex={0} aria-label="Planilha de transações; use as setas para navegar e Shift para estender a seleção"><table style={{width:table.getTotalSize()}}><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} style={{width:header.getSize()}}>{header.column.id==="select"?<div className="grid-select-all"><GridCheckbox checked={allRowsSelected} indeterminate={someRowsSelected} label="Selecionar todas as transações" onChange={table.getToggleAllRowsSelectedHandler()}/></div>:header.column.id==="notes"?<span className="grid-header grid-header-static" title="Observação opcional de cada lançamento">Obs.</span>:<button className="grid-header" onClick={header.column.getToggleSortingHandler()}>{String(header.column.columnDef.header)} {header.column.getIsSorted()==="asc"?"↑":header.column.getIsSorted()==="desc"?"↓":""}</button>}{header.column.getCanResize()&&<span className={`resize-handle ${header.column.getIsResizing()?"active":""}`} onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}/>}</th>)}</tr>)}</thead><tbody>{visibleRows.map(row=><tr key={row.id} data-draft={row.original.draft||undefined} data-dirty={dirty.has(row.id)||undefined} data-smart={row.original.smartService||undefined} data-invalid={invalid.has(row.id)||undefined} title={invalid.get(row.id)}>{row.getVisibleCells().map(cell=>{const id=cell.column.id;const selected=cell.getIsSelected();const edges=selected?cell.getSelectionEdges():null;return <td key={cell.id} tabIndex={cell.getTabIndex()} onMouseDown={cell.getSelectionStartHandler()} onMouseEnter={cell.getSelectionExtendHandler()} className={[id==="select"&&"grid-select-cell",selected&&"cell-selected",cell.getIsFocused()&&"cell-focused",edges?.top&&"cell-edge-top",edges?.right&&"cell-edge-right",edges?.bottom&&"cell-edge-bottom",edges?.left&&"cell-edge-left"].filter(Boolean).join(" ")} style={{width:cell.column.getSize()}}>{id==="select"?<GridCheckbox label={`Selecionar ${row.original.description||"rascunho"}`} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()}/>:id==="categoryId"?<GridSelect label="Categoria" value={row.original.categoryId||""} options={[{value:"",label:"Sem categoria"},...categories.map(option=>({value:option.id,label:option.name}))]} onValueChange={value=>update(row.id,id,value)}/>:id==="accountId"?<GridSelect label="Conta" value={row.original.accountId||""} options={[{value:"",label:"Sem conta · definir depois"},...accounts.map(option=>({value:option.id,label:option.name}))]} onValueChange={value=>update(row.id,id,value)}/>:id==="type"?<GridSelect label="Tipo" value={row.original.type} options={typeOptions} onValueChange={value=>update(row.id,id,value)}/>:id==="source"?<span className="badge" data-unsaved={row.original.draft||undefined}>{row.original.draft?"Não salvo":row.original.originLabel || row.original.source}</span>:id==="notes"?<NoteCell row={row.original} onOpen={()=>setDetailsId(row.id)}/>:<input data-row-id={row.id} data-field={id} aria-label={String(cell.column.columnDef.header)} type={id==="date"?"date":"text"} inputMode={id==="amount"?"decimal":undefined} placeholder={id==="description"?"Ex.: Uber, 99, iFood…":undefined} value={String(cell.getValue()??"")} onChange={event=>update(row.id,id,event.target.value)} onBlur={id==="description"?event=>smartFill(row.id,event.target.value):undefined}/>}</td>;})}</tr>)}</tbody></table><button className="grid-add-row" onClick={()=>addDraft()} title="A nova linha aparece no topo da tabela"><Plus size={14}/>Adicionar transação</button></div>}
    <TransactionDetailsDrawer row={detailsId?rows.find(row=>row.id===detailsId)??null:null} accounts={accounts} categories={categories} timeZone={timeZone} onChange={update} onClose={()=>setDetailsId(null)}/>
    <p className="muted text-xs"><ClipboardPaste size={13} className="inline mr-1"/>Linhas novas entram no topo. Cole TSV/CSV fora de uma célula para criar rascunhos. Selecione uma célula e cole uma matriz para preencher um intervalo. Nada entra nos totais antes de “Salvar”.</p>
  </section>;
}
