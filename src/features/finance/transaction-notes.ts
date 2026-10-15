/** Optional free-text note of a transaction. It is separate from the description (the title) and never
 * takes part in the bank fingerprint, so editing it can neither change an amount nor duplicate a row. */
export const NOTE_MAX = 2000;

// Control characters other than tab and newline have no place in a note (and corrupt CSV/clipboard).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Canonical stored form: LF line breaks, no control characters, trimmed; empty means "no note". */
export function normalizeNote(value: string | null | undefined): string | null {
  if (value == null) return null;
  const clean = value.replace(/\r\n?/g, "\n").replace(CONTROL, "").trim();
  return clean ? clean.slice(0, NOTE_MAX) : null;
}

/** One-line preview for dense tables; the full text stays one click away. */
export function notePreview(note: string | null | undefined, max = 60) {
  const line = (note ?? "").replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Value shown in the grid for a saved note, or the draft's own text. */
export const hasNote = (note: string | null | undefined) => Boolean(note && note.trim());
