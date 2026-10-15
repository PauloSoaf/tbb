import type { CardStatementKind, CardStatementStatus } from "@prisma/client";
import { isDateKey } from "@/lib/dates";
import { money } from "./money";

/** Rules for settling a card bill by hand. A payment changes the liability only: it never creates a
 * purchase, income or movement in the account ledger, and it never moves a bank balance. Pure and
 * shared by the dialog (live feedback) and the server (the same rules, enforced). */
export type PaymentLine = { amountCents: number; date: string | null };

/** What is still owed. Face value of a paid bill stays as declared; an open one drops with every payment
 * that the bank's own figure does not already reflect (those dated after the document's date). */
export function outstandingOf(input: { status: CardStatementStatus; declaredCents: number; addedCents: number; amountIsOutstanding: boolean; sourceAsOf: string | null; payments: PaymentLine[] }) {
  const sum = (lines: PaymentLine[]) => lines.reduce((total, line) => total + line.amountCents, 0);
  const paidCents = sum(input.payments);
  const deductibleCents = input.amountIsOutstanding ? sum(input.payments.filter((line) => line.date && input.sourceAsOf && line.date > input.sourceAsOf)) : paidCents;
  const faceCents = input.declaredCents + input.addedCents;
  return { paidCents, deductibleCents, faceCents, effectiveCents: input.status === "PAID" ? faceCents : Math.max(0, faceCents - deductibleCents) };
}

/** CLOSE_CARRIED: the balance was already moved into the next bill (and any payment recorded), so the old
 * bill only needs to be closed as paid. It pays nothing and moves nothing. */
export type PaymentMode = "FULL" | "PARTIAL" | "CARRY" | "CLOSE_CARRIED";
export type PayableStatement = {
  id: string; accountId: string; kind: CardStatementKind; status: CardStatementStatus; dueDate: string | null;
  outstandingCents: number; amountIsOutstanding: boolean; sourceAsOf: string | null; rolledIntoStatementId: string | null;
};
export type CarryTarget = { id: string; accountId: string; kind: CardStatementKind; status: CardStatementStatus; dueDate: string | null; rolledIntoStatementId: string | null };
export type PaymentRequest = {
  mode: PaymentMode; amountCents: number | null; paidOn: string | null; unknownDate: boolean;
  carryTarget: CarryTarget | null; carryIncluded: boolean;
};
export type PaymentPlan = {
  /** The payment to record, or null when only the carry-over closes the bill. */
  payment: { amountCents: number; date: string | null } | null;
  closes: boolean;
  carry: { nextId: string; cents: number } | null;
  paidAt: string | null;
  outstandingAfterCents: number;
};
export type PaymentResult = { ok: true; plan: PaymentPlan } | { ok: false; error: string };

const asOfText = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

export function planStatementPayment(statement: PayableStatement, request: PaymentRequest, today: string): PaymentResult {
  const fail = (error: string): PaymentResult => ({ ok: false, error });
  if (statement.kind !== "STATEMENT") return fail("Só faturas emitidas recebem pagamento; previsões não.");
  if (statement.status === "PAID") return fail("Esta fatura já está paga.");
  if (statement.status !== "OPEN") return fail("Esta fatura ainda não está aberta. Atualize-a antes de registrar um pagamento.");
  if (request.mode === "CLOSE_CARRIED") {
    if (!statement.rolledIntoStatementId) return fail("Esta fatura não tem saldo transportado. Escolha outra opção.");
    if (request.paidOn && !request.unknownDate && !isDateKey(request.paidOn)) return fail("Informe uma data válida.");
    const closedOn = !request.unknownDate && request.paidOn ? request.paidOn : null;
    if (closedOn && closedOn > today) return fail("A data do pagamento não pode estar no futuro.");
    return { ok: true, plan: { payment: null, closes: true, carry: null, paidAt: closedOn, outstandingAfterCents: 0 } };
  }
  if (statement.rolledIntoStatementId) return fail("O saldo desta fatura já foi transportado para a fatura seguinte.");
  const owed = statement.outstandingCents;
  if (owed <= 0) return fail("Esta fatura não tem saldo a pagar.");

  let date: string | null = null;
  if (!request.unknownDate && request.paidOn) {
    if (!isDateKey(request.paidOn)) return fail("Informe uma data de pagamento válida.");
    if (request.paidOn > today) return fail("A data do pagamento não pode estar no futuro.");
    date = request.paidOn;
  }
  const amount = request.amountCents;
  if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) return fail("Informe um valor de pagamento válido.");

  // A bank balance that already reflects payments up to its own date only changes with later payments.
  const dateRule = (cents: number) => {
    if (cents <= 0 || !statement.amountIsOutstanding) return null;
    if (!date) return `Informe a data: o saldo do banco já considera pagamentos até ${statement.sourceAsOf ? asOfText(statement.sourceAsOf) : "a data do documento"}, e só os posteriores o reduzem.`;
    if (statement.sourceAsOf && date <= statement.sourceAsOf) return `Este saldo já considera pagamentos até ${asOfText(statement.sourceAsOf)}. Registre só pagamentos feitos depois.`;
    return null;
  };

  if (request.mode === "FULL") {
    if (amount !== null && amount !== owed) return fail(`Para quitar, o valor é o saldo restante (${money(owed)}). Para outro valor, registre um pagamento parcial.`);
    const problem = dateRule(owed);
    if (problem) return fail(problem);
    return { ok: true, plan: { payment: { amountCents: owed, date }, closes: true, carry: null, paidAt: date, outstandingAfterCents: 0 } };
  }

  if (request.mode === "PARTIAL") {
    if (!amount) return fail("Informe o valor pago.");
    if (amount > owed) return fail(`O valor pago (${money(amount)}) é maior que o saldo restante (${money(owed)}). Se o banco cobrou encargos, corrija o valor da fatura antes.`);
    if (amount === owed) return fail("Esse valor quita a fatura: escolha “Quitar o saldo restante”.");
    const problem = dateRule(amount);
    if (problem) return fail(problem);
    return { ok: true, plan: { payment: { amountCents: amount, date }, closes: false, carry: null, paidAt: null, outstandingAfterCents: owed - amount } };
  }

  // CARRY: part (maybe nothing) was paid and what is left now lives inside the next bill.
  const paid = amount ?? 0;
  if (paid >= owed) return fail("Se o saldo foi todo pago, escolha “Quitar o saldo restante”.");
  const target = request.carryTarget;
  if (!target) return fail("Escolha a fatura que recebeu o saldo restante.");
  if (target.accountId !== statement.accountId) return fail("A fatura seguinte precisa ser do mesmo cartão.");
  if (target.kind !== "STATEMENT" || !["OPEN", "FUTURE_KNOWN"].includes(target.status)) return fail("O saldo só pode ser transportado para uma fatura aberta ou futura conhecida.");
  if (target.rolledIntoStatementId) return fail("A fatura escolhida já transportou o próprio saldo.");
  if (!target.dueDate || !statement.dueDate || target.dueDate <= statement.dueDate) return fail("A fatura que recebe o saldo precisa vencer depois desta.");
  if (!request.carryIncluded) return fail("Confirme que o saldo transportado já está incluído no total da fatura seguinte.");
  const problem = dateRule(paid);
  if (problem) return fail(problem);
  return { ok: true, plan: { payment: paid > 0 ? { amountCents: paid, date } : null, closes: true, carry: { nextId: target.id, cents: owed - paid }, paidAt: paid > 0 ? date : null, outstandingAfterCents: 0 } };
}
