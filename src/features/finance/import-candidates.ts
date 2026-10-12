import { z } from "zod";
import { isDateKey } from "@/lib/dates";

const day = z.string().refine(isDateKey, "Data inválida").nullable();
export const candidateSchema = z.object({
  locator: z.string().min(1).max(180),
  description: z.string().min(1).max(300),
  rawDescription: z.string().max(2000),
  rawDate: z.string().max(200).nullable().default(null),
  rawAmount: z.string().max(200).nullable().default(null),
  effectiveDate: day,
  purchasedDate: day.default(null),
  postedDate: day.default(null),
  occurredAt: z.iso.datetime().nullable().default(null),
  timezone: z.string().max(80).nullable().default(null),
  dateBasis: z.enum(["PURCHASE_DATE", "POSTED_DATE", "CYCLE_CONFIRMED", "UNKNOWN"]),
  amountCents: z.number().int().positive().max(2147483647).nullable(),
  eventKind: z.enum(["PURCHASE", "PURCHASE_INSTALLMENT", "REFUND", "INCOME", "TRANSFER", "CARD_PAYMENT", "CREDIT_CONVERSION", "FINANCING_INSTALLMENT", "INTEREST", "FEE", "IOF", "METADATA_REVIEW", "UNREAD"]),
  relatedLocator: z.string().max(180).nullable().default(null),
  merchant: z.string().max(200).nullable().default(null),
  tags: z.array(z.string().max(50)).max(30).default([]),
  issuerExternalId: z.string().max(200).nullable().default(null),
  installmentNumber: z.number().int().min(1).max(1200).nullable().default(null),
  installmentTotal: z.number().int().min(1).max(1200).nullable().default(null),
  originalCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().default(null),
  originalAmountCents: z.number().int().positive().nullable().default(null),
  exchangeRate: z.string().max(50).nullable().default(null),
  confidence: z.enum(["CONFIRMED", "PROBABLE", "LOW"]),
  problems: z.array(z.string().max(500)).max(30).default([]),
  statementId: z.string().max(100).nullable().default(null),
  categoryId: z.string().max(100).nullable().default(null),
  subscriptionId: z.string().max(100).nullable().default(null),
}).superRefine((row, ctx) => {
  if (row.installmentNumber && (!row.installmentTotal || row.installmentNumber > row.installmentTotal)) ctx.addIssue({ code: "custom", message: "Parcela inválida" });
  if (row.occurredAt && (!row.timezone || !row.purchasedDate)) ctx.addIssue({ code: "custom", message: "Hora exige data da compra e timezone" });
  if (row.timezone) {
    try { new Intl.DateTimeFormat("en", { timeZone: row.timezone }).format(new Date(0)); }
    catch { ctx.addIssue({ code: "custom", message: "Timezone inválido; use um identificador como America/Manaus" }); }
  }
  if (row.dateBasis === "PURCHASE_DATE" && row.effectiveDate !== row.purchasedDate) ctx.addIssue({ code: "custom", message: "Data efetiva deve ser a data confirmada da compra" });
});

export type ImportCandidate = z.infer<typeof candidateSchema>;
export type ReviewAction = "CREATE" | "KEEP" | "LINK_EVIDENCE" | "ENRICH_METADATA" | "AMBIGUOUS" | "CONFLICT" | "IGNORE";
export type EvidencePreview = { id: string; version: number; sourceId: string; fileName: string; candidate: ImportCandidate; action: ReviewAction; reason: string; matches: { id: string; description: string; date: string; revision: number }[] };
export const eventLabels: Record<ImportCandidate["eventKind"], string> = {
  PURCHASE: "Compra", PURCHASE_INSTALLMENT: "Parcela de compra", REFUND: "Estorno", INCOME: "Receita", TRANSFER: "Transferência",
  CARD_PAYMENT: "Pagamento da fatura", CREDIT_CONVERSION: "Conversão de limite", FINANCING_INSTALLMENT: "Parcela de financiamento",
  INTEREST: "Juros", FEE: "Tarifa", IOF: "IOF", METADATA_REVIEW: "Revisão de metadados", UNREAD: "Leitura pendente",
};
