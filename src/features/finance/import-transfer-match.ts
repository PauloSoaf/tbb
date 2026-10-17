export type OwnTransfer = { id: string; date: string; amountCents: number; fromAccountId: string; toAccountId: string; fromName: string; toName: string };
export type ImportRowRef = { index: number; date: string; amountCents: number; type: string };
export type TransferMatch = { transactionId: string; label: string; direction: "IN" | "OUT" };

/** A transfer is registered on the day the person noticed it, so the bank's own date is usually that day or earlier. */
export const MATCH_DAYS_BEFORE = 10;
export const MATCH_DAYS_AFTER = 3;
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86400000);

/**
 * A bank statement shows a PIX between the person's own accounts as income at the destination and as an expense at the
 * origin, but the app already holds it as one transfer. Matching those rows to the registered transfers keeps the money
 * from being counted twice. A row matches only on the same account, the same direction, the exact amount and a close date;
 * each transfer side is used once, nearest date first, so two identical PIX stay two movements.
 */
export function matchRowsToOwnTransfers(rows: ImportRowRef[], accountId: string, transfers: OwnTransfer[]): Map<number, TransferMatch> {
  const pairs: { row: ImportRowRef; transfer: OwnTransfer; direction: "IN" | "OUT"; distance: number }[] = [];
  for (const row of rows) {
    const direction = row.type === "EXPENSE" ? "OUT" : "IN";
    for (const transfer of transfers) {
      if (transfer.amountCents !== row.amountCents || (direction === "IN" ? transfer.toAccountId : transfer.fromAccountId) !== accountId) continue;
      const offset = dayNumber(row.date) - dayNumber(transfer.date);
      if (!Number.isFinite(offset) || offset < -MATCH_DAYS_BEFORE || offset > MATCH_DAYS_AFTER) continue;
      pairs.push({ row, transfer, direction, distance: Math.abs(offset) });
    }
  }
  pairs.sort((left, right) => left.distance - right.distance || left.transfer.id.localeCompare(right.transfer.id) || left.row.index - right.row.index);
  const matches = new Map<number, TransferMatch>(), usedTransfers = new Set<string>();
  for (const { row, transfer, direction } of pairs) {
    if (matches.has(row.index) || usedTransfers.has(transfer.id)) continue;
    usedTransfers.add(transfer.id);
    matches.set(row.index, { transactionId: transfer.id, label: `${transfer.fromName} → ${transfer.toName}`, direction });
  }
  return matches;
}
