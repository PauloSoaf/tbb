"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { Bot,Calculator,CalendarDays,Check,CheckCheck,FileSpreadsheet,Lightbulb,Loader2,Maximize2,Send,Target,Wallet,Wrench,X } from "lucide-react";
import { toast } from "sonner";
import type { CapturedTransaction } from "@/features/finance/natural-language";
import { FloatingCalculatorWindow } from "./FloatingCalculatorWindow";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";

type Message={role:"user"|"assistant";text:string};
type ProposedAction={kind:"transactions";transactions:CapturedTransaction[]}|{kind:"task";title:string;dueDate:string|null}|{kind:"goal";name:string;target:number;unit:string;targetDate:string|null};

const shortcuts=[
  {title:"Agenda",description:"Todos os compromissos do TBB.",href:"/calendar",icon:CalendarDays},
  {title:"Transações",description:"Ledger, captura por texto e planilha.",href:"/finance#transacoes",icon:Wallet},
  {title:"Importar extrato",description:"CSV, PDF ou dados colados.",href:"/finance/imports",icon:FileSpreadsheet},
  {title:"Hábitos de hoje",description:"Registrar a rotina rapidamente.",href:"/habits?view=today",icon:CheckCheck},
  {title:"Metas",description:"Atualizar progresso e foco.",href:"/goals",icon:Target},
  {title:"Insights",description:"Ler sinais dos seus dados.",href:"/insights",icon:Lightbulb},
];

function fallbackAnswer(path:string){return `Não consegui consultar os dados agora. Você continua no contexto de ${path}; tente novamente ou use as ferramentas rápidas.`}

export function FloatingActionDock({workspaceId}:{workspaceId:string}){
  const canWrite=useFinanceWriteAccess();
  const pathname=usePathname();
  const router=useRouter();
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [calculatorOpen,setCalculatorOpen]=useState(false);
  const [calculatorMinimized,setCalculatorMinimized]=useState(false);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [action,setAction]=useState<ProposedAction|null>(null);
  const initial=useMemo<Message[]>(()=>[{role:"assistant",text:"Oi, eu sou o Assistente TBB. Posso consultar seu workspace e preparar transações, tarefas e metas para sua confirmação."}],[]);
  const [messages,setMessages]=useState(initial);

  useEffect(()=>{try{const saved=localStorage.getItem(`tbb-assistant-${workspaceId}`);if(saved)queueMicrotask(()=>setMessages(JSON.parse(saved)))}catch{}},[workspaceId]);
  useEffect(()=>{localStorage.setItem(`tbb-assistant-${workspaceId}`,JSON.stringify(messages.slice(-30)))},[messages,workspaceId]);
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setAssistantOpen(false);setToolsOpen(false)}};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[]);

  function openCalculator(){setCalculatorOpen(true);setCalculatorMinimized(false);setToolsOpen(false)}

  async function submit(){
    const prompt=input.trim();
    if(!prompt||loading)return;
    setMessages(current=>[...current,{role:"user",text:prompt}]);
    setInput("");setAction(null);setLoading(true);
    try{
      const response=await fetch("/api/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,route:pathname})});
      if(!response.ok||!response.body)throw new Error("request");
      const encoded=response.headers.get("x-tbb-action");
      if(encoded)setAction(JSON.parse(decodeURIComponent(encoded)));
      setMessages(current=>[...current,{role:"assistant",text:""}]);
      const reader=response.body.getReader(),decoder=new TextDecoder();
      while(true){const {done,value}=await reader.read();if(done)break;const chunk=decoder.decode(value,{stream:true});setMessages(current=>current.map((message,index)=>index===current.length-1?{...message,text:message.text+chunk}:message))}
    }catch{setMessages(current=>[...current,{role:"assistant",text:fallbackAnswer(pathname)}])}
    finally{setLoading(false)}
  }

  async function confirmAction(){
    if(!action||loading||!canWrite)return;
    setLoading(true);
    try{
      const endpoint=action.kind==="transactions"?"/api/finance/capture":"/api/assistant/actions";
      const body=action.kind==="transactions"?{mode:"confirm",transactions:action.transactions}:action;
      const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível concluir.");
      const label=action.kind==="transactions"?`${result.created} transação(ões) adicionada(s).`:action.kind==="task"?"Tarefa adicionada.":"Meta adicionada.";
      setMessages(current=>[...current,{role:"assistant",text:label}]);setAction(null);toast.success(label);router.refresh();
    }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível concluir.")}
    finally{setLoading(false)}
  }

  return <>
    <div className="floating-dock">
      <button className="floating-dock-ai" onClick={()=>setAssistantOpen(true)} aria-label="Abrir Assistente TBB"><Bot size={20}/><span>Assistente IA</span></button>
      <button className="floating-dock-calculator" data-active={calculatorOpen||undefined} onClick={openCalculator} aria-label="Abrir calculadora profissional"><Calculator size={20}/><span>{calculatorOpen?"Restaurar calculadora":"Calculadora"}</span></button>
      <button className="floating-dock-tools" onClick={()=>setToolsOpen(true)} aria-label="Abrir ferramentas rápidas"><Wrench size={20}/><span>Ferramentas</span></button>
    </div>

    <div className="floating-layer" data-open={assistantOpen}>
      {assistantOpen&&<button className="floating-backdrop" aria-label="Fechar assistente" onClick={()=>setAssistantOpen(false)}/>}<aside className="floating-drawer" aria-hidden={!assistantOpen}><header><div className="row"><span className="drawer-icon"><Bot size={20}/></span><div><h2>Assistente TBB</h2><small>Consulta e ações com confirmação</small></div></div><button className="icon-button" onClick={()=>setAssistantOpen(false)} aria-label="Fechar"><X size={18}/></button></header><div className="assistant-prompts">{["uber 29 reais","adicione tarefa revisar currículo amanhã","crie uma meta ler 12 livros"].map(prompt=><button key={prompt} onClick={()=>setInput(prompt)}>{prompt}</button>)}</div><div className="assistant-messages">{messages.map((message,index)=><p key={index} data-role={message.role}>{message.text}</p>)}{action&&canWrite&&<ActionPreview action={action} onConfirm={()=>void confirmAction()} onCancel={()=>setAction(null)} disabled={loading}/>} {loading&&<p className="assistant-typing"><Loader2 className="nav-spinner" size={14}/> Processando…</p>}</div><form className="assistant-composer" onSubmit={event=>{event.preventDefault();void submit()}}><textarea value={input} onChange={event=>setInput(event.target.value)} placeholder="Converse ou peça uma ação…" rows={2}/><button className="button" aria-label="Enviar" disabled={loading}><Send size={16}/></button></form></aside>
    </div>

    <div className="floating-layer" data-open={toolsOpen}>
      {toolsOpen&&<button className="floating-backdrop" aria-label="Fechar ferramentas" onClick={()=>setToolsOpen(false)}/>}<aside className="floating-drawer tools-drawer" aria-hidden={!toolsOpen}><header><div className="row"><span className="drawer-icon"><Wrench size={20}/></span><div><h2>Ferramentas rápidas</h2><small>Use sem perder o contexto atual.</small></div></div><button className="icon-button" onClick={()=>setToolsOpen(false)} aria-label="Fechar"><X size={18}/></button></header><div className="tool-list"><button type="button" className="floating-tool-card featured" onClick={openCalculator}><span className="floating-tool-card-icon"><Calculator size={19}/></span><span><strong>Calculadora profissional</strong><small>Teclado completo, memória, histórico e funções avançadas.</small></span><span className="floating-tool-open"><Maximize2 size={13}/>Abrir janela</span></button>{shortcuts.map(item=><Link key={item.title} href={item.href} onClick={()=>setToolsOpen(false)}><item.icon size={18}/><span><strong>{item.title}</strong><small>{item.description}</small></span></Link>)}</div></aside>
    </div>

    <FloatingCalculatorWindow workspaceId={workspaceId} open={calculatorOpen} minimized={calculatorMinimized} onClose={()=>setCalculatorOpen(false)} onMinimize={()=>setCalculatorMinimized(true)} onRestore={()=>setCalculatorMinimized(false)}/>
  </>;
}

function ActionPreview({action,onConfirm,onCancel,disabled}:{action:ProposedAction;onConfirm:()=>void;onCancel:()=>void;disabled:boolean}){
  const title=action.kind==="transactions"?`${action.transactions.length} transação(ões)`:action.kind==="task"?action.title:action.name;
  const detail=action.kind==="transactions"?action.transactions.map(item=>`${item.description}: ${(item.amountCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`).join(" · "):action.kind==="task"?(action.dueDate||"Sem prazo"):`Meta: ${action.target} ${action.unit}`;
  return <section className="assistant-action-card"><span className="badge">Proposta</span><strong>{title}</strong><small>{detail}</small><div className="row"><button className="button-secondary" onClick={onCancel}>Cancelar</button><button className="button" onClick={onConfirm} disabled={disabled}><Check size={14}/>Confirmar</button></div></section>;
}
