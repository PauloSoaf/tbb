export type EditorImageAlignment = "LEFT" | "CENTER" | "RIGHT";
export type EditorImageLayer = "INLINE" | "BEHIND" | "FRONT";

export function normalizeEditorImageAlignment(value: unknown): EditorImageAlignment {
  return value === "LEFT" || value === "RIGHT" || value === "CENTER" ? value : "CENTER";
}

export function normalizeEditorImageLayer(value: unknown): EditorImageLayer {
  return value === "BEHIND" || value === "FRONT" ? value : "INLINE";
}

export function clampEditorImageDimension(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}
