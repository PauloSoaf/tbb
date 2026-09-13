"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CirclePlus, ListTodo, Sun, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
const items=[{key:"today",href:"/today",icon:Sun},{key:"tasks",href:"/tasks",icon:ListTodo},{key:"add",href:"/today?action=add",icon:CirclePlus,primary:true},{key:"finance",href:"/finance",icon:Wallet},{key:"career",href:"/career",icon:BriefcaseBusiness}];
export function MobileBottomNav(){const pathname=usePathname();const {t}=useI18n();return <nav className="mobile-bottom-nav" aria-label="Navegação móvel">{items.map(item=>{const active=pathname===item.href||(item.href!=="/today"&&pathname.startsWith(`${item.href}/`));return <Link key={item.key} href={item.href} className={item.primary?"primary":active?"active":""} aria-current={active?"page":undefined}><item.icon size={item.primary?25:20}/><span>{t(`mobile.${item.key}`)}</span></Link>})}</nav>}
