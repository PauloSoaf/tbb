"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleHelp, X } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { money } from "./money";
import type { InvoiceFunding } from "./bank-accounts";

export function InvoiceFundingPanel({ funding, compact = false, onDismiss }: { funding: InvoiceFunding; compact?: boolean; onDismiss?: () => void }) {
  const missing = !funding.hasCash;
  const title = missing ? "Informe o saldo das contas" : funding.shortfallCents ? "Possível dívida: falta dinheiro para as faturas" : funding.missingStatementCount ? "Cobertura das faturas: dados incompletos" : "As faturas abertas cabem no saldo registrado";
  const max = Math.max(funding.openCents, funding.availableCents, 1);
  if (compact) {
    const risk = missing || funding.missingStatementCount && !funding.shortfallCents ? "unknown" : funding.shortfallCents ? "danger" : "safe";
    const Icon = risk === "safe" ? CheckCircle2 : AlertTriangle;
    const heading = missing ? "Cobertura desconhecida" : funding.shortfallCents ? "Possível dívida nas faturas" : funding.missingStatementCount ? "Cobertura incompleta" : "Faturas cobertas pelo saldo";
    const value = missing ? "Informe o saldo das contas" : funding.shortfallCents ? `${money(funding.shortfallCents)} a cobrir` : `${money(funding.afterInvoicesCents)} após as faturas`;
    const explanation = `${title}. Compara o dinheiro de hoje com as faturas abertas. Cofrinhos, renda prevista e limite de crédito ficam fora. Faturas futuras aparecem na projeção detalhada.${funding.missingStatementCount ? ` ${funding.missingStatementCount} cartão(ões) ainda sem faturas registradas; os compromissos desses cartões não estão incluídos.` : ""}${funding.overdueCount ? ` ${funding.overdueCount} fatura(s) vencida(s).` : ""}`;
    return <section className="invoice-funding is-compact" data-risk={risk} aria-label="Cobertura das faturas">
      <span className="funding-compact-icon"><Icon size={18}/></span>
      <div className="funding-compact-content">
        <div className="funding-compact-heading"><h2>{heading}</h2><AppTooltip content={explanation}><button className="funding-compact-help" type="button" aria-label="Como a cobertura das faturas é calculada"><CircleHelp size={13}/></button></AppTooltip></div>
        <strong>{value}</strong>
        <span className="funding-compact-values">Saldo {missing ? "não informado" : money(funding.cashCents)} <span aria-hidden="true">·</span> Faturas {money(funding.openCents)}</span>
      </div>
      <div className="funding-compact-actions">
        <AppTooltip content={missing ? "Informar saldo das contas" : "Ver previsão de dívidas"}><Link href={missing ? "/finance/accounts" : "/finance/debts"} className="funding-compact-details" aria-label={missing ? "Informar saldo das contas" : "Ver previsão de dívidas"}><ArrowUpRight size={17}/></Link></AppTooltip>
        {onDismiss && <button className="funding-compact-dismiss" type="button" onClick={onDismiss} aria-label="Fechar alerta de faturas"><X size={17}/></button>}
      </div>
    </section>;
  }
  return <section className="panel stack invoice-funding" data-risk={missing ? "unknown" : funding.shortfallCents ? "danger" : funding.missingStatementCount ? "unknown" : "safe"} aria-label="Cobertura das faturas">
    <div className="row justify-between"><h2>{title}</h2><Link href={compact ? "/finance/debts" : "/finance/accounts"}>{compact ? "Ver previsão de dívidas →" : "Atualizar saldos →"}</Link></div>
    <p className="muted">{missing ? "Você tem cartões cadastrados, mas ainda precisa adicionar o saldo da conta corrente no card do banco. Sem esse saldo, a cobertura é desconhecida." : funding.shortfallCents ? `${money(funding.shortfallCents)} ainda precisam ser cobertos antes de quitar todas as faturas abertas.` : `${money(funding.afterInvoicesCents)} sobram depois das faturas abertas, antes das outras despesas.`}</p>
    <div className="account-card-invoice"><div><small>Saldo para pagar</small><strong>{missing ? "Não informado" : money(funding.cashCents)}</strong></div><div><small>Faturas abertas</small><strong>{money(funding.openCents)}</strong></div><div><small>Falta para quitar</small><strong>{missing ? "A calcular" : money(funding.shortfallCents)}</strong></div></div>
    {funding.missingStatementCount > 0 && <p className="muted text-xs">{funding.missingStatementCount} cartão(ões) sem faturas registradas. A comparação está incompleta; <Link href="/finance/statements">registre as faturas</Link> para incluir esses compromissos.</p>}
    {!missing && <div className="funding-chart" aria-label={`Saldo ${money(funding.cashCents)}; faturas ${money(funding.openCents)}`}><div><span>Dinheiro disponível</span><i style={{ width: `${funding.availableCents / max * 100}%` }}/></div><div><span>Faturas abertas</span><i data-invoices style={{ width: `${funding.openCents / max * 100}%` }}/></div></div>}
    {!compact && <><p className="muted text-xs">Cofrinhos e poupança: {money(funding.reserveCents)}, fora do saldo para pagar. A comparação usa o dinheiro de hoje, sem antecipar salário, resgates, limite de crédito ou metas de poupança. Outras despesas ainda precisam ser consideradas.</p>
      {!!funding.overdueCount && <p role="status">{funding.overdueCount} fatura(s) vencida(s). Confira o pagamento e atualize o status em <Link href="/finance/statements">Faturas</Link>.</p>}
      {!!funding.timeline.length && <div className="stack"><h3>Compromissos por mês de vencimento</h3><p className="muted text-xs">Faturas abertas e futuras conhecidas. Vencidas entram no mês atual. O saldo disponível é consumido uma única vez; esta projeção não inclui entradas futuras.</p><div className="funding-timeline">{funding.timeline.map((point) => <div key={point.month}><strong>{point.month.split("-").reverse().join("/")}</strong><span>Faturas: {money(point.amountCents)}</span><progress aria-label={`Compromissos acumulados ${point.month}`} max={Math.max(...funding.timeline.map((p) => p.cumulativeCents), 1)} value={point.cumulativeCents}/><small>{missing ? "Informe o saldo para calcular a falta" : `Falta acumulada: ${money(point.shortfallCents)}`}</small></div>)}</div></div>}
      <small className="muted">Esta possível dívida é calculada automaticamente e se atualiza com seus saldos e faturas. Registre uma dívida efetiva quando souber o valor financiado e os juros, para acompanhar a quitação.</small></>}
  </section>;
}
