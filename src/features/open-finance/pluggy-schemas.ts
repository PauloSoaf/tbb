import { z } from "zod";

/**
 * Lenient on purpose: Pluggy documents fields that vary by connector, and a missing optional field must never fail a
 * sync. Only what the app cannot work without is required. Unknown fields pass through and are never persisted.
 */
const text = z.string().nullish();
const number = z.number().finite().nullish();
const party = z.object({ name: text, documentNumber: z.object({ type: text, value: text }).passthrough().nullish() }).passthrough().nullish();

export const pluggyTransactionSchema = z.object({
  id: z.string().min(1),
  accountId: text,
  description: text,
  descriptionRaw: text,
  currencyCode: text,
  amount: z.number().finite(),
  amountInAccountCurrency: number,
  date: z.string().min(8),
  balance: number,
  status: text,
  type: text,
  operationType: text,
  category: text,
  providerId: text,
  providerCode: text,
  paymentData: z.object({ payer: party, receiver: party, paymentMethod: text, reason: text, referenceNumber: text }).passthrough().nullish(),
  merchant: z.object({ name: text, businessName: text }).passthrough().nullish(),
  creditCardMetadata: z.object({ installmentNumber: number, totalInstallments: number, totalAmount: number, purchaseDate: text, transactionDateTime: text, billId: text, cardNumber: text }).passthrough().nullish(),
}).passthrough();
export type PluggyTransaction = z.infer<typeof pluggyTransactionSchema>;

export const pluggyAccountSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  subtype: text,
  name: text,
  marketingName: text,
  number: text,
  balance: number,
  currencyCode: text,
  itemId: text,
  taxNumber: text,
  owner: text,
  creditData: z.object({ balanceCloseDate: text, balanceDueDate: text, availableCreditLimit: number, creditLimit: number, minimumPayment: number }).passthrough().nullish(),
}).passthrough();
export type PluggyAccount = z.infer<typeof pluggyAccountSchema>;

export const pluggyItemSchema = z.object({
  id: z.string().min(1),
  status: text,
  executionStatus: text,
  lastUpdatedAt: text,
  nextAutoSyncAt: text,
  consentExpiresAt: text,
  connector: z.object({ id: z.union([z.number(), z.string()]).nullish(), name: text }).passthrough().nullish(),
  error: z.object({ code: text, message: text }).passthrough().nullish(),
}).passthrough();
export type PluggyItem = z.infer<typeof pluggyItemSchema>;

export const pluggyBillSchema = z.object({
  id: z.string().min(1),
  dueDate: text,
  billClosingDate: text,
  totalAmount: number,
  totalAmountCurrencyCode: text,
  minimumPaymentAmount: number,
  allowsInstallments: z.boolean().nullish(),
  payments: z.array(z.object({ amount: number, paymentDate: text, currencyCode: text, valueType: text }).passthrough()).nullish(),
}).passthrough();
export type PluggyBill = z.infer<typeof pluggyBillSchema>;

/** Items are validated one by one by the client, so a single malformed record is counted and skipped instead of failing the page. */
export const pagedSchema = z.object({ results: z.array(z.unknown()), next: text, total: number, totalPages: number, page: number }).passthrough();
export const authSchema = z.object({ apiKey: z.string().min(10) }).passthrough();
