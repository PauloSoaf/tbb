import { unzipSync } from "fflate";
import { candidateSchema, type ImportCandidate } from "./import-candidates";
import { CsvFinanceImportParser, type ColumnMapping } from "./import-engine";
import { classifyCardEvent, purchaseDateFromCycle, sourceHash } from "./import-reconciliation";
import { normalizeDate, parseMoney } from "./money";

export const IMPORT_LIMITS = { fileBytes: 5_000_000, totalBytes: 20_000_000, expandedBytes: 50_000_000, files: 100, rows: 5000, pages: 40, ratio: 200 } as const;
export type DocumentInput = { name: string; bytes: Uint8Array };
export type ParsedDocument = DocumentInput & { sha256: string; mediaType: string; candidates: ImportCandidate[]; metadata: Record<string, unknown> };
const decode = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const norm = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Read the central directory before allocating inflated buffers. Reject ambiguous names,
 * encrypted entries, links, ZIP64, mismatched headers and dangerous expansion ratios. */
export function safeUnzip(bytes: Uint8Array, xlsx = false): Record<string, Uint8Array> {
  if (bytes.byteLength > IMPORT_LIMITS.fileBytes) throw new Error("Arquivo excede 5 MB.");
  const b = Buffer.from(bytes);
  let end = -1;
  for (let p = b.length - 22; p >= Math.max(0, b.length - 65557); p--) if (b.readUInt32LE(p) === 0x06054b50 && p + 22 + b.readUInt16LE(p + 20) === b.length) { end = p; break; }
  if (end < 0 || b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6)) throw new Error("ZIP inválido ou multipartes.");
  const count = b.readUInt16LE(end + 10), size = b.readUInt32LE(end + 12), offset = b.readUInt32LE(end + 16);
  if (count !== b.readUInt16LE(end + 8) || !count || count > (xlsx ? 300 : IMPORT_LIMITS.files) || offset + size !== end) throw new Error("ZIP excede limite ou diretório inválido.");
  const names = new Set<string>(); let expanded = 0, p = offset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > end || b.readUInt32LE(p) !== 0x02014b50) throw new Error("Diretório ZIP inválido.");
    const flags = b.readUInt16LE(p + 8), method = b.readUInt16LE(p + 10), compressed = b.readUInt32LE(p + 20), uncompressed = b.readUInt32LE(p + 24);
    const length = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), comment = b.readUInt16LE(p + 32), local = b.readUInt32LE(p + 42);
    if (p + 46 + length + extra + comment > end) throw new Error("Entrada ZIP incompleta.");
    const name = decode(b.subarray(p + 46, p + 46 + length));
    if (!name || /[\\:\u0000-\u001f]/.test(name) || name.startsWith("/") || name.split("/").some(x => x === ".." || x === ".") || names.has(name.toLowerCase())) throw new Error("Caminho ZIP inseguro ou duplicado.");
    names.add(name.toLowerCase()); expanded += uncompressed;
    const mode = b.readUInt32LE(p + 38) >>> 16;
    if (flags & 1 || ![0, 8].includes(method) || (mode & 0xf000) === 0xa000 || uncompressed === 0xffffffff || local + 30 > offset || b.readUInt32LE(local) !== 0x04034b50) throw new Error("ZIP criptografado, link ou formato não suportado.");
    const localNameLength = b.readUInt16LE(local + 26), localExtra = b.readUInt16LE(local + 28);
    if (decode(b.subarray(local + 30, local + 30 + localNameLength)) !== name || local + 30 + localNameLength + localExtra + compressed > offset || b.readUInt16LE(local + 8) !== method || b.readUInt16LE(local + 6) !== flags) throw new Error("Cabeçalhos ZIP inconsistentes.");
    if (expanded > IMPORT_LIMITS.expandedBytes || uncompressed > (xlsx ? 20_000_000 : IMPORT_LIMITS.fileBytes) || uncompressed > Math.max(1, compressed) * IMPORT_LIMITS.ratio) throw new Error("ZIP excede limite de expansão.");
    if (xlsx && /vbaProject|\.bin$|externalLinks\//i.test(name)) throw new Error("Planilha com macros ou links externos não aceita.");
    p += 46 + length + extra + comment;
  }
  if (p !== end) throw new Error("Diretório ZIP inconsistente.");
  const entries = unzipSync(bytes);
  if (Object.keys(entries).length !== count) throw new Error("ZIP inconsistente.");
  if (xlsx) for (const [name, data] of Object.entries(entries)) if (/\.(xml|rels)$/i.test(name) && /<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External["']/i.test(decode(data))) throw new Error("XML externo não aceito.");
  return entries;
}

function base(locator: string, description: string, rawDate: string | null, signed: number | null, date: string | null, card: boolean, posted = false): ImportCandidate {
  const eventKind = signed === null ? "UNREAD" : card ? classifyCardEvent(description, signed) : signed < 0 ? "PURCHASE" : "INCOME";
  const installment = signed === null ? null : description.match(/(?:Parcela\s+)?(\d+)\s*(?:\/|de)\s*(\d+)\s*$/i);
  return candidateSchema.parse({ locator, description: description.slice(0, 300), rawDescription: description, rawDate, rawAmount: signed === null ? null : String(signed / 100), effectiveDate: date,
    purchasedDate: posted ? null : date, postedDate: posted ? date : null, dateBasis: date ? posted ? "POSTED_DATE" : "PURCHASE_DATE" : "UNKNOWN",
    amountCents: signed === null || signed === 0 ? null : Math.abs(signed), eventKind, confidence: date && signed ? "CONFIRMED" : "LOW",
    installmentNumber: installment ? Number(installment[1]) : null, installmentTotal: installment ? Number(installment[2]) : null,
    problems: eventKind === "CREDIT_CONVERSION" ? ["Conversão de limite exige conciliação do financiamento; não é consumo nem renda."] : date && signed ? [] : ["Data/valor não confirmado."] });
}

export function parseCsvCandidates(bytes: Uint8Array, card: boolean, mapping?: ColumnMapping) {
  const parsed = CsvFinanceImportParser.parse(decode(bytes));
  const find = (keys: string[]) => parsed.headers.find(h => keys.includes(norm(h))) || "";
  const chosen = mapping || { date: find(["date", "data"]), description: find(["title", "description", "descricao", "lancamento"]), amount: find(["amount", "valor"]), direction: "SIGNED" as const };
  if (![chosen.date, chosen.description, chosen.amount].every(k => parsed.headers.includes(k)) || new Set([chosen.date, chosen.description, chosen.amount]).size !== 3) throw new Error("Mapeie Data, Descrição e Valor.");
  const nubank = card && parsed.headers.join(",") === "date,title,amount";
  return { ...parsed, candidates: parsed.rows.map((r, i) => {
    const get = (key?: string) => key ? r[parsed.headers.indexOf(key)] || "" : "";
    try {
      if (r.length !== parsed.headers.length) throw new Error("Quantidade de colunas incorreta.");
      const row = base(`row:${i + 2}`, get(chosen.description), get(chosen.date), parseMoney(get(chosen.amount), true), normalizeDate(get(chosen.date)), card, nubank);
      if (!card && chosen.direction !== "SIGNED") row.eventKind = chosen.direction === "EXPENSE" ? "PURCHASE" : "INCOME";
      row.merchant = get(chosen.merchant) || null; row.issuerExternalId = get(chosen.externalId) || null;
      return row;
    } catch (error) { return candidateSchema.parse({ ...base(`row:${i + 2}`, r.join(" | ") || "Linha vazia", null, null, null, card), problems: [error instanceof Error ? error.message : "Linha inválida"] }); }
  }) };
}

async function parseXlsx(bytes: Uint8Array, card: boolean) {
  const entries = safeUnzip(bytes, true);
  if (!entries["[Content_Types].xml"] || !entries["xl/workbook.xml"]) throw new Error("Assinatura XLSX inválida.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const candidates: ImportCandidate[] = [], metadata: Record<string, unknown> = {};
  if (workbook.worksheets.length > 20) throw new Error("Limite de 20 abas.");
  workbook.eachSheet(sheet => {
    if (sheet.rowCount > IMPORT_LIMITS.rows || sheet.columnCount > 100) throw new Error("Planilha excede limite de linhas/colunas.");
    let columns: { date: number; description: number; amount: number; installment: number } | null = null;
    sheet.eachRow((row, index) => {
      const strings = row.values as unknown[];
      const cells = Array.from(strings, v => v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "object" && v ? "" : String(v ?? ""));
      const dateCol = cells.findIndex(v => norm(v) === "data"), descCol = cells.findIndex(v => /^(lancamento|descricao|description|title)$/.test(norm(v))), amountCol = cells.findIndex(v => /^(valor|amount)$/.test(norm(v)));
      if (dateCol >= 0 && descCol >= 0 && amountCol >= 0) { columns = { date: dateCol, description: descCol, amount: amountCol, installment: cells.findIndex(v => norm(v) === "parcelamento") }; return; }
      if (!columns) {
        if (cells.some(v => /fatura aberta/i.test(v))) metadata.heading = cells.find(v => /fatura aberta/i.test(v));
        if (strings.some(v => v instanceof Date) && strings.some(v => typeof v === "number")) {
          metadata.dueDate = (strings.find(v => v instanceof Date) as Date).toISOString().slice(0, 10);
          metadata.amountCents = Math.round(Number(strings.find(v => typeof v === "number")) * 100);
        }
        return;
      }
      const desc = cells[columns.description]?.trim();
      if (!desc || /subtotal|importante saber|compras recentes/i.test(desc)) return;
      const locator = `sheet:${sheet.id}:row:${index}`;
      try {
        const dateValue = strings[columns.date];
        const serialEpoch = workbook.properties.date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
        const date = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : typeof dateValue === "number" ? new Date(serialEpoch + dateValue * 86400000).toISOString().slice(0, 10) : normalizeDate(cells[columns.date]);
        const amountValue = strings[columns.amount];
        if (typeof amountValue === "object") throw new Error("Fórmula não é uma ocorrência financeira confirmada.");
        const item = base(locator, desc + (cells[columns.installment] ? ` · ${cells[columns.installment]}` : ""), dateValue instanceof Date ? dateValue.toISOString() : cells[columns.date], parseMoney(String(amountValue), true), date, card);
        item.rawDescription = desc;
        const fx = cells.find(v => /\bUSD\b/.test(v));
        if (fx) {
          const nominal = fx.match(/USD\s*([\d.,]+)/), rate = fx.match(/cota[çc][aã]o\s*R\$\s*([\d.,]+)/i);
          item.originalCurrency = "USD"; item.originalAmountCents = nominal ? parseMoney(nominal[1]) : null; item.exchangeRate = rate?.[1] || null;
        }
        candidates.push(item);
      } catch (error) { candidates.push({ ...base(locator, desc, cells[columns.date] || null, null, null, card), problems: [error instanceof Error ? error.message : "Linha inválida"] }); }
    });
  });
  if (!candidates.length || candidates.length > IMPORT_LIMITS.rows) throw new Error("Nenhuma linha tabular reconhecida ou limite excedido.");
  return { candidates, metadata };
}

export type PositionedPage = { page: number; width: number; items: { text: string; x: number; y: number }[] };
export function positionedLines(page: PositionedPage, column = 0, split = false) {
  const items = page.items.filter(i => i.text.trim() && (!split || (column ? i.x >= page.width * .58 : i.x < page.width * .58))).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; text: string }[] = [];
  for (const item of items) {
    const line = lines.find(l => Math.abs(l.y - item.y) < 2);
    if (line) line.text += ` ${item.text.trim()}`; else lines.push({ y: item.y, text: item.text.trim() });
  }
  return lines;
}

/** Geometry keeps the bank's parallel columns separate. Only recognized occurrence
 * sections are committed candidates; future-installment schedules and totals are metadata. */
export function parsePositionedPdf(pages: PositionedPage[], card: boolean) {
  const all = pages.flatMap(p => positionedLines(p).map(l => l.text)).join("\n");
  const dueRaw = all.match(/Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || all.match(/Com vencimento em:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  const dueDate = dueRaw ? normalizeDate(dueRaw) : null;
  const itau = /Ita[uú]|Gold/i.test(all) && /Lançamentos: compras e saques/.test(all);
  const candidates: ImportCandidate[] = [];
  let continuation = "purchases";
  for (const page of pages) for (let col = 0; col < (itau && page.page > 1 ? 2 : 1); col++) {
    let section = itau ? continuation : "generic";
    const lines = positionedLines(page, col, itau && page.page > 1);
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].text;
      const undatedFee = text.match(/^(Juros do rotativo|Juros de mora|Multa por atraso|Repasse de IOF em R\$).*?([\d.]+,\d{2})\s*$/i);
      if (itau && undatedFee) {
        const row = base(`page:${page.page}:col:${col}:y:${lines[i].y.toFixed(2)}`, undatedFee[1], null, parseMoney(undatedFee[2]), null, true);
        row.eventKind = /IOF/i.test(undatedFee[1]) ? "IOF" : "INTEREST";
        row.problems = ["Encargo confirmado no total, mas a fonte não informa data individual de lançamento. Confirme antes de incluir no calendário."];
        candidates.push(row);
      }
      if (/Pagamentos efetuados/i.test(text)) section = "payments";
      if (/Lançamentos: compras e saques/i.test(text)) section = "purchases";
      if (/Lançamentos internacionais/i.test(text)) section = "foreign";
      if (/Lançamentos: produtos e serviços/i.test(text)) section = "products";
      if (/Compras parceladas - próximas faturas|Encargos cobrados|Limites de crédito|Simulação de|Novo teto|Pagamento mínimo|Fique atento/i.test(text)) section = "summary";
      // Page one is a boleto/summary: dates and numeric totals are never purchases.
      if (itau && page.page === 1 || section === "summary") continue;
      const match = text.match(/^(\d{2}\/\d{2}(?:\/\d{4})?|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\s*\d[\d.]*,\d{2})\s*$/);
      if (!match) {
        if (/^\d{2}\/\d{2}\s/.test(text)) candidates.push({ ...base(`page:${page.page}:col:${col}:y:${lines[i].y.toFixed(2)}`, text, text.slice(0, 5), null, null, card), problems: ["Linha com data não foi interpretada; confira a fonte."] });
        continue;
      }
      const [, rawDate, description, amount] = match;
      const installment = description.match(/(\d+)\/(\d+)\s*$/);
      let date: string | null = null;
      try { date = rawDate.length === 5 ? dueDate && itau ? purchaseDateFromCycle(rawDate, dueDate, 25, installment ? Number(installment[1]) : null) : null : normalizeDate(rawDate); } catch { /* Candidate retained for review. */ }
      const row = base(`page:${page.page}:col:${col}:y:${lines[i].y.toFixed(2)}`, description, rawDate, parseMoney(amount, true), date, card);
      if (rawDate.length === 5 && date) row.dateBasis = "CYCLE_CONFIRMED";
      if (section === "payments") row.eventKind = "CARD_PAYMENT";
      if (section === "foreign") {
        const context = lines.slice(i + 1, i + 5).map(l => l.text).join(" ");
        const usd = context.match(/(?:USD|US\$)\s*([\d.,]+)/i);
        if (usd) { row.originalCurrency = "USD"; row.originalAmountCents = parseMoney(usd[1]); }
        else {
          const values = lines[i + 1]?.text.match(/([\d.]+,\d{2})\s+([\d.]+,\d{2})$/);
          if (values) { row.originalCurrency = "USD"; row.originalAmountCents = parseMoney(values[2]); }
        }
        row.exchangeRate = context.match(/Dólar de Conversão R\$\s*([\d.,]+)/i)?.[1] || null;
        if (row.originalAmountCents && row.exchangeRate && Math.abs(Math.round(row.originalAmountCents * Number(row.exchangeRate.replace(",", "."))) - row.amountCents!) > 1) {
          candidates.push({ ...row, locator: `${row.locator}:fx-review`, relatedLocator: row.locator, eventKind: "METADATA_REVIEW", confidence: "LOW", description: `Conferir cotação: ${row.description}`.slice(0, 300), problems: ["Cotação impressa não fecha com valor original e valor convertido. Compra em BRL é confirmada; metadados de câmbio exigem revisão."] });
        }
      }
      candidates.push(row);
    }
    continuation = section;
  }
  const amount = all.match(/Total desta fatura\s+([\d.]+,\d{2})/i)?.[1];
  const asOf = all.match(/(?:Postagem|Emissão):\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  return { candidates, metadata: { dueDate, amountCents: amount ? parseMoney(amount) : null, asOfDate: asOf ? normalizeDate(asOf) : null, textLayer: Boolean(all.trim()), recognizedLayout: itau ? "ITAU_CLOSED_STATEMENT" : "GENERIC_REVIEW", explanation: "Totalizadores, mínimo, limite e cronograma futuro não são compras. Datas sem ano exigem ciclo confirmado." } };
}

async function parsePdf(bytes: Uint8Array, card: boolean) {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { maxImageSize: 16_777_216 });
  try {
    if (pdf.numPages > IMPORT_LIMITS.pages) throw new Error("PDF excede 40 páginas.");
    const pages: PositionedPage[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n), content = await page.getTextContent();
      pages.push({ page: n, width: page.view[2], items: content.items.filter(i => "str" in i).map(i => ({ text: i.str, x: i.transform[4], y: i.transform[5] })) });
    }
    const result = parsePositionedPdf(pages, card);
    if (!result.candidates.length) result.candidates.push(base("document:review", "PDF exige transcrição revisada", null, null, null, card));
    return result;
  } finally { await pdf.loadingTask.destroy(); }
}

export async function parseFinancialDocuments(files: DocumentInput[], card: boolean, mapping?: ColumnMapping): Promise<ParsedDocument[]> {
  if (!files.length || files.length > IMPORT_LIMITS.files || files.reduce((s, f) => s + f.bytes.length, 0) > IMPORT_LIMITS.totalBytes) throw new Error("Limite de 100 arquivos / 20 MB por envio.");
  const output: ParsedDocument[] = [];
  for (const file of files) {
    if (!file.bytes.length || file.bytes.length > IMPORT_LIMITS.fileBytes || file.name.length > 200) throw new Error("Arquivo vazio, nome inválido ou maior que 5 MB.");
    const ext = file.name.toLowerCase().split(".").pop(), b = Buffer.from(file.bytes);
    if (ext === "zip") {
      const entries = safeUnzip(file.bytes);
      const leaves = Object.entries(entries).filter(([name]) => !name.endsWith("/"));
      if (leaves.some(([name]) => !/\.(csv|xlsx|pdf|png|jpe?g|json)$/i.test(name))) throw new Error("ZIP contém formato não aceito ou outro ZIP.");
      output.push(...await parseFinancialDocuments(leaves.map(([name, bytes]) => ({ name, bytes })), card, mapping));
      continue;
    }
    let result: { candidates: ImportCandidate[]; metadata: Record<string, unknown> }, mediaType: string;
    if (ext === "csv") { result = { ...parseCsvCandidates(file.bytes, card, mapping), metadata: {} }; mediaType = "text/csv"; }
    else if (ext === "xlsx" && b.subarray(0, 4).equals(Buffer.from([80,75,3,4]))) { result = await parseXlsx(file.bytes, card); mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; }
    else if (ext === "pdf" && b.subarray(0, 5).toString() === "%PDF-") { result = await parsePdf(file.bytes, card); mediaType = "application/pdf"; }
    else if (ext === "png" && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || ["jpg","jpeg"].includes(ext || "") && b[0] === 255 && b[1] === 216 && b[2] === 255) {
      result = { candidates: [base("image:review", "Imagem: transcreva e confirme as ocorrências", null, null, null, card)], metadata: { ocr: "UNAVAILABLE", explanation: "OCR não configurado. Nenhuma ocorrência foi descartada ou confirmada automaticamente." } }; mediaType = ext === "png" ? "image/png" : "image/jpeg";
    } else if (ext === "json") {
      const data = JSON.parse(decode(file.bytes)) as { schemaVersion?: string; rows?: unknown[] };
      if (data.schemaVersion !== "finance-evidence/1" || !Array.isArray(data.rows) || data.rows.length > IMPORT_LIMITS.rows) throw new Error("JSON revisado exige schemaVersion finance-evidence/1 e rows.");
      result = { candidates: data.rows.map(row => ({ ...candidateSchema.parse(row), confidence: "LOW", problems: ["Confirme a transcrição com o original antes de aprovar."] })), metadata: { reviewedJson: true } }; mediaType = "application/json";
    } else throw new Error("Extensão e assinatura incompatíveis; use CSV, XLSX, PDF, PNG/JPEG, ZIP seguro ou JSON revisado.");
    output.push({ ...file, sha256: sourceHash(file.bytes), mediaType, ...result });
    if (output.length > IMPORT_LIMITS.files || output.reduce((s, f) => s + f.candidates.length, 0) > IMPORT_LIMITS.rows || output.reduce((s, f) => s + f.bytes.length, 0) > IMPORT_LIMITS.totalBytes) throw new Error("Envio excede limite de fontes ou ocorrências.");
  }
  return output;
}
