"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Delete, Loader2, Plus, ReceiptText, Save, Wallet, WalletCards, Wrench, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { displayCalculatorValue } from "./calculator-engine";

type UtilityMode="expense"|"income"|"monthly-income"|"card"|"check"|"save";
type Account={id:string;name:string;institution:string|null;type:string};
type Category={id:string;name:string;type:string;color:string};
type Metadata={accounts:Account[];categories:Category[];today:string};
type SavedCalculation={id:string;label:string;expression:string;result:number;createdAt:string};
type UtilityAction={mode:UtilityMode;title:string;description:string;icon:LucideIcon;tone:string};

const actions:UtilityAction[]=[
  {mode:"expense",title:"Nova despesa",description:"Registrar este valor como gasto",icon:ReceiptText,tone:"expense"},
  {mode:"income",title:"Nova receita",description:"Adicionar uma entrada avulsa",icon:Wallet,tone:"income"},
  {mode:"monthly-income",title:"Renda mensal",description:"Atualizar a referência do mês",icon:WalletCards,tone:"income"},
  {mode:"card",title:"Compra no cartão",description:"Lançar na fatura selecionada",icon:CreditCard,tone:"card"},
  {mode:"check",title:"Conferir cálculo",description:"Revisar expressão e resultado",icon:CheckCircle2,tone:"check"},
  {mode:"save",title:"Salvar cálculo",description:"Nomear e reutilizar depois",icon:Save,tone:"save"},
];

function money(value:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Math.abs(value))}
function localToday(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`}

export function CalculatorUtilities({workspaceId,value,expression,onRecall}:{workspaceId:string;value:number|null;expression:string;onRecall:(value:number)=>void}){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<UtilityMode|null>(null);
  const [metadata,setMetadata]=useState<Metadata|null>(null);
  const [loadingMetadata,setLoadingMetadata]=useState(false);
  const [metadataError,setMetadataError]=useState("");
  const [metadataRetry,setMetadataRetry]=useState(0);
  const metadataRequestRef=useRef(false);
  const [saving,setSaving]=useState(false);
  const [reviewing,setReviewing]=useState(false);
  const [description,setDescription]=useState("");
  const [date,setDate]=useState(localToday);
  const [accountId,setAccountId]=useState("");
  const [categoryId,setCategoryId]=useState("");
  const [label,setLabel]=useState("");
  const [saved,setSaved]=useState<SavedCalculation[]>([]);
  const [savedReady,setSavedReady]=useState(false);
  const storageKey=`tbb-calculator-saved-${workspaceId}`;
  const usableValue=value!==null&&Number.isFinite(value)&&Math.abs(value)>0;

  useEffect(()=>{
    try{const stored=localStorage.getItem(storageKey);if(stored)setSaved(JSON.parse(stored).slice(0,30))}catch{}
    setSavedReady(true);
  },[storageKey]);
  useEffect(()=>{if(savedReady)localStorage.setItem(storageKey,JSON.stringify(saved.slice(0,30)))},[saved,savedReady,storageKey]);
  useEffect(()=>{
    if(!open||metadata||metadataRequestRef.current)return;
    let active=true;
    metadataRequestRef.current=true;
    setMetadataError("");
    setLoadingMetadata(true);
    fetch("/api/finance/calculator-utilities")
      .then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível carregar as opções.");return result as Metadata})
      .then(result=>{if(active){setMetadata(result);setDate(result.today)}})
      .catch(error=>{if(active){const message=error instanceof Error?error.message:"Não foi possível carregar as opções.";setMetadataError(message);toast.error(message)}})
      .finally(()=>{if(active)setLoadingMetadata(false)});
    return()=>{active=false;if(!metadata)metadataRequestRef.current=false};
  },[metadata,metadataRetry,open]);

  const selectedAction=actions.find(action=>action.mode===mode);
  const SelectedIcon=selectedAction?.icon;
  const accounts=useMemo(()=>{
    if(!metadata)return [];
    if(mode==="card")return metadata.accounts.filter(account=>account.type==="CREDIT_CARD");
    if(mode==="income"||mode==="monthly-income")return metadata.accounts.filter(account=>account.type!=="CREDIT_CARD");
    return metadata.accounts.filter(account=>account.type!=="CREDIT_CARD");
  },[metadata,mode]);
  const categories=useMemo(()=>metadata?.categories.filter(category=>category.type===(mode==="income"?"INCOME":"EXPENSE"))||[],[metadata,mode]);
  const selectedAccount=metadata?.accounts.find(account=>account.id===accountId);
  const selectedCategory=metadata?.categories.find(category=>category.id===categoryId);

  function resetReview(){setReviewing(false)}
  function choose(next:UtilityMode){
    if(!usableValue){toast.error("Faça um cálculo com resultado maior que zero primeiro.");return}
    setMode(next);setReviewing(false);setAccountId("");setCategoryId("");
    setDescription(next==="expense"?"Despesa":next==="income"?"Receita":next==="card"?"Compra no cartão":"");
    if(next==="save"&&!label)setLabel(`Cálculo ${new Date().toLocaleDateString("pt-BR")}`);
  }
  function close(){setOpen(false);setMode(null);setReviewing(false)}
  function saveCalculation(){
    if(!usableValue)return;
    const cleanLabel=label.trim();
    if(cleanLabel.length<2){toast.error("Dê um nome ao cálculo.");return}
    const item:SavedCalculation={id:crypto.randomUUID(),label:cleanLabel.slice(0,80),expression:expression||displayCalculatorValue(value),result:value,createdAt:new Date().toISOString()};
    setSaved(current=>[item,...current].slice(0,30));
    setLabel("");
    toast.success("Cálculo salvo nas utilidades.");
  }
  async function confirmFinance(){
    if(!usableValue||!mode||!["expense","income","monthly-income","card"].includes(mode))return;
    setSaving(true);
    try{
      const monthly=mode==="monthly-income";
      const payload=monthly?{
        kind:"monthly-income",amountCents:Math.round(Math.abs(value)*100),date,accountId:accountId||null,expression,
      }:{
        kind:"transaction",type:mode==="income"?"INCOME":"EXPENSE",description:description.trim(),amountCents:Math.round(Math.abs(value)*100),date,accountId:accountId||null,categoryId:categoryId||null,creditCard:mode==="card",expression,
      };
      const response=await fetch("/api/finance/calculator-utilities",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível salvar.");
      toast.success(result.message);
      setMode(null);setReviewing(false);setDescription("");setAccountId("");setCategoryId("");
      router.refresh();
    }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível salvar.")}
    finally{setSaving(false)}
  }

  const financeMode=mode&&["expense","income","monthly-income","card"].includes(mode);
  const canReview=Boolean(usableValue&&date&&(mode==="monthly-income"||description.trim().length>=2)&&(mode!=="card"||accountId));

  return <section className="calculator-utilities" data-open={open||undefined}>
    <button type="button" className="calculator-utilities-trigger" onClick={()=>{setOpen(current=>!current);setMode(null);setReviewing(false)}} aria-expanded={open}>
      <span><Wrench size={15}/><strong>Utilidades</strong></span>
      <small>{usableValue?`Usar ${money(value)}`:"Calcule um valor para usar"}</small>
      {open?<X size={15}/>:<Plus size={15}/>} 
    </button>

    {open&&<div className="calculator-utilities-panel">
      {!mode&&<>
        <header><div><strong>O que deseja fazer?</strong><small>O resultado atual será preenchido automaticamente.</small></div>{loadingMetadata&&<Loader2 className="nav-spinner" size={16}/>}</header>
        {metadataError&&<div className="calculator-utility-load-error"><span>{metadataError}</span><button type="button" onClick={()=>{metadataRequestRef.current=false;setMetadataRetry(current=>current+1)}}>Tentar novamente</button></div>}
        <div className="calculator-utility-grid">{actions.map(action=>{const Icon=action.icon;return <button type="button" key={action.mode} data-tone={action.tone} onClick={()=>choose(action.mode)} disabled={!usableValue}><span><Icon size={16}/></span><strong>{action.title}</strong><small>{action.description}</small></button>})}</div>
        {saved.length>0&&<div className="calculator-saved-preview"><span>{saved.length} cálculo(s) salvo(s)</span><button type="button" onClick={()=>setMode("save")}>Ver salvos</button></div>}
      </>}

      {mode&&<header className="calculator-utility-heading"><button type="button" onClick={()=>{setMode(null);setReviewing(false)}} aria-label="Voltar"><ArrowLeft size={15}/></button><span className="calculator-utility-heading-icon" data-tone={selectedAction?.tone}>{SelectedIcon&&<SelectedIcon size={16}/>}</span><div><strong>{selectedAction?.title}</strong><small>{money(value||0)} selecionados</small></div></header>}

      {financeMode&&!reviewing&&<div className="calculator-utility-form">
        {mode!=="monthly-income"&&<label><span>Descrição</span><input value={description} onChange={event=>{setDescription(event.target.value);resetReview()}} placeholder={mode==="card"?"Ex.: mercado no cartão":"Ex.: mercado, salário, reembolso"} autoFocus/></label>}
        <div className="calculator-utility-row"><label><span>Data</span><input type="date" value={date} onChange={event=>{setDate(event.target.value);resetReview()}}/></label><label><span>{mode==="card"?"Cartão":"Conta"}</span><select value={accountId} onChange={event=>{setAccountId(event.target.value);setCategoryId("");resetReview()}} disabled={loadingMetadata}><option value="">{mode==="card"?(loadingMetadata?"Carregando…":"Selecione o cartão"):(loadingMetadata?"Carregando…":"Sem conta por enquanto")}</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}{account.institution?` · ${account.institution}`:""}</option>)}</select></label></div>
        {mode!=="monthly-income"&&<label><span>Categoria</span><select value={categoryId} onChange={event=>{setCategoryId(event.target.value);resetReview()}} disabled={loadingMetadata}><option value="">Sem categoria</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
        {mode==="card"&&!loadingMetadata&&!accounts.length&&<p className="calculator-utility-warning">Nenhum cartão ativo. Configure um cartão em Finanças para usar esta opção.</p>}
        <button type="button" className="calculator-utility-primary" disabled={!canReview||loadingMetadata} onClick={()=>setReviewing(true)}><Check size={15}/>Conferir antes de salvar</button>
      </div>}

      {financeMode&&reviewing&&<div className="calculator-utility-review">
        <span className="calculator-review-status"><CheckCircle2 size={15}/>Pronto para confirmar</span>
        <dl><div><dt>Destino</dt><dd>{mode==="monthly-income"?"Renda mensal":mode==="card"?"Compra no cartão":mode==="income"?"Nova receita":"Nova despesa"}</dd></div><div><dt>Valor</dt><dd>{money(value||0)}</dd></div>{mode!=="monthly-income"&&<div><dt>Descrição</dt><dd>{description}</dd></div>}<div><dt>Data</dt><dd>{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}</dd></div><div><dt>{mode==="card"?"Cartão":"Conta"}</dt><dd>{selectedAccount?.name||"Sem conta por enquanto"}</dd></div>{mode!=="monthly-income"&&<div><dt>Categoria</dt><dd>{selectedCategory?.name||"Sem categoria"}</dd></div>}<div><dt>Cálculo</dt><dd>{expression||displayCalculatorValue(value||0)}</dd></div></dl>
        <div className="calculator-review-actions"><button type="button" onClick={()=>setReviewing(false)} disabled={saving}>Editar</button><button type="button" className="calculator-utility-primary" onClick={()=>void confirmFinance()} disabled={saving}>{saving?<Loader2 className="nav-spinner" size={15}/>:<Save size={15}/>} {saving?"Salvando…":"Confirmar e salvar"}</button></div>
      </div>}

      {mode==="check"&&<div className="calculator-check-result"><span><CheckCircle2 size={18}/></span><div><strong>Cálculo válido</strong><small>A expressão foi processada localmente, sem arredondar o resultado usado.</small></div><dl><div><dt>Expressão</dt><dd>{expression||displayCalculatorValue(value||0)}</dd></div><div><dt>Resultado</dt><dd>{displayCalculatorValue(value||0)}</dd></div><div><dt>Como dinheiro</dt><dd>{money(value||0)}</dd></div><div><dt>Em centavos</dt><dd>{Math.round(Math.abs(value||0)*100).toLocaleString("pt-BR")}</dd></div></dl><button type="button" className="calculator-utility-primary" onClick={()=>choose("expense")}><ReceiptText size={15}/>Usar em nova despesa</button></div>}

      {mode==="save"&&<div className="calculator-save-panel">
        {usableValue&&<div className="calculator-save-form"><label><span>Nome do cálculo</span><input value={label} onChange={event=>setLabel(event.target.value)} placeholder="Ex.: parcelas do notebook" autoFocus/></label><button type="button" className="calculator-utility-primary" onClick={saveCalculation}><Save size={15}/>Salvar {money(value||0)}</button></div>}
        <div className="calculator-saved-list"><header><strong>Cálculos salvos</strong><small>{saved.length}/30</small></header>{saved.map(item=><article key={item.id}><button type="button" className="calculator-saved-use" onClick={()=>{onRecall(item.result);setMode(null);toast.success("Valor recuperado na calculadora.")}}><span><strong>{item.label}</strong><small>{item.expression}</small></span><b>{money(item.result)}</b></button><button type="button" className="calculator-saved-delete" onClick={()=>setSaved(current=>current.filter(savedItem=>savedItem.id!==item.id))} aria-label={`Excluir ${item.label}`}><Delete size={14}/></button></article>)}{!saved.length&&<p>Nenhum cálculo salvo ainda.</p>}</div>
      </div>}
    </div>}
  </section>;
}
