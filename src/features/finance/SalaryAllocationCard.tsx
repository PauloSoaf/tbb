"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePlanningCopy } from "./planning/copy";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Info, PieChart } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { FixedExpensesDialog, type CardOption, type FixedExpenseRow } from "./FixedExpensesDialog";
import { money } from "./money";
import { useFinancePrivacyBoundary } from "./FinancePrivacy";
import type { AllocationSlice, BillGroup, SalaryAllocation } from "./salary-allocation";
import { allocateMonth, billsOverflow, type SalaryPlanView } from "./salary-plan";

// Twelve distinct colors: the chart can show up to eight fixed expenses plus bills, variables and what is left.
const shade = (base: string) => `color-mix(in srgb, ${base} 58%, var(--foreground))`;
const PALETTE = ["var(--chart-1)", "var(--chart-5)", "var(--credit-future)", "var(--chart-3)", "var(--chart-4)", "var(--credit-open)", "var(--chart-2)",
  shade("var(--chart-1)"), shade("var(--chart-5)"), shade("var(--chart-3)"), shade("var(--chart-2)"), shade("var(--chart-4)")];
const RADIUS = 78;
/** Visual gap between slices, in hundredths of a percent of the circle. */
const GAP = 14;
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function sliceColor(slice: AllocationSlice, index: number) {
  if (slice.kind === "FREE") return "var(--credit-available)";
  if (slice.kind === "VARIABLE") return "var(--warning)";
  if (slice.key === "other") return "var(--muted-foreground)";
  return PALETTE[index % PALETTE.length];
}
const percent = (basisPoints: number) => `${(basisPoints / 100).toLocaleString("pt-BR", { minimumFractionDigits: basisPoints % 100 ? 1 : 0, maximumFractionDigits: 1 })}%`;
/** Written by hand: the server and the browser must produce exactly the same text. */
const monthTitle = (key: string) => { const name = MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key; return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${key.slice(0, 4)}`; };
const dayText = (day: string | null) => (day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : "sem data");

type Grouping = "item" | "kind";

export function AllocationMembers({ members }: { members: AllocationSlice[] }) {
  return <ul className="salary-members">{members.map((item) => <li key={item.key}>
    <span>{item.label}<small>{item.kind === "SUBSCRIPTION" ? "Assinatura" : item.kind === "RECURRING" ? "Recorrente" : item.kind === "BILL" ? "Fatura" : "Gasto fixo"}{item.cardId ? " · no cartão" : ""}</small></span>
    <b>{money(item.cents)}</b>
  </li>)}</ul>;
}

/** One donut with its legend. `onHideBill` is given only to the chart that has bills. */
function AllocationPanel({ id, title, hint, allocation, view, onHideBill, children }: {
  id: string; title: string; hint: string; allocation: SalaryAllocation; view: Grouping; onHideBill?: (cardKey: string) => void; children?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const slices = view === "item" ? allocation.slices : allocation.byKind;
  const colors = useMemo(() => new Map(slices.map((slice, index) => [slice.key, sliceColor(slice, index)])), [slices]);
  const picked = slices.some((slice) => slice.key === selected) ? selected : null;
  const active = hover ?? picked;
  const detail = slices.find((slice) => slice.key === picked) ?? null;
  const hasIncome = allocation.incomeCents > 0;
  // Each arc starts where the previous ones end; computed without mutating anything during render.
  const arcs = slices.map((slice, index) => ({
    slice,
    length: slices.length > 1 ? Math.max(1, slice.basisPoints - GAP) : slice.basisPoints,
    offset: slices.slice(0, index).reduce((sum, previous) => sum + previous.basisPoints, 0),
  }));
  const summary = `${title}. Renda prevista ${money(allocation.incomeCents)}: ${slices.map((slice) => `${slice.label} ${money(slice.cents)} (${percent(slice.basisPoints)})`).join("; ")}.${allocation.deficitCents ? ` Compromissos acima da renda em ${money(allocation.deficitCents)}.` : ""}`;

  return <section className="salary-panel" aria-labelledby={`${id}-title`}>
    <header className="salary-panel-head"><h3 id={`${id}-title`}>{title}</h3><p>{hint}</p></header>
    {!slices.length ? <div className="finance-dashboard-empty"><PieChart size={23}/><span>Cadastre a renda prevista e os gastos fixos para ver como o salário se divide.</span></div> : <div className="salary-body">
      <figure className="salary-donut" aria-label={summary}>
        <svg viewBox="0 0 200 200" role="img" aria-label={summary}>
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="26"/>
          {arcs.map(({ slice, length, offset: start }) => <circle key={slice.key} cx="100" cy="100" r={RADIUS} fill="none" stroke={colors.get(slice.key)} strokeWidth={active === slice.key ? 30 : 26} pathLength={10_000}
            strokeDasharray={`${length} ${10_000 - length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" opacity={active && active !== slice.key ? 0.3 : 1} className="salary-arc"/>)}
        </svg>
        <figcaption className="salary-center">
          {hasIncome ? <><small>Renda prevista</small><strong>{money(allocation.incomeCents)}</strong><span data-danger={allocation.deficitCents > 0 || undefined}>{allocation.usageBasisPoints !== null ? `${percent(allocation.usageBasisPoints)} comprometida` : ""}</span></>
            : <><small>Compromissos</small><strong>{money(allocation.commitmentsCents)}</strong><span>renda não definida</span></>}
        </figcaption>
      </figure>

      <div className="salary-side">
        <ul className="salary-legend">
          {slices.map((slice) => <li key={slice.key}>
            <button type="button" aria-pressed={picked === slice.key} data-active={active === slice.key || undefined}
              onClick={() => setSelected(picked === slice.key ? null : slice.key)} onMouseEnter={() => setHover(slice.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(slice.key)} onBlur={() => setHover(null)}>
              <i style={{ background: colors.get(slice.key) }} aria-hidden="true"/>
              <span className="salary-legend-name">{slice.label}{slice.members?.length ? <small>Ver gastos <ChevronDown size={11}/></small> : slice.kind === "SUBSCRIPTION" ? " · assinatura" : slice.kind === "RECURRING" ? " · recorrente" : slice.cardId && onHideBill ? " · no cartão" : ""}</span>
              <b>{money(slice.cents)}</b><em>{percent(slice.basisPoints)}</em>
            </button>
          </li>)}
        </ul>
        {detail && <div className="salary-detail" role="status">
          <strong>{detail.label}</strong>
          {detail.members && <AllocationMembers members={detail.members}/>}
          {detail.kind === "FIXED" && detail.plannedCents !== undefined && detail.postedCents !== undefined ? <p>Previsto {money(detail.plannedCents)} · já lançado este mês {money(detail.postedCents)}{detail.postedCents < detail.plannedCents ? ` · falta ${money(detail.plannedCents - detail.postedCents)}` : ""}.</p> : null}
          {detail.kind === "FIXED" && !detail.merged && <p className="muted">Edite em “Registrar gastos fixos”.</p>}
          {detail.cardId && onHideBill && <p>Previsto no cartão. Somente compras vinculadas à fatura comprovam que este gasto já está incluído nela.{detail.includedInBillsCents ? ` ${money(detail.includedInBillsCents)} já estão na fatura; esta fatia mostra o restante.` : " Ainda não há cobertura comprovada para este valor."}</p>}
          {detail.kind === "SUBSCRIPTION" && <p><Link href="/finance/subscriptions">Ver assinaturas</Link></p>}
          {detail.kind === "RECURRING" && <p><Link href={`/finance/transactions?q=${encodeURIComponent(detail.label)}`}>Ver lançamentos</Link></p>}
          {detail.kind === "VARIABLE" && <p>Despesas do mês que não são fixas e ainda não estão numa fatura. <Link href="/finance/transactions">Ver lançamentos</Link></p>}
          {detail.kind === "FREE" && <p>Previsão: renda prevista menos os compromissos. Não é o saldo do banco.</p>}
          {detail.kind === "BILL" && detail.bill && <>
            <p>Fatura de {money(detail.bill.grossCents)}: {detail.bill.toPayCents > 0 ? `a pagar ${money(detail.bill.toPayCents)}` : "nada a pagar"}{detail.bill.paidCents > 0 ? ` · já pago no mês ${money(detail.bill.paidCents)}` : ""}.</p>
            {detail.bill.linkedCents > 0 && <p>Inclui {money(detail.bill.linkedCents)} de gastos fixos comprovados por lançamentos. A fatura mantém seu valor integral; estes fixos saem apenas da fatia separada de gastos fixos.</p>}
            <ul className="salary-detail-list">{detail.bill.statements.map((line) => <li key={line.id}>{line.dueDate ? `Vence ${dayText(line.dueDate)}` : "Sem vencimento"}: {money(line.toPayCents + line.paidCents)}</li>)}</ul>
            {onHideBill && <button type="button" className="button-secondary" onClick={() => { onHideBill(detail.bill!.key); setSelected(null); }}>Tirar esta fatura do gráfico</button>}
            <p><Link href="/finance/statements">Ver faturas</Link></p>
          </>}
        </div>}
      </div>
    </div>}
    {children}
    {!!slices.length && <p className="salary-note">Percentuais das fatias sobre {allocation.deficitCents ? `os ${money(allocation.baseCents)} de compromissos` : "a renda prevista"}. O indicador central compara os compromissos com a renda.</p>}
  </section>;
}

/** Where the income is planned to go, month by month, in two charts that always agree with each other:
 * one with everything (fixed expenses, card bills and variable spending) and one with only the fixed expenses.
 * A shortfall is an alert, never a slice. What is left is a plan figure, not the bank balance. */
export function SalaryAllocationCard({ plan, expenses, cards, paymentAccounts = [], currentMonth }: { plan: SalaryPlanView; expenses: FixedExpenseRow[]; cards: CardOption[]; paymentAccounts?: CardOption[]; currentMonth: string }) {
  const privacyBoundary = useFinancePrivacyBoundary();
  const params = useSearchParams(), planning = usePlanningCopy();
  const [monthIndex, setMonthIndex] = useState(() => Math.max(0, plan.months.findIndex(month => month.month === params.get("month"))));
  const [view, setView] = useState<Grouping>("item");
  // Bills taken out of a chart are remembered per month, as "2032-11:card".
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const month = plan.months[Math.min(monthIndex, plan.months.length - 1)];
  const hiddenHere = useMemo(() => new Set([...hidden].filter((key) => key.startsWith(`${month.month}:`)).map((key) => key.slice(month.month.length + 1))), [hidden, month.month]);
  const { complete, fixedOnly, hiddenBills } = useMemo(() => allocateMonth(month, { hiddenBills: hiddenHere }), [month, hiddenHere]);
  const hide = (cardKey: string) => setHidden((current) => new Set(current).add(`${month.month}:${cardKey}`));
  const show = (cardKey: string) => setHidden((current) => { const next = new Set(current); next.delete(`${month.month}:${cardKey}`); return next; });
  const overflow = billsOverflow(complete);
  const coveredItems = month.items.filter(item => (item.includedInBillsCents ?? 0) > 0 && complete.bills.some(bill => bill.key === item.cardId));

  return <article {...privacyBoundary} className="finance-overview-card salary-card">
    <header className="finance-card-heading">
      <div><span className="finance-card-icon tone-purple"><PieChart size={17}/></span><div>
        <h2>Para onde vai o salário <AppTooltip content="Divide a renda prevista do mês. As faturas mantêm seus valores integrais: a pagar por vencimento e pagamentos feitos no mês. Um fixo só sai da sua fatia quando um lançamento vinculado comprova que ele está na fatura. O segundo gráfico mostra todos os fixos. Sobra prevista não é saldo bancário." side="bottom"><button type="button" className="icon-button" aria-label="O que entra nestes gráficos"><Info size={14}/></button></AppTooltip></h2>
        <p>Cada compromisso do mês como uma fatia da renda prevista.</p>
      </div></div>
      <div className="salary-actions">
        <div className="salary-months" role="group" aria-label="Mês do gráfico">
          <button type="button" className="icon-button" aria-label="Mês anterior" disabled={monthIndex === 0} onClick={() => setMonthIndex((current) => Math.max(0, current - 1))}><ChevronLeft size={16}/></button>
          <strong aria-live="polite">{monthTitle(month.month)}</strong>
          <button type="button" className="icon-button" aria-label="Próximo mês" disabled={monthIndex >= plan.months.length - 1} onClick={() => setMonthIndex((current) => Math.min(plan.months.length - 1, current + 1))}><ChevronRight size={16}/></button>
        </div>
        <div className="salary-toggle" role="group" aria-label="Agrupamento">
          <button type="button" aria-pressed={view === "item"} onClick={() => setView("item")}>Por item</button>
          <button type="button" aria-pressed={view === "kind"} onClick={() => setView("kind")}>Por tipo</button>
        </div>
        <FixedExpensesDialog expenses={expenses} cards={cards} paymentAccounts={paymentAccounts} currentMonth={currentMonth}/>
      </div>
    </header>

    {plan.canSeeBills && <div className="salary-bill-summary">
      <div><span>Faturas abertas · todos os vencimentos</span><strong>{money(plan.openBillsCents ?? 0)}</strong><small>Saldo ainda a pagar. <Link href="/finance/statements">Conferir faturas</Link></small></div>
      <div><span>Faturas no gráfico · {monthTitle(month.month)}</span><strong>{money(complete.billsGrossCents)}</strong><small>A pagar {money(complete.bills.reduce((sum,bill)=>sum+bill.toPayCents,0))} · já pago no mês {money(complete.bills.reduce((sum,bill)=>sum+bill.paidCents,0))}</small></div>
    </div>}
    {month.incomeKnown === false && <p className="salary-note">{planning("INCOME_UNKNOWN")}</p>}
    <div className="salary-pair">
      <AllocationPanel id="salary-complete" title="Fixos, faturas e variáveis" hint="Faturas integrais do mês, mais os fixos que ainda não estão nelas e as variáveis." allocation={complete} view={view} onHideBill={hide}>
        {coveredItems.length > 0 && complete.fixedIncludedInBillsCents > 0 && <details className="salary-covered"><summary>{money(complete.fixedIncludedInBillsCents)} de fixos já dentro das faturas · ver gastos</summary><ul className="salary-members">{coveredItems.map((item,index)=><li key={`${item.kind}:${item.id ?? index}`}><span>{item.name}</span><b>{money(item.includedInBillsCents ?? 0)}</b></li>)}</ul></details>}
        {overflow && <div className="salary-alert" role="alert"><AlertTriangle size={16} aria-hidden="true"/><span><strong>Os compromissos passam do que a renda comporta.</strong> Fixos fora das faturas de {money(complete.fixedOutsideBillsCents)} mais faturas integrais de {money(complete.billsCents)} somam {money(complete.fixedOutsideBillsCents + complete.billsCents)}, {money(complete.fixedOutsideBillsCents + complete.billsCents - complete.incomeCents)} acima da renda prevista de {money(complete.incomeCents)}.{complete.variableCents > 0 ? ` Ainda há ${money(complete.variableCents)} de variáveis.` : ""} Escolha uma fatura para conferir os valores e, se quiser simular sua exclusão, tirá-la só deste gráfico.</span></div>}
        {!overflow && complete.deficitCents > 0 && <div className="salary-alert" role="alert"><AlertTriangle size={16} aria-hidden="true"/><span><strong>Compromissos acima da renda prevista em {money(complete.deficitCents)}.</strong> O gráfico mostra a divisão dos {money(complete.commitmentsCents)} comprometidos; não há sobra prevista.</span></div>}
        {hiddenBills.length > 0 && <p className="salary-hidden">Fora do gráfico: {hiddenBills.map((bill: BillGroup) => <button key={bill.key} type="button" onClick={() => show(bill.key)}>{bill.label} · mostrar de novo</button>)}</p>}
        {!plan.canSeeBills && <p className="salary-note">As faturas de cartão são dados pessoais do titular e não aparecem para outros membros.</p>}
      </AllocationPanel>
      <AllocationPanel id="salary-fixed" title="Só gastos fixos" hint="Gastos fixos, assinaturas e recorrentes, sem faturas nem variáveis." allocation={fixedOnly} view={view}>
        {fixedOnly.deficitCents > 0 && <div className="salary-alert" role="alert"><AlertTriangle size={16} aria-hidden="true"/><span><strong>Gastos fixos acima da renda prevista em {money(fixedOnly.deficitCents)}.</strong></span></div>}
      </AllocationPanel>
    </div>
    <p className="salary-note">O total aberto considera todos os vencimentos; o gráfico considera o mês selecionado. Pagamentos já feitos no mês continuam como saída da renda. O saldo transportado entra somente na fatura que o carrega. Fixos apenas planejados no cartão não reduzem o valor da fatura. {month.variablesKnown ? "" : "Variáveis futuras ainda não foram lançadas. "}{plan.undatedBillsCount ? `${plan.undatedBillsCount} fatura(s) futura(s) sem vencimento confirmado ficam fora da divisão por mês. ` : ""}Sobra prevista não é saldo bancário.{plan.excludedDebtMinimumsCents > 0 ? ` Pagamentos mínimos de dívidas (${money(plan.excludedDebtMinimumsCents)}) ficam de fora; cadastre-os como gasto fixo se quiser incluí-los.` : ""}</p>
  </article>;
}
