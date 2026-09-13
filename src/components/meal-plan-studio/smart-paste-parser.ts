export interface ParsedMeal {
  name: string;
  time: string;
  items: { foodName: string; quantity: number; unit: string }[];
  notes: string;
}

/**
 * MVP Smart Paste parser:
 * - Lines ending with ":" or containing a time like "08:00" → new meal
 * - Lines starting with "- " or "* " or "•" → food items
 * - Other lines → meal notes or ignored
 */
export function parseSmartPasteText(text: string): ParsedMeal[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const meals: ParsedMeal[] = [];
  let current: ParsedMeal | null = null;

  const timeRegex = /\b\d{1,2}:\d{2}\b/;
  const itemRegex = /^[-*•]\s+(.+)/;
  const quantityRegex = /^(\d+[\d.,]*)\s*(g|ml|kg|l|unid|colher|xíc|fatia|copo|porção|und|un|tbsp|tsp)?\s+/i;

  for (const line of lines) {
    const isHeader = line.endsWith(":") || (timeRegex.test(line) && !line.startsWith("-") && !line.startsWith("*"));
    const itemMatch = itemRegex.exec(line);

    if (isHeader) {
      const timeMatch = timeRegex.exec(line);
      const name = line.replace(timeRegex, "").replace(/:$/, "").trim() || "Refeição";
      current = { name, time: timeMatch?.[0] ?? "", items: [], notes: "" };
      meals.push(current);
    } else if (itemMatch && current) {
      const rawItem = itemMatch[1].trim();
      const qtyMatch = quantityRegex.exec(rawItem);
      if (qtyMatch) {
        const quantity = parseFloat(qtyMatch[1].replace(",", "."));
        const unit = qtyMatch[2] ?? "unid";
        const foodName = rawItem.slice(qtyMatch[0].length).trim() || rawItem;
        current.items.push({ foodName, quantity, unit });
      } else {
        current.items.push({ foodName: rawItem, quantity: 1, unit: "unid" });
      }
    } else if (current && !isHeader) {
      current.notes = (current.notes ? current.notes + " " : "") + line;
    }
  }

  return meals.filter(m => m.items.length > 0 || m.name);
}
