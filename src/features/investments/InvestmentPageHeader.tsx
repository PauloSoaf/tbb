"use client";

import Link from "next/link";
import { Download, Landmark, Plus, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvestmentAccountForm, InvestmentAssetForm, InvestmentTransactionForm, type FinanceFormAccount, type InvestmentFormAccount, type InvestmentFormAsset, type ProductFormDefinition } from "./forms";
import { MarketAssetSearch } from "./MarketAssetSearch";
import { useInvestmentCopy } from "./investment-copy";

export function InvestmentPageHeader({ today, accounts, assets, financeAccounts, products, compactTitle }: { today: string; accounts: InvestmentFormAccount[]; assets: InvestmentFormAsset[]; financeAccounts: FinanceFormAccount[]; products?: ProductFormDefinition[]; compactTitle?: string }) {
  const t = useInvestmentCopy();
  return <PageHeader eyebrow={t("eyebrow")} title={compactTitle || t("title")} description={compactTitle ? t("subtitle") : t("subtitle")}>
    <Modal title={`+ ${t("contribution")}`} trigger={<><Plus size={15}/>{t("contribution")}</>} triggerClassName="button" openWhen={{param:"action",value:"contribution"}} drawer><InvestmentTransactionForm accounts={accounts} assets={assets} financeAccounts={financeAccounts} today={today}/></Modal>
    <Modal title={`+ ${t("asset")}`} trigger={<><Plus size={15}/>{t("asset")}</>} drawer><InvestmentAssetForm today={today} products={products}/></Modal>
    <Modal title={t("searchAsset")} trigger={<><Search size={15}/>{t("searchAsset")}</>}><MarketAssetSearch/></Modal>
    <Link className="button-secondary" href="/finance/investments/import"><Download size={15}/>{t("import")}</Link>
    <Modal title={`+ ${t("account")}`} trigger={<><Landmark size={15}/><span className="investment-header-account-label">{t("account")}</span></>}><InvestmentAccountForm financeAccounts={financeAccounts}/></Modal>
  </PageHeader>;
}
