import { fixedExpenseKey } from "../fixed-expenses";

export function commitmentMerchant(value: string | null | undefined) {
  const text = fixedExpenseKey(value);
  if (/\b(wellhub|gympass)\b/.test(text)) return "wellhub";
  if (/\bprudential\b|\bprudencial\b/.test(text)) return "prudential";
  if (/\b(chatgpt|openai)\b/.test(text)) return "openai";
  if (/\bspotify\b/.test(text)) return "spotify";
  if (/\b(anthropic|claude)\b/.test(text)) return "anthropic";
  return text;
}
export type MatchCommitment = { id: string; name: string; amountCents: number; cardAccountId?: string | null; paymentAccountId?: string | null; dueDay?: number | null; expectedMinCents?: number | null; expectedMaxCents?: number | null };
export type MatchPurchase = { id: string; description: string; merchant?: string | null; amountCents: number; accountId?: string | null; date?: string; purchasedDate?: string | null; type?: string; isConsumption?: boolean; fixedExpenseId?: string | null; subscriptionId?: string | null; recurring?: boolean };
/** A similarity is a suggestion, not evidence of identity. Only an explicit association confirms coverage. */
export function matchFixedCommitment(plan: MatchCommitment, purchase: MatchPurchase, toleranceCents = 100) {
  if (purchase.fixedExpenseId === plan.id) return { confidence: "CONFIRMED" as const, reasons: ["EXPLICIT_LINK"], score: 100 };
  const reasons: string[] = [];
  const account = plan.cardAccountId || plan.paymentAccountId;
  if (account && purchase.accountId && account !== purchase.accountId) return null;
  if (account && account === purchase.accountId) reasons.push("SAME_ACCOUNT");
  const merchant = commitmentMerchant(plan.name);
  if (!merchant || ![commitmentMerchant(purchase.description), commitmentMerchant(purchase.merchant)].includes(merchant)) return null;
  reasons.push("MERCHANT_ALIAS");
  const minimum = plan.expectedMinCents ?? plan.amountCents, maximum = plan.expectedMaxCents ?? plan.amountCents;
  if (purchase.amountCents >= minimum - toleranceCents && purchase.amountCents <= maximum + toleranceCents) reasons.push("AMOUNT");
  if (purchase.recurring || purchase.subscriptionId) reasons.push("RECURRENCE");
  if (purchase.date && plan.dueDay && Math.abs(Number(purchase.date.slice(8)) - plan.dueDay) <= 5) reasons.push("EXPECTED_DAY");
  const score = reasons.length * 20;
  return { confidence: reasons.includes("AMOUNT") && reasons.length >= 3 ? "PROBABLE" as const : "REVIEW" as const, reasons, score };
}
export function fixedExecution(plan: MatchCommitment & { safetyMarginCents?: number }, purchases: MatchPurchase[], month: string, today: string) {
  const posted = purchases.filter(row => row.fixedExpenseId === plan.id && row.isConsumption !== false && (!row.type || ["EXPENSE", "REFUND"].includes(row.type)) && (row.purchasedDate || row.date)?.startsWith(month) && (row.purchasedDate || row.date)! <= today);
  const actualCents = Math.max(0, posted.reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0)), plannedCents = plan.amountCents + (plan.safetyMarginCents ?? 0);
  const elapsed = today.startsWith(month) ? Number(today.slice(8)) : today > month + "-31" ? 31 : 0;
  const [year, number] = month.split("-").map(Number), days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { actualCents, plannedCents, remainingCents: Math.max(0, plannedCents - actualCents), differenceCents: plannedCents - actualCents,
    projectedCents: elapsed > 0 ? Math.round(actualCents * days / Math.min(elapsed, days)) : null };
}
