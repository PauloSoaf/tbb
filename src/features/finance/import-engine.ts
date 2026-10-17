import { createHash } from "node:crypto";
import { matchRowsToOwnTransfers, type OwnTransfer, type TransferMatch } from "./import-transfer-match";
import { normalizeDate, parseMoney } from "./money";

export type ColumnMapping = { date: string; description: string; amount: string; externalId?: string; merchant?: string; type?: string; direction: "SIGNED" | "EXPENSE" | "INCOME" };
export type NormalizedTransaction = { date: string; description: string; amountCents: number; type: "INCOME" | "EXPENSE" | "REFUND"; merchant: string | null; externalId: string | null; categoryId: string | null; tags: string[]; source: string; fingerprint: string };
export type ImportPreviewRow = { row: number; data: NormalizedTransaction | null; errors: string[]; duplicate: boolean; appliedRules: string[]; duplicateOf?: TransferMatch };
export type FinanceImportParser = { format: string; parse: (content: string) => { headers: string[]; rows: string[][]; delimiter: string } };

function parseRecords(content: string, delimiter: string) {
  const records: string[][] = [];
  let record: string[] = [], cell = "", quoted = false, afterQuote = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell.trim() || afterQuote) throw new Error("Aspas inválidas no CSV.");
      cell = ""; quoted = true;
    } else if (char === delimiter) { record.push(cell.trim()); cell = ""; afterQuote = false; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      record.push(cell.trim());
      if (record.some(c => c !== "")) records.push(record);
      record = []; cell = ""; afterQuote = false;
    } else {
      if (afterQuote && char.trim()) throw new Error("Conteúdo inesperado após aspas no CSV.");
      if (!afterQuote) cell += char;
    }
    if (records.length > 5000) throw new Error("Importe no máximo 5.000 linhas por lote.");
  }
  if (quoted) throw new Error("CSV contém aspas sem fechamento.");
  record.push(cell.trim());
  if (record.some(c => c !== "")) records.push(record);
  return records;
}

export const CsvFinanceImportParser: FinanceImportParser = {
  format: "CSV",
  parse(content) {
    let clean = content.replace(/^\uFEFF/, "");
    const declared=clean.match(/^sep=([,;\t])\r?\n/i);if(declared)clean=clean.slice(declared[0].length);
    if (Buffer.byteLength(clean, "utf8") > 5_000_000) throw new Error("CSV deve ter no máximo 5 MB.");
    if (clean.includes("\uFFFD") || clean.includes("\0")) throw new Error("Salve o arquivo em UTF-8 antes de importar.");
    let delimiter = ",";
    let headerQuotes = false, commas = 0, semicolons = 0, tabs = 0;
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (char === '"') { if (headerQuotes && clean[i + 1] === '"') { i++; continue; } headerQuotes = !headerQuotes; }
      if (!headerQuotes && (char === "\n" || char === "\r")) break;
      if (!headerQuotes && char === ",") commas++;
      if (!headerQuotes && char === ";") semicolons++;
      if (!headerQuotes && char === "\t") tabs++;
    }
    if (tabs>commas&&tabs>semicolons)delimiter="\t";else if (semicolons > commas) delimiter = ";";
    const [headers, ...rows] = parseRecords(clean, delimiter);
    if (!headers || headers.length < 2 || !rows.length) throw new Error("CSV precisa de cabeçalho e pelo menos uma linha.");
    if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error("Cabeçalhos devem ser únicos e não vazios.");
    if (headers.length > 50 || rows.length > 5000) throw new Error("Limite de 50 colunas e 5.000 linhas.");
    return { headers, rows, delimiter };
  },
};

export const OfxFinanceImportParser: FinanceImportParser = {
  format: "OFX",
  parse() { throw new Error("OFX ainda não está disponível. Exporte o extrato como CSV."); },
};
export const financeImportParsers: Record<string, FinanceImportParser> = { CSV: CsvFinanceImportParser, OFX: OfxFinanceImportParser };

export function normalizeText(value: string) { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"); }

export function transactionFingerprint(workspaceId: string, accountId: string, transaction: Pick<NormalizedTransaction, "date" | "description" | "amountCents" | "type" | "externalId">) {
  const identity = transaction.externalId
    ? [workspaceId, accountId, "external-v1", transaction.externalId.trim()]
    : [workspaceId, accountId, "content-v1", transaction.date, transaction.amountCents, transaction.type, normalizeText(transaction.description)];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export type ImportRule = { id: string; name: string; field: string; operator: string; value: string; minAmountCents: number | null; maxAmountCents: number | null; accountId: string | null; source: string | null; categoryId: string | null; setMerchant: string | null; addTag: string | null; priority: number };

/** Lower priority numbers win; later matches only fill category/merchant not already set. */
export function applyRules(transaction: NormalizedTransaction, rules: ImportRule[], accountId: string) {
  const data = { ...transaction, tags: [...transaction.tags] };
  const appliedRules: string[] = [];
  let merchantSet = false, categorySet = false;
  for (const rule of [...rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    if (rule.accountId && rule.accountId !== accountId || rule.source && rule.source !== data.source) continue;
    if (rule.minAmountCents !== null && data.amountCents < rule.minAmountCents || rule.maxAmountCents !== null && data.amountCents > rule.maxAmountCents) continue;
    const field = normalizeText(rule.field === "merchant" ? transaction.merchant || "" : transaction.description);
    const term = normalizeText(rule.value);
    const match = rule.operator === "contains" ? field.includes(term) : rule.operator === "startsWith" ? field.startsWith(term) : rule.operator === "equals" ? field === term : false;
    if (!match || !term) continue;
    if (rule.categoryId && !categorySet) { data.categoryId = rule.categoryId; categorySet = true; }
    if (rule.setMerchant && !merchantSet) { data.merchant = rule.setMerchant; merchantSet = true; }
    if (rule.addTag && !data.tags.includes(rule.addTag)) data.tags.push(rule.addTag);
    appliedRules.push(rule.name);
  }
  return { data, appliedRules };
}

export function previewCsv(content: string, mapping: ColumnMapping, workspaceId: string, accountId: string, existing: Set<string>, rules: ImportRule[] = [], source = "CSV", ownTransfers: OwnTransfer[] = []): ImportPreviewRow[] {
  const { headers, rows } = CsvFinanceImportParser.parse(content);
  for (const column of [mapping.date, mapping.description, mapping.amount]) if (!headers.includes(column)) throw new Error("Mapeie data, descrição e valor para colunas existentes.");
  if (new Set([mapping.date, mapping.description, mapping.amount]).size !== 3) throw new Error("Data, descrição e valor devem usar colunas diferentes.");
  const seen = new Set(existing);
  const preview = rows.map((row, index): ImportPreviewRow => {
    try {
      if (row.length !== headers.length) throw new Error(`A linha tem ${row.length} colunas; esperado: ${headers.length}.`);
      const get = (key?: string) => key ? row[headers.indexOf(key)] || "" : "";
      const date = normalizeDate(get(mapping.date));
      const description = get(mapping.description).trim();
      if (!description || description.length > 300) throw new Error("Descrição deve ter 1 a 300 caracteres.");
      const amount = parseMoney(get(mapping.amount), true);
      if (!amount) throw new Error("Valor zero requer revisão.");
      const typeValue = normalizeText(get(mapping.type));
      let type: NormalizedTransaction["type"] = mapping.direction === "EXPENSE" ? "EXPENSE" : mapping.direction === "INCOME" ? "INCOME" : amount < 0 ? "EXPENSE" : "INCOME";
      if (typeValue) {
        if (["expense", "despesa", "débito", "debito"].includes(typeValue)) type = "EXPENSE";
        else if (["income", "receita", "crédito", "credito"].includes(typeValue)) type = "INCOME";
        else if (["refund", "reembolso", "estorno"].includes(typeValue)) type = "REFUND";
        else throw new Error("Tipo não reconhecido. Use receita, despesa ou estorno.");
      }
      const base: NormalizedTransaction = { date, description, amountCents: Math.abs(amount), type, merchant: get(mapping.merchant).slice(0, 200) || null, externalId: get(mapping.externalId).slice(0, 200) || null, categoryId: null, tags: [], source, fingerprint: "" };
      base.fingerprint = transactionFingerprint(workspaceId, accountId, base);
      const duplicate = seen.has(base.fingerprint);
      seen.add(base.fingerprint);
      const applied = applyRules(base, rules, accountId);
      return { row: index + 2, ...applied, duplicate, errors: [] };
    } catch (error) {
      return { row: index + 2, data: null, errors: [error instanceof Error ? error.message : "Linha inválida."], duplicate: false, appliedRules: [] };
    }
  });
  if (!ownTransfers.length) return preview;
  // Rows that are the bank's view of a transfer already registered between the person's own accounts are not new money.
  const matches = matchRowsToOwnTransfers(preview.flatMap((item, index) => item.data && !item.duplicate && !item.errors.length ? [{ index, date: item.data.date, amountCents: item.data.amountCents, type: item.data.type }] : []), accountId, ownTransfers);
  return preview.map((item, index) => matches.has(index) ? { ...item, duplicate: true, duplicateOf: matches.get(index) } : item);
}

export function isRollbackEligible(transaction: { importBatchId: string | null; revision: number }, batchId: string) {
  return transaction.importBatchId === batchId && transaction.revision === 0;
}
