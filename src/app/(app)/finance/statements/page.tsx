
import { FinanceWriteOnly } from "@/features/finance/FinanceWriteAccess";
import { currentFinanceOrigin } from "@/features/finance/data-origin-request";
import { transactionOriginWhere } from "@/features/finance/data-origin";
import { financePageAccess } from "@/features/finance/finance-page-access";
import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, Info, Landmark, Layers, Plus, ShieldCheck, Upload } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { CardStatementTimelineChart } from "@/components/TbbCharts";
import { StatementCorrectionDialog } from "@/features/finance/StatementCorrectionDialog";
import { BankBadge } from "@/features/finance/BankBadge";
import { CardExpenseButton, CardExpenseDialog } from "@/features/finance/CardExpenseDialog";
import { CardStatementImport } from "@/features/finance/CardStatementImport";
import { StatementProvenanceTooltip } from "@/features/finance/StatementProvenanceTooltip";
import { StatementPaymentDialog, UndoPaymentButton } from "@/features/finance/StatementPaymentDialog";
import { undoableManualPayments } from "@/features/finance/statement-payment-service";
import { describeProvenance } from "@/features/finance/statement-provenance";
import { CreditLimitBreakdown } from "@/features/finance/CreditLimitBreakdown";
import { resolveCardStatementOverlap, updateStatementLink } from "@/features/finance/actions";
import { statementAlerts, summarizeCardStatements, type StatementRow } from "@/features/finance/card-statements";
import { institutionBrand } from "@/features/finance/institution-brand";
import { money } from "@/features/finance/money";
import { canReadCardStatements, cardStatementRows, creditCardPositions, monthlyIncomeReference } from "@/features/finance/queries";
import { addDays, dayKey, formatDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Faturas" };

export default async function CardStatementsPage() {
  const c = await financePageAccess();
  if (!canReadCardStatements(c)) return <FinancePrivacyBoundary canWrite={c.canWrite}><div className="stack">
    <PageHeader eyebrow="MONEY · FATURAS" title="Faturas dos cartões."/>
    <div className="panel"><EmptyState title="Faturas visíveis só para o titular" description="As faturas de cartão deste espaço são dados pessoais do titular e não aparecem para outros membros."/></div>
  </div></FinancePrivacyBoundary>;
  const origin = await currentFinanceOrigin();

  const today = dayKey(new Date(), c.workspace.timezone);
  const rows = await cardStatementRows(c, origin);
  const [positions, incomeCents, categories, linked, bankLimits, bankAccounts, bankTransactions] = await Promise.all([
    creditCardPositions(c.workspaceId, today, rows, { origin }),
    monthlyIncomeReference(c.workspaceId, today),
    prisma.financeCategory.findMany({ where: { workspaceId: c.workspaceId, isArchived: false, type: "EXPENSE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.financeTransaction.findMany({ where: { workspaceId: c.workspaceId, cardStatementId: { in: rows.map(row => row.id) }, type: { in: ["EXPENSE", "REFUND"] }, AND: transactionOriginWhere(origin) }, select: { id: true, description: true, merchant: true, amountCents: true, date: true, cardStatementId: true, statementDetailMode: true, type: true, eventKind: true, postedDate: true, occurredAt: true, occurredTimezone: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.financialSnapshot.findMany({ where: { workspaceId: c.workspaceId, kind: "BANK_CREDIT_LIMIT" }, select: { accountId: true, asOfDate: true, payload: true }, orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 100 }),
    prisma.account.findMany({ where: { workspaceId: c.workspaceId, isArchived: false, type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } }, select: { id: true, name: true } }),
    prisma.financeTransaction.findMany({ where: { workspaceId: c.workspaceId, account: { type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } }, OR: [{ type: "TRANSFER", destinationAccount: { type: "CREDIT_CARD" } }, { type: "EXPENSE", isConsumption: false, eventKind: { in: ["CARD_SETTLEMENT", "CARD_PAYMENT"] } }], date: { lte: new Date(`${today}T00:00:00Z`) }, bankStatementPayment: null }, select: { id: true, accountId: true, destinationAccountId: true, amountCents: true, date: true, description: true }, orderBy: { date: "desc" }, take: 100 }),
  ]);
  const s = summarizeCardStatements(rows, today);
  const undoable = await undoableManualPayments(prisma, c.workspaceId, rows.filter((row) => row.status === "PAID" || row.status === "OPEN").map((row) => row.id));
  const alerts = statementAlerts(s, { today, monthlyIncomeCents: incomeCents, cardsWithoutLimit: positions.filter((card) => card.totals && !card.creditLimitCents).map((card) => card.name) });
  const cardOf = new Map(positions.map((card) => [card.id, card]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const day = (value: string | null) => (value ? formatDay(value, c.workspace.locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado");
  const month = (value: string | null) => (value ? new Intl.DateTimeFormat(c.workspace.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00.000Z`)) : "—");
  const closing = (row: Pick<StatementRow, "closingDate" | "closingDay">) => (row.closingDate ? day(row.closingDate) : row.closingDay ? `Dia ${row.closingDay}` : "Não informado");
  const percent = (part: number, total: number) => (total ? Math.round(part / total * 100) : 0);
  const badge = (accountId: string, name: string, size = 28) => <BankBadge institution={cardOf.get(accountId)?.institution} name={name} size={size}/>;
  const detailBase = (row: StatementRow) => row.declaredCents === undefined ? row.amountCents : row.declaredCents + (row.addedCents || 0);
  const detail = (row: StatementRow) => (row.detailCount ? `${money(row.detailedCents ?? 0)} · ${percent(row.detailedCents ?? 0, detailBase(row))}%` : "—");
  const composition = positions.filter((card) => card.totals && card.totals.openCents > 0).sort((a, b) => b.totals!.openCents - a.totals!.openCents);
  const statementCards = positions.filter((card) => card.totals);
  const soon = s.futureKnown.filter((row) => (row.dueDate || "") <= addDays(today, 30)).length;
  const nextOpen = s.open.find((row) => !row.overdue) ?? s.open[0];
  const linkedByStatement = new Map<string, typeof linked>();
  for (const item of linked) linkedByStatement.set(item.cardStatementId!, [...(linkedByStatement.get(item.cardStatementId!) ?? []), item]);
  const hasStatements = rows.length > 0;
  const now = new Date();
  // Dates and times are formatted here, in the workspace time zone, so server and browser always agree.
  const provenance = (row: StatementRow) => <StatementProvenanceTooltip subject={`${row.accountName} ${row.dueDate ? `com vencimento ${day(row.dueDate)}` : month(row.referenceMonth)}`} view={describeProvenance(row.provenance, { timeZone: c.workspace.timezone, today, now, status: row.status })}/>;
  // Both dialogs sit side by side and restart when the bill changes; their keys must differ, or React confuses them.
  const payment = (row: StatementRow, compact = false) => row.version && row.kind === "STATEMENT" && row.status === "OPEN" && row.dueDate
    ? <FinanceWriteOnly><StatementPaymentDialog key={`pay-${row.version}`} compact={compact} today={today}
      bankAccounts={bankAccounts} bankTransactions={bankTransactions.map(row => ({ ...row, date: row.date.toISOString().slice(0, 10) }))}
      statement={{ id: row.id, version: row.version, accountId: row.accountId, accountName: row.accountName, dueDate: row.dueDate, declaredCents: row.declaredCents ?? row.amountCents, addedCents: row.addedCents ?? 0, paidCents: row.paidCents ?? 0, outstandingCents: row.amountCents, amountIsOutstanding: Boolean(row.amountIsOutstanding), sourceAsOf: row.provenance?.bankAsOfDate ?? null, carriedInto: row.rolledIntoStatementId && byId.get(row.rolledIntoStatementId)?.dueDate ? { id: row.rolledIntoStatementId, dueDate: byId.get(row.rolledIntoStatementId)!.dueDate!, amountCents: byId.get(row.rolledIntoStatementId)!.amountCents } : null }}
      carryOptions={rows.filter((other) => other.accountId === row.accountId && other.id !== row.id && other.kind === "STATEMENT" && (other.status === "OPEN" || other.status === "FUTURE_KNOWN") && !other.rolledIntoStatementId && other.dueDate && other.dueDate > row.dueDate!)
        .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).map((other) => ({ id: other.id, dueDate: other.dueDate!, amountCents: other.amountCents, status: other.status as "OPEN" | "FUTURE_KNOWN" }))}/></FinanceWriteOnly>
    : null;
  const undo = (row: StatementRow) => undoable.has(row.id) && row.version ? <FinanceWriteOnly><UndoPaymentButton statementId={row.id} version={row.version} label={`${row.accountName} ${row.dueDate ? day(row.dueDate) : month(row.referenceMonth)}`}/></FinanceWriteOnly> : null;
  const correction = (row: StatementRow, compact = false) => row.version && row.status !== "PAID" ? <FinanceWriteOnly><StatementCorrectionDialog key={`edit-${row.version}`} compact={compact} statement={{ ...row, version: row.version, declaredCents: row.declaredCents ?? row.amountCents, addedCents: row.addedCents ?? 0 }}/></FinanceWriteOnly> : null;

  return <FinancePrivacyBoundary canWrite={c.canWrite}><div className="stack statements-page">
    <PageHeader eyebrow="MONEY · FATURAS" title="Faturas dos cartões." description="Dívida atual, compromissos futuros e histórico quitado, separados dos lançamentos do dia a dia.">
      <FinanceWriteOnly><CardExpenseButton className="button"><Plus size={15}/>Adicionar gasto no cartão</CardExpenseButton></FinanceWriteOnly>
      <a className="button-secondary" href="#importar"><Upload size={15}/>Importar faturas</a>
      <Link className="button-secondary" href="/finance/accounts"><Landmark size={15}/>Contas e cartões</Link>
    </PageHeader>

    {!hasStatements && <div className="panel"><EmptyState title="Nenhuma fatura registrada" description="Importe o arquivo JSON de faturas no fim da página. A prévia mostra tudo antes de gravar."/></div>}

    {hasStatements && <>
      <section className="statement-kpis" aria-label="Resumo das faturas">
        <article data-tone="open"><span className="statement-kpi-icon"><CreditCard size={16}/></span><div>
          <small>Dívida atual</small><strong>{money(s.openCents)}</strong>
          <span className="statement-chip" data-tone="open">{composition.length} cartão{composition.length === 1 ? "" : "ões"}</span>
          <p>{nextOpen ? `Próximo: ${nextOpen.accountName} em ${day(nextOpen.dueDate)}` : "Nenhuma fatura aberta"}</p>
        </div></article>
        <article data-tone={s.overdueCents ? "danger" : "success"}><span className="statement-kpi-icon">{s.overdueCents ? <AlertTriangle size={16}/> : <ShieldCheck size={16}/>}</span><div>
          <small>Vencidas sem pagamento</small><strong>{money(s.overdueCents)}</strong>
          <span className="statement-chip" data-tone={s.overdueCents ? "danger" : "success"}>{s.overdueCents ? `${s.open.filter((row) => row.overdue).length} vencida(s)` : "Em dia"}</span>
          <p>{s.overdueCents ? "Já incluídas na dívida atual." : "Nenhuma fatura passou do vencimento."}</p>
        </div></article>
        <article data-tone="future"><span className="statement-kpi-icon"><CalendarClock size={16}/></span><div>
          <small>Futuras conhecidas</small><strong>{money(s.futureKnownCents)}</strong>
          <span className="statement-chip" data-tone="future">{soon} nos próximos 30 dias</span>
          <p>{s.futureKnown.length} fatura(s); podem mudar até o fechamento.</p>
        </div></article>
        <article data-tone={s.pendingCents ? "warning" : "forecast"}><span className="statement-kpi-icon"><Layers size={16}/></span><div>
          <small>Previsões mensais</small><strong>{money(s.forecastCountedCents)}</strong>
          <span className="statement-chip" data-tone={s.pendingCents ? "warning" : "success"}>{s.pendingCents ? `${money(s.pendingCents)} a conciliar` : "Sem pendências"}</span>
          <p>{s.forecasts.length ? `${s.forecasts.length} previsão(ões) sem vencimento confirmado.` : "Nenhuma previsão registrada."}</p>
        </div></article>
      </section>

      {alerts.length > 0 && <section className="statement-alerts" aria-label="Alertas das faturas">{alerts.map((alert) => {
        const content = <><span className="statement-alert-icon">{alert.tone === "info" ? <Info size={15}/> : <AlertTriangle size={15}/>}</span><span><strong>{alert.title}</strong><small>{alert.detail}</small></span><ArrowRight size={14}/></>;
        return alert.href.startsWith("/") ? <Link key={alert.id} href={alert.href} data-tone={alert.tone}>{content}</Link> : <a key={alert.id} href={alert.href} data-tone={alert.tone}>{content}</a>;
      })}</section>}

      <section className="statement-charts">
        <article className="panel stack" id="composicao">
          <div><h2>Composição da dívida atual</h2><p className="muted">Faturas abertas por cartão.</p></div>
          {composition.length ? <ul className="statement-composition">{composition.map((card) => <li key={card.id}>
            {badge(card.id, card.name, 30)}
            <div>
              <div className="statement-composition-head"><strong>{card.name}</strong><b>{money(card.totals!.openCents)}</b></div>
              <span className="statement-composition-bar"><i style={{ width: `${percent(card.totals!.openCents, s.openCents)}%`, background: institutionBrand(card.institution, card.name).background }}/></span>
              <small>{percent(card.totals!.openCents, s.openCents)}% do total{card.totals!.nextDueDate ? ` · vence ${day(card.totals!.nextDueDate)}` : ""}</small>
            </div>
          </li>)}</ul> : <p className="muted">Nenhuma fatura aberta.</p>}
        </article>
        <article className="panel stack" id="vencimentos">
          <div><h2>Vencimentos por mês</h2><p className="muted">Faturas pelo mês de vencimento; previsões pela competência. Valores a conciliar ficam fora.</p></div>
          <CardStatementTimelineChart data={s.months.map((item) => ({ month: item.month, open: item.openCents / 100, future: item.futureKnownCents / 100, forecast: item.forecastCents / 100, pending: item.pendingCents / 100 }))}/>
          <div className="finance-chart-legend"><span><i style={{ background: "var(--credit-open)" }}/>Abertas</span><span><i style={{ background: "var(--credit-future)" }}/>Futuras conhecidas</span><span><i style={{ background: "var(--chart-5)" }}/>Previsões</span></div>
          <details className="statement-table-toggle"><summary>Ver valores por mês</summary>
            <div className="table-wrap"><table><thead><tr><th>Mês</th><th>Abertas</th><th>Futuras</th><th>Previsões</th><th>A conciliar</th></tr></thead><tbody>
              {s.months.map((item) => <tr key={item.month}><td>{month(item.month)}</td><td>{item.openCents ? money(item.openCents) : "—"}</td><td>{item.futureKnownCents ? money(item.futureKnownCents) : "—"}</td><td>{item.forecastCents ? money(item.forecastCents) : "—"}</td><td>{item.pendingCents ? money(item.pendingCents) : "—"}</td></tr>)}
            </tbody></table></div>
          </details>
        </article>
      </section>

      <section className="statement-cards" aria-label="Cartões">{statementCards.map((card) => {
        const totals = card.totals!;
        const next = s.open.find((row) => row.accountId === card.id);
        const bankLimit = bankLimits.find(snapshot => snapshot.accountId === card.id);
        const reportedAvailable = (bankLimit?.payload as { availableCents?: number } | undefined)?.availableCents;
        return <article className="panel statement-card" key={card.id}>
          <header>{badge(card.id, card.name, 40)}<div><h3>{card.name}</h3><small className="muted">{card.institution || "Sem instituição"}</small></div>{next?.overdue && <span className="statement-chip" data-tone="danger">Vencida</span>}</header>
          <div className="statement-card-amount"><small>Fatura aberta{next && provenance(next)}</small><strong>{money(totals.openCents)}</strong><span className="muted">{next ? `Vence ${day(next.dueDate)} · fecha ${closing(next).toLowerCase()}` : "Nenhuma fatura aberta"}</span></div>
          <dl className="statement-card-facts">
            <div><dt>Futuras conhecidas</dt><dd>{money(totals.futureKnownCents)} <small>{totals.futureKnownCount} fatura(s)</small></dd></div>
            <div><dt>Histórico pago</dt><dd>{money(totals.paidCents)} <small>{totals.paidCount} fatura(s)</small></dd></div>
            {next && next.detailCount ? <div><dt>Detalhado</dt><dd>{money(next.detailedCents ?? 0)} <small>do total original {money(detailBase(next))}</small></dd></div> : null}
          </dl>
          <CreditLimitBreakdown breakdown={card.breakdown} editHref={`/finance/accounts?edit=${card.id}`}/>
          {next?.notes && <small className="muted">{next.notes}</small>}
          {bankLimit && typeof reportedAvailable === "number" && Number.isSafeInteger(reportedAvailable) && <small className="muted">Banco informou disponível {money(reportedAvailable)} em {day(bankLimit.asOfDate.toISOString().slice(0, 10))}. A barra acima usa os compromissos registrados no TBB.</small>}
          <div className="row">{next && payment(next)}{next && correction(next)}<Link className="button-secondary" href={`/finance/accounts?edit=${card.id}`}>Editar cartão</Link><FinanceWriteOnly><CardExpenseButton accountId={card.id}><Plus size={14}/>Adicionar gasto</CardExpenseButton></FinanceWriteOnly><Link className="button-secondary" href={`/finance/transactions?account=${card.id}`}>Ver transações</Link></div>
        </article>;
      })}</section>

      <section className="panel stack" id="abertas">
        <div className="statement-section-head"><div><h2>Abertas</h2><p className="muted">Compõem a dívida atual. Cada uma vence na própria data.</p></div><span className="statement-chip" data-tone="open">{money(s.openCents)}</span></div>
        {s.open.length ? <div className="table-wrap"><table className="statement-table"><thead><tr><th>Cartão</th><th>Fechamento</th><th>Vencimento</th><th>Valor</th><th>Detalhado</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {s.open.map((row) => <tr key={row.id} id={`fatura-${row.id}`}>
            <td><span className="statement-card-cell">{badge(row.accountId, row.accountName)}{row.accountName}</span></td>
            <td>{closing(row)}</td><td>{day(row.dueDate)}</td>
            <td className="statement-amount">{money(row.amountCents)}{provenance(row)}{row.addedCents ? <small>inclui {money(row.addedCents)} somado</small> : null}</td>
            <td>{detail(row)}</td>
            <td><span className="statement-chip" data-tone={row.overdue ? "danger" : "open"}>{row.overdue ? "Vencida, não paga" : "Aberta"}</span>{row.paidCents ? <small className="muted block">pago {money(row.paidCents)}</small> : null}</td>
            <td><div className="row">{payment(row, true)}{undo(row)}{correction(row, true)}<FinanceWriteOnly><CardExpenseButton accountId={row.accountId} statementId={row.id} className="icon-button" label={`Adicionar gasto na fatura ${row.accountName} de ${day(row.dueDate)}`}><Plus size={16}/></CardExpenseButton></FinanceWriteOnly></div></td>
          </tr>)}
        </tbody><tfoot><tr><th colSpan={3}>Total aberto</th><th colSpan={4}>{money(s.openCents)}</th></tr></tfoot></table></div> : <p className="muted">Nenhuma fatura aberta.</p>}
      </section>

      <section className="panel stack" id="futuras">
        <div className="statement-section-head"><div><h2>Próximas e previstas</h2><p className="muted">Faturas futuras conhecidas e previsões mensais. Não são dívida vencida.</p></div><span className="statement-chip" data-tone="future">{money(s.futureKnownCents + s.forecastCountedCents)}</span></div>
        {s.futureKnown.length + s.forecasts.length ? <div className="table-wrap"><table className="statement-table"><thead><tr><th>Cartão</th><th>Competência</th><th>Fechamento</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {s.futureKnown.map((row) => <tr key={row.id} id={`fatura-${row.id}`}>
            <td><span className="statement-card-cell">{badge(row.accountId, row.accountName)}{row.accountName}</span></td>
            <td>{row.referenceMonth ? month(row.referenceMonth) : "—"}</td><td>{closing(row)}</td><td>{day(row.dueDate)}</td>
            <td className="statement-amount">{money(row.amountCents)}{provenance(row)}{row.addedCents ? <small>inclui {money(row.addedCents)} somado</small> : null}</td>
            <td><span className="statement-chip" data-tone={row.awaitingUpdate ? "warning" : "future"}>{row.awaitingUpdate ? "Venceu · aguardando atualização" : "Futura conhecida"}</span></td>
            <td><div className="row">{correction(row, true)}<FinanceWriteOnly><CardExpenseButton accountId={row.accountId} statementId={row.id} className="icon-button" label={`Adicionar gasto na fatura ${row.accountName} de ${day(row.dueDate)}`}><Plus size={16}/></CardExpenseButton></FinanceWriteOnly></div></td>
          </tr>)}
          {s.forecasts.map((row) => {
            const overlapped = row.overlapsStatementId ? byId.get(row.overlapsStatementId) : undefined;
            return <tr key={row.id} id={`previsao-${row.id}`}>
              <td><span className="statement-card-cell">{badge(row.accountId, row.accountName)}{row.accountName}</span></td>
              <td>{month(row.referenceMonth)}</td><td>—</td><td>Não informado</td>
              <td className="statement-amount">{money(row.amountCents)}{provenance(row)}</td>
              <td>{row.reconciliation === "PENDING" ? <div className="stack" style={{ gap: 6 }}>
                <span className="statement-chip" data-tone="warning">Pendente de conciliação · fora dos totais</span>
                {overlapped && <small className="muted">Pode já estar na fatura de {money(overlapped.amountCents)} que vence em {day(overlapped.dueDate)}.</small>}
                <div className="row">
                  <ActionForm action={resolveCardStatementOverlap}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="resolution" value="INCLUDED_IN_STATEMENT"/><button className="button-secondary">Já está na fatura</button></ActionForm>
                  <ActionForm action={resolveCardStatementOverlap}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="resolution" value="SEPARATE_CHARGE"/><button className="button-secondary">É cobrança separada</button></ActionForm>
                </div>
              </div> : <span className="statement-chip" data-tone="forecast">{row.reconciliation === "INCLUDED_IN_STATEMENT" ? "Incluída na fatura · não somada" : "Previsão"}</span>}</td>
              <td>{correction(row, true)}</td>
            </tr>;
          })}
        </tbody></table></div> : <p className="muted">Nenhum compromisso futuro informado.</p>}
      </section>

      {linked.length > 0 && <section className="panel stack" id="detalhamento">
        <div><h2>Gastos vinculados às faturas</h2><p className="muted">Compras detalhadas sob cada fatura. “Já incluído” só detalha o total; “somado” aumenta o total da fatura.</p></div>
        {[...linkedByStatement.entries()].map(([statementId, items]) => {
          const statement = byId.get(statementId);
          if (!statement) return null;
          return <article className="statement-detail" key={statementId}>
            <header>{badge(statement.accountId, statement.accountName)}<strong>{statement.accountName} · {statement.dueDate ? `vence ${day(statement.dueDate)}` : month(statement.referenceMonth)}</strong><span className="muted">Detalhado {money(statement.detailedCents ?? 0)} do total original {money(detailBase(statement))} · sem detalhe {money(Math.max(0, detailBase(statement) - (statement.detailedCents ?? 0)))}</span></header>
            <ul>{items.map((item) => <li key={item.id}>
              <span className="muted">{day(item.date.toISOString().slice(0, 10))}</span>
              <span>{item.merchant || item.description}</span>
              <b>{money(item.type === "REFUND" ? -item.amountCents : item.amountCents)}</b>
              <span className="statement-chip" data-tone={item.statementDetailMode === "ADDED_TO_STATEMENT" ? "future" : "success"}>{item.statementDetailMode === "ADDED_TO_STATEMENT" ? "Somado ao total" : "Já incluído"}</span>
              <small className="muted">{item.eventKind === "FINANCING_INSTALLMENT" ? "Financiamento · fora do consumo" : item.type === "REFUND" ? "Estorno" : "Compra/encargo"}{item.postedDate ? ` · lançado ${day(item.postedDate.toISOString().slice(0, 10))}` : ""}{item.occurredAt && item.occurredTimezone ? ` · ${item.occurredAt.toLocaleTimeString(c.workspace.locale, { timeZone: item.occurredTimezone, hour: "2-digit", minute: "2-digit" })}` : ""}</small>
              <span className="row">
                <ActionForm action={updateStatementLink}><input type="hidden" name="transactionId" value={item.id}/><input type="hidden" name="statementId" value={statementId}/><input type="hidden" name="mode" value={item.statementDetailMode === "ADDED_TO_STATEMENT" ? "ALREADY_INCLUDED" : "ADDED_TO_STATEMENT"}/><button className="button-secondary">{item.statementDetailMode === "ADDED_TO_STATEMENT" ? "Já estava incluído" : "Somar ao total"}</button></ActionForm>
                <ActionForm action={updateStatementLink}><input type="hidden" name="transactionId" value={item.id}/><input type="hidden" name="statementId" value=""/><button className="button-secondary">Desvincular</button></ActionForm>
              </span>
            </li>)}</ul>
          </article>;
        })}
      </section>}

      <details className="panel statement-paid">
        <summary><span><strong>Histórico quitado</strong><span className="muted"> · {s.paid.length} fatura(s) · {money(s.paidCents)} em valor histórico · não entra na dívida</span></span></summary>
        <div className="table-wrap"><table className="statement-table"><thead><tr><th>Cartão</th><th>Vencimento</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>
          {s.paid.map((row) => <tr key={row.id}><td><span className="statement-card-cell">{badge(row.accountId, row.accountName)}{row.accountName}</span></td><td>{day(row.dueDate)}</td><td className="statement-amount">{money(row.amountCents)}{provenance(row)}</td><td><span className="payment-paid-cell">{row.paidAt ? day(row.paidAt) : "Paga · data não informada"}{row.rolledIntoStatementId && <span className="statement-chip" data-tone="forecast">Saldo transportado</span>}{undoable.has(row.id) && <span className="statement-chip" data-tone="success">Baixa manual</span>}{undo(row)}</span></td></tr>)}
        </tbody></table></div>
      </details>
    </>}

    {s.carried.length > 0 && <section className="panel stack"><h2>Histórico com saldo carregado</h2><p className="muted">O restante destas faturas já está na fatura seguinte. Ele não é somado outra vez à dívida atual nem aos vencimentos do calendário.</p>{s.carried.map(row => <div className="list-item" key={row.id}><div><strong>{row.accountName} · {month(row.referenceMonth)}</strong><p>Total original {money(row.declaredCents ?? row.amountCents)} · pagamento {money(row.paidCents || 0)} · saldo {money(row.amountCents)}{provenance(row)}</p></div><span className="row">{payment(row)}{undo(row)}<a href={`#fatura-${row.rolledIntoStatementId}`}>Ver fatura que inclui este saldo →</a></span></div>)}</section>}
    <section id="importar"><FinanceWriteOnly><CardStatementImport/></FinanceWriteOnly></section>
    <FinanceWriteOnly><CardExpenseDialog cards={positions.map(({ id, name, institution }) => ({ id, name, institution }))} categories={categories} today={today}
      statements={rows.map(({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents }) => ({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents: detailedCents ?? 0 }))}/></FinanceWriteOnly>
  </div></FinancePrivacyBoundary>;
}
