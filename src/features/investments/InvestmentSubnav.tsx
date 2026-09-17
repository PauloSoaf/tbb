"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useInvestmentCopy } from "./investment-copy";
import { investmentSections } from "./investment-sections";

export function InvestmentSubnav() {
  const pathname = usePathname();
  const t = useInvestmentCopy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = investmentSections.filter((section) => pathname === section.href || (section.href !== "/finance/investments" && pathname.startsWith(section.href))).sort((a, b) => b.href.length - a.href.length)[0] || investmentSections[0];
  useEffect(() => { const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const main = investmentSections.filter((section) => !section.overflow);
  const overflow = investmentSections.filter((section) => section.overflow);

  return <nav className="investment-subnav" aria-label="Seções de investimentos">
    <div className="investment-subnav-track">{main.map((section) => <Link href={section.href} key={section.id} aria-current={active.id === section.id ? "page" : undefined}>{active.id === section.id && <motion.span layoutId="investment-subnav-active" className="investment-subnav-active" transition={{ type: "spring", stiffness: 430, damping: 35 }}/>}<span>{t(section.key)}</span></Link>)}</div>
    <div className="investment-subnav-more" ref={ref}><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} data-active={active.overflow || undefined}>{active.overflow ? t(active.key) : t("more")}<ChevronDown size={14}/></button><div data-open={open}>{overflow.map((section) => <Link href={section.href} key={section.id} aria-current={active.id === section.id ? "page" : undefined} onClick={() => setOpen(false)}>{t(section.key)}</Link>)}</div></div>
  </nav>;
}
