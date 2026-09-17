"use client";

import { useRef,useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot,CheckCircle2,Info,Sparkles,Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CapturedTransaction } from "./natural-language";

type Account={id:string;name:string;institution?:string|null;type?:string};
const accountLabel=(account:Account)=>`${account.type==="CREDIT_CARD"?"Cartão":"Conta"} · ${account.name}${account.institution&&account.institution!==account.name?` · ${account.institution}`:""}`;
type Notice={tone:"success"|"info";text:string};
const example=`renda mensal 5500
13/09 uber 29 reais nubank
uber 43 reais itau credito
uber 22 reais nubank debito`;
const brl=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);

export function NaturalLanguageCapture({accounts,today,compact=false}:{accounts:Account[];today:string;compact?:boolean}){
  const router=useRouter();
  const reviewRef=useRef<HTMLDivElement>(null);
  const [text,setText]=useState("");
  const [items,setItems]=useState<CapturedTransaction[]>([]);
  const [provider,setProvider]=useState<string|null>(null);
  const [phase,setPhase]=useState<"idle"|"parsing"|"saving">("idle");
  const [notice,setNotice]=useState<Notice|null>(null);
  const [pending,startTransition]=useTransition();
  const total=items.reduce((sum,item)=>sum+item.amountCents,0);

  function parse(){
    setPhase("parsing");
    setNotice(null);
    startTransition(async()=>{
      try{
        const response=await fetch("/api/finance/capture",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"parse",text,today})});
        const result=await response.json();
        if(!response.ok){toast.error(result.error||"Não foi possível interpretar o texto.");return}
        const transactions=result.transactions as CapturedTransaction[];
        setItems(transactions);
        setProvider(result.provider);
        if(!transactions.length){toast.error("Nenhuma transação foi encontrada. Inclua descrição e valor.");return}
        requestAnimationFrame(()=>reviewRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}));
      }finally{setPhase("idle")}
    });
  }
  function update(index:number,patch:Partial<CapturedTransaction>){setItems(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,...patch}:item))}
  function confirm(){
    setPhase("saving");
    startTransition(async()=>{
      try{
        const response=await fetch("/api/finance/capture",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"confirm",transactions:items})});
        const result=await response.json();
        if(!response.ok){toast.error(result.error||"Não foi possível adicionar as transações.");return}
        const created=Number(result.created)||0;
        const skipped=Number(result.skipped)||0;
        const message=created?`${created} transação(ões) adicionada(s) ao Finance${skipped?`; ${skipped} duplicada(s) ignorada(s)`:""}. Os totais foram atualizados.`:`Nenhuma transação nova foi adicionada; ${skipped||items.length} já existia(m).`;
        setNotice({tone:created?"success":"info",text:message});
        setItems([]);
        setText("");
        setProvider(null);
        if(created)toast.success(`${created} transação(ões) adicionada(s).`);else toast.info("Os lançamentos já existiam.");
        router.refresh();
      }finally{setPhase("idle")}
    });
  }

  return <section className={`${compact?"capture-box":"panel stack"} transaction-capture`} aria-busy={pending}>
    <div className="capture-heading"><div className="capture-icon"><Sparkles size={20}/></div><div><h2>Adicionar por texto</h2><p className="muted">Escreva como você fala ou cole mensagens do WhatsApp. Você revisa antes de salvar.</p></div>{provider&&<span className="badge capture-provider"><Bot size={12}/>{provider==="openai"?"GPT":"Leitura local"}</span>}</div>
    {notice&&<div className="capture-notice" data-tone={notice.tone} role="status">{notice.tone==="success"?<CheckCircle2 size={18}/>:<Info size={18}/>}<span>{notice.text}</span>{notice.tone==="success"&&<a href="#resumo">Ver resumo</a>}</div>}
    <label className="capture-input"><span>Transações</span><textarea rows={compact?4:5} value={text} onChange={event=>setText(event.target.value)} placeholder={example}/><small>Uma transação por linha. Em frases como “renda mensal 5500”, a moeda pode ser omitida. A conta é opcional.</small></label>
    <div className="capture-entry-actions"><span className="muted"><Info size={14}/>Interpretar cria uma revisão e ainda não altera seus totais.</span><button className="button" onClick={parse} disabled={pending||text.trim().length<3}><Sparkles size={15}/>{phase==="parsing"?"Interpretando…":"Revisar transações"}</button></div>
    {items.length>0&&<div className="capture-review" ref={reviewRef}>
      <header><div><span className="eyebrow">REVISÃO OBRIGATÓRIA</span><h3>{items.length} transação(ões) · {brl(total)}</h3><p>Ainda não foram salvas. Ajuste os campos e confirme abaixo.</p></div><span className="capture-unsaved">Não salvo</span></header>
      <div className="capture-review-list">{items.map((item,index)=><article className="capture-review-row" key={`${item.date}-${index}`}>
        <label><span>Data</span><input type="date" value={item.date} onChange={event=>update(index,{date:event.target.value})}/></label>
        <label className="capture-description"><span>Descrição {item.recurring&&<em className="capture-recurring">↻ mensal</em>}</span><input value={item.description} onChange={event=>update(index,{description:event.target.value})}/></label>
        <label><span>Tipo</span><select value={item.type} onChange={event=>update(index,{type:event.target.value as CapturedTransaction["type"]})}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option><option value="REFUND">Reembolso</option></select></label>
        <label><span>Valor</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={item.amountCents/100} onChange={event=>update(index,{amountCents:Math.round(Number(event.target.value)*100)})}/></label>
        <label className="capture-account"><span>Conta</span><select value={item.accountId||""} onChange={event=>update(index,{accountId:event.target.value||null})}><option value="">Sem conta · vincular depois</option>{accounts.map(account=><option value={account.id} key={account.id}>{accountLabel(account)}</option>)}</select></label>
        <button className="icon-button capture-remove" onClick={()=>setItems(current=>current.filter((_,itemIndex)=>itemIndex!==index))} aria-label={`Remover ${item.description}`}><Trash2 size={16}/></button>
      </article>)}</div>
      <footer><div><strong>Confirme para lançar</strong><small>Após adicionar, despesas, saldos e gráficos são recalculados.</small></div><button className="button capture-confirm" onClick={confirm} disabled={pending||!items.length}><CheckCircle2 size={16}/>{phase==="saving"?"Adicionando…":`Adicionar ${items.length} ao Finance`}</button></footer>
    </div>}
  </section>;
}
