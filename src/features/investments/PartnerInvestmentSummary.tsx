import Link from "next/link";
import { ArrowRight, CircleDollarSign, Layers3, ShieldCheck, TrendingUp, Users, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { InvestmentOverviewData } from "./queries";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);

export function PartnerInvestmentSummary({ scope, me, partner, partnerName }: { scope: "partner" | "together"; me?: InvestmentOverviewData; partner: InvestmentOverviewData; partnerName: string }) {
  const combined = scope === "together" && me ? {
    value: me.metrics.marketValueCents + partner.metrics.marketValueCents,
    cost: me.metrics.bookCostCents + partner.metrics.bookCostCents,
    result: me.metrics.totalResultCents + partner.metrics.totalResultCents,
    income: me.metrics.monthIncomeCents + partner.metrics.monthIncomeCents,
    positions: me.positions.length + partner.positions.length,
  } : { value: partner.metrics.marketValueCents, cost: partner.metrics.bookCostCents, result: partner.metrics.totalResultCents, income: partner.metrics.monthIncomeCents, positions: partner.positions.length };
  const top = scope === "together" && me ? [...me.positions.map((item) => ({ ...item, owner: "Você" })), ...partner.positions.map((item) => ({ ...item, owner: partnerName }))].sort((a, b) => b.currentValueCents - a.currentValueCents) : partner.positions.map((item) => ({ ...item, owner: partnerName }));
  return <div className="investment-page partner-investment-page">
    <PageHeader eyebrow="MONEY · INVESTMENTS" title={scope === "together" ? "Investimentos juntos" : `Investimentos de ${partnerName}`} description={scope === "together" ? "Visão consolidada; os registros continuam separados por workspace." : "Visão somente leitura dos dados compartilhados pelo parceiro."}/>
    <section className="investment-section-kpis"><article><span><WalletCards size={16}/></span><div><small>Patrimônio</small><strong>{money(combined.value)}</strong></div></article><article><span><Layers3 size={16}/></span><div><small>Valor aplicado</small><strong>{money(combined.cost)}</strong></div></article><article data-tone={combined.result >= 0 ? "success" : "danger"}><span><TrendingUp size={16}/></span><div><small>Resultado</small><strong>{money(combined.result)}</strong></div></article><article><span><CircleDollarSign size={16}/></span><div><small>Renda no mês</small><strong>{money(combined.income)}</strong><em>{combined.positions} posições</em></div></article></section>
    {scope === "together" && me && <section className="partner-investment-owners"><article><span><Users size={18}/></span><div><small>Você</small><strong>{money(me.metrics.marketValueCents)}</strong><em>{me.positions.length} posições</em></div></article><article><span><Users size={18}/></span><div><small>{partnerName}</small><strong>{money(partner.metrics.marketValueCents)}</strong><em>{partner.positions.length} posições</em></div></article></section>}
    <section className="investment-section-card"><header className="investment-section-title"><span><Layers3 size={16}/></span><h2>Principais posições</h2></header><div className="partner-investment-positions">{top.slice(0, 10).map((item) => <div key={`${item.owner}:${item.id}`}><span className="investment-asset-avatar">{(item.ticker || item.name).slice(0, 2).toUpperCase()}</span><span><strong>{item.ticker || item.name}</strong><small>{item.owner} · {item.account}</small></span><b>{money(item.currentValueCents)}</b><em data-negative={item.unrealizedPnlCents < 0 || undefined}>{money(item.unrealizedPnlCents)}</em></div>)}{!top.length && <div className="investment-section-empty"><ShieldCheck size={22}/><p>Nenhuma posição compartilhada ainda.</p></div>}</div></section>
    <div className="investment-source-note"><ShieldCheck size={16}/><div><strong>Permissão respeitada</strong><p>Esta á uma visualização de leitura. Contas, ativos e operações continuam pertencendo ao workspace de origem.</p></div><Link href="/finance/investments">Minha carteira <ArrowRight size={12}/></Link></div>
  </div>;
}
