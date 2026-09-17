"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { FinanceCategoryChart, FinanceDailyCashFlowChart, FinanceIncomeUsageChart } from "@/components/TbbCharts";
import { useI18n } from "@/lib/i18n/I18nContext";
import { NaturalLanguageCapture } from "./NaturalLanguageCapture";
import { CompactMonthlyIncome } from "./CompactMonthlyIncome";
import { FinanceOverviewHeader } from "./FinanceOverviewHeader";
import { FinanceSectionNav } from "./FinanceSectionNav";
import { useFinanceCopy } from "./finance-copy";
import type { FinanceOverviewData } from "./overview-query";

type CaptureAccount = { id: string; name: string; institution?: string | null; type?: string };

const localeCode = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;

function percent(value: number, total: number) {
  return total > 0 ? Math.round(value / total * 100) : 0;
}

export function FinanceOverview({ data, captureAccounts }: { data: FinanceOverviewData; captureAccounts: CaptureAccount[] }) {
  const t = useFinanceCopy();
  const { locale } = useI18n();
  const language = localeCode[locale];
  const currency = (cents: number) => new Intl.NumberFormat(language, { style: "currency", currency: "BRL", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const date = (day: string) => new Intl.DateTimeFormat(language, { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`)).replace(".", "");
  const metrics = data.metrics;
  const incomeUse = percent(metrics.expensesCents, metrics.incomeReferenceCents);
  const balanceDelta = metrics.previousBalanceCents ? Math.round((metrics.balanceCents - metrics.previousBalanceCents) / Math.abs(metrics.previousBalanceCents) * 100) : null;
  const goalProgress = metrics.savingsTargetCents ? Math.min(100, percent(metrics.totalSavingsCents, metrics.savingsTargetCents)) : 0;
  const daysInMonth = new Date(Number(data.today.slice(0, 4)), Number(data.today.slice(5, 7)), 0).getDate();
  const elapsed = Number(data.today.slice(8, 10));
  const projection = elapsed ? Math.round(metrics.expensesCents / elapsed * daysInMonth) : metrics.expensesCents;

  const kpis = [
    { label: t("netWorth"), value: metrics.netWorthCents, context: `${data.accounts.filter((account) => !account.unassigned).length} ${t("acrossAccounts")}`, icon: Landmark, tone: "primary" },
    { label: t("income"), value: metrics.incomeCents, context: t("registeredThisMonth"), icon: ArrowDownLeft, tone: "success" },
    { label: t("expenses"), value: metrics.expensesCents, context: metrics.incomeReferenceCents ? `${incomeUse}% ${t("spentFromIncome")}` : t("registeredThisMonth"), icon: ArrowUpRight, tone: "danger" },
    { label: t("balance"), value: metrics.balanceCents, context: balanceDelta === null ? t("newThisMonth") : `${balanceDelta > 0 ? "+" : ""}${balanceDelta}% ${t("comparedPrevious")}`, icon: metrics.balanceCents >= 0 ? TrendingUp : TrendingDown, tone: metrics.balanceCents >= 0 ? "success" : "danger" },
    { label: t("fixed"), value: metrics.fixedCents, context: `${data.fixedDetails.recurringCount + data.fixedDetails.subscriptionCount} ${t("monthlyCommitments")}`, icon: Repeat2, tone: "warning" },
    { label: t("invoices"), value: metrics.openInvoicesCents, context: `${data.creditCards.length} ${t("dueOnCards")}`, icon: CreditCard, tone: "purple" },
  ];

  const alerts: { id: string; title: string; detail: string; href: string; tone: "warning" | "danger" }[] = [];
  if (!metrics.incomeReferenceCents && metrics.expensesCents) alerts.push({ id: "income", title: t("setIncome"), detail: currency(metrics.expensesCents), href: "#renda", tone: "warning" });
  else if (metrics.incomeReferenceCents && metrics.expensesCents >= metrics.incomeReferenceCents) alerts.push({ id: "over", title: t("overIncome"), detail: `${incomeUse}% · ${currency(metrics.expensesCents)}`, href: "#captura", tone: "danger" });
  else if (metrics.incomeReferenceCents && incomeUse >= 80) alerts.push({ id: "near", title: t("nearIncome"), detail: `${incomeUse}% · ${currency(metrics.availableCents)}`, href: "#analises", tone: "warning" });
  else if (metrics.incomeReferenceCents && projection > metrics.incomeReferenceCents) alerts.push({ id: "pace", title: t("spendingPace"), detail: currency(projection), href: "#analises", tone: "warning" });
  for (const card of data.creditCards.filter((item) => item.usage !== null && item.usage >= 80).slice(0, 2)) alerts.push({ id: `card-${card.id}`, title: `${t("cardLimit")} · ${card.name}`, detail: `${card.usage}% · ${currency(card.monthSpentCents)}`, href: "#cartoes", tone: (card.usage || 0) >= 100 ? "danger" : "warning" });
  for (const budget of data.budgets.filter((item) => item.usage >= 80).slice(0, 2)) alerts.push({ id: `budget-${budget.id}`, title: `${t("budgetAlert")} · ${budget.category}`, detail: `${budget.usage}% · ${currency(budget.spentCents)} / ${currency(budget.limitCents)}`, href: "/finance/budgets", tone: budget.usage >= 100 ? "danger" : "warning" });
  for (const item of data.upcoming.slice(0, 2)) alerts.push({ id: item.id, title: `${item.label} ${t("dueSoon")}`, detail: `${date(item.date)} · ${currency(item.amountCents)}`, href: "#pagamentos", tone: "warning" });

  return <div className="finance-overview-page">
    <FinanceOverviewHeader/>
    <FinanceSectionNav/>

    <main id="resumo" className="finance-cockpit">
      <section className="finance-kpi-strip" aria-label={t("overview")}>
        {kpis.map((item, index) => <RevealOnScroll key={item.label} delay={index * .035} className="finance-kpi-reveal">
          <article className="finance-kpi" data-tone={item.tone}>
            <span className="finance-kpi-icon"><item.icon size={16}/></span>
            <div><small>{item.label}</small><strong><NumberFlow value={item.value / 100} format={{ style: "currency", currency: "BRL", maximumFractionDigits: 0 }} locales={language}/></strong><span>{item.context}</span></div>
          </article>
        </RevealOnScroll>)}
      </section>

      <RevealOnScroll><CompactMonthlyIncome accounts={captureAccounts} today={data.today} amountCents={data.monthlyIncome.amountCents} accountId={data.monthlyIncome.accountId} accountName={data.monthlyIncome.accountName}/></RevealOnScroll>

      <section id="analises" className="finance-primary-grid">
        <RevealOnScroll className="finance-primary-chart">
          <article className="finance-overview-card finance-cashflow-card">
            <header className="finance-card-heading"><div><span className="finance-card-icon"><TrendingUp size={17}/></span><div><h2>{t("cashFlow")}</h2><p>{t("cashFlowHint")}</p></div></div><Link href="/finance/reports">{t("seeAll")}<ArrowRight size={14}/></Link></header>
            {data.daily.length ? <><FinanceDailyCashFlowChart data={data.daily} labels={{ income: t("income"), expenses: t("expenses"), balance: t("balance"), last7Days: t("last7Days"), currentMonth: t("currentMonth") }}/><div className="finance-chart-legend"><span><i data-tone="success"/>{t("income")}</span><span><i data-tone="danger"/>{t("expenses")}</span><span><i data-tone="primary"/>{t("balance")}</span></div></> : <EmptyDashboard icon={ReceiptText} text={t("noTransactions")}/>}
          </article>
        </RevealOnScroll>
        <RevealOnScroll className="finance-usage-reveal" delay={.06}>
          <article className="finance-overview-card finance-income-usage">
            <header className="finance-card-heading"><div><span className="finance-card-icon tone-warning"><CircleDollarSign size={17}/></span><div><h2>{t("incomeUsage")}</h2><p>{t("incomeUsageHint")}</p></div></div></header>
            {metrics.incomeReferenceCents ? <>
              <div className="income-usage-score" data-danger={incomeUse >= 100 || undefined}><strong>{incomeUse}%</strong><span>{t("incomeUsed")}</span></div>
              <FinanceIncomeUsageChart fixed={metrics.fixedPaidCents / 100} variable={metrics.variableCents / 100} available={metrics.availableCents / 100} labels={{ fixed: t("fixedLabel"), variable: t("variable"), available: t("available") }}/>
              <div className="income-usage-breakdown">
                <span><i data-tone="fixed"/><small>{t("fixedLabel")}</small><strong>{currency(metrics.fixedPaidCents)}</strong></span>
                <span><i data-tone="variable"/><small>{t("variable")}</small><strong>{currency(metrics.variableCents)}</strong></span>
                <span><i data-tone="available"/><small>{t("available")}</small><strong>{currency(metrics.availableCents)}</strong></span>
              </div>
            </> : <EmptyDashboard icon={CircleDollarSign} text={t("setIncomeHint")} href="#renda" linkText={t("configure")}/>}
          </article>
        </RevealOnScroll>
      </section>

      <section className="finance-secondary-grid">
        <RevealOnScroll><article className="finance-overview-card finance-category-card">
          <header className="finance-card-heading"><div><span className="finance-card-icon tone-purple"><Sparkles size={17}/></span><div><h2>{t("categories")}</h2><p>{t("categoriesHint")}</p></div></div></header>
          {data.categories.length ? <div className="finance-category-layout"><FinanceCategoryChart data={data.categories}/><div className="finance-category-deltas">{data.categories.slice(0, 5).map((item) => <div key={item.category}><span>{item.category}</span><strong>{currency(item.amountCents)}</strong><small data-up={item.delta !== null && item.delta > 0 || undefined}>{item.delta === null ? t("newThisMonth") : `${item.delta > 0 ? "+" : ""}${item.delta}%`}</small></div>)}</div></div> : <EmptyDashboard icon={Sparkles} text={t("noTransactions")}/>}
        </article></RevealOnScroll>
        <RevealOnScroll delay={.05}><article className="finance-overview-card finance-savings-card">
          <header className="finance-card-heading"><div><span className="finance-card-icon tone-success"><PiggyBank size={17}/></span><div><h2>{t("savings")}</h2><p>{t("savingsHint")}</p></div></div></header>
          <div className="finance-savings-value" data-negative={metrics.savingsCents < 0 || undefined}><NumberFlow value={metrics.savingsCents / 100} format={{ style: "currency", currency: "BRL", maximumFractionDigits: 0 }} locales={language}/><span>{metrics.incomeCents ? `${Math.round(metrics.savingsCents / metrics.incomeCents * 100)}%` : "—"}</span></div>
          {metrics.savingsTargetCents ? <div className="finance-goal-progress"><div><span>{currency(metrics.totalSavingsCents)} {t("goalsSaved")}</span><strong>{goalProgress}% {t("goalProgress")}</strong></div><span><i style={{ width: `${goalProgress}%` }}/></span></div> : <div className="finance-goal-empty"><Target size={19}/><span>{t("noGoals")}</span><Link href="/finance/savings">{t("createGoal")}</Link></div>}
          <div className="finance-savings-comparison"><span>{t("previousMonth")}</span><strong>{currency(metrics.previousBalanceCents)}</strong></div>
        </article></RevealOnScroll>
      </section>

      <section id="contas" className="finance-accounts-grid">
        <RevealOnScroll><article className="finance-overview-card finance-account-card">
          <header className="finance-card-heading"><div><span className="finance-card-icon"><Landmark size={17}/></span><div><h2>{t("accountSummary")}</h2><p>{t("accountHint")}</p></div></div><Link href="/finance/accounts">{t("seeAll")}<ArrowRight size={14}/></Link></header>
          <div className="finance-account-list">{data.accounts.filter((account) => !account.unassigned && account.type !== "CREDIT_CARD").slice(0, 6).map((account) => <Link href="/finance/accounts" key={account.id}><span className="finance-account-mark"><WalletCards size={16}/></span><span><strong>{account.name}</strong><small>{account.institution || account.type.replaceAll("_", " ")}</small></span><b data-negative={account.balanceCents < 0 || undefined}>{currency(account.balanceCents)}</b></Link>)}{data.accounts.some((account) => account.unassigned) && <Link href="/finance/transactions"><span className="finance-account-mark tone-warning"><AlertTriangle size={16}/></span><span><strong>{t("pendingLink")}</strong><small>{t("transactions")}</small></span><ArrowRight size={15}/></Link>}</div>
        </article></RevealOnScroll>
        <RevealOnScroll delay={.05}><article id="cartoes" className="finance-overview-card finance-card-overview">
          <header className="finance-card-heading"><div><span className="finance-card-icon tone-purple"><CreditCard size={17}/></span><div><h2>{t("cards")}</h2><p>{t("cardsHint")}</p></div></div></header>
          {data.creditCards.length ? <div className="finance-credit-list">{data.creditCards.slice(0, 4).map((card) => <Link href="/finance/accounts" key={card.id}><div><span><strong>{card.name}</strong><b>{currency(card.monthSpentCents)}</b></span><small>{card.usage === null ? t("limitMissing") : `${card.usage}% ${t("used")}`} {card.closingDay ? `· ${t("closesDay")} ${card.closingDay}` : ""} {card.dueDay ? `· ${t("dueDay")} ${card.dueDay}` : ""}</small></div><span className="finance-credit-progress" data-danger={(card.usage || 0) >= 90 || undefined}><i style={{ width: `${Math.min(100, card.usage || 0)}%` }}/></span></Link>)}</div> : <EmptyDashboard icon={CreditCard} text={t("noCards")} href="/finance/accounts" linkText={t("addCard")}/>}
        </article></RevealOnScroll>
      </section>

      <section className="finance-monitor-grid">
        <RevealOnScroll><article className="finance-overview-card finance-radar-card" data-clear={!alerts.length || undefined}>
          <header className="finance-card-heading"><div><span className="finance-card-icon tone-warning">{alerts.length ? <AlertTriangle size={17}/> : <ShieldCheck size={17}/>}</span><div><h2>{t("radar")}</h2><p>{alerts.length ? `${alerts.length} ${t("radarAttention")}` : t("radarClear")}</p></div></div></header>
          {alerts.length ? <div className="finance-radar-list">{alerts.slice(0, 5).map((alert) => <Link key={alert.id} href={alert.href} data-tone={alert.tone}><span><strong>{alert.title}</strong><small>{alert.detail}</small></span><ArrowRight size={15}/></Link>)}</div> : <div className="finance-radar-clear"><CheckCircle2 size={24}/><span>{t("radarClear")}</span></div>}
        </article></RevealOnScroll>
      <RevealOnScroll delay={.05}><article id="pagamentos" className="finance-overview-card finance-upcoming-card">
          <header className="finance-card-heading"><div><span className="finance-card-icon"><CalendarClock size={17}/></span><div><h2>{t("upcoming")}</h2><p>{t("upcomingHint")}</p></div></div></header>
          {data.upcoming.length ? <div className="finance-upcoming-list">{data.upcoming.map((item) => <div key={item.id}><time dateTime={item.date}><strong>{date(item.date).split(" ")[0]}</strong><small>{date(item.date).split(" ").slice(1).join(" ")}</small></time><span><strong>{item.label}</strong><small>{item.kind === "CARD" ? t("cardKind") : item.kind === "DEBT" ? t("debtKind") : item.kind === "INVESTMENT" ? t("investments") : t("subscriptionKind")}</small></span><b>{currency(item.amountCents)}</b></div>)}</div> : <EmptyDashboard icon={CalendarClock} text={t("noUpcoming")}/>} 
        </article></RevealOnScroll>
      </section>

      <RevealOnScroll><section id="transacoes" className="finance-overview-card finance-recent-card">
        <header className="finance-card-heading"><div><span className="finance-card-icon"><ReceiptText size={17}/></span><div><h2>{t("recent")}</h2><p>{t("recentHint")}</p></div></div><Link href="/finance/transactions">{t("fullHistory")}<ArrowRight size={14}/></Link></header>
        {data.recent.length ? <div className="finance-recent-list">{data.recent.map((item) => {
          const positive = item.type === "INCOME" || item.type === "REFUND";
          return <Link href="/finance/transactions" key={item.id}><span className="finance-transaction-icon" data-positive={positive || undefined}>{positive ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><span className="finance-transaction-copy"><strong>{item.merchant || item.description}</strong><small>{item.merchant ? item.description + " · " : ""}{item.category} · {item.account}</small></span><time>{date(item.date)}</time><b data-positive={positive || undefined}>{positive ? "+" : "−"}{currency(item.amountCents)}</b></Link>;
        })}</div> : <EmptyDashboard icon={ReceiptText} text={t("noTransactions")}/>}
      </section></RevealOnScroll>

      <RevealOnScroll><section id="captura" className="finance-capture-overview"><NaturalLanguageCapture accounts={captureAccounts} today={data.today}/></section></RevealOnScroll>
    </main>
  </div>;
}

function EmptyDashboard({ icon: Icon, text, href, linkText }: { icon: typeof ReceiptText; text: string; href?: string; linkText?: string }) {
  return <div className="finance-dashboard-empty"><Icon size={23}/><span>{text}</span>{href && <Link href={href}>{linkText || "Abrir"}<ArrowRight size={13}/></Link>}</div>;
}
