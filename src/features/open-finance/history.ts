import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { isDateKey } from "@/lib/dates";

type DB = Prisma.TransactionClient;
const nextDay = (value: Date) => new Date(value.getTime() + 86400000).toISOString().slice(0, 10);
export async function rememberHistoryAnchor(db: DB, workspaceId: string, accountId: string, linkId: string, cutoff: string) {
  if (!isDateKey(cutoff)) throw new Error("Data de referência do histórico inválida.");
  const payload = { origin: "OPEN_FINANCE", linkId, cutoff };
  const bytes = Buffer.from(JSON.stringify(payload));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const source = await db.financialSource.upsert({ where: { workspaceId_accountId_sha256: { workspaceId, accountId, sha256 } }, update: {}, create: { workspaceId, accountId, sha256, fileName: "Open Finance · Referência de saldo para histórico", mediaType: "application/json", content: bytes, byteLength: bytes.length } });
  await db.financialSnapshot.upsert({ where: { sourceId_locator: { sourceId: source.id, locator: "history-anchor" } }, update: {}, create: { workspaceId, accountId, sourceId: source.id, locator: "history-anchor", kind: "OPEN_FINANCE_HISTORY_ANCHOR", asOfDate: new Date(cutoff), payload } });
}

/** Backfilling transactions before an existing balance checkpoint must not change that confirmed balance. */
export async function historyCutoff(db: DB, workspaceId: string, accountId: string, linkId: string) {
  const [anchor, checkpoint] = await Promise.all([
    db.financialSnapshot.findFirst({ where: { workspaceId, accountId, kind: "OPEN_FINANCE_HISTORY_ANCHOR", payload: { path: ["linkId"], equals: linkId } }, orderBy: { asOfDate: "desc" } }),
    db.financeTransaction.findFirst({ where: { workspaceId, accountId, type: "ADJUSTMENT", source: "BALANCE_RECONCILIATION" }, orderBy: { date: "desc" }, select: { date: true } }),
  ]);
  // An explicit balance reconciliation is authoritative; an automatically suggested import date is not.
  if (checkpoint) return nextDay(checkpoint.date);
  const cutoff = (anchor?.payload as { cutoff?: string } | null)?.cutoff;
  return cutoff && isDateKey(cutoff) ? cutoff : null;
}

/** Runs in the same import transaction, including later manual confirmations of historical evidence. */
export async function preserveHistoricalBalances(db: DB, workspaceId: string, createdIds: string[]) {
  if (!createdIds.length) return;
  const rows = await db.financeTransaction.findMany({ where: { workspaceId, id: { in: createdIds }, source: "DOCUMENT_V2", account: { type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } } }, include: { importBatch: { select: { id: true, preview: true } } } });
  const checkpoints = await db.financeTransaction.findMany({ where: { workspaceId, accountId: { in: [...new Set(rows.map(row => row.accountId))] }, type: "ADJUSTMENT", source: "BALANCE_RECONCILIATION" }, select: { accountId: true, date: true }, orderBy: { date: "desc" } });
  const groups = new Map<string, { accountId: string; batchId: string; cutoff: string; net: number; ids: string[] }>();
  for (const row of rows) {
    const metadata = (row.importBatch?.preview as { metadata?: { origin?: string; preserveBalanceBefore?: string } } | null)?.metadata;
    const checkpoint = checkpoints.find(value => value.accountId === row.accountId);
    const cutoff = checkpoint ? nextDay(checkpoint.date) : metadata?.preserveBalanceBefore;
    if (metadata?.origin !== "OPEN_FINANCE" || !metadata.preserveBalanceBefore || !row.importBatch || !cutoff || !isDateKey(cutoff) || row.date.toISOString().slice(0, 10) >= cutoff || !["INCOME", "REFUND", "EXPENSE"].includes(row.type)) continue;
    const key = `${row.accountId}:${row.importBatch.id}:${cutoff}`;
    const group = groups.get(key) ?? { accountId: row.accountId, batchId: row.importBatch.id, cutoff, net: 0, ids: [] };
    group.net += (row.type === "EXPENSE" ? -1 : 1) * row.amountCents; group.ids.push(row.id); groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (!group.net) continue;
    if (!Number.isSafeInteger(group.net) || Math.abs(group.net) > 2147483647) throw new Error("Histórico excede o intervalo de saldo suportado.");
    const fingerprint = createHash("sha256").update(JSON.stringify([workspaceId, group.accountId, group.ids.sort(), group.cutoff])).digest("hex");
    await db.financeTransaction.create({ data: { workspaceId, accountId: group.accountId, importBatchId: group.batchId, type: "ADJUSTMENT", amountCents: -group.net, date: new Date(Date.parse(`${group.cutoff}T00:00:00Z`) - 86400000), source: "OPEN_FINANCE_HISTORY", isConsumption: false, description: "Referência de saldo preservada na importação do histórico", fingerprint: `open-finance-history:${fingerprint}`, tags: ["open-finance", "historical-balance"], notes: "Compensa apenas movimentos anteriores ao saldo já conferido. Não é receita nem despesa." } });
  }
}
