"use client";
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { moduleCommands, type Command } from './navigation';
export function CommandPalette(){
 const ref=useRef<HTMLDialogElement>(null);const input=useRef<HTMLInputElement>(null);const [query,setQuery]=useState('');const [results,setResults]=useState<Command[]>([]);const [loading,setLoading]=useState(false);
 useEffect(()=>{const handle=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(ref.current?.open)ref.current.close();else{ref.current?.showModal();input.current?.focus();}}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[]);
 useEffect(()=>{if(query.trim().length<2)return;const controller=new AbortController();const timer=setTimeout(async()=>{setLoading(true);try{const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`,{signal:controller.signal});if(response.ok){const data:Command[]=await response.json();setResults(data);}}catch{}finally{if(!controller.signal.aborted)setLoading(false);}},200);return()=>{clearTimeout(timer);controller.abort();};},[query]);
 const commands=moduleCommands.filter(c=>`${c.label} ${c.group}`.toLowerCase().includes(query.toLowerCase()));
 const combined=[...commands,...(query.trim().length>=2?results:[])];
 return <><button className="search-trigger" onClick={()=>{ref.current?.showModal();input.current?.focus();}} aria-label="Buscar e abrir comandos"><Search size={16}/><span>Buscar no seu espaço</span><kbd>⌘ K</kbd></button>
 <dialog ref={ref} className="modal" aria-label="Busca e comandos" onClick={e=>{if(e.target===e.currentTarget)ref.current?.close();}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const focusables=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.command-search,.command-result'));const index=focusables.indexOf(document.activeElement as HTMLElement);focusables[(index+(e.key==='ArrowDown'?1:-1)+focusables.length)%focusables.length]?.focus();}}}>
 <div className="modal-content"><div className="row"><Search size={18}/><input className="command-search flex-1" ref={input} value={query} onChange={e=>{setQuery(e.target.value);setResults([]);}} placeholder="O que você quer fazer?" aria-label="Buscar hábitos, tarefas, transações e mais"/><button className="icon-button" aria-label="Fechar busca" onClick={()=>ref.current?.close()}><X size={18}/></button></div>
 <div className="command-list">{combined.map((c,index)=><Link key={`${c.href}-${index}`} href={c.href} className="command-result" onClick={()=>ref.current?.close()}><span>{c.label}</span><small>{c.group}</small></Link>)}{!combined.length&&<p className="muted">Nenhum resultado.</p>}{loading&&<p role="status" className="muted">Buscando…</p>}</div><p className="muted text-xs">↑ ↓ navegar · Enter abrir · Esc fechar</p></div></dialog></>;
}
