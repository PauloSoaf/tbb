"use client";
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon, PanelLeftClose } from 'lucide-react';
import { navGroups, adminItem } from './navigation';
import { CommandPalette } from './CommandPalette';
import { AppTooltip } from '@/components/ui/AppTooltip';
export function AppShell({children,workspaceName,userName,isAdmin}:{children:ReactNode;workspaceName:string;userName:string;isAdmin:boolean}){
 const pathname=usePathname();const [mobile,setMobile]=useState(false);const {resolvedTheme,setTheme}=useTheme();
 const current=navGroups.flatMap(g=>g.items.map(i=>({...i,group:g.name}))).filter(i=>pathname===i.href||pathname.startsWith(`${i.href}/`)).sort((a,b)=>b.href.length-a.href.length)[0];
 function items(list:typeof navGroups[number]['items']){return list.map(item=><Link href={item.href} key={item.href} className={`nav-item ${current?.href===item.href?'active':''}`} aria-current={current?.href===item.href?'page':undefined} onClick={()=>setMobile(false)}><item.icon size={16} strokeWidth={1.7}/>{item.label}</Link>);}
 return <div className="app-shell"><a className="skip-link" href="#main-content">Ir para o conteúdo</a><aside className={`sidebar ${mobile?'mobile-open':''}`} aria-label="Navegação principal"><div className="brand"><Link href="/today" className="row"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span><strong>TBB</strong><small>TO BE BETTER</small></span></Link><button className="icon-button mobile-menu ml-auto" aria-label="Fechar menu" onClick={()=>setMobile(false)}><X size={17}/></button></div>
 <nav>{navGroups.map((group,index)=>group.name?<details key={group.name} className="nav-group" open={group.name==='Life'||group.name===current?.group}><summary>{group.name}</summary>{items(group.items)}</details>:<div key={index}>{items(group.items)}</div>)}{isAdmin&&items([adminItem])}</nav>
 <div className="workspace-label"><span className="avatar">{userName.slice(0,1).toUpperCase()}</span><div className="min-w-0"><p>{workspaceName}</p><small>Workspace pessoal</small></div></div></aside>
 <div className="app-main"><header className="topbar"><div className="row"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={()=>setMobile(true)}><Menu size={19}/></button><span className="topbar-path">Meu espaço <span className="mx-2">/</span> <strong>{current?.group?`${current.group} / `:''}{current?.label??'TBB'}</strong></span></div><div className="row"><CommandPalette/><span className="h-4 border-l border-border mx-1"/><AppTooltip content="Alternar tema"><button className="icon-button" aria-label="Alternar tema claro e escuro" onClick={()=>setTheme(resolvedTheme==='dark'?'light':'dark')}><Sun size={16} className="hidden dark:block"/><Moon size={16} className="dark:hidden"/></button></AppTooltip><Link className="avatar" href="/settings" aria-label="Seu perfil">{userName.slice(0,1).toUpperCase()}</Link></div></header>
 <main id="main-content" className="content" onClick={()=>{if(mobile)setMobile(false);}}>{children}</main><span className="sr-only"><PanelLeftClose/></span></div></div>;
}
