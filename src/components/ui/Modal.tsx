"use client";
import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({ title, trigger, children, drawer = false }: {title:string;trigger:ReactNode;children:ReactNode;drawer?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null); const id=useId();
  return <><button className="button-secondary" type="button" onClick={()=>ref.current?.showModal()}>{trigger}</button>
    <dialog ref={ref} className={drawer ? "modal drawer" : "modal"} aria-labelledby={id} onClick={event=>{if(event.target===event.currentTarget) ref.current?.close();}}>
      <div className="modal-content"><div className="row justify-between"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={()=>ref.current?.close()}><X size={18}/></button></div>{children}</div>
    </dialog></>;
}
