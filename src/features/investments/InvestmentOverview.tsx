"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { ArrowRight, CalendarClock, CircleDollarSign, Gauge, Landmark, Layers3, PieChart, Radar, ReceiptText, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp, WalletCards } from "lucide-react";
import { InvestmentAllocationChart, InvestmentBenchmarkChart, InvestmentIncomeChart, InvestmentPortfolioHistoryChart } from "@/components/TbbCharts";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { InvestmentOverviewData } from "./queries";
import type { FinanceFormAccount, InvestmentFormAccount, InvestmentFormAsset, ProductFormDefinition } from "./forms";
import { InvestmentAllocationForm, InvestmentBudgetForm, InvestmentReviewForm } from "./forms";
import { InvestmentPageHeader } from "./InvestmentPageHeader";
import { InvestmentSubnav } from "./InvestmentSubnav";
import { useInvestmentCopy } from "./investment-copy";

const localeCode = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;

type Shell = {
  accounts: InvestmentFormAccount[];
  assets: InvestmentFormAsset[];
  financeAccounts: FinanceFormAccount[];
  products: ProductFormDefinition[];
};

export function InvestmentOverview({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  const t = useInvestmentCopy();
  const { locale } = useI18n();
  const language = localeCode[locale];
  const currency = (cents: number) => new Intl.NumberFormat(language, { style: "currency", currency: "BRL", maximumFractionDigits: Math.abs(cents) < 100_000 ? 2 : 0 }).format(cents / 100);
  const percent = (basisPoints: number) => `${(basisPoints / 100).toLocaleString(language, { maximumFractionDigits: 2 })}%`;
  const shortDate = (day: string) => new Intl.DateTimeFormat(language, { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`)).replaceAll(".", "");
  const positive = data.metrics.totalResultCents >= 0;
  const review = data.reviews.find((item) => item.month === data.today.slice(0, 7));
  const kpis = [
    { label: t("investedWealth"), value: data.metrics.marketValueCents, detail: `${data.positions.length} ${t("topPositions").toLowerCase()}`, icon: Landmark, tone: "primary" },
    { label: t("bookCost"), value: data.metrics.bookCostCents, detail: t("allTime"), icon: WalletCards, tone: "purple" },
    { label: t("totalReturn"), value: data.metrics.totalResultCents, detail: `${percent(data.metrics.returnBasisPoints)} ${t("versusCost")}`, icon: TrendingUp, tone: positive ? "success" : "danger" },
    { label: t("month"), value: data.metrics.monthResultCents, detail: t("thisMonth"), icon: Gauge, tone: data.metrics.monthResultCents >= 0 ? "success" : "danger" },
    { label: t("passiveIncome"), value: data.metrics.monthIncomeCents, detail: t("thisMonth"), icon: CircleDollarSign, tone: "success" },
    { label: t("investableCash"), value: data.metrics.investableCashCents, detail: data.budget ? `${percent(data.budget.usageBasisPoints)} ${t("applied").toLowerCase()}` : t("configure"), icon: Target, tone: "warning" },
  ];

  return <div className="investment-page investment-overview-page">
    <InvestmentPageHeader today={data.today} {...shell}/>
    <InvestmentSubnav/>
    <main className="investment-cockpit">
      <section className="investment-kpi-strip" aria-label={t("overview")}>
        {kpis.map((item, index) => <RevealOnScroll className="investment-kpi-reveal" delay={index * .035} key={item.label}><article className="investment-kpi" data-tone={item.tone}>
          <span className="investment-kpi-icon"><item.icon size={16}/></span>
          <div><small>{item.label}</small><strong data-negative={item.value < 0 || undefined}><NumberFlow value={item.value / 100} locales={language} format={{ style: "currency", currency: "BRL", maximumFractionDigits: 0 }}/></strong><span>{item.detail}</span></div>
        </article></RevealOnScroll>)}
      </section>

      {!data.positions.length ? <RevealOnScroll><section className="investment-empty-hero">
        <div><span><Sparkles size={20}/></span><div><h2>{t("empty")}</h2><p>{t("manualData")}</p></div></div>
        <div><span>1</span><p><strong>{t("account")}</strong><small>Corretora, banco, exchange ou custódia</small></p><ArrowRight size={15}/><span>2</span><p><strong>{t("asset")}</strong><small>Manual ou encontrado no mercado</small></p><ArrowRight size={15}/><span>3</span><p><strong>{t("contribution")}</strong><small>Compra, aporte ou transferência</small></p></div>
      </section></RevealOnScroll> : null}

      <section className="investment-primary-grid">
        <RevealOnScroll><article className="investment-card investment-history-card">
          <CardHeading icon={TrendingUp} title={t("history")} detail={`${currency(data.metrics.bookCostCents)} ${t("applied").toLowerCase()}`} href="/finance/investments/portfolio"/>
          {data.history.length ? <><InvestmentPortfolioHistoryChart data={data.history} labels={{ value: t("currentValue"), invested: t("bookCost") }}/><div className="investment-chart-legend"><span><i data-tone="portfolio"/>{t("currentValue")}</span><span><i data-tone="invested"/>{t("bookCost")}</span></div></> : <CardEmpty icon={TrendingUp} text={t("noData")}/>} 
        </article></RevealOnScroll>
        <RevealOnScroll delay={.05}><article className="investment-card investment-allocation-card">
          <CardHeading icon={PieChart} title={t("allocation")} detail={t("current")}/>
          {data.allocation.length ? <><InvestmentAllocationChart data={data.allocation}/><div className="investment-allocation-list">{data.allocation.slice(0, 6).map((item) => <div key={item.key}><i data-group={item.key}/><span>{item.label}</span><strong>{percent(item.currentBasisPoints)}</strong><small data-alert={Math.abs(item.driftBasisPoints) >= 500 || undefined}>{item.targetBasisPoints ? `${item.driftBasisPoints > 0 ? "+" : ""}${percent(item.driftBasisPoints)}` : "—"}</small></div>)}</div></> : <CardEmpty icon={PieChart} text={t("noData")}/>} 
          <footer><Modal title={t("allocation")} trigger={<><Target size={14}/>{t("configure")}</>}><InvestmentAllocationForm/></Modal></footer>
        </article></RevealOnScroll>
      </section>

      <section className="investment-dashboard-grid">
        <RevealOnScroll><article className="investment-card investment-budget-card">
          <CardHeading icon={Target} title={t("investableCash")} detail={data.today.slice(0, 7)}/>
          {data.budget ? <div className="investment-budget-body"><div><small>{t("remaining")}</small><strong>{currency(data.budget.remainingCents)}</strong><span>{currency(data.budget.usedCents)} / {currency(data.budget.amountCents)}</span></div><span className="investment-progress"><i style={{ width: `${Math.min(100, data.budget.usageBasisPoints / 100)}%` }}/></span></div> : <CardEmpty icon={Target} text={t("noData")}/>} 
          <footer><Modal title={t("investableCash")} trigger={<><Target size={14}/>{data.budget ? t("configure") : t("configure")}</>} drawer><InvestmentBudgetForm month={data.today.slice(0, 7)}/></Modal></footer>
        </article></RevealOnScroll>
        <RevealOnScroll delay={.04}><article className="investment-card investment-benchmark-card">
          <CardHeading icon={Radar} title={t("benchmark")} detail={t("source")}/>
          {data.benchmarkComparison.length > 1 && <><InvestmentBenchmarkChart data={data.benchmarkComparison} labels={{ portfolio: t("investedWealth"), selic: "Selic" }}/><div className="investment-chart-legend"><span><i data-tone="portfolio"/>{t("investedWealth")} (base 100)</span><span><i data-tone="invested"/>Selic (base 100)</span></div></>}
          <div className="investment-benchmark-body">{data.macro.length ? data.macro.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.code}><span><strong>{item.name}</strong><small>{item.source}</small></span><b>{item.value.toLocaleString(language, { maximumFractionDigits: 2 })}{item.unit.startsWith("%") ? "%" : ` ${item.unit}`}</b><em data-stale={item.freshness === "STALE" || undefined}>{item.freshness === "STALE" ? t("stale") : t("updated")}</em></a>) : <CardEmpty icon={RefreshCw} text={t("manualData")}/>}</div>
        </article></RevealOnScroll>
        <RevealOnScroll delay={.08}><article className="investment-card investment-top-card">
          <CardHeading icon={Layers3} title={t("topPositions")} detail={t("ofPortfolio")} href="/finance/investments/portfolio"/>
          {data.positions.length ? <div className="investment-position-list">{data.positions.slice(0, 5).map((position) => <Link href="/finance/investments/portfolio" key={position.id}><span className="investment-asset-avatar">{(position.ticker || position.name).slice(0, 2).toUpperCase()}</span><span><strong>{position.ticker || position.name}</strong><small>{position.account} · {position.group.replaceAll("_", " ")}</small></span><b>{currency(position.currentValueCents)}</b><em data-negative={position.unrealizedPnlCents < 0 || undefined}>{position.bookCostCents ? percent(Math.round(position.unrealizedPnlCents / position.bookCostCents * 10_000)) : "—"}</em></Link>)}</div> : <CardEmpty icon={Layers3} text={t("noData")}/>} 
        </article></RevealOnScroll>
      </section>

      <section className="investment-secondary-grid">
        <RevealOnScroll><article className="investment-card investment-income-card"><CardHeading icon={CircleDollarSign} title={t("passiveIncome")} detail={t("allTime")} href="/finance/investments/income"/>{data.incomeByMonth.some((item) => item.income) ? <InvestmentIncomeChart data={data.incomeByMonth}/> : <CardEmpty icon={CircleDollarSign} text={t("noData")}/>}</article></RevealOnScroll>
        <RevealOnScroll delay={.04}><article className="investment-card"><CardHeading icon={CalendarClock} title={t("maturity")} detail={t("liquidity")} href="/finance/investments/fixed-income"/>{data.upcomingMaturities.length ? <div className="investment-maturity-list">{data.upcomingMaturities.slice(0, 5).map((item) => <div key={item.id}><time><strong>{shortDate(item.date).split(" ")[0]}</strong><small>{shortDate(item.date).split(" ").slice(1).join(" ")}</small></time><span><strong>{item.ticker || item.name}</strong><small>{item.indexer.replaceAll("_", " ")} · {item.liquidity}</small></span><b>{currency(item.principalCents)}</b></div>)}</div> : <CardEmpty icon={CalendarClock} text={t("noData")}/>}</article></RevealOnScroll>
        <RevealOnScroll delay={.08}><article className="investment-card"><CardHeading icon={ShieldCheck} title={t("risk")} detail={t("ofPortfolio")}/><div className="investment-risk-grid"><div><small>{t("liquidity")}</small><strong>{percent(data.risk.liquidBasisPoints)}</strong><span>{currency(data.risk.liquidCents)}</span></div><div><small>{t("topPositions")}</small><strong>{data.risk.maxPosition?.name || "—"}</strong><span>{data.risk.maxPosition ? percent(data.risk.maxPosition.weightBasisPoints) : "—"}</span></div><div><small>{t("account")}</small><strong>{data.risk.maxInstitution?.name || "—"}</strong><span>{data.risk.maxInstitution ? percent(data.risk.maxInstitution.weightBasisPoints) : "—"}</span></div><div><small>{t("currentValue")}</small><strong>{currency(data.risk.illiquidCents)}</strong><span>{t("realEstate")}</span></div></div></article></RevealOnScroll>
      </section>

      <section className="investment-lower-grid">
        <RevealOnScroll><article className="investment-card"><CardHeading icon={ReceiptText} title={t("recent")} detail={t("allTime")} href="/finance/investments/portfolio"/>{data.recent.length ? <div className="investment-activity-list">{data.recent.slice(0, 7).map((item) => <div key={item.id} data-income={item.kind === "INCOME" || undefined}><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{shortDate(item.date)}</time><b>{item.kind === "INCOME" ? "+" : ""}{currency(item.amountCents)}</b></div>)}</div> : <CardEmpty icon={ReceiptText} text={t("noData")}/>}</article></RevealOnScroll>
        <RevealOnScroll delay={.05}><article className="investment-card investment-review-card"><CardHeading icon={RefreshCw} title="Revisão mensal" detail={data.today.slice(0, 7)}/><InvestmentReviewForm month={data.today.slice(0, 7)} initial={review ? { portfolioUpdated: review.portfolioUpdated, contributionsReviewed: review.contributionsReviewed, allocationReviewed: review.allocationReviewed, maturitiesReviewed: review.maturitiesReviewed, goalsReviewed: review.goalsReviewed } : undefined}/><p>{t("noRecommendation")}</p></article></RevealOnScroll>
      </section>
    </main>
  </div>;
}

function CardHeading({ icon: Icon, title, detail, href }: { icon: typeof TrendingUp; title: string; detail?: string; href?: string }) {
  return <header className="investment-card-heading"><div><span><Icon size={16}/></span><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div></div>{href && <Link href={href}><ArrowRight size={14}/></Link>}</header>;
}

function CardEmpty({ icon: Icon, text }: { icon: typeof TrendingUp; text: string }) {
  return <div className="investment-card-empty"><Icon size={21}/><span>{text}</span></div>;
}
