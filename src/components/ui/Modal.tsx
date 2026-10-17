"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
export function Modal({ title, trigger, children, drawer = false, triggerClassName = "button-secondary", openWhen }: {title:string;trigger:ReactNode;children:ReactNode;drawer?:boolean;triggerClassName?:string;openWhen?:{param:string;value:string}}) {
  const ref=useRef<HTMLDialogElement>(null); const id=useId();
  const canWrite=useFinanceWriteAccess();
  const openParam=openWhen?.param,openValue=openWhen?.value;
  useEffect(()=>{
    const dialog=ref.current;
    if(!dialog)return;
    const closeAfterSuccess=()=>dialog.close();
    dialog.addEventListener("tbb:form-success",closeAfterSuccess);
    return()=>dialog.removeEventListener("tbb:form-success",closeAfterSuccess);
  },[]);
  useEffect(()=>{if(!openParam||!openValue)return;const params=new URLSearchParams(window.location.search);if(params.get(openParam)===openValue&&!ref.current?.open)ref.current?.showModal();},[openParam,openValue]);
  if(!canWrite)return null;
  return <><button className={triggerClassName} type="button" onClick={()=>ref.current?.showModal()}>{trigger}</button>
    <dialog ref={ref} className={drawer ? "modal drawer" : "modal"} aria-labelledby={id} onClick={event=>{if(event.target===event.currentTarget) ref.current?.close();}}>
      <div className="modal-content"><div className="row justify-between"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={()=>ref.current?.close()}><X size={18}/></button></div>{children}</div>
    </dialog></>;
}
