"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { GridSelect, type GridSelectOption } from "@/components/ui/GridSelect";

type Option={id:string;name:string};
type Filters={q?:string;account?:string;category?:string;type?:string;source?:string};

const typeOptions:GridSelectOption[]=[
  {value:"",label:"Todos os tipos"},
  {value:"EXPENSE",label:"Despesas"},
  {value:"INCOME",label:"Receitas"},
  {value:"REFUND",label:"Reembolsos"},
];
const sourceOptions:GridSelectOption[]=[
  {value:"",label:"Todas as origens"},
  {value:"MANUAL",label:"Entrada manual"},
  {value:"PASTE",label:"Dados colados"},
  {value:"CSV",label:"Arquivo CSV"},
  {value:"PDF",label:"Documento PDF"},
  {value:"AI_TEXT",label:"Texto interpretado por IA"},
  {value:"WHATSAPP",label:"Mensagem do WhatsApp"},
  {value:"API",label:"Integração por API"},
  {value:"CALCULATOR",label:"Calculadora TBB"},
];

export function FinanceTransactionFilters({accounts,categories,current}:{accounts:Option[];categories:Option[];current:Filters}){
  const [query,setQuery]=useState(current.q||"");
  const [account,setAccount]=useState(current.account||"");
  const [category,setCategory]=useState(current.category||"");
  const [type,setType]=useState(current.type||"");
  const [source,setSource]=useState(current.source||"");
  const active=[query,account,category,type,source].filter(Boolean).length;
  const accountOptions=[{value:"",label:"Todas as contas"},...accounts.map(option=>({value:option.id,label:option.name}))];
  const categoryOptions=[{value:"",label:"Todas as categorias"},...categories.map(option=>({value:option.id,label:option.name}))];

  return <form className="filter-bar finance-transaction-filters" action="/finance/transactions">
    <label className="finance-filter-search">
      <span className="finance-filter-caption">Pesquisar transações</span>
      <span className="finance-filter-search-field"><Search size={16}/><input name="q" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar descrição, observação, estabelecimento ou tag" autoComplete="off"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="Limpar pesquisa"><X size={14}/></button>}</span>
    </label>
    <FilterSelect caption="Conta" name="account" value={account} options={accountOptions} onChange={setAccount}/>
    <FilterSelect caption="Categoria" name="category" value={category} options={categoryOptions} onChange={setCategory}/>
    <FilterSelect caption="Tipo" name="type" value={type} options={typeOptions} onChange={setType}/>
    <FilterSelect caption="Origem" name="source" value={source} options={sourceOptions} onChange={setSource}/>
    <div className="finance-filter-actions"><button className="button finance-filter-submit" type="submit"><SlidersHorizontal size={15}/><span>Aplicar filtros</span>{active>0&&<b>{active}</b>}</button><Link className="button-secondary finance-filter-clear" href="/finance/transactions" aria-disabled={!active}><X size={14}/><span>Limpar</span></Link></div>
  </form>;
}

function FilterSelect({caption,name,value,options,onChange}:{caption:string;name:string;value:string;options:GridSelectOption[];onChange:(value:string)=>void}){
  return <div className="finance-filter-control" data-active={Boolean(value)||undefined}>
    <span className="finance-filter-caption">{caption}</span>
    <GridSelect label={caption} value={value} options={options} onValueChange={onChange} triggerClassName="finance-filter-select-trigger"/>
    <input type="hidden" name={name} value={value}/>
  </div>;
}
