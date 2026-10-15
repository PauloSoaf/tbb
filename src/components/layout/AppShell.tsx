"use client";

import { Suspense, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { navGroups, adminItem } from "./navigation";
import { navLabelKey } from "./navigation-registry";
import { AppNavigationBar } from "./AppNavigationBar";
import { CommandPalette } from "./CommandPalette";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell, type ShellNotification } from "./NotificationBell";
import { MobileBottomNav } from "./MobileBottomNav";
import { PartnerScopeSwitcher } from "./PartnerScopeSwitcher";
import { useI18n } from "@/lib/i18n/I18nContext";
import { FinancePrivacyToggle } from "@/features/finance/FinancePrivacy";

const COLLAPSED_KEY = "tbb-sidebar-collapsed";

export function AppShell({children,workspaceName,userName,isAdmin,notifications,partnerName}:{children:ReactNode;workspaceName:string;userName:string;isAdmin:boolean;notifications:ShellNotification[];partnerName:string|null}){
  const pathname=usePathname();
  const {t}=useI18n();
  const [mobile,setMobile]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [openGroups,setOpenGroups]=useState<Set<string>>(()=>new Set());
  const [pinnedGroups,setPinnedGroups]=useState<Set<string>>(()=>new Set());
  const [pendingHref,setPendingHref]=useState<string|null>(null);
  const [navbarAutoHide,setNavbarAutoHide]=useState(false);
  const [navbarOpen,setNavbarOpen]=useState(false);
  const topbarRef=useRef<HTMLElement>(null);
  const navbarCloseTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    // The old hover-to-expand preference ("false") becomes the compact rail the user had chosen.
    const stored=localStorage.getItem(COLLAPSED_KEY)??(localStorage.getItem("tbb-sidebar-pinned-v2")==="false"?"true":null);
    if(stored!==null)queueMicrotask(()=>setCollapsed(stored==="true"));
  },[]);
  useEffect(()=>{queueMicrotask(()=>setPendingHref(null));},[pathname]);
  useEffect(()=>{
    // Touch devices keep the permanent bar; "no fine pointer" alone is unreliable on some desktops.
    if(!pointerCanHover()&&navigator.maxTouchPoints>0)return;
    queueMicrotask(()=>setNavbarAutoHide(true));
    const reveal=(event:MouseEvent)=>{if(event.clientY<=8)setNavbarOpen(true)};
    window.addEventListener("mousemove",reveal);
    return()=>{window.removeEventListener("mousemove",reveal);if(navbarCloseTimer.current)clearTimeout(navbarCloseTimer.current)};
  },[]);
  const all=navGroups.flatMap(group=>group.items.map(item=>({...item,group:group.name})));
  const current=all.filter(item=>pathname===item.href||pathname.startsWith(`${item.href}/`)).sort((a,b)=>b.href.length-a.href.length)[0];
  const label=(href:string,fallback:string)=>t(navLabelKey(href,fallback));
  const expanded=!collapsed||mobile;
  function toggle(){const next=!collapsed;setCollapsed(next);localStorage.setItem(COLLAPSED_KEY,String(next));}
  function setGroupOpen(name:string,open:boolean){
    setOpenGroups(currentGroups=>{
      if(currentGroups.has(name)===open)return currentGroups;
      const next=new Set(currentGroups);
      if(open)next.add(name);else next.delete(name);
      return next;
    });
  }
  function togglePinnedGroup(name:string){
    setPinnedGroups(currentGroups=>{
      const next=new Set(currentGroups);
      if(next.has(name))next.delete(name);else next.add(name);
      return next;
    });
  }
  function pointerCanHover(){return typeof window!=="undefined"&&window.matchMedia("(hover: hover) and (pointer: fine)").matches}
  function keepNavbarOpen(){if(navbarCloseTimer.current)clearTimeout(navbarCloseTimer.current);setNavbarOpen(true)}
  // Closing is deferred so the bar survives moving the pointer into one of its own dropdowns.
  function scheduleNavbarClose(){
    if(navbarCloseTimer.current)clearTimeout(navbarCloseTimer.current);
    navbarCloseTimer.current=setTimeout(()=>{
      const topbar=topbarRef.current;
      if(topbar&&(topbar.matches(":hover")||topbar.contains(document.activeElement)))return;
      setNavbarOpen(false);
    },420);
  }
  function closeAfterPointerLeaves(element:HTMLElement,name:string){
    if(!pointerCanHover())return;
    if(!element.contains(document.activeElement))setGroupOpen(name,false);
  }
  function closeAfterFocusLeaves(event:FocusEvent<HTMLDivElement>,name:string){
    if(!event.currentTarget.contains(event.relatedTarget as Node|null)&&!event.currentTarget.matches(":hover"))setGroupOpen(name,false);
  }
  function closeWithEscape(event:KeyboardEvent<HTMLDivElement>,name:string){
    if(event.key!=="Escape")return;
    event.preventDefault();
    setGroupOpen(name,false);
    setPinnedGroups(currentGroups=>{const next=new Set(currentGroups);next.delete(name);return next;});
    event.currentTarget.querySelector<HTMLButtonElement>(".nav-group-trigger")?.focus();
  }
  // The compact rail is a deliberate state: same items and colors, icons only, names in tooltips.
  function railTip(content:string,node:ReactNode){return expanded?node:<AppTooltip content={content} side="right" className="nav-tooltip-trigger">{node}</AppTooltip>}
  function items(list:typeof navGroups[number]["items"]){
    return list.map(item=>{
      const active=current?.href===item.href;
      const loading=pendingHref===item.href&&!active;
      const name=label(item.href,item.label);
      return <div className="nav-entry" key={item.href}>{railTip(name,<Link href={item.href} prefetch onClick={()=>{setPendingHref(item.href);setMobile(false)}} className={`nav-item ${active||loading?"active":""}`} aria-current={active?"page":undefined} aria-label={expanded?undefined:name}>{loading?<Loader2 className="nav-spinner" size={18}/>:<item.icon size={18} strokeWidth={1.8}/>}<span>{name}</span></Link>)}</div>;
    });
  }
  const toggleLabel=t(collapsed?"shell.sidebar_expand":"shell.sidebar_collapse");
  const toggleButton=<button type="button" className="sidebar-toggle" onClick={toggle} aria-label={toggleLabel} aria-expanded={!collapsed}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button>;

  return <div className="app-shell" data-collapsed={!expanded||undefined}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    {mobile&&<button className="sidebar-overlay" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
    <aside className={`sidebar ${mobile?"mobile-open":""}`} aria-label="Navegação principal">
      <div className="brand"><Link href="/today" className="row" aria-label="TBB"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span className="brand-copy"><strong>TBB</strong><small>TO BE BETTER</small></span></Link><button className="icon-button mobile-menu ml-auto" aria-label="Fechar menu" onClick={()=>setMobile(false)}><X size={18}/></button>{expanded&&!mobile&&<AppTooltip content={toggleLabel} side="right" className="sidebar-toggle-wrap">{toggleButton}</AppTooltip>}</div>
      {!expanded&&<div className="sidebar-rail-toggle"><AppTooltip content={toggleLabel} side="right">{toggleButton}</AppTooltip></div>}
      <nav>{navGroups.map((group,index)=>{
        if(!group.name)return <div className="nav-direct" key={index}>{items(group.items)}</div>;
        const groupName=t(`group.${group.name.toLowerCase()}`);
        if(!expanded)return <div key={group.name} className="nav-rail-group" role="group" aria-label={groupName} data-active={group.name===current?.group||undefined}>{items(group.items)}</div>;
        const isPinned=pinnedGroups.has(group.name);
        const isOpen=isPinned||openGroups.has(group.name);
        return <div key={group.name} className="nav-group" data-active={group.name===current?.group||undefined} data-open={isOpen} data-pinned={isPinned||undefined} onMouseEnter={()=>{if(pointerCanHover())setGroupOpen(group.name,true)}} onMouseLeave={event=>closeAfterPointerLeaves(event.currentTarget,group.name)} onFocus={()=>setGroupOpen(group.name,true)} onBlur={event=>closeAfterFocusLeaves(event,group.name)} onKeyDown={event=>closeWithEscape(event,group.name)}>
          <button type="button" className="nav-group-trigger" aria-expanded={isOpen} aria-pressed={isPinned} aria-controls={`nav-group-${group.name.toLowerCase()}`} onClick={event=>{togglePinnedGroup(group.name);if(pointerCanHover()&&event.detail>0)event.currentTarget.blur();}}><span>{groupName}</span><span className="nav-group-state" aria-hidden="true"><i/><ChevronDown size={15} strokeWidth={2}/></span></button>
          <div id={`nav-group-${group.name.toLowerCase()}`} className="nav-group-panel" aria-hidden={!isOpen} inert={!isOpen}><div className="nav-group-items">{items(group.items)}</div></div>
        </div>;
      })}{isAdmin&&<div className={expanded?undefined:"nav-rail-group"}>{items([adminItem])}</div>}</nav>
      <div className="workspace-label">{railTip(`${workspaceName} · ${t("shell.workspace")}`,<span className="avatar">{userName.slice(0,1).toUpperCase()}</span>)}<div className="workspace-copy"><p>{workspaceName}</p><small>{t("shell.workspace")}</small></div></div>
    </aside>
    <div className="app-main"><header ref={topbarRef} className="topbar" data-autohide={navbarAutoHide||undefined} data-open={navbarAutoHide&&navbarOpen||undefined} onMouseEnter={keepNavbarOpen} onMouseLeave={scheduleNavbarClose} onFocusCapture={keepNavbarOpen} onBlurCapture={scheduleNavbarClose}><div className="row"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={()=>setMobile(true)}><Menu size={19}/></button></div><div className="topbar-actions">{pathname?.startsWith("/finance")&&<FinancePrivacyToggle/>}<CommandPalette/><NotificationBell initialItems={notifications}/>{partnerName&&<Suspense fallback={null}><PartnerScopeSwitcher partnerName={partnerName}/></Suspense>}<LangToggle/><ThemeToggle showLabel/><Link className="avatar" href="/settings" aria-label="Seu perfil">{userName.slice(0,1).toUpperCase()}</Link></div></header><main id="main-content" className="content" onClick={()=>{if(mobile)setMobile(false)}}><Suspense fallback={null}><AppNavigationBar/></Suspense>{children}</main><MobileBottomNav/></div>
  </div>;
}
