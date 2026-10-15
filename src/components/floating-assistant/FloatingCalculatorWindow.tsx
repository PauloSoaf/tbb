"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Calculator, GripHorizontal, Maximize2, Minus, RotateCcw, X } from "lucide-react";
import { ProfessionalCalculator } from "./ProfessionalCalculator";

type Position={x:number;y:number};
const size={width:410,height:680};

function clamp(position:Position){
  if(typeof window==="undefined")return position;
  return {
    x:Math.max(8,Math.min(position.x,window.innerWidth-Math.min(size.width,window.innerWidth)-8)),
    y:Math.max(8,Math.min(position.y,window.innerHeight-70)),
  };
}

type WindowProps={workspaceId:string;open:boolean;minimized:boolean;onClose:()=>void;onMinimize:()=>void;onRestore:()=>void};
const subscribeToClient=()=>()=>{};
export function FloatingCalculatorWindow(props:WindowProps){
  const mounted=useSyncExternalStore(subscribeToClient,()=>true,()=>false);
  return mounted?<CalculatorWindow {...props}/>:null;
}

function CalculatorWindow({workspaceId,open,minimized,onClose,onMinimize,onRestore}:WindowProps){
  const [position,setPosition]=useState<Position>(()=>{
    const fallback={x:Math.max(12,window.innerWidth-size.width-82),y:84};
    try{const saved=JSON.parse(localStorage.getItem("tbb-calculator-window-position")||"null");return clamp(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)?saved:fallback)}catch{return clamp(fallback)}
  });
  const [dragging,setDragging]=useState(false);
  const dragRef=useRef<{pointerX:number;pointerY:number;origin:Position}|null>(null);

  useEffect(()=>{
    if(!dragging)return;
    const move=(event:PointerEvent)=>{if(!dragRef.current)return;setPosition(clamp({x:dragRef.current.origin.x+event.clientX-dragRef.current.pointerX,y:dragRef.current.origin.y+event.clientY-dragRef.current.pointerY}))};
    const stop=()=>{setDragging(false);dragRef.current=null;window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",stop)};
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",stop);
    return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",stop)};
  },[dragging]);
  useEffect(()=>{
    if(dragging)return;
    try{localStorage.setItem("tbb-calculator-window-position",JSON.stringify(position))}catch{}
  },[dragging,position]);
  useEffect(()=>{
    const resize=()=>setPosition(current=>clamp(current));
    window.addEventListener("resize",resize);
    return()=>window.removeEventListener("resize",resize);
  },[]);

  function startDrag(event:ReactPointerEvent<HTMLDivElement>){
    if(event.button!==0||(event.target as HTMLElement).closest("button"))return;
    dragRef.current={pointerX:event.clientX,pointerY:event.clientY,origin:position};
    setDragging(true);
  }
  function resetPosition(){setPosition(clamp({x:Math.max(12,window.innerWidth-size.width-82),y:84}))}

  if(!open)return null;
  return createPortal(<section className="floating-calculator-window" data-minimized={minimized||undefined} data-dragging={dragging||undefined} style={{left:position.x,top:position.y,width:size.width}} aria-label="Calculadora profissional flutuante">
    <div className="floating-calculator-titlebar" onPointerDown={startDrag}>
      <div><span className="floating-calculator-icon"><Calculator size={17}/></span><span><strong>Calculadora</strong><small>{minimized?"Minimizada":"Janela flutuante"}</small></span></div>
      <GripHorizontal className="floating-calculator-grip" size={18} aria-hidden="true"/>
      <div className="floating-window-actions">
        <button type="button" onClick={resetPosition} aria-label="Restaurar posição"><RotateCcw size={15}/></button>
        <button type="button" onClick={minimized?onRestore:onMinimize} aria-label={minimized?"Restaurar calculadora":"Minimizar calculadora"}>{minimized?<Maximize2 size={15}/>:<Minus size={16}/>}</button>
        <button type="button" onClick={onClose} aria-label="Fechar calculadora"><X size={16}/></button>
      </div>
    </div>
    {!minimized&&<div className="floating-calculator-content"><ProfessionalCalculator workspaceId={workspaceId}/></div>}
  </section>,document.body);
}
