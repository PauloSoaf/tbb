"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Calculator, Clipboard, Clock3, Delete, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CalculatorUtilities } from "./CalculatorUtilities";
import { calculateExpression, calculatorValue, displayCalculatorValue } from "./calculator-engine";

type HistoryItem={expression:string;result:number};
type CalculatorKey={label:ReactNode;aria?:string;kind?:"clear"|"utility"|"operator";action:()=>void};
const operators=new Set(["+","-","*","/"]);

export function ProfessionalCalculator({workspaceId}:{workspaceId:string}){
  const rootRef=useRef<HTMLDivElement>(null);
  const [expression,setExpression]=useState("");
  const [lastExpression,setLastExpression]=useState("");
  const [memory,setMemory]=useState(0);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [justEvaluated,setJustEvaluated]=useState(false);
  const [error,setError]=useState("");
  const storageKey=`tbb-calculator-history-${workspaceId}`;

  useEffect(()=>{
    rootRef.current?.focus();
    try{const saved=localStorage.getItem(storageKey);if(saved)queueMicrotask(()=>setHistory(JSON.parse(saved).slice(0,20)))}catch{}
  },[storageKey]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(history.slice(0,20)))},[history,storageKey]);

  const preview=useMemo(()=>{
    if(!expression||/[+\-*/.(]$/.test(expression))return null;
    try{return calculateExpression(expression)}catch{return null}
  },[expression]);

  function update(next:string,evaluated=false){setExpression(next.slice(0,80));setJustEvaluated(evaluated);setError("")}
  function digit(value:string){update(justEvaluated?value:`${expression}${value}`)}
  function decimal(){
    const segment=expression.split(/[+\-*/()]/).at(-1)||"";
    if(segment.includes("."))return;
    update(justEvaluated?"0.":`${expression}${segment?"":"0"}.`);
  }
  function operator(value:string){
    if(!expression){if(value==="-")update("-");return}
    if(/[+\-*/.]$/.test(expression))update(`${expression.slice(0,-1)}${value}`);
    else update(`${expression}${value}`);
  }
  function parenthesis(value:"("|")"){
    if(justEvaluated&&value==="("){update("(");return}
    if(value==="("&&/[\d)]$/.test(expression))update(`${expression}*(`);
    else update(`${expression}${value}`);
  }
  function equals(){
    try{
      const value=calculateExpression(expression);
      const item={expression,result:value};
      setHistory(current=>[item,...current.filter(entry=>entry.expression!==expression)].slice(0,20));
      setLastExpression(expression);
      update(calculatorValue(value),true);
    }catch(cause){setError(cause instanceof Error?cause.message:"Expressão inválida")}
  }
  function unary(kind:"sqrt"|"square"|"inverse"|"sign"){
    try{
      const value=calculateExpression(expression||"0");
      if(kind==="sqrt"&&value<0)throw new Error("A raiz exige um número positivo");
      if(kind==="inverse"&&value===0)throw new Error("Não é possível dividir por zero");
      const next=kind==="sqrt"?Math.sqrt(value):kind==="square"?value*value:kind==="inverse"?1/value:-value;
      setLastExpression(kind==="sqrt"?`√(${expression||0})`:kind==="square"?`(${expression||0})²`:kind==="inverse"?`1/(${expression||0})`:`−(${expression||0})`);
      update(calculatorValue(next),true);
    }catch(cause){setError(cause instanceof Error?cause.message:"Operação inválida")}
  }
  function percent(){
    if(!expression)return;
    try{
      const match=/^(.*)([+\-*/])(-?\d+(?:\.\d+)?)$/.exec(expression);
      if(match){
        const base=calculateExpression(match[1]);
        const percentValue=(match[2]==="+"||match[2]==="-")?base*Number(match[3])/100:Number(match[3])/100;
        update(`${match[1]}${match[2]}${calculatorValue(percentValue)}`);
      }else update(calculatorValue(calculateExpression(expression)/100));
    }catch(cause){setError(cause instanceof Error?cause.message:"Percentual inválido")}
  }
  function currentValue(){try{return calculateExpression(expression||"0")}catch{return 0}}
  function memoryAction(action:"clear"|"recall"|"add"|"subtract"){
    if(action==="clear"){setMemory(0);return}
    if(action==="recall"){update(calculatorValue(memory));return}
    setMemory(current=>action==="add"?current+currentValue():current-currentValue());
  }
  function clear(){setExpression("");setLastExpression("");setError("");setJustEvaluated(false)}
  function backspace(){if(justEvaluated)clear();else update(expression.slice(0,-1))}
  async function copy(){
    const value=preview??currentValue();
    await navigator.clipboard.writeText(calculatorValue(value));
    toast.success("Resultado copiado.");
  }
  function keyboard(event:KeyboardEvent<HTMLDivElement|HTMLInputElement>){
    const target=event.target as HTMLElement;
    if(target.closest("button,textarea,select")||(target instanceof HTMLInputElement&&!target.dataset.calculatorExpression))return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    const key=event.key;
    if(/^\d$/.test(key)){event.preventDefault();digit(key)}
    else if(operators.has(key)){event.preventDefault();operator(key)}
    else if(key==="x"||key==="X"){event.preventDefault();operator("*")}
    else if(key==="Enter"||key==="="){event.preventDefault();equals()}
    else if(key==="Backspace"){event.preventDefault();backspace()}
    else if(key==="Escape"||key==="Delete"){event.preventDefault();clear()}
    else if(key==="."||key===","){event.preventDefault();decimal()}
    else if(key==="("||key===")"){event.preventDefault();parenthesis(key)}
    else if(key==="%"){event.preventDefault();percent()}
  }

  const keys:CalculatorKey[]=[
    {label:"AC",kind:"clear",action:clear},{label:<Delete size={18}/>,aria:"Apagar último caractere",kind:"utility",action:backspace},{label:"(",kind:"utility",action:()=>parenthesis("(")},{label:")",kind:"utility",action:()=>parenthesis(")")},
    {label:"7",action:()=>digit("7")},{label:"8",action:()=>digit("8")},{label:"9",action:()=>digit("9")},{label:"÷",kind:"operator",action:()=>operator("/")},
    {label:"4",action:()=>digit("4")},{label:"5",action:()=>digit("5")},{label:"6",action:()=>digit("6")},{label:"×",kind:"operator",action:()=>operator("*")},
    {label:"1",action:()=>digit("1")},{label:"2",action:()=>digit("2")},{label:"3",action:()=>digit("3")},{label:"−",kind:"operator",action:()=>operator("-")},
    {label:"±",kind:"utility",action:()=>unary("sign")},{label:"0",action:()=>digit("0")},{label:",",action:decimal},{label:"+",kind:"operator",action:()=>operator("+")},
  ];

  return <div className="professional-calculator" ref={rootRef} tabIndex={-1} onKeyDown={keyboard}>
    <section className="calculator-display" data-error={Boolean(error)||undefined}>
      <div className="calculator-display-meta"><span>{memory!==0?`M ${displayCalculatorValue(memory)}`:"Calculadora profissional"}</span><div><button type="button" onClick={()=>setHistoryOpen(value=>!value)} aria-label="Abrir histórico" aria-pressed={historyOpen}><History size={15}/></button><button type="button" onClick={()=>void copy()} aria-label="Copiar resultado"><Clipboard size={15}/></button></div></div>
      <small>{error||lastExpression||"Digite ou use o teclado abaixo"}</small>
      <input data-calculator-expression value={expression} onChange={event=>{const value=event.target.value.replace(/,/g,".").replace(/[×x]/gi,"*").replace(/÷/g,"/");if(/^[\d.+\-*/()\s]*$/.test(value))update(value)}} inputMode="decimal" aria-label="Expressão da calculadora" placeholder="0"/>
      <strong aria-live="polite">{error?"Erro":preview===null?"—":displayCalculatorValue(preview)}</strong>
    </section>
    <CalculatorUtilities workspaceId={workspaceId} value={preview} expression={justEvaluated&&lastExpression?`${lastExpression} = ${expression}`:expression} onRecall={value=>{setLastExpression("Cálculo salvo");update(calculatorValue(value),true)}}/>
    {historyOpen&&<section className="calculator-history"><header><span><Clock3 size={14}/>Histórico</span><button type="button" onClick={()=>setHistory([])} disabled={!history.length}><Delete size={14}/>Limpar</button></header><div>{history.map((item,index)=><button type="button" key={`${item.expression}-${index}`} onClick={()=>{setLastExpression(item.expression);update(calculatorValue(item.result),true);setHistoryOpen(false)}}><span>{item.expression.replace(/\*/g,"×").replace(/\//g,"÷")}</span><strong>{displayCalculatorValue(item.result)}</strong></button>)}{!history.length&&<p>Nenhum cálculo realizado.</p>}</div></section>}
    <div className="calculator-memory" aria-label="Memória"><button type="button" onClick={()=>memoryAction("clear")} disabled={memory===0}>MC</button><button type="button" onClick={()=>memoryAction("recall")}>MR</button><button type="button" onClick={()=>memoryAction("add")}>M+</button><button type="button" onClick={()=>memoryAction("subtract")}>M−</button></div>
    <div className="calculator-science"><button type="button" onClick={percent}>%</button><button type="button" onClick={()=>unary("sqrt")}>√x</button><button type="button" onClick={()=>unary("square")}>x²</button><button type="button" onClick={()=>unary("inverse")}>1/x</button></div>
    <div className="calculator-keypad">{keys.map((key,index)=><button type="button" key={index} data-kind={key.kind} aria-label={key.aria} onClick={key.action}>{key.label}</button>)}</div>
    <button type="button" className="calculator-equals" onClick={equals}>=</button>
    <footer><Calculator size={13}/><span>Enter calcula · Esc limpa · vírgula ou ponto para decimais</span><button type="button" onClick={clear}><RotateCcw size={13}/>Limpar</button></footer>
  </div>;
}
