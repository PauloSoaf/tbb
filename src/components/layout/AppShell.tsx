"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Menu, X } from "lucide-react";
import { navGroups, adminItem } from "./navigation";
import { CommandPalette } from "./CommandPalette";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell, type ShellNotification } from "./NotificationBell";
import { MobileBottomNav } from "./MobileBottomNav";
import { useI18n } from "@/lib/i18n/I18nContext";

const keyByHref:Record<string,string>={"/today":"today","/habits":"habits","/tasks":"tasks","/goals":"goals","/projects":"projects","/calendar":"calendar","/finance":"overview","/finance/transactions":"transactions","/finance/accounts":"accounts","/finance/budgets":"budgets","/finance/subscriptions":"subscriptions","/finance/debts":"debts","/finance/savings":"savings","/finance/reports":"reports","/career":"overview","/career/applications":"applications","/career/companies":"companies","/career/interviews":"interviews","/career/contacts":"contacts","/career/documents":"documents","/insights":"insights","/integrations":"integrations","/settings":"settings","/admin":"admin"};

export function AppShell({children,workspaceName,userName,isAdmin,notifications}:{children:ReactNode;workspaceName:string;userName:string;isAdmin:boolean;notifications:ShellNotification[]}){
  const pathname=usePathname();
  const {t}=useI18n();
  const [mobile,setMobile]=useState(false);
  const [pinned,setPinned]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [openGroups,setOpenGroups]=useState<Set<string>>(()=>new Set(navGroups.flatMap(group=>group.name?[group.name]:[])));
  const [pendingHref,setPendingHref]=useState<string|null>(null);
  useEffect(()=>{const stored=localStorage.getItem("tbb-sidebar-pinned-v2");if(stored!==null)queueMicrotask(()=>setPinned(stored==="true"));},[]);
  useEffect(()=>{queueMicrotask(()=>setPendingHref(null));},[pathname]);
  const all=navGroups.flatMap(group=>group.items.map(item=>({...item,group:group.name})));
  const current=all.filter(item=>pathname===item.href||pathname.startsWith(`${item.href}/`)).sort((a,b)=>b.href.length-a.href.length)[0];
  const groupHref=current?.group==="Money"?"/finance":current?.group==="Career"?"/career":current?.group==="Life"?"/today":null;
  const label=(href:string,fallback:string)=>t(`nav.${keyByHref[href]||fallback.toLowerCase()}`);
  const expanded=pinned||hovered||mobile;
  function toggle(){const next=!pinned;setPinned(next);localStorage.setItem("tbb-sidebar-pinned-v2",String(next));}
  function setGroupOpen(name:string,open:boolean){setOpenGroups(current=>{if(current.has(name)===open)return current;const next=new Set(current);if(open)next.add(name);else next.delete(name);return next})}
  function items(list:typeof navGroups[number]["items"]){return list.map(item=>{const active=current?.href===item.href;const loading=pendingHref===item.href&&!active;return <div className="nav-entry" key={item.href}><Link href={item.href} prefetch onClick={()=>{setPendingHref(item.href);setMobile(false)}} className={`nav-item ${active||loading?"active":""}`} aria-current={active?"page":undefined}>{loading?<Loader2 className="nav-spinner" size={17}/>:<item.icon size={17} strokeWidth={1.7}/>}<span>{label(item.href,item.label)}</span></Link>{!expanded&&<span className="collapsed-tooltip">{label(item.href,item.label)}</span>}</div>})}
  return <div className="app-shell" data-collapsed={!expanded||undefined}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    {mobile&&<button className="sidebar-overlay" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
    <aside className={`sidebar ${mobile?"mobile-open":""}`} aria-label="Navegação principal" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div className="brand"><Link href="/today" className="row"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span className="brand-copy"><strong>TBB</strong><small>TO BE BETTER</small></span></Link><button className="icon-button mobile-menu ml-auto" aria-label="Fechar menu" onClick={()=>setMobile(false)}><X size={17}/></button><button className="sidebar-toggle" onClick={toggle} aria-label={pinned?"Usar expansão ao passar o mouse":"Fixar menu expandido"}>{pinned?<ChevronLeft size={15}/>:<ChevronRight size={15}/>}</button></div>
      <nav>{navGroups.map((group,index)=>group.name?<details key={group.name} className="nav-group" open={openGroups.has(group.name)} onToggle={event=>setGroupOpen(group.name,event.currentTarget.open)}><summary><span>{t(`group.${group.name.toLowerCase()}`)}</span></summary>{items(group.items)}</details>:<div key={index}>{items(group.items)}</div>)}{isAdmin&&items([adminItem])}</nav>
      <div className="workspace-label"><span className="avatar">{userName.slice(0,1).toUpperCase()}</span><div className="workspace-copy"><p>{workspaceName}</p><small>{t("shell.workspace")}</small></div></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="row"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={()=>setMobile(true)}><Menu size={19}/></button><nav className="topbar-path" aria-label="Breadcrumb"><Link href="/today">TBB</Link>{current?.group&&groupHref&&<><span>/</span><Link href={groupHref}>{t(`group.${current.group.toLowerCase()}`)}</Link></>}{current&&<><span>/</span><Link href={current.href} aria-current="page"><strong>{label(current.href,current.label)}</strong></Link></>}</nav></div><div className="topbar-actions"><CommandPalette/><NotificationBell initialItems={notifications}/><LangToggle/><ThemeToggle showLabel/><Link className="avatar" href="/settings" aria-label="Seu perfil">{userName.slice(0,1).toUpperCase()}</Link></div></header><main id="main-content" className="content" onClick={()=>{if(mobile)setMobile(false)}}>{children}</main><MobileBottomNav/></div>
  </div>;
}
