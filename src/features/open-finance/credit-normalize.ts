import { isDateKey } from "@/lib/dates";
import { candidateSchema, type ImportCandidate } from "@/features/finance/import-candidates";
import { classifyCardEvent } from "@/features/finance/import-reconciliation";
import type { PluggyBill, PluggyTransaction } from "./pluggy-schemas";
import { dayOf } from "./normalize";

export type CreditBill = { externalId: string; dueDate: string; closingDate: string | null; totalCents: number; status: "OPEN" | "FUTURE_KNOWN" | "PAID" | null; paidOn: string | null; basis?: "ACCOUNT_BALANCE"; balanceCents?: number; paymentDigest?: string; unknownPayments?: boolean };
export const billingDay = (raw: string | null | undefined) => raw && isDateKey(raw.slice(0, 10)) ? raw.slice(0, 10) : null;
const moneyCents = (amount: number | null | undefined) => typeof amount === "number" && Number.isSafeInteger(Math.round(amount * 100)) && Math.abs(Math.round(amount * 100)) <= 2147483647 ? Math.round(amount * 100) : null;

export function normalizeCreditBill(bill: PluggyBill, currentDue: string | null): CreditBill | null {
  const dueDate = billingDay(bill.dueDate), closingDate = billingDay(bill.billClosingDate), totalCents = moneyCents(bill.totalAmount);
  if (!dueDate || totalCents === null || totalCents < 0 || bill.totalAmountCurrencyCode !== "BRL" || closingDate && closingDate > dueDate) return null;
  const payments = (bill.payments ?? []).filter(payment => payment.currencyCode === "BRL" && billingDay(payment.paymentDate) && (moneyCents(payment.amount) ?? 0) > 0);
  const fullyPaid = totalCents > 0 && payments.reduce((sum, payment) => sum + moneyCents(payment.amount)!, 0) >= totalCents;
  return { externalId: bill.id, dueDate, closingDate, totalCents, status: fullyPaid ? "PAID" : dueDate === currentDue ? "OPEN" : currentDue && dueDate > currentDue ? "FUTURE_KNOWN" : null, paidOn: fullyPaid ? payments.map(payment => billingDay(payment.paymentDate)!).sort().at(-1)! : null };
}

export function normalizeCreditTransaction(transaction: PluggyTransaction, input: { timezone: string; syncFrom: string | null; bills: CreditBill[]; statementIds: Map<string, string>; currentDue: string | null }): { candidate: ImportCandidate; day: string } | null {
  const posted = dayOf(transaction.date, input.timezone);
  if (!posted || input.syncFrom && posted < input.syncFrom) return null;
  const rawCents = moneyCents(transaction.currencyCode && transaction.currencyCode !== "BRL" ? transaction.amountInAccountCurrency : transaction.amount);
  if (!rawCents) return null;
  const problems: string[] = [];
  const direction = transaction.type?.toUpperCase();
  if (direction !== "DEBIT" && direction !== "CREDIT") problems.push("Confirme se o lançamento do cartão é cobrança ou estorno.");
  const signed = (direction === "CREDIT" ? -1 : 1) * Math.abs(rawCents);
  const description = (transaction.description || transaction.descriptionRaw || "Lançamento do cartão").trim().slice(0, 300);
  let eventKind = classifyCardEvent(description, signed);
  if (/^(PAGAMENTO|PAGAMENTO_FATURA)$/.test(transaction.operationType ?? "")) eventKind = "CARD_PAYMENT";
  if (transaction.operationType === "ESTORNO") eventKind = "REFUND";
  const metadata = transaction.creditCardMetadata;
  const number = metadata?.installmentNumber, total = metadata?.totalInstallments;
  const validInstallment = Number.isInteger(number) && Number.isInteger(total) && number! >= 1 && total! >= number! && total! <= 1200;
  if ((number || total) && !validInstallment) problems.push("Metadados de parcela incompletos; confirme a parcela na revisão.");
  if (validInstallment && total! > 1 && eventKind === "PURCHASE") eventKind = "PURCHASE_INSTALLMENT";
  if (eventKind === "PURCHASE_INSTALLMENT" && !validInstallment) problems.push("Confirme o número e o total de parcelas antes de importar.");
  let bill = metadata?.billId ? input.bills.find(value => value.externalId === metadata.billId) : undefined;
  // Pending purchases can lack billId. Require two known closing dates and an approved current invoice;
  // an ACCOUNT_BALANCE proposal uses the local closing date explicitly confirmed by the owner. Never invent future cycles.
  if (!metadata?.billId && transaction.status === "PENDING") {
    const current = input.bills.find(value => value.dueDate === input.currentDue);
    const previousClose = current?.closingDate ? input.bills.flatMap(value => value.closingDate && value.closingDate < current.closingDate! ? [value.closingDate] : []).sort().at(-1) : null;
    if (current?.closingDate && previousClose && posted > previousClose && posted < current.closingDate) bill = current;
  }
  const statementId = bill ? input.statementIds.get(bill.externalId) ?? null : null;
  if (!statementId) problems.push("Fatura ainda não conciliada ou sem vínculo confirmado no banco; escolha a fatura na revisão.");
  if (eventKind === "CARD_PAYMENT") problems.push("Pagamento de fatura: concilie com os pagamentos existentes; não é gasto nem receita.");
  if (!["POSTED", "PENDING"].includes(transaction.status ?? "")) problems.push("Situação do lançamento não confirmada pelo banco.");
  const purchase = metadata?.purchaseDate ? billingDay(metadata.purchaseDate) : null;
  return { day: posted, candidate: candidateSchema.parse({
    locator: `pluggy:${transaction.id}`.slice(0, 180), description, rawDescription: (transaction.descriptionRaw || transaction.description || "").slice(0, 2000), rawDate: transaction.date.slice(0, 200), rawAmount: String(transaction.amount),
    effectiveDate: posted, postedDate: posted, purchasedDate: purchase, dateBasis: bill && !metadata?.billId ? "CYCLE_CONFIRMED" : "POSTED_DATE", amountCents: Math.abs(rawCents), eventKind,
    installmentNumber: validInstallment ? number : null, installmentTotal: validInstallment ? total : null, statementId,
    issuerExternalId: (transaction.providerId ? `pluggy-provider:${transaction.providerId}` : `pluggy:${transaction.id}`).slice(0, 200), merchant: transaction.merchant?.name?.trim().slice(0, 200) || null,
    originalCurrency: transaction.currencyCode && transaction.currencyCode !== "BRL" && /^[A-Z]{3}$/.test(transaction.currencyCode) ? transaction.currencyCode : null,
    originalAmountCents: transaction.currencyCode && transaction.currencyCode !== "BRL" ? Math.abs(moneyCents(transaction.amount) ?? 0) || null : null,
    tags: ["open-finance", "credit-card"], confidence: problems.length ? "PROBABLE" : "CONFIRMED", problems,
  }) };
}
