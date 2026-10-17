"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDay } from "@/lib/dates";
import { registerStatementPayment, undoManualStatementPayment } from "./statement-actions";
import { money, parseMoney } from "./money";
import { planStatementPayment, type PaymentMode } from "./statement-payment";

export type PayableView = {
  id: string; version: string; accountId: string; accountName: string; dueDate: string; declaredCents: number; addedCents: number; paidCents: number;
  outstandingCents: number; amountIsOutstanding: boolean; sourceAsOf: string | null;
  /** Set when this bill's balance was already moved into a later bill: it only needs to be closed. */
  carriedInto?: { id: string; dueDate: string; amountCents: number } | null;
};
export type CarryOption = { id: string; dueDate: string; amountCents: number; status: "OPEN" | "FUTURE_KNOWN" };
const day = (value: string) => formatDay(value, "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const newToken = () => globalThis.crypto.randomUUID();
const MODES: { value: PaymentMode; title: (owed: string) => string; hint: string }[] = [
  { value: "FULL", title: (owed) => `Quitar o saldo restante (${owed})`, hint: "Paguei tudo o que faltava." },
  { value: "PARTIAL", title: () => "Paguei só uma parte", hint: "A fatura continua aberta com o saldo menor." },
  { value: "CARRY", title: () => "Paguei uma parte (ou nada) e o resto foi para a próxima fatura", hint: "Esta fatura é encerrada; o restante já faz parte da seguinte." },
  { value: "CLOSE_CARRIED", title: () => "Encerrar como paga: o saldo restante já está na fatura seguinte", hint: "Nada é pago agora e nada é somado de novo; esta fatura só deixa de ficar em aberto." },
];

/** "Marcar como paga". Nothing is chosen by default and nothing happens on one click: the user picks what
 * happened, reviews the result, and confirms. It records the liability only; no expense is created and no
 * account balance moves. */
export function StatementPaymentDialog({ statement, carryOptions, today, compact = false, bankAccounts = [], bankTransactions = [] }: { statement: PayableView; carryOptions: CarryOption[]; today: string; compact?: boolean;
  bankAccounts?: { id: string; name: string }[]; bankTransactions?: { id: string; accountId: string; destinationAccountId: string | null; amountCents: number; date: string; description: string }[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const token = useRef(newToken());
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<PaymentMode | null>(null);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [unknownDate, setUnknownDate] = useState(false);
  const [nextId, setNextId] = useState("");
  const [carryIncluded, setCarryIncluded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bankMode, setBankMode] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankTransactionId, setBankTransactionId] = useState("");
  const [balanceConfirmed, setBalanceConfirmed] = useState(false);
  const [serverError, setServerError] = useState("");

  let amountCents: number | null = null, amountProblem = "";
  if (amount.trim()) { try { amountCents = parseMoney(amount); } catch (error) { amountProblem = error instanceof Error ? error.message : "Valor inválido."; } }
  const next = carryOptions.find((option) => option.id === nextId) ?? null;
  const planned = mode && !amountProblem ? planStatementPayment(
    { id: statement.id, accountId: statement.accountId, kind: "STATEMENT", status: "OPEN", dueDate: statement.dueDate, outstandingCents: statement.outstandingCents, amountIsOutstanding: statement.amountIsOutstanding, sourceAsOf: statement.sourceAsOf, rolledIntoStatementId: statement.carriedInto?.id ?? null },
    { mode, amountCents: mode === "FULL" ? null : amountCents, paidOn: paidOn || null, unknownDate, carryTarget: next ? { id: next.id, accountId: statement.accountId, kind: "STATEMENT", status: next.status, dueDate: next.dueDate, rolledIntoStatementId: null } : null, carryIncluded },
    today,
  ) : null;
  const owed = money(statement.outstandingCents);
  const modes = MODES.filter((item) => (item.value === "CLOSE_CARRIED") === Boolean(statement.carriedInto));

  function open() {
    token.current = newToken();
    setBankMode(""); setBankAccountId(""); setBankTransactionId(""); setBalanceConfirmed(false);
    setMode(null); setAmount(""); setPaidOn(""); setUnknownDate(false); setNextId(""); setCarryIncluded(false); setConfirmed(false); setServerError("");
    dialog.current?.showModal();
  }
  function submit() {
    if (!mode || !planned?.ok) return;
    const fd = new FormData();
    fd.set("id", statement.id); fd.set("version", statement.version); fd.set("mode", mode); fd.set("token", token.current);
    if (mode !== "FULL" && amount.trim()) fd.set("amount", amount);
    if (paidOn) fd.set("paidOn", paidOn);
    if (unknownDate) fd.set("unknownDate", "on");
    if (mode === "CARRY") { fd.set("nextStatementId", nextId); if (carryIncluded) fd.set("carryIncluded", "on"); }
    if (confirmed) fd.set("confirm", "on");
    fd.set("bankMode", bankMode || "UNRECONCILED"); fd.set("bankAccountId", bankAccountId); fd.set("bankTransactionId", bankTransactionId);
    if (balanceConfirmed) fd.set("balanceConfirmed", "on");
    startTransition(async () => {
      const result = await registerStatementPayment(fd);
      if ("error" in result && result.error) { setServerError(result.error); return; }
      toast.success("success" in result ? result.success : "Pagamento registrado.");
      dialog.current?.close();
      router.refresh();
    });
  }

  const message = amountProblem || (planned && !planned.ok ? planned.error : "");
  const dateRequired = mode === "PARTIAL" || (mode === "CARRY" && amountCents) || mode === "FULL";
  return <>
    <button type="button" className={compact ? "icon-button" : "button-secondary"} onClick={open} aria-label={`Marcar como paga a fatura de ${statement.accountName} com vencimento ${day(statement.dueDate)}`} title="Marcar como paga">
      <CheckCircle2 size={compact ? 16 : 15} aria-hidden="true"/>{!compact && "Marcar como paga"}
    </button>
    <dialog ref={dialog} className="modal statement-payment-dialog" aria-labelledby={`pay-${statement.id}`} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="modal-content" aria-busy={pending}>
        <div className="row justify-between"><h2 id={`pay-${statement.id}`}>Marcar fatura como paga</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => dialog.current?.close()}><X size={18}/></button></div>
        <dl className="payment-summary">
          <div><dt>Cartão</dt><dd>{statement.accountName}</dd></div>
          <div><dt>Vencimento</dt><dd>{day(statement.dueDate)}</dd></div>
          <div><dt>Total da fatura</dt><dd>{money(statement.declaredCents + statement.addedCents)}</dd></div>
          <div><dt>Pagamentos já registrados</dt><dd>{money(statement.paidCents)}</dd></div>
          {statement.carriedInto ? <div className="payment-owed"><dt>Saldo transportado para a fatura de {day(statement.carriedInto.dueDate)} ({money(statement.carriedInto.amountCents)})</dt><dd>{owed}</dd></div> : <div className="payment-owed"><dt>Saldo restante</dt><dd>{owed}</dd></div>}
        </dl>
        <fieldset className="payment-modes">
          <legend>O que aconteceu com esta fatura?</legend>
          {modes.map((item) => <label key={item.value} data-selected={mode === item.value || undefined}>
            <input type="radio" name={`mode-${statement.id}`} checked={mode === item.value} onChange={() => { setMode(item.value); setConfirmed(false); setServerError(""); }}/>
            <span><strong>{item.title(owed)}</strong><small>{item.hint}</small></span>
          </label>)}
        </fieldset>
        {mode && <div className="form-grid">
          {(mode === "PARTIAL" || mode === "CARRY") && <label>{mode === "CARRY" ? "Valor que paguei (opcional)" : "Valor pago"}<input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setConfirmed(false); }} placeholder="0,00"/></label>}
          {mode === "CLOSE_CARRIED" && <p className="muted payment-wide">A data de encerramento será a do último pagamento registrado nesta fatura; se não houver, fica sem data. Nada é inventado.</p>}
          {mode !== "CLOSE_CARRIED" && (mode !== "CARRY" || amountCents) && <div className="payment-date">
            <label>Data do pagamento<input type="date" value={paidOn} max={today} disabled={unknownDate} onChange={(event) => { setPaidOn(event.target.value); setConfirmed(false); }} required={Boolean(dateRequired) && !unknownDate && statement.amountIsOutstanding}/></label>
            <label className="row"><input type="checkbox" checked={unknownDate} onChange={(event) => { setUnknownDate(event.target.checked); setConfirmed(false); }}/>Não sei a data</label>
            <small className="muted">{unknownDate ? "O pagamento fica sem data; nada é inventado." : statement.amountIsOutstanding && statement.sourceAsOf ? `O saldo do banco já considera pagamentos até ${day(statement.sourceAsOf)}.` : "Não pode ser uma data futura."}</small>
          </div>}
          {mode === "CARRY" && <label className="payment-wide">Fatura que recebeu o restante
            <select value={nextId} onChange={(event) => { setNextId(event.target.value); setConfirmed(false); }}>
              <option value="">Escolha a fatura seguinte</option>
              {carryOptions.map((option) => <option key={option.id} value={option.id}>Vence {day(option.dueDate)} · {money(option.amountCents)} · {option.status === "OPEN" ? "aberta" : "futura"}</option>)}
            </select>
          </label>}
          {mode === "CARRY" && <label className="payment-wide row"><input type="checkbox" checked={carryIncluded} onChange={(event) => { setCarryIncluded(event.target.checked); setConfirmed(false); }}/>Confirmo que o saldo transportado{planned?.ok && planned.plan.carry ? ` (${money(planned.plan.carry.cents)})` : ""} já está incluído no total da fatura escolhida.</label>}
        </div>}
        {planned?.ok && planned.plan.payment && <fieldset className="stack"><legend>Conciliação com o banco</legend>
          <label>Situação do dinheiro<select value={bankMode} onChange={event => setBankMode(event.target.value)} required>
            <option value="">Escolha como tratar o saldo</option><option value="UNRECONCILED">Ainda não sei conciliar com o banco</option>
            <option value="STATUS_ONLY">Só regularizar a fatura · saldo já atualizado</option><option value="LINKED">Vincular a uma liquidação existente</option>
            <option value="CREATED">Registrar saída da conta que pagou</option>
          </select></label>
          {bankMode === "STATUS_ONLY" && <label><input type="checkbox" checked={balanceConfirmed} onChange={event => setBalanceConfirmed(event.target.checked)}/>O saldo informado já reflete esse pagamento.</label>}
          {bankMode === "CREATED" && <label>Conta de origem<select value={bankAccountId} onChange={event => setBankAccountId(event.target.value)} required><option value="">Selecione</option>{bankAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><small>Cria uma transferência de liquidação, sem nova despesa de consumo. Exige data efetiva.</small></label>}
          {bankMode === "LINKED" && <label>Movimentação já registrada<select value={bankTransactionId} onChange={event => { setBankTransactionId(event.target.value); const row = bankTransactions.find(row => row.id === event.target.value); if (row) { setPaidOn(row.date); setUnknownDate(false); } }} required><option value="">Selecione</option>{bankTransactions.filter(row => (!row.destinationAccountId || row.destinationAccountId === statement.accountId) && row.amountCents === planned.plan.payment!.amountCents).map(row => <option key={row.id} value={row.id}>{day(row.date)} · {money(row.amountCents)} · {row.description}</option>)}</select></label>}
          {bankMode === "UNRECONCILED" && <small>Não altera o saldo bancário. O valor fica como pendência de conciliação, sem aumentar o patrimônio artificialmente.</small>}
        </fieldset>}
        {mode && (planned?.ok
          ? <div className="payment-result" role="status"><strong>Resultado</strong><ul>
            {planned.plan.payment && <li>Pagamento de {money(planned.plan.payment.amountCents)} {planned.plan.payment.date ? `em ${day(planned.plan.payment.date)}` : "sem data informada"}.</li>}
            {planned.plan.carry && <li>{money(planned.plan.carry.cents)} ficam na fatura seguinte e <b>não são somados de novo</b> à dívida.</li>}
            <li>{planned.plan.closes ? "A fatura sai da dívida atual e vai para o histórico quitado." : `A fatura continua aberta com saldo de ${money(planned.plan.outstandingAfterCents)}.`}</li>
            <li>{bankMode === "CREATED" ? "A conta escolhida registra a liquidação na data efetiva, sem duplicar consumo." : "Nenhuma nova despesa ou saída bancária é criada."}</li>
          </ul></div>
          : message && <p className="payment-hint" role="status">{message}</p>)}
        {mode && planned?.ok && <label className="payment-confirm row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/>Confirmo que esta fatura foi paga como descrito acima. Fica registrado quem fez e quando; posso desfazer pelo histórico.</label>}
        {serverError && <p role="alert" className="form-error">{serverError}</p>}
        <div className="row justify-between"><button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Cancelar</button><button type="button" className="button" onClick={submit} disabled={pending || !planned?.ok || !confirmed || Boolean(planned?.ok && planned.plan.payment && (!bankMode || bankMode === "STATUS_ONLY" && !balanceConfirmed || bankMode === "CREATED" && (!bankAccountId || !paidOn) || bankMode === "LINKED" && !bankTransactionId))}>{pending ? "Registrando…" : "Confirmar pagamento"}</button></div>
      </div>
    </dialog>
  </>;
}

/** Undo for a manual payment, in two steps so one stray click can never reopen a bill. */
export function UndoPaymentButton({ statementId, version, label }: { statementId: string; version: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  function undo() {
    const fd = new FormData();
    fd.set("id", statementId); fd.set("version", version); fd.set("confirm", "on");
    startTransition(async () => {
      const result = await undoManualStatementPayment(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      toast.success("success" in result ? result.success : "Pagamento desfeito.");
      setAsking(false);
      router.refresh();
    });
  }
  if (!asking) return <button type="button" className="button-secondary" onClick={() => setAsking(true)} aria-label={`Desfazer a baixa manual: ${label}`}>Desfazer baixa</button>;
  return <span className="undo-payment" role="group" aria-label="Confirmar desfazer">
    <span>Reabrir esta fatura?</span>
    <button type="button" className="button" onClick={undo} disabled={pending}>{pending ? "Desfazendo…" : "Sim, desfazer"}</button>
    <button type="button" className="button-secondary" onClick={() => { setAsking(false); setError(""); }} disabled={pending}>Não</button>
    {error && <small role="alert" className="form-error">{error}</small>}
  </span>;
}
