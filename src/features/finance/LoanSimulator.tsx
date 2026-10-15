"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoanCostChart } from "@/components/TbbCharts";
import { formatDay } from "@/lib/dates";
import { deleteLoanComparison, saveLoanComparison } from "./loan-actions";
import { budgetFromPayload, centsText, defaultForms, emptyBudget, emptyForm, formFromScenario, payloadOf, simulate, type BudgetForm, type ComparisonPayload, type ScenarioForm } from "./loan-comparison";
import { MAX_SCENARIOS, type FlowSummary, type RepaymentSystem } from "./loan-simulator";
import { money, moneyInput } from "./money";

export type StatementOption = { id: string; label: string; outstandingCents: number };
/** `updatedOn` is a date key already resolved in the workspace time zone by the page. */
export type SavedComparison = { id: string; name: string; updatedOn: string; payload: ComparisonPayload };

const SYSTEMS: { value: RepaymentSystem; label: string }[] = [
  { value: "CASH", label: "Quitar à vista" },
  { value: "PRICE", label: "Parcelado · parcelas fixas (Price)" },
  { value: "SAC", label: "Parcelado · amortização constante (SAC)" },
  { value: "REVOLVING", label: "Rotativo do cartão (só para comparar)" },
];
const newId = () => `s${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 8)}`;

/** Compare ways to pay a bill or borrow. Everything here is a study: nothing is contracted, no debt or
 * installment is created, and no bank is contacted. Rates and CET typed in stay "informados por você". */
export function LoanSimulator({ today, locale, statements, suggestedIncomeCents, suggestedCommitmentsCents, saved, initial }: {
  today: string; locale: string; statements: StatementOption[]; suggestedIncomeCents: number; suggestedCommitmentsCents: number; saved: SavedComparison[];
  /** Starts from a saved comparison instead of the blank editor. */
  initial?: SavedComparison;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [forms, setForms] = useState<ScenarioForm[]>(() => (initial ? initial.payload.scenarios.map(formFromScenario) : defaultForms(today)));
  const [budget, setBudget] = useState<BudgetForm>(() => (initial ? budgetFromPayload(initial.payload) : emptyBudget({ income: centsText(suggestedIncomeCents), commitments: centsText(suggestedCommitmentsCents) })));
  const [statementId, setStatementId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [loadedId, setLoadedId] = useState<string | null>(initial?.id ?? null);

  const sim = useMemo(() => simulate(forms, budget), [forms, budget]);
  const { results, flows, comparison, parsed } = sim;
  const hasIncome = sim.flowParams.incomeCents > 0;
  const selected = results.find((result) => result.id === selectedId && result.schedule.length) ?? results.find((result) => result.schedule.length) ?? null;
  const chartData = results.filter((result) => result.ok && !result.incomplete).map((result) => ({ name: result.name, principal: sim.neededCents / 100, interest: result.interestCents / 100, charges: Math.max(0, result.costCents - result.interestCents) / 100 }));

  const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
  const day = (value: string) => formatDay(value, locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const monthName = (key: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00.000Z`));

  const patch = (change: Partial<BudgetForm>) => setBudget((current) => ({ ...current, ...change }));
  const update = (id: string, change: Partial<ScenarioForm>) => setForms((current) => current.map((form) => (form.id === id ? { ...form, ...change } : form)));
  const add = () => setForms((current) => (current.length >= MAX_SCENARIOS ? current : [...current, emptyForm(newId(), today, { name: `Cenário ${current.length + 1}` })]));
  const remove = (id: string) => setForms((current) => (current.length <= 2 ? current : current.filter((form) => form.id !== id)));

  function save(asNew: boolean) {
    const fd = new FormData();
    fd.set("name", name); fd.set("payload", JSON.stringify(payloadOf(sim)));
    if (loadedId && !asNew) fd.set("id", loadedId);
    startTransition(async () => {
      const result = await saveLoanComparison(fd);
      if ("error" in result && result.error) { toast.error(result.error); return; }
      toast.success("success" in result ? result.success : "Salvo.");
      router.refresh();
    });
  }
  function open(item: SavedComparison) {
    setForms(item.payload.scenarios.map(formFromScenario)); setBudget(budgetFromPayload(item.payload));
    setName(item.name); setLoadedId(item.id); setStatementId(""); setSelectedId(null);
  }
  function destroy(item: SavedComparison) {
    if (!window.confirm(`Excluir a comparação "${item.name}"? Isso não afeta dívidas nem faturas.`)) return;
    const fd = new FormData(); fd.set("id", item.id);
    startTransition(async () => {
      const result = await deleteLoanComparison(fd);
      if ("error" in result && result.error) { toast.error(result.error); return; }
      toast.success("success" in result ? result.success : "Excluída.");
      if (loadedId === item.id) setLoadedId(null);
      router.refresh();
    });
  }

  const blocked = pending || !name.trim() || sim.scenarioErrors.length > 0 || sim.fieldErrors.length > 0;

  return <div className="stack loan-simulator" aria-busy={pending}>
    <p className="loan-disclaimer" role="note"><AlertTriangle size={15} aria-hidden="true"/><span>É uma simulação para comparar caminhos: não contrata nada, não é oferta e não acessa seu banco nem pede senha. Taxas e CET que você digita ficam como <strong>informados por você</strong>; o CET calculado aqui é uma <strong>estimativa</strong>, e vale o do contrato.</span></p>

    <section className="panel stack" aria-labelledby="loan-need">
      <div><h2 id="loan-need">O que você precisa resolver</h2><p className="muted">O mesmo valor é usado em todos os cenários, para a comparação ser justa.</p></div>
      <div className="form-grid">
        <label>Valor a resolver (R$)<input inputMode="decimal" value={budget.needed} onChange={(event) => { patch({ needed: event.target.value }); setStatementId(""); }} placeholder="Ex.: 4.200,00"/></label>
        <label>Ou usar uma fatura<select value={statementId} onChange={(event) => { setStatementId(event.target.value); const found = statements.find((item) => item.id === event.target.value); if (found) patch({ needed: moneyInput(found.outstandingCents) }); }}>
          <option value="">Digitar o valor</option>{statements.map((item) => <option key={item.id} value={item.id}>{item.label} · {money(item.outstandingCents)}</option>)}
        </select></label>
      </div>
      <details className="loan-budget">
        <summary>Orçamento mensal · {hasIncome ? `renda ${money(sim.flowParams.incomeCents)} · gastos ${money(sim.flowParams.commitmentsCents)}` : "informe a renda para ver se cabe"}</summary>
        <div className="form-grid">
          <label>Renda mensal prevista (R$)<input inputMode="decimal" value={budget.income} onChange={(event) => patch({ income: event.target.value })}/></label>
          <label>Gastos do mês (R$)<input inputMode="decimal" value={budget.commitments} onChange={(event) => patch({ commitments: event.target.value })} aria-describedby="loan-commitments-hint"/><small id="loan-commitments-hint" className="muted">Começa só com seus gastos fixos. Some o que costuma gastar no variável para a sobra ficar realista.</small></label>
          <label>Dinheiro guardado que você usaria agora (R$)<input inputMode="decimal" value={budget.savings} onChange={(event) => patch({ savings: event.target.value })} placeholder="0,00" aria-describedby="loan-savings-hint"/><small id="loan-savings-hint" className="muted">Cobre o que é pago na hora (à vista ou entrada) antes de tirar da renda do mês.</small></label>
          <label>E se a renda mudar? (%)<input inputMode="decimal" value={budget.change} onChange={(event) => patch({ change: event.target.value })} aria-describedby="loan-change-hint"/><small id="loan-change-hint" className="muted">Ex.: -20 simula uma queda de 20%.</small></label>
          <label>Gasto extra por mês (R$)<input inputMode="decimal" value={budget.extra} onChange={(event) => patch({ extra: event.target.value })} placeholder="0,00"/></label>
        </div>
      </details>
      {sim.fieldErrors.length > 0 && <ul className="loan-problems" role="alert">{sim.fieldErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
    </section>

    <section className="stack" aria-label="Cenários">
      <div className="row justify-between"><h2>Cenários ({forms.length}/{MAX_SCENARIOS})</h2><button type="button" className="button-secondary" onClick={add} disabled={forms.length >= MAX_SCENARIOS}><Plus size={15}/>Adicionar cenário</button></div>
      <div className="loan-scenarios">{forms.map((form, index) => {
        const credit = form.system !== "CASH";
        const installmentBased = credit && form.system !== "REVOLVING";
        const result = results[index];
        // Until a value to resolve is typed, the only complaint would be that one, and it is said once, below.
        const problems = [...parsed[index].errors, ...(result.incomplete || sim.neededCents <= 0 ? [] : result.issues)];
        return <details className="panel loan-scenario" key={form.id} open>
          <summary><strong>{form.name.trim() || `Cenário ${index + 1}`}</strong><span className="muted">{SYSTEMS.find((item) => item.value === form.system)?.label}</span>{result.incomplete && <span className="badge" data-unsaved>Incompleto</span>}</summary>
          <div className="form-grid">
            <label>Nome<input value={form.name} maxLength={80} onChange={(event) => update(form.id, { name: event.target.value })} placeholder="Ex.: Empréstimo do banco X"/></label>
            <label>Como seria pago<select value={form.system} onChange={(event) => update(form.id, { system: event.target.value as RepaymentSystem })}>{SYSTEMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Tipo de crédito<select value={form.product} onChange={(event) => update(form.id, { product: event.target.value as ScenarioForm["product"] })}><option value="CARD_STATEMENT">Fatura de cartão</option><option value="LOAN">Empréstimo ou financiamento</option><option value="OTHER">Outro</option></select></label>
            {!credit && <label>Data do pagamento<input type="date" value={form.startOn} onChange={(event) => update(form.id, { startOn: event.target.value })}/></label>}
            {installmentBased && <label>Entrada (R$)<input inputMode="decimal" value={form.down} onChange={(event) => update(form.id, { down: event.target.value })} placeholder="0,00"/></label>}
            {installmentBased && <label>Parcelas<input inputMode="numeric" value={form.installments} onChange={(event) => update(form.id, { installments: event.target.value })}/></label>}
            {credit && <label>Juros ao mês (%)<input inputMode="decimal" value={form.rate} onChange={(event) => update(form.id, { rate: event.target.value })} placeholder="Ex.: 3,99"/><small className="muted">Informado por você. Sem a taxa, o cenário fica incompleto.</small></label>}
            {form.system === "REVOLVING" && <label>Pagamento por mês (R$)<input inputMode="decimal" value={form.payment} onChange={(event) => update(form.id, { payment: event.target.value })}/></label>}
            {installmentBased && <>
              <label>IOF (R$)<input inputMode="decimal" value={form.iof} onChange={(event) => update(form.id, { iof: event.target.value })} placeholder="0,00"/></label>
              <label>Tarifas (R$)<input inputMode="decimal" value={form.fees} onChange={(event) => update(form.id, { fees: event.target.value })} placeholder="0,00"/></label>
              <label className="row loan-check"><input type="checkbox" checked={form.financeCharges} onChange={(event) => update(form.id, { financeCharges: event.target.checked })}/>IOF e tarifas entram no valor financiado</label>
            </>}
            {credit && <label>Seguro por mês (R$)<input inputMode="decimal" value={form.insurance} onChange={(event) => update(form.id, { insurance: event.target.value })} placeholder="0,00"/></label>}
            {credit && <label>Início do contrato<input type="date" value={form.startOn} onChange={(event) => update(form.id, { startOn: event.target.value })}/></label>}
            {credit && <label>1º vencimento<input type="date" value={form.firstPaymentOn} onChange={(event) => update(form.id, { firstPaymentOn: event.target.value })}/></label>}
            {installmentBased && <label>CET informado pelo banco (% ao ano)<input inputMode="decimal" value={form.informedCet} onChange={(event) => update(form.id, { informedCet: event.target.value })} placeholder="Opcional"/></label>}
            {installmentBased && <fieldset className="loan-extra"><legend>Antecipar uma parte (opcional)</legend>
              <label>Valor (R$)<input inputMode="decimal" value={form.extraAmount} onChange={(event) => update(form.id, { extraAmount: event.target.value })}/></label>
              <label>Na parcela nº<input inputMode="numeric" value={form.extraMonth} onChange={(event) => update(form.id, { extraMonth: event.target.value })}/></label>
              <label>Efeito<select value={form.extraEffect} onChange={(event) => update(form.id, { extraEffect: event.target.value as ScenarioForm["extraEffect"] })}><option value="REDUCE_TERM">Encurtar o prazo</option><option value="REDUCE_INSTALLMENT">Reduzir a parcela</option></select></label>
            </fieldset>}
          </div>
          {problems.length > 0 && <ul className="loan-problems" role="alert">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
          {result.incomplete && <p className="payment-hint">{result.issues[0]}</p>}
          <div className="row justify-between"><span className="muted text-xs">Estes valores são seus; nada é buscado no banco.</span><button type="button" className="button-secondary" onClick={() => remove(form.id)} disabled={forms.length <= 2}><Trash2 size={14}/>Remover</button></div>
        </details>;
      })}</div>
    </section>

    <section className="panel stack" id="resultado" aria-labelledby="loan-result">
      <div><h2 id="loan-result">Comparação</h2><p className="muted">Custo do crédito = total pago − valor resolvido. Menor parcela não significa menor custo.</p></div>
      {sim.neededCents <= 0 ? <p className="muted">Informe o valor a resolver para ver os números.</p> : <>
        <div className="table-wrap"><table className="loan-table">
          <caption className="sr-only">Comparação dos cenários</caption>
          <thead><tr><th scope="col">Cenário</th><th scope="col">Pago na hora</th><th scope="col">Maior parcela</th><th scope="col">Prazo</th><th scope="col">Total pago</th><th scope="col">Custo do crédito</th><th scope="col" title="Calculado aqui a partir do fluxo de pagamentos">CET estimado</th><th scope="col" title="O que o banco informou, se você digitou">CET informado</th><th scope="col" title="Menor sobra entre os meses, depois dos gastos">Pior mês</th><th scope="col">Meses no vermelho</th></tr></thead>
          <tbody>{results.map((result) => {
            const flow = flows[result.id];
            const ready = result.ok && !result.incomplete;
            return <tr key={result.id} data-best={result.id === comparison.cheapestId || result.id === comparison.mostViableId || undefined}>
              <th scope="row"><strong>{result.name}</strong>
                {result.id === comparison.cheapestId && <span className="statement-chip" data-tone="success"><BadgeCheck size={12} aria-hidden="true"/>Mais barato</span>}
                {result.id === comparison.mostViableId && <span className="statement-chip" data-tone="future">Mais folga no orçamento</span>}</th>
              {ready ? <>
                <td className="statement-amount">{result.upfrontCents ? money(result.upfrontCents) : "—"}</td>
                <td className="statement-amount">{result.system === "CASH" ? "—" : money(result.peakPaymentCents)}{result.system !== "CASH" && hasIncome && <small>{percent(flow?.peakShareOfIncome ?? null)} da renda</small>}</td>
                <td className="loan-term">{result.system === "CASH" ? "à vista" : `${result.months} ${result.months === 1 ? "mês" : "meses"}`}</td>
                <td className="statement-amount">{money(result.totalPaidCents)}</td>
                <td className="statement-amount">{money(result.costCents)}</td>
                <td>{result.system === "CASH" ? "—" : <>{percent(result.effectiveAnnual)} a.a.<small className="muted block">estimado</small></>}</td>
                <td>{result.informedCetAnnual === null ? "—" : <>{percent(result.informedCetAnnual)} a.a.<small className="muted block">informado por você</small></>}</td>
                <td className="statement-amount" data-negative={(hasIncome && (flow?.lowestSurplusCents ?? 0) < 0) || undefined}>{hasIncome && flow?.lowestSurplusCents != null ? money(flow.lowestSurplusCents) : "—"}</td>
                <td data-negative={(hasIncome && (flow?.negativeMonths ?? 0) > 0) || undefined}>{hasIncome ? flow?.negativeMonths ?? 0 : "—"}</td>
              </> : <td colSpan={9} className="muted">{result.issues[0] ?? "Dados insuficientes para calcular."}</td>}
            </tr>;
          })}</tbody>
        </table></div>
        {comparison.notes.length > 0 && <ul className="loan-notes" role="status">{comparison.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
        {chartData.length > 1 && <div className="stack"><h3>Quanto cada opção custa</h3><LoanCostChart data={chartData}/><div className="finance-chart-legend"><span><i style={{ background: "var(--chart-5)" }}/>Valor resolvido</span><span><i style={{ background: "var(--credit-future)" }}/>Juros</span><span><i style={{ background: "var(--credit-open)" }}/>IOF, tarifas e seguro</span></div></div>}
        {results.filter((result) => result.flags.length).map((result) => <div key={result.id} className="loan-flag" role="note"><AlertTriangle size={15} aria-hidden="true"/><span><strong>{result.name}:</strong> {result.flags.join(" ")}</span></div>)}
      </>}
    </section>

    {selected && <section className="panel stack" id="cronograma" aria-labelledby="loan-schedule">
      <div className="row justify-between"><div><h2 id="loan-schedule">Cronograma e fluxo de caixa</h2><p className="muted">Mês a mês: o que se paga e o que sobra da renda depois dos gastos{hasIncome ? "" : " (informe a renda para ver a sobra)"}.</p></div>
        <label>Cenário<select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{results.filter((result) => result.schedule.length).map((result) => <option key={result.id} value={result.id}>{result.name}</option>)}</select></label></div>
      <div className="table-wrap loan-schedule"><table className="loan-table">
        <caption className="sr-only">Cronograma do cenário {selected.name}</caption>
        <thead><tr><th scope="col">Parcela</th><th scope="col">Vencimento</th><th scope="col">Valor pago</th><th scope="col">Juros</th><th scope="col">Amortização</th><th scope="col">Seguro</th><th scope="col">Saldo devedor</th><th scope="col">Sobra do mês</th></tr></thead>
        <tbody>
          {selected.upfrontCents > 0 && <tr><th scope="row">Na hora</th><td>{day(selected.startOn)}</td><td className="statement-amount">{money(selected.upfrontCents)}</td><td>—</td><td>—</td><td>—</td><td>{money(selected.financedCents)}</td>
            <td>{hasIncome ? <Surplus flow={flows[selected.id]} month={selected.startOn.slice(0, 7)} label={monthName}/> : "—"}</td></tr>}
          {selected.schedule.map((row) => <tr key={row.n}>
            <th scope="row">{row.n}{row.extraCents ? " + extra" : ""}</th><td>{day(row.date)}</td><td className="statement-amount">{money(row.paymentCents)}</td><td>{money(row.interestCents)}</td><td>{money(row.amortizationCents)}</td><td>{row.insuranceCents ? money(row.insuranceCents) : "—"}</td><td>{money(row.balanceCents)}</td>
            <td>{hasIncome ? <Surplus flow={flows[selected.id]} month={row.date.slice(0, 7)} label={monthName}/> : "—"}</td>
          </tr>)}
        </tbody>
      </table></div>
    </section>}

    <section className="panel stack" id="salvar" aria-labelledby="loan-save">
      <div><h2 id="loan-save">Salvar esta comparação</h2><p className="muted">Só os dados que você digitou são guardados, e apenas se você pedir. Salvar não cria dívida, parcela nem altera nenhuma fatura.</p></div>
      <div className="row"><label className="loan-save-name">Nome<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Fatura de novembro"/></label>
        <button type="button" className="button" onClick={() => save(false)} disabled={blocked}><Save size={15}/>{loadedId ? "Atualizar a salva" : "Salvar comparação"}</button>
        {loadedId && <button type="button" className="button-secondary" onClick={() => save(true)} disabled={blocked}>Salvar como nova</button>}</div>
      {saved.length > 0 && <ul className="loan-saved">{saved.map((item) => <li key={item.id}><span><strong>{item.name}</strong><small className="muted">{item.payload.scenarios.length} cenário(s) · atualizada em {day(item.updatedOn)}</small></span>
        <span className="row"><button type="button" className="button-secondary" onClick={() => open(item)}>Abrir</button><button type="button" className="button-secondary" onClick={() => destroy(item)} disabled={pending} aria-label={`Excluir a comparação ${item.name}`}><Trash2 size={14}/></button></span></li>)}</ul>}
    </section>
  </div>;
}

/** What is left of the month once the payments of the scenario are made; red when it is below zero. */
function Surplus({ flow, month, label }: { flow: FlowSummary | undefined; month: string; label: (key: string) => string }) {
  const found = flow?.months.find((item) => item.month === month);
  if (!found) return <span className="muted">—</span>;
  return <span className="loan-surplus" data-negative={found.surplusCents < 0 || undefined}>{money(found.surplusCents)} <small className="muted">{label(found.month)}</small></span>;
}
