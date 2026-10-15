/** Axis labels for bars: long names end in an ellipsis instead of overlapping their neighbours, and two bars
 * never share a label (a band scale is keyed by it, so a repeat would draw both bars on top of each other).
 * `room` is how many characters fit under one bar. */
export function fitLabels(names: string[], room: number): string[] {
  const limit = Math.max(2, Math.floor(room));
  const used = new Set<string>();
  return names.map((raw) => {
    const letters = Array.from(raw.trim() || "—");
    const base = letters.length > limit ? `${letters.slice(0, limit - 1).join("").trimEnd()}…` : letters.join("");
    let label = base;
    for (let copy = 2; used.has(label); copy++) label = `${base} ${copy}`;
    used.add(label);
    return label;
  });
}
