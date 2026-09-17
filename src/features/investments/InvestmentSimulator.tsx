"use client";

import { useMemo, useState } from "react";
import { Building2, Calculator, Landmark, PiggyBank, Scale, TrendingUp } from "lucide-react";
import { InvestmentPortfolioHistoryChart } from "@/components/TbbCharts";
import { compoundInterest, fixedIncomeProjection, realEstateMetrics, savingsProjection } from "./calculations";

type SimulatorKind = "compound" | "fixed" | "savings" | "property" | "rebalance";
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value / 100);
const cents = (value: string) => Math.max(0, Math.round((Number(value.replace(",", ".")) || 0) * 100));
const bp = (value: string) => Math.round((Number(value.replace(",", ".")) || 0) * 100);

export function InvestmentSimulator({ selicBasisPoints = 0 }: { selicBasisPoints?: number }) {
  const [kind, setKind] = useState<SimulatorKind>("compound");
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("1000");
  const [rate, setRate] = useState("12");
  const [months, setMonths] = useState("60");
  const [percentage, setPercentage] = useState("100");
  const [estimated, setEstimated] = useState("500000");
  const [financing, setFinancing] = useState("200000");
  const [rent, setRent] = useState("2500");
  const [costs, setCosts] = useState("550");
  const [currentAllocation, setCurrentAllocation] = useState("65");
  const [targetAllocation, setTargetAllocation] = useState("55");

  const result = useMemo(() => {
    if (kind === "compound") return { kind, value: compoundInterest({ initialCents: cents(initial), monthlyContributionCents: cents(monthly), annualRateBasisPoints: bp(rate), months: Math.max(1, Number(months) || 1) }) } as const;
    if (kind === "fixed") return { kind, value: fixedIncomeProjection({ principalCents: cents(initial), months: Math.max(1, Number(months) || 1), indexAnnualBasisPoints: selicBasisPoints || bp(rate), indexerPercentageBasisPoints: bp(percentage) }) } as const;
    if (kind === "savings") return { kind, value: savingsProjection({ principalCents: cents(initial), months: Math.max(1, Number(months) || 1), selicAnnualBasisPoints: selicBasisPoints || bp(rate) }) } as const;
    if (kind === "property") return { kind, value: realEstateMetrics({ purchasePriceCents: cents(initial), estimatedValueCents: cents(estimated), financingBalanceCents: cents(financing), monthlyRentCents: cents(rent), monthlyCostsCents: cents(costs) }) } as const;
    const total = cents(initial);
    const current = bp(currentAllocation);
    const target = bp(targetAllocation);
    const adjustment = Math.round(total * (target - current) / 10_000);
    return { kind, value: { total, current, target, adjustment } } as const;
  }, [kind, initial, monthly, rate, months, percentage, estimated, financing, rent, costs, currentAllocation, targetAllocation, selicBasisPoints]);

  const history = result.kind === "compound" ? result.value.history.map((item) => { const date = new Date(); date.setUTCMonth(date.getUTCMonth() + item.month); return { date: date.toISOString().slice(0, 10), marketValue: item.balanceCents / 100, invested: item.contributionsCents / 100 }; }) : [];
  const tabs: { id: SimulatorKind; label: string; icon: typeof Calculator }[] = [
    { id: "compound", label: "Juros compostos", icon: TrendingUp }, { id: "fixed", label: "Renda fixa", icon: Landmark }, { id: "savings", label: "Poupança", icon: PiggyBank }, { id: "property", label: "Imóvel", icon: Building2 }, { id: "rebalance", label: "Rebalanceamento", icon: Scale },
  ];

  return <div className="investment-simulator">
    <nav>{tabs.map((tab) => <button type="button" key={tab.id} aria-pressed={kind === tab.id} onClick={() => setKind(tab.id)}><tab.icon size={15}/>{tab.label}</button>)}</nav>
    <div className="investment-simulator-workspace">
      <section className="investment-simulator-inputs">
        <header><span><Calculator size={17}/></span><div><h2>Premissas</h2><p>Altere os valores e compare o resultado instantaneamente.</p></div></header>
        <label><span>{kind === "rebalance" ? "Patrimônio da carteira" : kind === "property" ? "Preço de compra" : "Valor inicial"}</span><div><i>R$</i><input value={initial} inputMode="decimal" onChange={(event) => setInitial(event.target.value)}/></div></label>
        {kind === "compound" && <label><span>Aporte mensal</span><div><i>R$</i><input value={monthly} inputMode="decimal" onChange={(event) => setMonthly(event.target.value)}/></div></label>}
        {(kind === "compound" || kind === "fixed" || kind === "savings") && <label><span>{selicBasisPoints && kind !== "compound" ? "Selic atual (provider)" : "Taxa anual"}</span><div><input value={selicBasisPoints && kind !== "compound" ? String(selicBasisPoints / 100) : rate} inputMode="decimal" onChange={(event) => setRate(event.target.value)} disabled={Boolean(selicBasisPoints && kind !== "compound")}/><i>% a.a.</i></div></label>}
        {kind === "fixed" && <label><span>Percentual do indexador</span><div><input value={percentage} inputMode="decimal" onChange={(event) => setPercentage(event.target.value)}/><i>%</i></div></label>}
        {(kind === "compound" || kind === "fixed" || kind === "savings") && <label><span>Prazo</span><div><input value={months} type="number" min="1" max="600" onChange={(event) => setMonths(event.target.value)}/><i>meses</i></div></label>}
        {kind === "property" && <><label><span>Valor estimado</span><div><i>R$</i><input value={estimated} inputMode="decimal" onChange={(event) => setEstimated(event.target.value)}/></div></label><label><span>Saldo financiado</span><div><i>R$</i><input value={financing} inputMode="decimal" onChange={(event) => setFinancing(event.target.value)}/></div></label><label><span>Aluguel mensal</span><div><i>R$</i><input value={rent} inputMode="decimal" onChange={(event) => setRent(event.target.value)}/></div></label><label><span>Custos mensais</span><div><i>R$</i><input value={costs} inputMode="decimal" onChange={(event) => setCosts(event.target.value)}/></div></label></>}
        {kind === "rebalance" && <><label><span>Alocação atual da classe</span><div><input value={currentAllocation} inputMode="decimal" onChange={(event) => setCurrentAllocation(event.target.value)}/><i>%</i></div></label><label><span>Alocação alvo</span><div><input value={targetAllocation} inputMode="decimal" onChange={(event) => setTargetAllocation(event.target.value)}/><i>%</i></div></label></>}
      </section>
      <section className="investment-simulator-result">
        <header><span>SIMULAÇÃO</span><small>Os cálculos usam as premissas informadas e não são recomendação.</small></header>
        {result.kind === "compound" && <><div className="investment-simulator-kpis"><div><small>Saldo projetado</small><strong>{money(result.value.finalCents)}</strong></div><div><small>Total aplicado</small><strong>{money(result.value.contributionsCents)}</strong></div><div><small>Rendimentos</small><strong>{money(result.value.returnsCents)}</strong></div></div><InvestmentPortfolioHistoryChart data={history}/></>}
        {result.kind === "fixed" && <div className="investment-simulator-kpis"><div><small>Valor líquido</small><strong>{money(result.value.netCents)}</strong></div><div><small>Valor bruto</small><strong>{money(result.value.grossCents)}</strong></div><div><small>IR estimado</small><strong>{money(result.value.taxCents)}</strong></div><div><small>Retorno líquido</small><strong>{(result.value.netReturnBasisPoints / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</strong></div></div>}
        {result.kind === "savings" && <><div className="investment-simulator-kpis"><div><small>Valor projetado</small><strong>{money(result.value.netCents)}</strong></div><div><small>Rendimentos</small><strong>{money(result.value.netCents - cents(initial))}</strong></div><div><small>Imposto</small><strong>{money(result.value.taxCents)}</strong></div></div><p className="investment-simulator-rule">Regra usada: {result.value.rule}</p></>}
        {result.kind === "property" && <div className="investment-simulator-kpis"><div><small>Equity</small><strong>{money(result.value.equityCents)}</strong></div><div><small>Fluxo mensal</small><strong>{money(result.value.monthlyCashFlowCents)}</strong></div><div><small>Yield bruto</small><strong>{(result.value.grossYieldBasisPoints / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.a.</strong></div><div><small>Yield líquido</small><strong>{(result.value.netYieldBasisPoints / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.a.</strong></div></div>}
        {result.kind === "rebalance" && <div className="investment-rebalance-result" data-positive={result.value.adjustment >= 0 || undefined}><Scale size={27}/><small>{result.value.adjustment >= 0 ? "Aporte necessário nesta classe" : "Excesso atual nesta classe"}</small><strong>{money(Math.abs(result.value.adjustment))}</strong><p>Atual: {(result.value.current / 100).toLocaleString("pt-BR")}% · Alvo: {(result.value.target / 100).toLocaleString("pt-BR")}%</p></div>}
      </section>
    </div>
  </div>;
}
