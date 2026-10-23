import { merchantKey } from "./import-reconciliation";

type Occurrence = { accountId: string; type: string; amountCents: number; date: Date | string; description: string; merchant?: string | null; cardStatementId?: string | null; installmentNumber?: number | null; installmentTotal?: number | null };
/** Exact occurrence identity, never an amount-only or fuzzy-merchant deletion rule.
 * Keep different invoice cycles and installment numbers distinct, even on the same purchase date. */
export function sameFinancialOccurrence(left: Occurrence, right: Occurrence) {
  const day = (value: Date | string) => (value instanceof Date ? value.toISOString() : value).slice(0, 10);
  const key = (value: string) => merchantKey(value);
  return left.accountId === right.accountId && left.type === right.type && left.amountCents === right.amountCents
    && day(left.date) === day(right.date) && (left.cardStatementId ?? null) === (right.cardStatementId ?? null)
    && (left.installmentNumber ?? null) === (right.installmentNumber ?? null) && (left.installmentTotal ?? null) === (right.installmentTotal ?? null)
    && key(left.description).length >= 4 && key(left.description) === key(right.description)
    && (!left.merchant || !right.merchant || key(left.merchant) === key(right.merchant));
}
