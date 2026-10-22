import { describe, expect, it } from "vitest";
import { normalizeCreditBill, normalizeCreditTransaction, type CreditBill } from "../credit-normalize";
import type { PluggyTransaction } from "../pluggy-schemas";

const current: CreditBill = { externalId: "current", dueDate: "2032-11-03", closingDate: "2032-10-26", totalCents: 10000, status: "OPEN", paidOn: null };
const previous: CreditBill = { ...current, externalId: "previous", dueDate: "2032-10-03", closingDate: "2032-09-26", status: "PAID" };
const context = { timezone: "America/Manaus", syncFrom: "2032-10-01", bills: [previous, current], statementIds: new Map([["current", "local-statement"]]), currentDue: current.dueDate };
const transaction = (extra: Partial<PluggyTransaction> = {}): PluggyTransaction => ({ id: "synthetic-tx", date: "2032-10-20T00:00:00Z", amount: 12.34, currencyCode: "BRL", description: "Mercado", type: "DEBIT", status: "PENDING", creditCardMetadata: { billId: "current" }, ...extra });
const normalize = (extra: Partial<PluggyTransaction> = {}) => normalizeCreditTransaction(transaction(extra), context)!.candidate;

describe("credit normalization", () => {
  it("uses bank billing dates without changing the day for offset-free timestamps", () => {
    const bill = normalizeCreditBill({ id: "current", dueDate: "2032-11-03T00:00:00", billClosingDate: "2032-10-26T00:00:00", totalAmount: 100, totalAmountCurrencyCode: "BRL" }, "2032-11-03");
    expect(bill).toEqual(current);
  });
  it("never infers that an old bill is paid just because it is overdue", () => {
    expect(normalizeCreditBill({ id: "old", dueDate: "2032-09-03", totalAmount: 20, totalAmountCurrencyCode: "BRL" }, current.dueDate)?.status).toBeNull();
  });
  it("recognizes full payment only from dated BRL payment evidence", () => {
    const bill = { id: "old", dueDate: "2032-09-03", totalAmount: 20, totalAmountCurrencyCode: "BRL" };
    expect(normalizeCreditBill({ ...bill, payments: [{ amount: 20, paymentDate: "2032-09-02", currencyCode: "BRL" }] }, current.dueDate)).toMatchObject({ status: "PAID", paidOn: "2032-09-02" });
    expect(normalizeCreditBill({ ...bill, payments: [{ amount: 20, paymentDate: null, currencyCode: "BRL" }] }, current.dueDate)?.status).toBeNull();
    expect(normalizeCreditBill({ ...bill, payments: [{ amount: 20, paymentDate: "2032-09-02", currencyCode: "USD" }] }, current.dueDate)?.status).toBeNull();
  });
  it("rejects invalid bill dates, negative amounts and non-BRL bills", () => {
    for (const extra of [{ dueDate: "2032-02-31" }, { totalAmount: -1 }, { totalAmountCurrencyCode: "USD" }, { billClosingDate: "2032-12-01" }]) expect(normalizeCreditBill({ id: "x", dueDate: current.dueDate, totalAmount: 100, totalAmountCurrencyCode: "BRL", ...extra }, current.dueDate)).toBeNull();
  });
  it("accepts a pending purchase on a confirmed bill", () => {
    expect(normalize()).toMatchObject({ eventKind: "PURCHASE", confidence: "CONFIRMED", statementId: "local-statement", amountCents: 1234 });
  });
  it("does not multiply installments or invent the remaining installments", () => {
    expect(normalize({ creditCardMetadata: { billId: "current", installmentNumber: 2, totalInstallments: 8, totalAmount: 800 } })).toMatchObject({ amountCents: 1234, installmentNumber: 2, installmentTotal: 8, eventKind: "PURCHASE_INSTALLMENT" });
    expect(normalize({ creditCardMetadata: { billId: "current", installmentNumber: 2 } }).confidence).toBe("PROBABLE");
  });
  it("uses the declared credit direction for refunds and sends card payments to review", () => {
    expect(normalize({ type: "CREDIT", amount: 12.34, description: "Estorno" })).toMatchObject({ eventKind: "REFUND", amountCents: 1234 });
    expect(normalize({ type: "CREDIT", amount: -100, operationType: "PAGAMENTO_FATURA", description: "Pagamento recebido" })).toMatchObject({ eventKind: "CARD_PAYMENT", confidence: "PROBABLE" });
  });
  it("keeps unknown bills and future cycles for review", () => {
    expect(normalize({ creditCardMetadata: { billId: "unknown" } })).toMatchObject({ statementId: null, confidence: "PROBABLE" });
    expect(normalize({ date: "2032-12-20", creditCardMetadata: null })).toMatchObject({ statementId: null, confidence: "PROBABLE" });
  });
  it("can prove a pending cycle only with bank-provided previous and current closing dates", () => {
    expect(normalize({ creditCardMetadata: null })).toMatchObject({ statementId: "local-statement", dateBasis: "CYCLE_CONFIRMED", confidence: "CONFIRMED" });
    const result = normalizeCreditTransaction(transaction({ creditCardMetadata: null }), { ...context, bills: [current] });
    expect(result?.candidate.confidence).toBe("PROBABLE");
    expect(normalize({ date: "2032-10-26", creditCardMetadata: null }).confidence).toBe("PROBABLE");
    expect(normalizeCreditTransaction(transaction({ date: "2032-09-26", creditCardMetadata: null }), { ...context, syncFrom: null })?.candidate.confidence).toBe("PROBABLE");
  });
  it("preserves purchase metadata without pulling a future installment into the original purchase day", () => {
    expect(normalize({ creditCardMetadata: { billId: "current", installmentNumber: 3, totalInstallments: 4, purchaseDate: "2032-08-01" } })).toMatchObject({ effectiveDate: "2032-10-20", purchasedDate: "2032-08-01", postedDate: "2032-10-20" });
  });
  it("uses confirmed BRL conversion while preserving foreign currency metadata", () => {
    expect(normalize({ currencyCode: "USD", amount: 10, amountInAccountCurrency: 50 })).toMatchObject({ amountCents: 5000, originalCurrency: "USD", originalAmountCents: 1000 });
    expect(normalizeCreditTransaction(transaction({ currencyCode: "USD", amountInAccountCurrency: undefined }), context)).toBeNull();
  });
  it("does not import purchases before the configured start date", () => {
    expect(normalizeCreditTransaction(transaction({ date: "2032-09-30" }), context)).toBeNull();
  });
});
