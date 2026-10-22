"use client";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { KeepFormValues } from "@/components/ui/KeepFormValues";
import { Modal } from "@/components/ui/Modal";
import { money } from "@/features/finance/money";
import { addOpenFinanceConnection, mapOpenFinanceAccount, pauseOpenFinanceConnection, removeOpenFinanceConnection, reviewOpenFinanceBill, syncOpenFinanceNow } from "./actions";
import { accountKindLabel, connectionStatusLabel, openFinanceError, runStatusLabel } from "./copy";
import type { OpenFinanceOverview } from "./queries";
import { connectionInstitution, INSTITUTIONS, type Institution } from "./institutions";

export type TbbCashAccount = { id: string; name: string; balanceCents: number; kind?: "BANK" | "CREDIT" };
type Connection = Extract<OpenFinanceOverview, { ready: true }>["connections"][number];
const when = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const dayLabel = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
const tone = (status: string) => status === "ACTIVE" ? "ok" : status === "PAUSED" ? "muted" : "warn";
const billStatusLabel: Record<string, string> = { OPEN: "Aberta", FUTURE_KNOWN: "Futura conhecida", PAID: "Quitada", FORECAST: "Previsão" };

function AddConnection({ count, institution }: { count: number; institution?: Institution }) {
  return <Modal title={institution ? `Conectar ${institution.name} pelo Meu Pluggy` : "Adicionar conexão do Meu Pluggy"} trigger={<><Plus size={15}/>{institution ? `Conectar ${institution.name}` : "Adicionar conexão"}</>} triggerClassName={institution ? "button-secondary" : "button"}>
    {institution && <div className="of-connect-guide"><p>Use as credenciais da Pluggy já configuradas no TBB.</p><ol className="of-steps"><li>Conecte {institution.name} em <a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer">Meu Pluggy</a> e autorize no aplicativo do banco.</li><li>No <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer">Dashboard da Pluggy</a>, abra sua aplicação → Demo → Conectar Conta e escolha <strong>MeuPluggy</strong>.</li><li>Copie o Item ID de {institution.name} e cole abaixo. Depois sincronize e escolha as contas e cartões já existentes no TBB.</li></ol></div>}
    <KeepFormValues><ActionForm key={count} action={addOpenFinanceConnection} className="stack" resetOnSuccess={false}>
      <label>Nome da conexão<input name="label" required maxLength={80} defaultValue={institution?.name ?? ""} placeholder="Ex.: Nubank" autoComplete="off"/></label>
      <label>Item ID<input name="itemId" required placeholder="00000000-0000-0000-0000-000000000000" autoComplete="off" spellCheck={false}/></label>
      <p className="muted text-sm">Copie o Item ID em Aplicações → sua aplicação → Demo → Itens conectados, no Dashboard da Pluggy. Ele é guardado criptografado e nunca aparece de novo na tela.</p>
      <button className="button" type="submit">Adicionar</button>
    </ActionForm></KeepFormValues>
  </Modal>;
}

function InstitutionSetup({ connections }: { connections: Connection[] }) {
  return <section className="panel stack" aria-labelledby="of-banks-title"><div><h2 id="of-banks-title">Seus bancos no TBB</h2><p className="muted text-sm">Cada banco tem sua própria autorização. Conta, reserva e cartão são vinculados separadamente aos registros que você já tem.</p></div>
    <ul className="of-bank-setup">{INSTITUTIONS.map(institution => {
      const connection = connections.find(value => connectionInstitution([value.label, value.institutionName, ...value.accounts.map(account => account.displayName)])?.id === institution.id);
      return <li key={institution.id} data-institution={institution.id}><div className="of-institution-name"><span className="of-institution-mark" aria-hidden="true">{institution.initials}</span><div><h3>{institution.name}</h3><p className="muted text-xs">{connection ? "Cadastrado no TBB" : "Aguardando conexão"}</p></div></div>
        {connection ? <a className="button-secondary" href={`#of-connection-${connection.id}`}>Ver vínculo</a> : <AddConnection count={connections.length} institution={institution}/>}
      </li>;
    })}</ul>
    <p className="muted text-xs">Só serão importadas as contas que você habilitar. Cole os Item IDs nesta tela; não é preciso enviá-los pelo chat.</p>
  </section>;
}

function AccountRow({ account, tbb }: { account: Connection["accounts"][number]; tbb: TbbCashAccount[] }) {
  const compatible = tbb.filter(item => (item.kind ?? "BANK") === account.kind);
  const mapped = compatible.find((item) => item.id === account.accountId);
  const drift = mapped && account.providerBalanceCents != null ? account.providerBalanceCents - mapped.balanceCents : null;
  const isCard = account.kind !== "BANK";
  return <li className="of-account">
    <div className="of-account-head">
      <div><strong>{account.displayName}</strong><small>{accountKindLabel[account.kind] ?? account.kind}{account.maskedNumber ? ` · final ${account.maskedNumber}` : ""}</small></div>
      {account.providerBalanceCents != null && <div className="of-balance"><small>Saldo no banco</small><strong>{money(account.providerBalanceCents)}</strong></div>}
    </div>
    <KeepFormValues><ActionForm key={`${account.accountId}|${account.syncFromDate}|${account.isEnabled}`} action={mapOpenFinanceAccount} className="of-map" resetOnSuccess={false}>
        <input type="hidden" name="linkId" value={account.id}/>
        <label>{isCard ? "Cartão do TBB" : "Conta do TBB"}<select name="accountId" defaultValue={account.accountId ?? ""}><option value="">Não vincular</option>{compatible.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{isCard ? "Compras a partir de" : "Importar a partir de"}<input type="date" name="syncFromDate" defaultValue={account.syncFromDate ?? ""}/></label>
        <label className="of-check"><input type="checkbox" name="enabled" defaultChecked={account.isEnabled}/><span>Sincronizar esta conta</span></label>
        <button className="button-secondary" type="submit">Salvar</button>
      </ActionForm></KeepFormValues>
    {isCard && <p className="muted text-xs">Faturas são conciliadas pelo vencimento. Compras entram como detalhamento já incluído no total; parcelas futuras exigem dados confirmados. Pagamentos e divergências aguardam revisão.</p>}
    {!isCard && <p className="muted text-xs">Movimentos anteriores à data de início nunca são importados, para não alterar o saldo que o TBB já acompanha.{account.lastTransactionDate ? ` Último movimento lido: ${dayLabel(account.lastTransactionDate)}.` : ""}</p>}
    {drift !== null && <p className="of-drift" data-off={drift !== 0 || undefined}>{drift === 0 ? "O saldo do TBB confere com o do banco." : <>Saldo do TBB {money(mapped!.balanceCents)} · diferença {money(drift)}. <Link href="/finance/accounts">Conferir em Atualizar saldos →</Link></>}</p>}
  </li>;
}

function CreditBillReviews({ reviews }: { reviews: OpenFinanceOverview["creditReviews"] }) {
  if (!reviews.length) return null;
  return <section className="panel stack"><h2>Faturas para conciliar</h2><p className="muted text-sm">Confira a fatura de destino e o total informado pelo banco antes de substituir os valores do TBB.</p>
    {reviews.map(review => <article key={review.id} className="of-bill-review stack">
      <div><h3>{review.connectionLabel} · {review.accountName}</h3><strong>Vence {dayLabel(review.dueDate)} · {review.balanceCents !== null ? "Total conciliado " : "Total no banco "}{money(review.totalCents)}</strong>{review.balanceCents !== null && <p className="muted text-sm">Saldo em aberto no banco: {money(review.balanceCents)}. O total acima inclui pagamentos registrados até a data da fonte.</p>}<p className="muted text-xs">{review.closingDate ? `Fecha ${dayLabel(review.closingDate)}` : "Fechamento não informado pelo banco"}</p><p className="muted text-sm">{review.reason}</p><Link className="muted text-sm" href="/finance/statements">Conferir faturas e pagamentos →</Link></div>
      <KeepFormValues><ActionForm action={reviewOpenFinanceBill} className="of-map" resetOnSuccess={false}>
        <input type="hidden" name="snapshotId" value={review.id}/>
        <label>Fatura no TBB<select name="target" defaultValue={review.statements.find(statement => statement.id === review.statementId) ? `${review.statementId}|${review.statements.find(statement => statement.id === review.statementId)!.version}` : ""}>
          <option value="">Nova fatura, se o período ainda não existir</option>{review.statements.map(statement => <option key={statement.id} value={`${statement.id}|${statement.version}`}>{statement.dueDate ? dayLabel(statement.dueDate) : statement.referenceMonth || "Sem vencimento"}{statement.closingDate ? ` · fecha ${dayLabel(statement.closingDate)}` : ""} · {money(statement.amountCents)} · {billStatusLabel[statement.status] ?? statement.status}</option>)}
        </select></label>
        <label>Situação confirmada<select name="status" required defaultValue={review.status ?? ""}><option value="" disabled>Conferir situação</option><option value="OPEN">Aberta</option><option value="FUTURE_KNOWN">Futura conhecida</option><option value="PAID">Quitada, com pagamento confirmado</option></select></label>
        <label className="of-check"><input type="checkbox" name="confirm" required/><span>Conferi o total e a fatura de destino</span></label>
        <button className="button-secondary" type="submit">Conciliar fatura</button>
      </ActionForm></KeepFormValues>
    </article>)}
  </section>;
}

function ConnectionCard({ connection, tbb }: { connection: Connection; tbb: TbbCashAccount[] }) {
  const error = openFinanceError(connection.lastErrorCode);
  const paused = connection.status === "PAUSED", resumable = paused || connection.status === "CONSENT_EXPIRED";
  return <article className="panel stack of-connection" id={`of-connection-${connection.id}`}>
    <header className="row justify-between">
      <div><h2>{connection.label}</h2><p className="muted text-sm">{connection.institutionName ? `${connection.institutionName} · ` : ""}Meu Pluggy</p></div>
      <span className="badge" data-tone={tone(connection.status)}>{connectionStatusLabel[connection.status] ?? connection.status}</span>
    </header>
    <dl className="of-facts">
      <div><dt>Última sincronização</dt><dd>{when(connection.lastSyncedAt)}</dd></div>
      <div><dt>Próxima atualização do Meu Pluggy</dt><dd>{when(connection.nextAutoSyncAt)}</dd></div>
      <div><dt>Dados do banco atualizados em</dt><dd>{when(connection.providerUpdatedAt)}</dd></div>
      <div><dt>Consentimento até</dt><dd>{connection.consentExpiresAt ? when(connection.consentExpiresAt) : "Sem prazo informado"}</dd></div>
    </dl>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="row">
      {!paused && <ActionForm action={syncOpenFinanceNow} resetOnSuccess={false}><input type="hidden" name="connectionId" value={connection.id}/><button className="button" type="submit"><RefreshCw size={14}/>Sincronizar agora</button></ActionForm>}
      <ActionForm action={pauseOpenFinanceConnection}><input type="hidden" name="connectionId" value={connection.id}/><input type="hidden" name="paused" value={resumable ? "0" : "1"}/><button className="button-secondary" type="submit">{resumable ? "Retomar" : "Pausar"}</button></ActionForm>
      <Modal title={`Remover ${connection.label}`} trigger="Remover"><ActionForm action={removeOpenFinanceConnection} className="stack"><input type="hidden" name="connectionId" value={connection.id}/><p>A sincronização para. Os lançamentos que já vieram desta conexão continuam no TBB; só o vínculo com o banco é removido.</p><button className="button" type="submit">Remover conexão</button></ActionForm></Modal>
    </div>
    <p className="muted text-xs">O Meu Pluggy atualiza os dados do banco a cada 24 horas e não aceita atualização manual. “Sincronizar agora” traz para o TBB o que o Meu Pluggy já tem.</p>
    {connection.accounts.length > 0 ? <ul className="of-accounts">{connection.accounts.map((account) => <AccountRow key={account.id} account={account} tbb={tbb}/>)}</ul>
      : <p className="muted text-sm">Nenhuma conta listada ainda. Use “Sincronizar agora” para o TBB buscar as contas deste banco.</p>}
    {connection.runs.length > 0 && <details><summary>Histórico de sincronizações</summary>
      <div className="table-wrap"><table><thead><tr><th>Quando</th><th>Origem</th><th>Resultado</th><th>Lidos</th><th>Criados</th><th>Revisar</th><th>Já conhecidos</th></tr></thead><tbody>
        {connection.runs.map((run) => <tr key={run.id}><td>{when(run.startedAt)}</td><td>{run.trigger === "CRON" ? "Agendada" : "Manual"}</td><td>{runStatusLabel[run.status] ?? run.status}{run.errorCode ? ` · ${run.errorCode}` : ""}</td><td>{run.transactionsFetched}</td><td>{run.autoCreated}</td><td>{run.needsReview}</td><td>{run.alreadyKnown}</td></tr>)}
      </tbody></table></div></details>}
  </article>;
}

export function OpenFinancePanel({ overview, tbbAccounts, migrationReady }: { overview: OpenFinanceOverview; tbbAccounts: TbbCashAccount[]; migrationReady: boolean }) {
  return <div className="stack of-page">
    <section className="panel stack">
      <div className="row justify-between"><div><h2>Estado da integração</h2><p className="muted text-sm">O TBB lê os dados autorizados no Meu Pluggy. Nada é gravado no banco, e nenhuma senha bancária passa por aqui.</p></div>{migrationReady && overview.configured && <AddConnection count={overview.connections.length}/>}</div>
      <ul className="of-checks">
        <li data-ok={overview.configured || undefined}><strong>Credenciais da Pluggy</strong><span>{overview.configured ? "Configuradas no servidor" : "Faltam PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env"}</span></li>
        <li data-ok={migrationReady || undefined}><strong>Tabelas da integração</strong><span>{migrationReady ? "Prontas" : "Migração pendente: rode npm run prisma:deploy"}</span></li>
      </ul>
      <details open={!overview.configured || overview.connections.length === 0}><summary>Como conectar um banco, passo a passo</summary>
        <ol className="of-steps">
          <li>Crie sua conta gratuita em <a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer">meu.pluggy.ai</a> e conecte cada banco por lá. Cada banco é autorizado separadamente.</li>
          <li>Entre no <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer">Dashboard da Pluggy</a> com a mesma conta, crie uma aplicação e copie o Client ID. O Client Secret aparece uma única vez.</li>
          <li>Em Customização → Conectores, deixe o conector <strong>MeuPluggy</strong> ativo.</li>
          <li>Em Aplicações → sua aplicação → Demo, clique em Conectar Conta e escolha <strong>MeuPluggy</strong> (não o banco). Cada banco vira um item.</li>
          <li>Copie o Item ID de cada item e coloque PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env do TBB. Depois use “Adicionar conexão” aqui.</li>
        </ol>
        <p className="muted text-xs">Gratuito para uso pessoal, até 5 conexões. Não use para fins comerciais.</p>
      </details>
    </section>
    {migrationReady && overview.configured && <InstitutionSetup connections={overview.connections}/>}
    {overview.pendingReview > 0 && <section className="panel row justify-between"><p><strong>{overview.pendingReview} movimento(s)</strong> aguardam sua revisão: possíveis duplicidades, pagamentos de fatura e transferências entre contas suas.</p><Link className="button" href="/finance/imports">Revisar em Importar → Retomar revisão</Link></section>}
    <CreditBillReviews reviews={overview.creditReviews}/>
    {overview.connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} tbb={tbbAccounts}/>)}
    {migrationReady && overview.configured && overview.connections.length === 0 && <section className="panel"><p className="muted">Nenhum banco conectado ainda. Siga os passos acima e use “Adicionar conexão”.</p></section>}
  </div>;
}
