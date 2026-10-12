import { createHash } from "node:crypto";
import { normalizeText } from "./import-engine";
import type { ImportCandidate, ReviewAction } from "./import-candidates";

export const sourceHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export function evidenceFingerprint(workspaceId: string, accountId: string, sha256: string, row: ImportCandidate) {
  return createHash("sha256").update(JSON.stringify(row.issuerExternalId
    ? [workspaceId, accountId, "issuer-v2", row.issuerExternalId]
    : [workspaceId, accountId, "source-row-v2", sha256, row.locator])).digest("hex");
}
export const merchantKey = (value: string) => normalizeText(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]/g, "");
export const ledgerType = (row: ImportCandidate) => row.eventKind === "REFUND" ? "REFUND" as const : row.eventKind === "INCOME" ? "INCOME" as const : "EXPENSE" as const;
export type MatchTransaction = { id: string; date: string; description: string; merchant: string | null; amountCents: number; type: string; externalId: string | null; revision: number; fingerprint: string | null };

/** Probable cross-source matches require an explicit decision. Identical occurrences in
 * one file remain distinct by source locator. Equal amounts alone never establish identity. */
export function reconcileCandidate(row: ImportCandidate, existing: MatchTransaction[], fingerprint: string, linkedId: string | null = null): { action: ReviewAction; reason: string; matches: MatchTransaction[] } {
  const strong = existing.filter(t => t.id === linkedId || t.fingerprint === fingerprint || Boolean(row.issuerExternalId && t.externalId === row.issuerExternalId));
  if (row.eventKind === "METADATA_REVIEW") {
    if (strong.length !== 1 || row.confidence !== "CONFIRMED" || row.problems.length) return { action: "CONFLICT", reason: row.problems.join(" · ") || "Confirme primeiro a compra de origem e os metadados no original.", matches: strong };
    return { action: "ENRICH_METADATA", reason: "Corrigir somente os metadados de câmbio confirmados, preservando compra, valor em BRL, descrição e categoria.", matches: strong };
  }
  if (strong.length > 1) return { action: "CONFLICT", reason: "Identificador corresponde a mais de um registro.", matches: strong };
  if (strong.length) {
    const current = strong[0];
    if (row.amountCents !== current.amountCents || ledgerType(row) !== current.type) return { action: "CONFLICT", reason: "Evidência diverge do valor ou tipo existente; registro preservado.", matches: strong };
    return { action: "KEEP", reason: "Ocorrência já importada; dados manuais preservados.", matches: strong };
  }
  if (!row.effectiveDate || !row.amountCents || row.confidence !== "CONFIRMED" || row.problems.length || ["UNREAD", "CREDIT_CONVERSION", "TRANSFER"].includes(row.eventKind)) return { action: "CONFLICT", reason: row.problems.join(" · ") || "Confirme leitura, data e natureza do evento.", matches: [] };
  if (row.eventKind === "CARD_PAYMENT") return { action: "CREATE", reason: "Pagamento separado do consumo e das receitas.", matches: [] };
  const probable = existing.filter(t => {
    if (t.amountCents !== row.amountCents || t.type !== ledgerType(row)) return false;
    const days = Math.abs(Date.parse(t.date) - Date.parse(row.effectiveDate!)) / 86400000;
    const incoming = [row.merchant, row.description].filter((v): v is string => Boolean(v)).map(merchantKey);
    const saved = [t.merchant, t.description].filter((v): v is string => Boolean(v)).map(merchantKey);
    return days <= 3 && incoming.some(a => saved.some(b => a.length >= 4 && b.length >= 4 && (a === b || a.startsWith(b) || b.startsWith(a))));
  });
  return probable.length ? { action: "AMBIGUOUS", reason: "Possível ocorrência existente. Vincule a evidência ou confirme que é outra compra.", matches: probable }
    : { action: "CREATE", reason: "Nova ocorrência confirmada na fonte.", matches: [] };
}

export function classifyCardEvent(description: string, signedCents: number): ImportCandidate["eventKind"] {
  const text = merchantKey(description);
  if (/pagament|pagto|paymentreceived/.test(text)) return "CARD_PAYMENT";
  if (/limiteconvertido|conversaodelimite/.test(text)) return "CREDIT_CONVERSION";
  if (/parcautomatic|parcelamentodefatura|refinanci/.test(text)) return "FINANCING_INSTALLMENT";
  if (/iof/.test(text)) return "IOF";
  if (/juros|multa|encargos/.test(text)) return "INTEREST";
  if (/mensalidade|tarifa|anuidade/.test(text)) return signedCents < 0 ? "REFUND" : "FEE";
  if (signedCents < 0) return "REFUND";
  return /(?:\d+\s*\/\s*\d+|parcela\s+\d+)/i.test(description) ? "PURCHASE_INSTALLMENT" : "PURCHASE";
}

/** dd/MM years come from the closed statement cycle, never the wall clock. An
 * installment's original purchase can be in an earlier year; its cycle remains separate. */
export function purchaseDateFromCycle(rawDate: string, dueDate: string, closingDay: number, installment?: number | null) {
  const [d, m] = rawDate.split("/").map(Number), due = new Date(`${dueDate}T00:00:00Z`);
  const dueMonthIndex = due.getUTCFullYear() * 12 + due.getUTCMonth();
  const possible: string[] = [];
  for (let y = due.getUTCFullYear() - 5; y <= due.getUTCFullYear(); y++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > dueDate) continue;
    const firstDueMonth = y * 12 + m - 1 + (d >= closingDay ? 2 : 1);
    if (installment ? dueMonthIndex - firstDueMonth + 1 === installment : dueMonthIndex - (y * 12 + m - 1) <= 2) possible.push(date);
  }
  return possible.length === 1 ? possible[0] : null;
}
