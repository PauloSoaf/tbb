import { normalizeDate, parseMoney } from "./money";

/** Pure rules of the transactions grid: where drafts sit, how a server refresh merges with
 * unsaved work, and which rows are valid to save. No React, so every view shares them. */
export type GridSort = { id: string; desc: boolean }[];
export type GridLabels = Partial<Record<string, (value: string) => string>>;
type GridRowLike = { id: string; draft?: boolean };

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** Stable unique id for an unsaved row; never collides with a persisted id or another draft. */
export const newDraftId = () => `draft-${globalThis.crypto.randomUUID()}`;

function decimal(value: string) {
  const parsed = Number(String(value ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function sortValue(row: Record<string, unknown>, columnId: string, labels: GridLabels): string | number {
  const raw = String(row[columnId] ?? "");
  if (columnId === "amount") return decimal(raw);
  return labels[columnId]?.(raw) ?? raw;
}

/** Visual order of the grid: unsaved drafts first, newest on top and never moved by a column sort,
 * then the saved rows in the user's sort (or the server order when nothing is sorted). */
export function orderGridRows<T extends GridRowLike>(rows: T[], sorting: GridSort, labels: GridLabels = {}): T[] {
  const drafts = rows.filter((row) => row.draft);
  const saved = rows.filter((row) => !row.draft);
  if (!sorting.length) return [...drafts, ...saved];
  const sorted = [...saved].sort((a, b) => {
    for (const { id, desc } of sorting) {
      const left = sortValue(a as Record<string, unknown>, id, labels), right = sortValue(b as Record<string, unknown>, id, labels);
      const result = typeof left === "number" && typeof right === "number" ? left - right : collator.compare(String(left), String(right));
      if (result) return desc ? -result : result;
    }
    return 0;
  });
  return [...drafts, ...sorted];
}

/** Rows after the server sent fresh data: saved drafts are replaced by their persisted rows, while
 * unsaved drafts and unsaved edits survive. Also returns the dirty ids that still exist. */
export function mergeServerRows<T extends GridRowLike>(local: T[], server: T[], dirty: ReadonlySet<string>) {
  const localById = new Map(local.map((row) => [row.id, row]));
  const drafts = local.filter((row) => row.draft && dirty.has(row.id));
  const saved = server.map((row) => {
    const edited = localById.get(row.id);
    return edited && !edited.draft && dirty.has(row.id) ? edited : row;
  });
  const rows = [...drafts, ...saved];
  const present = new Set(rows.map((row) => row.id));
  return { rows, dirty: new Set([...dirty].filter((id) => present.has(id))) };
}

export type GridRowInput = { date: string; description: string; amount: string; type: string };
/** First problem that stops a row from being saved, in plain words, or null when it can be. */
export function validateGridRow(row: GridRowInput): string | null {
  if (!row.description.trim()) return "Informe a descrição.";
  try { normalizeDate(row.date); } catch (error) { return error instanceof Error ? error.message : "Data inválida."; }
  if (!row.amount.trim()) return "Informe o valor.";
  try {
    const cents = parseMoney(row.amount, row.type === "ADJUSTMENT");
    if (!cents) return "O valor deve ser diferente de zero.";
  } catch (error) { return error instanceof Error ? error.message : "Valor inválido."; }
  return null;
}
