"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useInvestmentCopy, type InvestmentCopyKey } from "@/features/investments/investment-copy";
import { usePageTitle } from "./BreadcrumbTitle";
import { backTarget, recordVisit } from "./nav-history";
import { resolveRouteTrail, withKeptParams, type CrumbLabel } from "./navigation-registry";

/** Always-visible path and back button, outside the auto-hiding top bar. */
export function AppNavigationBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const investment = useInvestmentCopy();
  const pageTitle = usePageTitle(pathname);
  const query = search.toString();
  const url = query ? `${pathname}?${query}` : pathname;
  useEffect(() => { try { recordVisit(url, sessionStorage); } catch { /* storage unavailable: back uses the parent */ } }, [url]);
  const trail = resolveRouteTrail(pathname);
  const text = (label: CrumbLabel) => label.kind === "text" ? label.text : label.kind === "i18n" ? t(label.key) : label.kind === "investment" ? investment(label.key as InvestmentCopyKey) : pageTitle ?? t(label.fallbackKey);
  function back() {
    let previous: string | null = null;
    try { previous = backTarget(url, sessionStorage); } catch { previous = null; }
    router.push(previous ?? withKeptParams(trail.parentHref ?? "/today", search, trail.keepParams));
  }
  return <div className="app-nav-strip">
    {trail.parentHref && <button type="button" className="app-back" onClick={back}><ArrowLeft size={15} aria-hidden="true"/>{t("shell.back")}</button>}
    <nav aria-label={t("shell.breadcrumb")} className="app-breadcrumb"><ol>{trail.crumbs.map((crumb, index) => {
      const last = index === trail.crumbs.length - 1;
      const label = text(crumb.label);
      const href = crumb.href && crumb.href !== pathname ? (index ? withKeptParams(crumb.href, search, trail.keepParams) : crumb.href) : null;
      return <li key={`${index}-${label}`}>{last ? <span aria-current="page">{label}</span> : href ? <Link href={href}>{label}</Link> : <span>{label}</span>}{!last && <ChevronRight size={13} aria-hidden="true"/>}</li>;
    })}</ol></nav>
  </div>;
}
