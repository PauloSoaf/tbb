import { candidateSchema, type ImportCandidate } from "@/features/finance/import-candidates";
import { merchantKey } from "@/features/finance/import-reconciliation";
import type { PluggyTransaction } from "./pluggy-schemas";

export type NormalizeContext = {
  timezone: string;
  /** Tax numbers of the account holder, used in memory only to recognise transfers between the person's own accounts. */
  ownerTaxNumbers: string[];
  /** First day to import for this account. Earlier movements are left alone so existing balances stay consistent. */
  syncFrom: string | null;
};
export type SkipReason = "PENDING" | "BEFORE_WINDOW" | "INVALID";
export type Normalized = { kind: "candidate"; candidate: ImportCandidate; day: string } | { kind: "skipped"; reason: SkipReason; day: string | null };

const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
const MAX_CENTS = 2_147_483_647;

/**
 * The calendar day of a Pluggy timestamp. Bank movements arrive as midnight UTC for a plain date, which must not slip to
 * the previous day in a Brazilian timezone; a real time of day is converted to the workspace timezone.
 */
export function dayOf(raw: string, timezone: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return Number.isNaN(Date.parse(`${raw}T00:00:00Z`)) ? null : raw;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return null;
  if (/T00:00:00(\.0+)?(Z|\+00:00)$/.test(raw)) return new Date(time).toISOString().slice(0, 10);
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time)); }
  catch { return new Date(time).toISOString().slice(0, 10); }
}

const CARD_PAYMENT = /pagamentodefatura|pagamentofatura|pgtofatura|pagfatura|faturadocartao|pagamentodecartao|pagamentocartao/;
const REFUND = /estorno|devolucao|reembolso|refund/;

/** One bank-account movement as a review candidate. Movements that are not plainly income or spending are left for review. */
export function normalizeBankTransaction(transaction: PluggyTransaction, context: NormalizeContext): Normalized {
  const day = dayOf(transaction.date, context.timezone);
  if (!day) return { kind: "skipped", reason: "INVALID", day: null };
  // A pending or scheduled movement has not settled; it returns as posted and is imported then.
  if (transaction.status?.toUpperCase() === "PENDING") return { kind: "skipped", reason: "PENDING", day };
  if (context.syncFrom && day < context.syncFrom) return { kind: "skipped", reason: "BEFORE_WINDOW", day };
  if (transaction.currencyCode && transaction.currencyCode.toUpperCase() !== "BRL") return { kind: "skipped", reason: "INVALID", day };
  const amountCents = Math.round(Math.abs(transaction.amount) * 100);
  if (!amountCents || amountCents > MAX_CENTS) return { kind: "skipped", reason: "INVALID", day };

  const problems: string[] = [];
  const declared = transaction.type?.toUpperCase();
  const outflow = declared === "DEBIT" ? true : declared === "CREDIT" ? false : transaction.amount < 0;
  if (declared !== "DEBIT" && declared !== "CREDIT") problems.push("O banco não informou se foi entrada ou saída; confira o sentido.");

  const text = merchantKey(`${transaction.description ?? ""} ${transaction.descriptionRaw ?? ""} ${transaction.operationType ?? ""}`);
  const counterparties = [transaction.paymentData?.payer, transaction.paymentData?.receiver];
  const ownTransfer = counterparties.some((party) => { const value = digits(party?.documentNumber?.value); return value.length >= 11 && context.ownerTaxNumbers.some((own) => digits(own) === value); });
  let eventKind: ImportCandidate["eventKind"] = outflow ? "PURCHASE" : "INCOME";
  if (CARD_PAYMENT.test(text)) { eventKind = "TRANSFER"; problems.push("Pagamento de fatura de cartão: concilie pela fatura para não contar a compra duas vezes."); }
  else if (ownTransfer) { eventKind = "TRANSFER"; problems.push("Movimentação entre contas da mesma titularidade: registre como transferência."); }
  else if (!outflow && REFUND.test(text)) eventKind = "REFUND";
  else if (outflow && /iof/.test(text)) eventKind = "IOF";
  else if (outflow && /tarifa/.test(text)) eventKind = "FEE";
  else if (outflow && /juros|multa|encargos/.test(text)) eventKind = "INTEREST";

  const description = (transaction.description || transaction.descriptionRaw || "Movimentação bancária").trim().slice(0, 300);
  const candidate = candidateSchema.parse({
    locator: `pluggy:${transaction.id}`.slice(0, 180),
    description,
    rawDescription: (transaction.descriptionRaw ?? transaction.description ?? "").slice(0, 2000),
    rawDate: transaction.date.slice(0, 200),
    rawAmount: String(transaction.amount).slice(0, 200),
    effectiveDate: day, purchasedDate: null, postedDate: day, occurredAt: null, timezone: null, dateBasis: "POSTED_DATE",
    amountCents, eventKind,
    merchant: transaction.merchant?.name?.trim().slice(0, 200) || null,
    tags: ["open-finance"],
    // The provider's own id is the most stable identity; Pluggy's id is the fallback and is matched by content if it ever changes.
    issuerExternalId: (transaction.providerId ? `pluggy-provider:${transaction.providerId}` : `pluggy:${transaction.id}`).slice(0, 200),
    confidence: problems.length ? "PROBABLE" : "CONFIRMED", problems,
  });
  return { kind: "candidate", candidate, day };
}
