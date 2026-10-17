"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { reconcileAccountBalances } from "./actions";
import { bankKey, cashTypeLabel, planBalanceSync, sortCashAccounts, suggestTransfers, type BalanceSyncTransfer, type CashAccount } from "./balance-sync";
import { money, moneyInput, parseMoney } from "./money";

type Draft = { key: string; from: string; to: string; amount: string };
const signed = (cents: number) => `${cents > 0 ? "+" : "−"}${money(Math.abs(cents))}`;
const parse = (value: string, allowNegative = true) => { try { return value.trim() ? parseMoney(value, allowNegative) : null; } catch { return null; } };
/** Cent-sized leftovers are almost always yield or a fee the app had not seen yet; larger ones deserve a second look. */
const SMALL_DIFFERENCE_CENTS = 500;

/**
 * One screen to type what each bank shows today. Only the accounts the person edits are sent, so a stale prefilled
 * balance can never overwrite a newer one. The transfers behind the new balances are proposed from the numbers and stay
 * editable: their amounts must be the real ones, because those are what a bank statement will show later.
 */
export function BalanceSyncForm({ accounts }: { accounts: CashAccount[] }) {
  const list = useMemo(() => sortCashAccounts(accounts), [accounts]);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [manual, setManual] = useState<Draft[] | null>(null);
  const scope = useRef<HTMLDivElement>(null), counter = useRef(0);
  useEffect(() => {
    const element = scope.current;
    const clear = () => { setTyped({}); setManual(null); };
    // The native reset that follows every form action would blank the selects of a refused request.
    const keep = (event: Event) => event.preventDefault();
    element?.addEventListener("tbb:form-success", clear);
    element?.addEventListener("reset", keep);
    return () => { element?.removeEventListener("tbb:form-success", clear); element?.removeEventListener("reset", keep); };
  }, []);

  const edited = useMemo(() => list.flatMap((account) => {
    const value = typed[account.id];
    return value !== undefined && value.trim() !== moneyInput(account.balanceCents) ? [{ account, value, desiredCents: parse(value) }] : [];
  }), [list, typed]);
  const invalidBalance = edited.some((row) => row.desiredCents === null);
  const rows = useMemo(() => edited.flatMap((row) => row.desiredCents === null ? [] : [{ accountId: row.account.id, currentCents: row.account.balanceCents, desiredCents: row.desiredCents }]), [edited]);
  const suggested = useMemo<Draft[]>(() => suggestTransfers(rows.map((row) => {
    const account = list.find((item) => item.id === row.accountId)!;
    return { ...row, groupKey: bankKey(account), reserve: account.type === "SAVINGS" };
  })).map((transfer, index) => ({ key: `suggested-${index}`, from: transfer.fromAccountId, to: transfer.toAccountId, amount: moneyInput(transfer.amountCents) })), [rows, list]);
  const drafts = manual ?? suggested;
  const change = (next: Draft[]) => setManual(next);
  const update = (key: string, patch: Partial<Draft>) => change(drafts.map((draft) => draft.key === key ? { ...draft, ...patch } : draft));

  const checked = drafts.map((draft) => {
    const amountCents = parse(draft.amount, false);
    const complete = Boolean(draft.from && draft.to && draft.from !== draft.to && amountCents && amountCents > 0);
    return { draft, amountCents, complete };
  });
  const incomplete = checked.some((item) => !item.complete);
  const declared = checked.flatMap((item): BalanceSyncTransfer[] => item.complete ? [{ fromAccountId: item.draft.from, toAccountId: item.draft.to, amountCents: item.amountCents! }] : []);
  const plan = planBalanceSync(rows, declared);
  const name = (id: string) => list.find((account) => account.id === id)?.name ?? "";
  const editedIds = new Set(edited.map((row) => row.account.id));
  const largest = Math.max(0, ...plan.adjustments.map((item) => Math.abs(item.amountCents)));
  const options = list.map((account) => <option key={account.id} value={account.id}>{account.name}</option>);
  const canSubmit = (edited.length > 0 || drafts.length > 0) && !invalidBalance && !incomplete;

  return <div ref={scope} className="balance-sync">
    <ActionForm action={reconcileAccountBalances} className="balance-sync" resetOnSuccess={false}>
      <p className="muted text-sm">Digite o saldo que cada banco mostra agora. Só as contas que você alterar mudam. O TBB calcula a diferença e preserva todo o seu histórico.</p>
      <div className="balance-sync-list">{list.map((account) => {
        const row = edited.find((item) => item.account.id === account.id);
        const difference = row?.desiredCents == null ? null : row.desiredCents - account.balanceCents;
        const isEdited = editedIds.has(account.id);
        return <label className="balance-sync-row" key={account.id} data-edited={isEdited || undefined}>
          <span className="balance-sync-name"><strong>{account.name}</strong><small>{cashTypeLabel[account.type]} · no TBB: {money(account.balanceCents)}</small></span>
          {isEdited && <input type="hidden" name="accountId" value={account.id}/>}
          <input name={isEdited ? "balance" : undefined} inputMode="decimal" autoComplete="off" aria-label={`Saldo atual de ${account.name}`} aria-invalid={isEdited && row?.desiredCents === null || undefined}
            value={typed[account.id] ?? moneyInput(account.balanceCents)} onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setTyped((current) => ({ ...current, [account.id]: event.target.value }))}/>
          {isEdited && <span className="balance-sync-diff" data-sign={difference === null ? undefined : difference > 0 ? "up" : "down"}>{difference === null ? "Valor inválido. Exemplo: 123,45" : `Diferença: ${signed(difference)}`}</span>}
        </label>;
      })}</div>
      {!list.length && <p className="muted">Cadastre uma conta corrente, carteira ou cofrinho para conferir saldos.</p>}

      {(edited.length > 0 || drafts.length > 0) && <section className="balance-sync-plan" aria-live="polite" aria-label="Transferências e ajustes">
        <div className="row justify-between"><h3>Dinheiro que você moveu entre contas</h3>{manual && <button type="button" className="balance-sync-link" onClick={() => setManual(null)}>Refazer sugestão</button>}</div>
        <p className="muted text-xs">{drafts.length ? "Confirme o valor de cada PIX como aparece no extrato do banco. Eles não contam como gasto nem receita, e o TBB os reconhece se você importar o extrato depois." : "Se você mandou dinheiro de uma conta sua para outra, adicione aqui. Isso não conta como gasto nem receita."}</p>
        <ul className="balance-sync-transfers">{drafts.map((draft) => <li key={draft.key} data-incomplete={!checked.find((item) => item.draft.key === draft.key)?.complete || undefined}>
          <select aria-label="Saiu de" value={draft.from} onChange={(event) => update(draft.key, { from: event.target.value })}><option value="">Saiu de…</option>{options}</select>
          <ArrowRight size={14} aria-hidden/>
          <select aria-label="Entrou em" value={draft.to} onChange={(event) => update(draft.key, { to: event.target.value })}><option value="">Entrou em…</option>{options}</select>
          <span className="balance-sync-amount"><input inputMode="decimal" autoComplete="off" aria-label="Valor da transferência" placeholder="30,00" value={draft.amount} onFocus={(event) => event.currentTarget.select()} onChange={(event) => update(draft.key, { amount: event.target.value })}/>
            <button type="button" className="icon-button" aria-label="Remover transferência" onClick={() => change(drafts.filter((item) => item.key !== draft.key))}><X size={15}/></button></span>
          {checked.some((item) => item.complete && item.draft.key === draft.key) && <input type="hidden" name="transferFrom" value={draft.from}/>}
          {checked.some((item) => item.complete && item.draft.key === draft.key) && <input type="hidden" name="transferTo" value={draft.to}/>}
          {checked.some((item) => item.complete && item.draft.key === draft.key) && <input type="hidden" name="transferAmount" value={draft.amount}/>}
        </li>)}</ul>
        <button type="button" className="balance-sync-link" onClick={() => change([...drafts, { key: `manual-${counter.current++}`, from: "", to: "", amount: "" }])}><Plus size={13} aria-hidden/>Adicionar transferência</button>
        {incomplete && <p className="form-error text-xs">Escolha origem, destino e valor de cada transferência, ou remova a que ficou incompleta.</p>}

        {plan.adjustments.length > 0 && <>
          <h3>Ajustes de saldo</h3>
          <ul>{plan.adjustments.map((adjustment) => <li className="balance-sync-adjustment" key={adjustment.accountId}><span className="badge">Ajuste</span><span className="balance-sync-flow">{name(adjustment.accountId)}</span><strong data-sign={adjustment.amountCents > 0 ? "up" : "down"}>{signed(adjustment.amountCents)}</strong></li>)}</ul>
          <p className="muted text-xs">{largest <= SMALL_DIFFERENCE_CENTS ? "Diferença pequena: costuma ser rendimento de cofrinho ou uma tarifa que o TBB ainda não conhecia. O ajuste só corrige o saldo da conta." : "O ajuste só corrige o saldo da conta. Se for um gasto ou uma receita que você esqueceu, lance antes em Lançamentos."}</p>
        </>}
      </section>}
      <button className="button" type="submit" disabled={!canSubmit}>Atualizar saldos</button>
    </ActionForm>
  </div>;
}
