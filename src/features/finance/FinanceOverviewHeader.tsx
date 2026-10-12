"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleDollarSign, Download, Goal, Landmark, Package, Plus, ReceiptText, Repeat2, SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountForm } from "./forms";
import { useFinanceCopy } from "./finance-copy";
import { FinanceReportExport } from "./FinanceReportExport";
import { useI18n } from "@/lib/i18n/I18nContext";
import { personalAssetCopy } from "./personal-asset-copy";

export function FinanceOverviewHeader({canExportReport}:{canExportReport:boolean}) {
  const t = useFinanceCopy();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("subtitle")}>
    <Link className="button finance-primary-action" href="#captura"><Plus size={15}/>{t("addTransaction")}</Link>
    <Link className="button-secondary" href="/finance/imports"><Download size={15}/>{t("import")}</Link>
    {canExportReport&&<FinanceReportExport/>}
    <div className="finance-more" ref={ref}>
      <button type="button" className="button-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{t("more")}<ChevronDown size={14} className={open ? "rotate" : ""}/></button>
      <div className="finance-more-menu" data-open={open}>
        <Modal title={t("newAccount")} trigger={<><Landmark size={15}/>{t("newAccount")}</>}><AccountForm/></Modal>
        <Link href="/finance/budgets" onClick={() => setOpen(false)}><SlidersHorizontal size={15}/>{t("budget")}</Link>
        <Link href="/finance/assets" onClick={() => setOpen(false)}><Package size={15}/>{personalAssetCopy(locale).assets}</Link>
        <Link href="/finance/subscriptions" onClick={() => setOpen(false)}><Repeat2 size={15}/>{t("subscription")}</Link>
        <Link href="/finance/savings" onClick={() => setOpen(false)}><Goal size={15}/>{t("goal")}</Link>
        <a href="#renda" onClick={() => setOpen(false)}><CircleDollarSign size={15}/>{t("configureIncome")}</a>
        <Link href="/finance/transactions" onClick={() => setOpen(false)}><ReceiptText size={15}/>{t("fullHistory")}</Link>
      </div>
    </div>
  </PageHeader>;
}
