"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Building2, CalendarClock, CheckCircle2, CircleDollarSign, Download, ExternalLink, Eye, FileText, Gauge, Landmark, Layers3, LineChart, Plus, Radar, RefreshCw, Scale, Search, ShieldCheck, Target, TrendingUp, WalletCards } from "lucide-react";
import { InvestmentIncomeChart } from "@/components/TbbCharts";
import { Modal } from "@/components/ui/Modal";
import type { InvestmentOverviewData } from "./queries";
import type { FinanceFormAccount, InvestmentFormAccount, InvestmentFormAsset, ProductFormDefinition } from "./forms";
import { InvestmentAllocationForm, InvestmentBudgetForm, InvestmentGoalLinkForm, InvestmentIncomeForm, InvestmentMarketRefreshForm, InvestmentPriceAlertForm, InvestmentPriceForm, InvestmentProductForm, InvestmentResearchForm, InvestmentTradeForm, InvestmentWatchlistForm, InvestmentWatchlistItemForm } from "./forms";
import { InvestmentPageHeader } from "./InvestmentPageHeader";
import { InvestmentPositionsTable } from "./InvestmentPositionsTable";
import { InvestmentSimulator } from "./InvestmentSimulator";
import { InvestmentSubnav } from "./InvestmentSubnav";
import { investmentSections, type InvestmentSectionId } from "./investment-sections";
import { useInvestmentCopy } from "./investment-copy";

type Shell = { accounts: InvestmentFormAccount[]; assets: InvestmentFormAsset[]; financeAccounts: FinanceFormAccount[]; products: ProductFormDefinition[] };
type SectionId = InvestmentSectionId;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Math.abs(cents) < 100_000 ? 2 : 0 }).format(cents / 100);
const pct = (bp: number) => `${(bp / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const date = (day: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(day.length === 10 ? `${day}T00:00:00.000Z` : day));

export function InvestmentSectionPage({ section, data, shell }: { section: SectionId; data: InvestmentOverviewData; shell: Shell }) {
  const t = useInvestmentCopy();
  const sectionCopyKey = investmentSections.find((item) => item.id === section)?.key || "title";
  return <div className="investment-page investment-section-page">
    <InvestmentPageHeader today={data.today} {...shell} compactTitle={t(sectionCopyKey)}/>
    <InvestmentSubnav/>
    <main className="investment-section-content">
      {section === "portfolio" && <PortfolioSection data={data} shell={shell}/>} 
      {section === "fixed-income" && <FixedIncomeSection data={data}/>} 
      {section === "stocks" && <AssetClassSection data={data} types={["STOCK", "BDR"]} title="Ações e BDRs"/>}
      {section === "etfs" && <AssetClassSection data={data} types={["ETF"]} title="ETFs"/>}
      {section === "fiis" && <AssetClassSection data={data} types={["FII"]} title="FIIs"/>}
      {section === "funds" && <AssetClassSection data={data} types={["FUND", "FIAGRO"]} title="Fundos e Fiagros"/>}
      {section === "crypto" && <CryptoSection data={data}/>} 
      {section === "real-estate" && <RealEstateSection data={data}/>} 
      {section === "trading" && <TradingSection data={data} shell={shell}/>} 
      {section === "research" && <ResearchSection data={data} shell={shell}/>} 
      {section === "watchlist" && <WatchlistSection data={data} shell={shell}/>} 
      {section === "income" && <IncomeSection data={data} shell={shell}/>} 
      {section === "goals" && <GoalsSection data={data} shell={shell}/>} 
      {section === "simulator" && <InvestmentSimulator selicBasisPoints={Math.round((data.macro.find((item) => item.code === "SELIC")?.value || 0) * 100)}/>} 
    </main>
  </div>;
}

function PortfolioSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  function exportCsv() {
    const header = ["Ativo", "Ticker", "Classe", "Conta", "Quantidade", "Preço médio", "Preço atual", "Aplicado", "Valor atual", "Resultado", "Fonte"];
    const rows = data.positions.map((item) => [item.name, item.ticker || "", item.type, item.account, item.quantity, item.averagePriceCents, item.currentPriceCents, item.bookCostCents / 100, item.currentValueCents / 100, item.unrealizedPnlCents / 100, item.source]);
    const content = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); link.download = `tbb-carteira-${data.today}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  return <>
    <SectionKpis items={[{ label: "Valor atual", value: money(data.metrics.marketValueCents), icon: Landmark }, { label: "Valor aplicado", value: money(data.metrics.bookCostCents), icon: WalletCards }, { label: "Resultado total", value: money(data.metrics.totalResultCents), detail: pct(data.metrics.returnBasisPoints), tone: data.metrics.totalResultCents >= 0 ? "success" : "danger", icon: TrendingUp }, { label: "Posições", value: String(data.positions.length), detail: `${data.accounts.length} contas`, icon: Layers3 }]}/>
    <section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Posições consolidadas</h2><p>Cotação manual ou provider claramente identificado em cada linha.</p></div><div><InvestmentMarketRefreshForm/><Modal title="Atualizar cotação" trigger={<><RefreshCw size={14}/>Atualizar preço</>}><InvestmentPriceForm assets={shell.assets} today={data.today}/></Modal><button type="button" className="button-secondary" onClick={exportCsv}><Download size={14}/>Exportar CSV</button></div></header><InvestmentPositionsTable positions={data.positions}/></section>
    <section className="investment-two-column"><article className="investment-section-card"><SectionTitle icon={Landmark} title="Contas de investimento"/><div className="investment-account-directory">{data.accounts.map((account) => <div key={account.id}><span><strong>{account.name}</strong><small>{account.institution || account.type.replaceAll("_", " ")}</small></span><b>{money(data.positions.filter((item) => item.accountId === account.id).reduce((sum, item) => sum + item.currentValueCents, 0))}</b><em>{account.linkedFinancialAccount ? `Finance: ${account.linkedFinancialAccount}` : "Sem vínculo Finance"}</em></div>)}</div></article><article className="investment-section-card"><SectionTitle icon={ShieldCheck} title="Qualidade da carteira"/><div className="investment-health-list"><MetricRow label="Liquidez D+0 / D+1" value={pct(data.risk.liquidBasisPoints)} detail={money(data.risk.liquidCents)}/><MetricRow label="Maior posição" value={data.risk.maxPosition?.name || "—"} detail={data.risk.maxPosition ? pct(data.risk.maxPosition.weightBasisPoints) : ""}/><MetricRow label="Maior instituição" value={data.risk.maxInstitution?.name || "—"} detail={data.risk.maxInstitution ? pct(data.risk.maxInstitution.weightBasisPoints) : ""}/><MetricRow label="Parcela ilíquida" value={money(data.risk.illiquidCents)} detail="Imóveis e ativos sem liquidez"/></div></article></section>
  </>;
}

function FixedIncomeSection({ data }: { data: InvestmentOverviewData }) {
  const types = ["CASH_EQUIVALENT", "SAVINGS", "CDB", "LCI", "LCA", "TREASURY", "DEBENTURE", "FIXED_INCOME_OTHER"];
  const positions = data.positions.filter((item) => types.includes(item.type));
  return <><SectionKpis items={[{ label: "Patrimônio em renda fixa", value: money(positions.reduce((sum, item) => sum + item.currentValueCents, 0)), icon: Landmark }, { label: "Produtos", value: String(positions.length), icon: Layers3 }, { label: "Com liquidez", value: money(positions.filter((item) => item.liquidity === "LIQUID").reduce((sum, item) => sum + item.currentValueCents, 0)), icon: ShieldCheck }, { label: "Próximo vencimento", value: data.upcomingMaturities[0] ? date(data.upcomingMaturities[0].date) : "—", icon: CalendarClock }]}/>
    <section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Títulos e aplicações</h2><p>Liquidez, indexador, custo e valor ficam associados ao ativo.</p></div><Link href="/finance/investments/simulator" className="button-secondary"><BarChart3 size={14}/>Comparar cenários</Link></header><InvestmentPositionsTable positions={data.positions} types={types}/></section>
    <section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Catálogo versionado</h2><p>Condições são editáveis, datadas e preservam a fonte usada.</p></div><Modal title="Nova versão de produto" trigger={<><Plus size={14}/>Produto</>} drawer><InvestmentProductForm today={data.today}/></Modal></header><div className="investment-product-grid">{data.products.map((product) => <article key={product.id}><header><span>{product.institution.slice(0, 2).toUpperCase()}</span><div><h3>{product.product}</h3><p>{product.institution} · {product.assetType.replaceAll("_", " ")}</p></div></header><strong>{product.indexerPercentageBasisPoints ? `${(product.indexerPercentageBasisPoints / 100).toLocaleString("pt-BR")}%` : product.fixedRateBasisPoints ? `${pct(product.fixedRateBasisPoints)} a.a.` : product.indexer.replaceAll("_", " ")}</strong><p>{product.eligibility || "Sem condição adicional cadastrada."}</p><footer><span>{product.liquidity || "Liquidez não informada"}</span><a href={product.source} target="_blank" rel="noreferrer">Fonte <ExternalLink size={12}/></a></footer></article>)}</div></section></>;
}

function AssetClassSection({ data, types, title }: { data: InvestmentOverviewData; types: string[]; title: string }) {
  const positions = data.positions.filter((item) => types.includes(item.type));
  const total = positions.reduce((sum, item) => sum + item.currentValueCents, 0);
  const pnl = positions.reduce((sum, item) => sum + item.unrealizedPnlCents, 0);
  const income = data.recent.filter((item) => item.kind === "INCOME" && positions.some((position) => item.title === position.ticker || item.title === position.name)).reduce((sum, item) => sum + item.amountCents, 0);
  const sectors = [...new Map(positions.map((item) => [item.sector || "Sem setor", positions.filter((row) => (row.sector || "Sem setor") === (item.sector || "Sem setor")).reduce((sum, row) => sum + row.currentValueCents, 0)])).entries()].sort((a, b) => b[1] - a[1]);
  return <><SectionKpis items={[{ label: `Patrimônio em ${title}`, value: money(total), icon: LineChart }, { label: "Resultado não realizado", value: money(pnl), tone: pnl >= 0 ? "success" : "danger", icon: TrendingUp }, { label: "Rendimentos registrados", value: money(income), icon: CircleDollarSign }, { label: "Ativos", value: String(positions.length), icon: Layers3 }]}/><section className="investment-section-card"><SectionTitle icon={LineChart} title={title}/><InvestmentPositionsTable positions={data.positions} types={types}/></section><section className="investment-two-column"><article className="investment-section-card"><SectionTitle icon={Radar} title="Exposição por setor"/><div className="investment-bar-list">{sectors.length ? sectors.map(([sector, value]) => <div key={sector}><span>{sector}</span><strong>{money(value)}</strong><i><b style={{ width: `${total ? Math.round(value / total * 100) : 0}%` }}/></i></div>) : <SectionEmpty icon={Radar}/>}</div></article><article className="investment-section-card"><SectionTitle icon={Bell} title="Radar"/><div className="investment-message"><ShieldCheck size={22}/><strong>Acompanhamento descritivo</strong><p>O TBB mostra concentração, variação e seus registros. Ele não cria sinais de compra ou venda.</p><Link href="/finance/investments/watchlist">Abrir watchlist <ArrowRight size={13}/></Link></div></article></section></>;
}

function CryptoSection({ data }: { data: InvestmentOverviewData }) {
  const positions = data.positions.filter((item) => item.type === "CRYPTO");
  return <><SectionKpis items={[{ label: "Patrimônio cripto", value: money(positions.reduce((sum, item) => sum + item.currentValueCents, 0)), icon: Gauge }, { label: "Resultado", value: money(positions.reduce((sum, item) => sum + item.unrealizedPnlCents, 0)), icon: TrendingUp }, { label: "Ativos", value: String(positions.length), icon: Layers3 }, { label: "Provider conectado", value: positions.some((item) => item.source === "CoinGecko") ? "CoinGecko" : "Manual", icon: RefreshCw }]}/><section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Posições fracionárias</h2><p>Precisão de até 12 casas na quantidade e 8 no preço.</p></div><Modal title="Pesquisar cripto" trigger={<><Search size={14}/>Pesquisar ativo</>}><p className="muted">Use a busca de mercado no cabeçalho para adicionar um ativo da CoinGecko.</p></Modal></header><InvestmentPositionsTable positions={data.positions} types={["CRYPTO"]}/></section><section className="investment-source-note"><RefreshCw size={16}/><div><strong>Fonte e atualização visíveis</strong><p>Cotações conectadas usam CoinGecko Simple Price, mostram atraso e conservam o último valor em cache quando o provider está indisponível.</p></div><a href="https://docs.coingecko.com/reference/simple-price" target="_blank" rel="noreferrer">Documentação <ExternalLink size={12}/></a></section></>;
}

function RealEstateSection({ data }: { data: InvestmentOverviewData }) {
  const assets = data.assets.filter((asset) => asset.type === "REAL_ESTATE" && asset.realEstate);
  const totalEquity = data.positions.filter((position) => position.type === "REAL_ESTATE").reduce((sum, position) => sum + position.currentValueCents, 0);
  const rent = assets.reduce((sum, asset) => sum + (asset.realEstate?.monthlyRentCents || 0), 0);
  const debt = assets.reduce((sum, asset) => sum + (asset.realEstate?.financingBalanceCents || 0), 0);
  return <><SectionKpis items={[{ label: "Equity imobiliário", value: money(totalEquity), icon: Building2 }, { label: "Aluguel bruto mensal", value: money(rent), icon: CircleDollarSign }, { label: "Saldo financiado", value: money(debt), icon: Landmark }, { label: "Imóveis", value: String(assets.length), icon: Layers3 }]}/><section className="investment-property-grid">{assets.map((asset) => { const item = asset.realEstate!; const net = item.monthlyRentCents - item.monthlyCostsCents; const equity = item.estimatedValueCents - item.financingBalanceCents; return <article className="investment-section-card" key={asset.id}><header><span><Building2 size={19}/></span><div><h2>{asset.name}</h2><p>{item.propertyType} · avaliado em {date(item.valuationDate)}</p></div></header><div className="investment-property-value"><small>Equity estimado</small><strong>{money(equity)}</strong><span>{money(item.estimatedValueCents)} valor · {money(item.financingBalanceCents)} dívida</span></div><div className="investment-property-metrics"><MetricRow label="Aluguel" value={money(item.monthlyRentCents)}/><MetricRow label="Custos" value={money(item.monthlyCostsCents)}/><MetricRow label="Fluxo líquido" value={money(net)}/><MetricRow label="Vacância" value={pct(item.vacancyBasisPoints)}/></div></article>; })}{!assets.length && <div className="investment-section-card"><SectionEmpty icon={Building2} text="Cadastre um ativo do tipo Imóvel para acompanhar equity, renda e financiamento."/></div>}</section></>;
}

function TradingSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  const metrics = data.tradingMetrics;
  return <><SectionKpis items={[{ label: "P&L líquido", value: money(metrics.netPnlCents), tone: metrics.netPnlCents >= 0 ? "success" : "danger", icon: TrendingUp }, { label: "Taxa de acerto", value: pct(metrics.winRateBasisPoints), icon: Target }, { label: "Profit factor", value: metrics.profitFactor === null ? "∞" : metrics.profitFactor.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), icon: Scale }, { label: "Drawdown máximo", value: money(metrics.maxDrawdownCents), tone: "danger", icon: ArrowDownLeft }]}/><section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Journal de operações</h2><p>Entrada, saída, stop, alvo, custos, estratégia e notas.</p></div><Modal title="Nova operação" trigger={<><Plus size={14}/>Operação</>} drawer><InvestmentTradeForm accounts={shell.accounts} assets={shell.assets}/></Modal></header><div className="investment-trade-table"><table><thead><tr><th>Ativo</th><th>Direção</th><th>Entrada</th><th>Saída</th><th>Quantidade</th><th>Estratégia</th><th>Status</th></tr></thead><tbody>{data.trades.map((trade) => <tr key={trade.id}><td><strong>{trade.asset.ticker || trade.asset.name}</strong><small>{trade.account}</small></td><td><span className="investment-type-pill">{trade.direction}</span></td><td>{date(trade.entryDate)}<small>{money(Number(trade.entryPriceCents))}</small></td><td>{trade.exitDate ? date(trade.exitDate) : "—"}<small>{trade.exitPriceCents ? money(Number(trade.exitPriceCents)) : ""}</small></td><td>{Number(trade.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 8 })}</td><td>{trade.strategy || "—"}<small>{trade.setup || ""}</small></td><td><span className="investment-status" data-status={trade.status}>{trade.status}</span></td></tr>)}</tbody></table>{!data.trades.length && <SectionEmpty icon={LineChart} text="Registre a primeira operação para formar seu journal."/>}</div></section></>;
}

function ResearchSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  return <><section className="investment-research-layout"><article className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Caderno de pesquisa</h2><p>Separe fatos, hipóteses, riscos e fontes da decisão.</p></div><Modal title="Nova nota de pesquisa" trigger={<><Plus size={14}/>Nota</>} drawer><InvestmentResearchForm assets={shell.assets}/></Modal></header><div className="investment-note-grid">{data.notes.map((note) => <article key={note.id}><span><FileText size={15}/>{note.asset?.ticker || note.asset?.name || "MACRO"}</span><h3>{note.title}</h3><p>{note.content}</p><div>{note.tags.map((tag) => <em key={tag}>{tag}</em>)}</div><footer>{date(note.updatedAt)}</footer></article>)}{!data.notes.length && <SectionEmpty icon={BookOpen} text="Crie a primeira tese ou nota macro."/>}</div></article><aside className="investment-section-card"><SectionTitle icon={Radar} title="Mercado e fontes"/><div className="investment-market-list">{data.macro.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.code}><span><strong>{item.name}</strong><small>{item.source}</small></span><b>{item.value.toLocaleString("pt-BR")}{item.unit}</b><em>{item.freshness}</em></a>)}{!data.macro.length && <SectionEmpty icon={RefreshCw}/>}</div><p className="investment-disclaimer">Conteúdo descritivo. Sem recomendação, ordem simulada ou cotação inventada.</p></aside></section></>;
}

function WatchlistSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  const lists = data.watchlists.map(({ id, name }) => ({ id, name }));
  return <><section className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Watchlists</h2><p>Organize ativos que você quer acompanhar sem incluí-los na carteira.</p></div><div><Modal title="Nova watchlist" trigger={<><Plus size={14}/>Lista</>}><InvestmentWatchlistForm/></Modal>{lists.length > 0 && <Modal title="Adicionar ativo" trigger={<><Eye size={14}/>Ativo</>}><InvestmentWatchlistItemForm watchlists={lists} assets={shell.assets}/></Modal>}<Modal title="Novo alerta de preço" trigger={<><Bell size={14}/>Alerta</>}><InvestmentPriceAlertForm assets={shell.assets}/></Modal></div></header><div className="investment-watchlist-grid">{data.watchlists.map((list) => <article key={list.id}><header><span><Eye size={16}/></span><div><h3>{list.name}</h3><p>{list.items.length} ativos</p></div></header>{list.items.map((item) => <div key={item.id}><span className="investment-asset-avatar">{(item.asset.ticker || item.asset.name).slice(0, 2).toUpperCase()}</span><span><strong>{item.asset.ticker || item.asset.name}</strong><small>{item.asset.type.replaceAll("_", " ")} {item.notes ? `· ${item.notes}` : ""}</small></span><b>{item.targetPriceCents ? money(Number(item.targetPriceCents)) : "Sem alvo"}</b></div>)}</article>)}{!data.watchlists.length && <SectionEmpty icon={Eye} text="Crie uma lista e adicione os ativos já cadastrados."/>}</div></section>{data.alerts.length > 0 && <section className="investment-section-card"><SectionTitle icon={Bell} title="Alertas ativos"/><div className="investment-alert-list">{data.alerts.map((alert) => { const current = data.positions.find((position) => position.assetId === alert.asset.id); const reached = current ? alert.type === "ABOVE" ? Number(current.currentPriceCents) >= Number(alert.targetValueCents) : Number(current.currentPriceCents) <= Number(alert.targetValueCents) : false; return <div key={alert.id} data-reached={reached || undefined}><span><strong>{alert.asset.ticker || alert.asset.name}</strong><small>{alert.type === "ABOVE" ? "Acima de" : "Abaixo de"} {money(Number(alert.targetValueCents))}</small></span><b>{current ? money(Number(current.currentPriceCents)) : "Sem preço"}</b><em>{reached ? "ATINGIDO" : "MONITORANDO"}</em></div>; })}</div></section>}</>;
}

function IncomeSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  const allIncome = data.incomeByMonth.reduce((sum, item) => sum + Math.round(item.income * 100), 0);
  return <><SectionKpis items={[{ label: "Recebido no mês", value: money(data.metrics.monthIncomeCents), icon: CircleDollarSign }, { label: "Últimos 12 meses", value: money(allIncome), icon: TrendingUp }, { label: "Média mensal", value: money(Math.round(allIncome / 12)), icon: BarChart3 }, { label: "Yield sobre custo", value: data.metrics.bookCostCents ? pct(Math.round(allIncome / data.metrics.bookCostCents * 10_000)) : "—", icon: Gauge }]}/><section className="investment-two-column investment-income-section"><article className="investment-section-card"><header className="investment-section-toolbar"><div><h2>Renda passiva</h2><p>Rendimentos registrados nos últimos 12 meses.</p></div><Modal title="Registrar rendimento" trigger={<><Plus size={14}/>Rendimento</>} drawer><InvestmentIncomeForm accounts={shell.accounts} assets={shell.assets} today={data.today}/></Modal></header><InvestmentIncomeChart data={data.incomeByMonth}/></article><article className="investment-section-card"><SectionTitle icon={CalendarClock} title="Recebimentos recentes"/><div className="investment-income-list">{data.recent.filter((item) => item.kind === "INCOME").map((item) => <div key={item.id}><span><strong>{item.title}</strong><small>{item.type} · {date(item.date)}</small></span><b>+{money(item.amountCents)}</b></div>)}{!data.recent.some((item) => item.kind === "INCOME") && <SectionEmpty icon={CircleDollarSign}/>}</div></article></section></>;
}

function GoalsSection({ data, shell }: { data: InvestmentOverviewData; shell: Shell }) {
  const kpis = [
    { label: "Verba do mês", value: money(data.budget?.amountCents || 0), icon: Target },
    { label: "Aportado", value: money(data.metrics.monthContributionsCents), icon: ArrowUpRight },
    { label: "Restante", value: money(data.metrics.investableCashCents), icon: WalletCards },
    { label: "Metas financeiras", value: String(data.goals.length), icon: CheckCircle2 },
  ];
  return <>
    <SectionKpis items={kpis}/>
    <section className="investment-planning-grid">
      <article className="investment-section-card">
        <header className="investment-section-toolbar"><div><h2>Plano mensal de aportes</h2><p>Defina quanto pode investir sem confundir aporte com despesa.</p></div><Modal title="Planejamento mensal" trigger={<><Target size={14}/>Configurar</>} drawer><InvestmentBudgetForm month={data.today.slice(0, 7)}/></Modal></header>
        {data.budget ? <div className="investment-plan-summary"><div><small>Planejado</small><strong>{money(data.budget.amountCents)}</strong></div><div><small>Aplicado</small><strong>{money(data.budget.usedCents)}</strong></div><div><small>Restante</small><strong>{money(data.budget.remainingCents)}</strong></div><span><i style={{ width: `${Math.min(100, data.budget.usageBasisPoints / 100)}%` }}/></span></div> : <SectionEmpty icon={Target} text="Configure a verba mensal e a divisão planejada por classe."/>}
      </article>
      <article className="investment-section-card">
        <header className="investment-section-toolbar"><div><h2>Alocação alvo</h2><p>O sistema mostra o desvio; a decisão continua sendo sua.</p></div><Modal title="Alocação alvo" trigger={<><Scale size={14}/>Configurar</>}><InvestmentAllocationForm/></Modal></header>
        <div className="investment-target-list">{data.allocation.map((item) => <div key={item.key}><span>{item.label}</span><strong>{pct(item.currentBasisPoints)}</strong><small>alvo {item.targetBasisPoints ? pct(item.targetBasisPoints) : "—"}</small><em data-alert={Math.abs(item.driftBasisPoints) >= 500 || undefined}>{item.targetBasisPoints ? `${item.driftBasisPoints > 0 ? "+" : ""}${pct(item.driftBasisPoints)}` : "sem alvo"}</em></div>)}{!data.allocation.length && <SectionEmpty icon={Scale}/>}</div>
      </article>
    </section>
    <section className="investment-section-card">
      <header className="investment-section-toolbar"><div><h2>Metas conectadas</h2><p>Relacione a carteira inteira ou um ativo a uma meta financeira.</p></div>{data.goals.length > 0 && <Modal title="Conectar meta" trigger={<><Plus size={14}/>Conectar</>}><InvestmentGoalLinkForm goals={data.goals.map(({id,name})=>({id,name}))} assets={shell.assets}/></Modal>}</header>
      <div className="investment-goal-grid">{data.goals.map((goal) => {
        const progress = goal.targetCents ? Math.min(100, Math.round(goal.currentCents / goal.targetCents * 100)) : 0;
        return <article key={goal.id}><header><span><strong>{goal.name}</strong><small>{goal.targetDate ? `até ${date(goal.targetDate)}` : "Sem prazo"}</small></span><b>{progress}%</b></header><span><i style={{ width: `${progress}%` }}/></span><footer><strong>{money(goal.currentCents)}</strong><small>de {money(goal.targetCents)}</small></footer>{goal.links.length > 0 && <p>{goal.links.map((link) => link.asset?.ticker || link.asset?.name || "Carteira").join(", ")}</p>}</article>;
      })}{!data.goals.length && <SectionEmpty icon={CheckCircle2} text="Crie uma meta em Money → Metas para conectá-la à carteira."/>}</div>
    </section>
  </>;
}

function SectionKpis({ items }: { items: { label: string; value: string; detail?: string; tone?: string; icon: typeof Landmark }[] }) {
  return <section className="investment-section-kpis">{items.map((item) => <article key={item.label} data-tone={item.tone}><span><item.icon size={16}/></span><div><small>{item.label}</small><strong>{item.value}</strong>{item.detail && <em>{item.detail}</em>}</div></article>)}</section>;
}
function SectionTitle({ icon: Icon, title }: { icon: typeof Landmark; title: string }) { return <header className="investment-section-title"><span><Icon size={16}/></span><h2>{title}</h2></header>; }
function MetricRow({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>; }
function SectionEmpty({ icon: Icon, text = "Nenhum dado registrado nesta área." }: { icon: typeof Landmark; text?: string }) { return <div className="investment-section-empty"><Icon size={22}/><p>{text}</p></div>; }
