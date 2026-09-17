"use client";

import { useState } from "react";
import { Car, CreditCard, Loader2, Sparkles, Utensils, WalletCards, X } from "lucide-react";
import { GridSelect } from "@/components/ui/GridSelect";
import { SMART_SERVICES, type SmartAccountPreferences, type SmartServiceId } from "./smart-entry";

export type SmartEntryAccount={id:string;name:string;institution:string|null;type:string};

export function SmartEntryPreferences({accounts,preferences,loading,onClose,onPreferenceChange}:{accounts:SmartEntryAccount[];preferences:SmartAccountPreferences;loading:boolean;onClose:()=>void;onPreferenceChange:(serviceId:SmartServiceId,accountId:string)=>Promise<void>}){
  const [pending,setPending]=useState<SmartServiceId|null>(null);
  const options=[{value:"",label:"Perguntar em cada lançamento"},...accounts.map(account=>({value:account.id,label:`${account.type==="CREDIT_CARD"?"Cartão":"Conta"} · ${account.name}${account.institution?` · ${account.institution}`:""}`}))];

  async function change(serviceId:SmartServiceId,accountId:string){
    setPending(serviceId);
    try{await onPreferenceChange(serviceId,accountId)}finally{setPending(null)}
  }

  return <section className="smart-entry-panel" aria-labelledby="smart-entry-title">
    <header><div className="smart-entry-title"><span><Sparkles size={17}/></span><div><h3 id="smart-entry-title">Preenchimento inteligente</h3><p>Associe cada serviço à conta ou ao cartão usado normalmente.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar preferências"><X size={17}/></button></header>
    {loading?<div className="smart-entry-loading"><Loader2 className="nav-spinner" size={18}/><span>Carregando suas associações…</span></div>:<div className="smart-entry-services">{SMART_SERVICES.map(service=>{
      const food=service.id==="ifood";
      return <article key={service.id} data-service={service.id}>
        <span className="smart-service-icon">{food?<Utensils size={18}/>:<Car size={18}/>}</span>
        <div className="smart-service-copy"><div><strong>{service.name}</strong>{pending===service.id&&<Loader2 className="nav-spinner" size={13}/>}</div><small>{service.description}</small><span>{service.tags.map(tag=><i key={tag}>#{tag}</i>)}</span></div>
        <div className="smart-account-choice"><span>{preferences[service.id]?<><CreditCard size={12}/>Associação ativa</>:<><WalletCards size={12}/>Conta definida ao lançar</>}</span><GridSelect label={`Conta para ${service.name}`} value={preferences[service.id]||""} options={options} onValueChange={value=>void change(service.id,value)} triggerClassName="smart-account-select"/></div>
      </article>})}</div>}
    <footer><Sparkles size={14}/><span>Digite apenas <strong>Uber</strong>, <strong>99</strong>, <strong>inDrive</strong> ou <strong>iFood</strong> na descrição. Ao sair da célula, o TBB completa o restante.</span></footer>
  </section>;
}
