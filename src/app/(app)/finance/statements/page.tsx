import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { CardStatementImport } from "@/features/finance/CardStatementImport";
import { resolveCardStatementOverlap } from "@/features/finance/actions";
import { money } from "@/features/finance/money";
import { cardStatementOverview } from "@/features/finance/queries";
import { dayKey, formatDay } from "@/lib/dates";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Faturas" };

export default async function CardStatementsPage() {
  const c = await getWorkspaceContext();
  const today = dayKey(new Date(), c.workspace.timezone);
  const s = await cardStatementOverview(c.workspaceId, today);
  const owner = c.role === "OWNER";
  const day = (value: string | null) => (value ? formatDay(value, c.workspace.locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado");
  const month = (value: string | null) => (value ? new Intl.DateTimeFormat(c.workspace.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00.000Z`)) : "—");
  const closing = (row: { closingDate: string | null; closingDay: number | null }) => row.closingDate ? day(row.closingDate) : row.closingDay ? `Dia ${row.closingDay} (mês não informado)` : "Não informado";
  const byId = new Map([...s.open, ...s.futureKnown, ...s.paid].map((row) => [row.id, row]));
  const hasStatements = s.open.length + s.futureKnown.length + s.forecasts.length + s.paid.length > 0;

  return <div className="stack">
    <PageHeader eyebrow="MONEY · FATURAS" title="Faturas dos cartões." description="Dívida atual, compromissos futuros e histórico quitado ficam separados. Faturas não viram lançamentos: o fluxo de caixa continua vindo das transações."/>

    {hasStatements && <section className="stat-grid" aria-label="Resumo das faturas">
      <div className="stat-card"><span>Dívida atual (faturas abertas)</span><strong>{money(s.openCents)}</strong><small className="muted">{s.open.length ? `${s.open.length} aberta(s) · vencem ${s.dueDates.map(day).join(" · ")}` : "Nenhuma fatura aberta"}</small></div>
      <div className="stat-card"><span>Vencidas sem pagamento</span><strong>{money(s.overdueCents)}</strong><small className="muted">{s.overdueCents ? "Já incluídas na dívida atual" : "Nenhuma fatura vencida"}</small></div>
      <div className="stat-card"><span>Futuras já conhecidas</span><strong>{money(s.futureKnownCents)}</strong><small className="muted">{s.futureKnown.length} fatura(s) · podem mudar até o fechamento</small></div>
      <div className="stat-card"><span>Previsões mensais</span><strong>{money(s.forecastCountedCents)}</strong><small className="muted">{s.pendingCents ? `${money(s.pendingCents)} aguardando conciliação, fora deste total` : "Sem pendências de conciliação"}</small></div>
    </section>}

    {hasStatements && <section className="panel stack">
      <div><h2>Abertas · compõem a dívida atual</h2><p className="muted">Somente estas entram no total devido agora. Cada uma vence em sua própria data.</p></div>
      {s.open.length ? <div className="table-wrap"><table><thead><tr><th>Cartão</th><th>Fechamento</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>
        {s.open.map((row) => <tr key={row.id}><td>{row.accountName}</td><td>{closing(row)}</td><td>{day(row.dueDate)}</td><td>{money(row.amountCents)}</td><td><span className="badge">{row.overdue ? "Vencida, não paga" : "Aberta"}</span></td></tr>)}
      </tbody><tfoot><tr><th colSpan={3}>Total aberto</th><th colSpan={2}>{money(s.openCents)}</th></tr></tfoot></table></div> : <p className="muted">Nenhuma fatura aberta.</p>}
    </section>}

    {hasStatements && <section className="panel stack">
      <div><h2>Próximas e previstas · não são dívida vencida</h2><p className="muted">Valores informados para o futuro. Previsões sem data de vencimento mostram apenas a competência.</p></div>
      {s.futureKnown.length + s.forecasts.length ? <div className="table-wrap"><table><thead><tr><th>Cartão</th><th>Vencimento ou competência</th><th>Valor</th><th>Tipo</th><th>Situação</th></tr></thead><tbody>
        {s.futureKnown.map((row) => <tr key={row.id}><td>{row.accountName}</td><td>{day(row.dueDate)}</td><td>{money(row.amountCents)}</td><td>Fatura futura conhecida</td><td><span className="badge">{row.awaitingUpdate ? "Venceu · aguardando atualização" : "Prevista"}</span></td></tr>)}
        {s.forecasts.map((row) => {
          const overlapped = row.overlapsStatementId ? byId.get(row.overlapsStatementId) : undefined;
          return <tr key={row.id}><td>{row.accountName}</td><td>{month(row.referenceMonth)} · vencimento não informado</td><td>{money(row.amountCents)}</td><td>Previsão mensal</td><td>
            {row.reconciliation === "PENDING" ? <div className="stack" style={{ gap: 8 }}>
              <span className="badge">Pendente de conciliação · fora dos totais</span>
              {overlapped && <small className="muted">Pode já estar na fatura de {money(overlapped.amountCents)} que vence em {day(overlapped.dueDate)}.</small>}
              {owner && <div className="row">
                <ActionForm action={resolveCardStatementOverlap}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="resolution" value="INCLUDED_IN_STATEMENT"/><button className="button-secondary">Já está na fatura</button></ActionForm>
                <ActionForm action={resolveCardStatementOverlap}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="resolution" value="SEPARATE_CHARGE"/><button className="button-secondary">É cobrança separada</button></ActionForm>
              </div>}
            </div> : <span className="badge">{row.reconciliation === "INCLUDED_IN_STATEMENT" ? "Incluída na fatura · não somada" : "Prevista"}</span>}
          </td></tr>;
        })}
      </tbody></table></div> : <p className="muted">Nenhum compromisso futuro informado.</p>}
    </section>}

    {s.months.length > 0 && <section className="panel stack">
      <div><h2>Comprometimento por mês</h2><p className="muted">Mês do vencimento para faturas e da competência para previsões. Valores a conciliar não entram nas somas.</p></div>
      <div className="table-wrap"><table><thead><tr><th>Mês</th><th>Abertas</th><th>Futuras conhecidas</th><th>Previsões</th><th>A conciliar</th></tr></thead><tbody>
        {s.months.map((row) => <tr key={row.month}><td>{month(row.month)}</td><td>{row.openCents ? money(row.openCents) : "—"}</td><td>{row.futureKnownCents ? money(row.futureKnownCents) : "—"}</td><td>{row.forecastCents ? money(row.forecastCents) : "—"}</td><td>{row.pendingCents ? money(row.pendingCents) : "—"}</td></tr>)}
      </tbody></table></div>
    </section>}

    {hasStatements && <section className="panel stack">
      <div><h2>Histórico quitado · não entra na dívida</h2><p className="muted">{s.paid.length} fatura(s) pagas, somando {money(s.paidCents)} em valor histórico. A data efetiva de pagamento só aparece quando foi informada.</p></div>
      {s.paid.length ? <div className="table-wrap"><table><thead><tr><th>Cartão</th><th>Vencimento</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>
        {s.paid.map((row) => <tr key={row.id}><td>{row.accountName}</td><td>{day(row.dueDate)}</td><td>{money(row.amountCents)}</td><td>{row.paidAt ? day(row.paidAt) : "Paga · data não informada"}</td></tr>)}
      </tbody></table></div> : <p className="muted">Nenhuma fatura quitada registrada.</p>}
    </section>}

    {!hasStatements && <div className="panel"><EmptyState title="Nenhuma fatura registrada" description={owner ? "Importe o arquivo JSON de faturas abaixo. A prévia mostra tudo antes de gravar." : "O titular deste espaço ainda não importou faturas."}/></div>}
    {owner && <CardStatementImport/>}
  </div>;
}
