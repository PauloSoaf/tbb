"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type GridSelectOption={value:string;label:string};
type MenuPosition={left:number;top:number;width:number;maxHeight:number;placement:"top"|"bottom"};

export function GridSelect({label,value,options,onValueChange,triggerClassName=""}:{label:string;value:string;options:GridSelectOption[];onValueChange:(value:string)=>void;triggerClassName?:string}){
  const id=useId();
  const triggerRef=useRef<HTMLButtonElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const optionRefs=useRef<Array<HTMLButtonElement|null>>([]);
  const [mounted,setMounted]=useState(false);
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [position,setPosition]=useState<MenuPosition>({left:8,top:8,width:190,maxHeight:260,placement:"bottom"});
  const selectedIndex=Math.max(0,options.findIndex(option=>option.value===value));
  const searchable=options.length>7;
  const selected=options.find(option=>option.value===value);
  const visibleOptions=useMemo(()=>{
    const normalized=query.trim().toLocaleLowerCase("pt-BR");
    return normalized?options.filter(option=>option.label.toLocaleLowerCase("pt-BR").includes(normalized)):options;
  },[options,query]);

  useEffect(()=>setMounted(true),[]);

  function placeMenu(){
    const trigger=triggerRef.current;
    if(!trigger)return;
    const rect=trigger.getBoundingClientRect();
    const edge=8,gap=5;
    const width=Math.min(Math.max(rect.width,205),window.innerWidth-edge*2);
    const below=window.innerHeight-rect.bottom-gap-edge;
    const above=rect.top-gap-edge;
    const placement=below>=Math.min(230,above)?"bottom":"top";
    const maxHeight=Math.max(120,Math.min(280,placement==="bottom"?below:above));
    const left=Math.max(edge,Math.min(rect.left,window.innerWidth-width-edge));
    const top=placement==="bottom"?rect.bottom+gap:rect.top-gap;
    setPosition({left,top,width,maxHeight,placement});
  }
  function show(){
    placeMenu();
    setQuery("");
    setOpen(true);
  }
  function hide(focus=false){
    setOpen(false);
    setQuery("");
    if(focus)requestAnimationFrame(()=>triggerRef.current?.focus());
  }
  function choose(next:string){onValueChange(next);hide(true)}

  useEffect(()=>{
    if(!open)return;
    const reposition=()=>placeMenu();
    const outside=(event:PointerEvent)=>{
      const target=event.target as Node;
      const popup=document.getElementById(`${id}-popup`);
      if(!triggerRef.current?.contains(target)&&!popup?.contains(target))hide();
    };
    window.addEventListener("resize",reposition);
    window.addEventListener("scroll",reposition,true);
    document.addEventListener("pointerdown",outside,true);
    requestAnimationFrame(()=>searchable?searchRef.current?.focus():optionRefs.current[selectedIndex]?.focus());
    return()=>{
      window.removeEventListener("resize",reposition);
      window.removeEventListener("scroll",reposition,true);
      document.removeEventListener("pointerdown",outside,true);
    };
  },[id,open,searchable,selectedIndex]);

  function triggerKeyboard(event:KeyboardEvent<HTMLButtonElement>){
    event.stopPropagation();
    if(event.key==="Enter"||event.key===" "||event.key==="ArrowDown"||event.key==="ArrowUp"){
      event.preventDefault();
      if(open)hide();else show();
    }
    if(event.key==="Escape"&&open){event.preventDefault();hide(true)}
  }
  function optionKeyboard(event:KeyboardEvent<HTMLButtonElement>,index:number){
    event.stopPropagation();
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){
      event.preventDefault();
      const step=event.key==="ArrowDown"?1:-1;
      const next=(index+step+visibleOptions.length)%visibleOptions.length;
      optionRefs.current[next]?.focus();
    }else if(event.key==="Home"){event.preventDefault();optionRefs.current[0]?.focus()}
    else if(event.key==="End"){event.preventDefault();optionRefs.current[visibleOptions.length-1]?.focus()}
    else if(event.key==="Escape"){event.preventDefault();hide(true)}
  }

  const popup=mounted&&open?createPortal(
    <div id={`${id}-popup`} className="grid-select-popover" data-placement={position.placement} role="presentation" style={{left:position.left,top:position.top,width:position.width,maxHeight:position.maxHeight}}>
      <header><span>{label}</span><button type="button" onClick={()=>hide(true)} aria-label={`Fechar ${label}`}><X size={13}/></button></header>
      {searchable&&<label className="grid-select-search"><Search size={13}/><input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{event.stopPropagation();if(event.key==="Escape"){event.preventDefault();hide(true)}else if(event.key==="ArrowDown"&&visibleOptions.length){event.preventDefault();optionRefs.current[0]?.focus()}}} placeholder={`Buscar ${label.toLocaleLowerCase("pt-BR")}`} aria-label={`Buscar em ${label}`}/>{query&&<button type="button" onClick={()=>{setQuery("");searchRef.current?.focus()}} aria-label="Limpar busca"><X size={12}/></button>}</label>}
      <div className="grid-select-options" role="listbox" aria-label={label} style={{maxHeight:position.maxHeight-(searchable?76:37)}}>
        {visibleOptions.map((option,index)=><button ref={node=>{optionRefs.current[index]=node}} type="button" role="option" aria-selected={option.value===value} data-selected={option.value===value||undefined} key={option.value} onClick={()=>choose(option.value)} onKeyDown={event=>optionKeyboard(event,index)}><span>{option.label}</span>{option.value===value&&<Check size={14} strokeWidth={2.6}/>}</button>)}
        {!visibleOptions.length&&<p>Nenhum item encontrado.</p>}
      </div>
    </div>,document.body):null;

  return <>
    <button ref={triggerRef} type="button" className={`grid-select-trigger ${triggerClassName}`.trim()} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?`${id}-popup`:undefined} data-open={open||undefined} onPointerDown={event=>event.stopPropagation()} onMouseDown={event=>event.stopPropagation()} onClick={()=>open?hide():show()} onKeyDown={triggerKeyboard}>
      <span>{selected?.label||"Selecione"}</span><ChevronDown size={13}/>
    </button>
    {popup}
  </>;
}
