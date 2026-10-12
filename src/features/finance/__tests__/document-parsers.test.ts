import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { zipSync, strToU8 } from "fflate";
import { candidateSchema } from "../import-candidates";
import { parseCsvCandidates, parseFinancialDocuments, parsePositionedPdf, safeUnzip } from "../document-parsers";
import { classifyCardEvent, evidenceFingerprint, purchaseDateFromCycle, reconcileCandidate } from "../import-reconciliation";

const candidate = (overrides = {}) => candidateSchema.parse({ locator: "row:2", description: "Loja Exemplo", rawDescription: "Loja Exemplo", effectiveDate: "2026-10-08", purchasedDate: "2026-10-08", dateBasis: "PURCHASE_DATE", amountCents: 1234, eventKind: "PURCHASE", confidence: "CONFIRMED", ...overrides });
const existing = { id: "manual", date: "2026-10-09", description: "Descrição manual", merchant: "Loja Exemplo", amountCents: 1234, type: "EXPENSE", externalId: null, revision: 4, fingerprint: null };

describe("card source semantics and provenance", () => {
  it("reads 45 card rows as purchases and a distinct payment, never income", () => {
    const csv = "date,title,amount\n" + Array.from({ length: 44 }, (_, i) => `2026-10-08,Compra ${i},12.34`).join("\n") + "\n2026-10-09,Pagamento recebido,-789.12";
    const rows = parseCsvCandidates(strToU8(csv), true).candidates;
    expect(rows).toHaveLength(45); expect(rows.filter(r => r.eventKind === "PURCHASE")).toHaveLength(44);
    expect(rows[44].eventKind).toBe("CARD_PAYMENT"); expect(rows.some(r => r.eventKind === "INCOME")).toBe(false);
    expect(rows[0]).toMatchObject({ purchasedDate: null, occurredAt: null, postedDate: "2026-10-08", dateBasis: "POSTED_DATE", issuerExternalId: null });
  });
  it("retains malformed CSV rows for review and supports BR money/dates", () => {
    const rows = parseCsvCandidates(strToU8('Data;Descrição;Valor\n08/10/2026;Loja;"R$ 1.234,56"\n31/02/2026;Inválida;25,00'), true).candidates;
    expect(rows[0].amountCents).toBe(123456); expect(rows[1].eventKind).toBe("UNREAD"); expect(rows[1].problems.length).toBeGreaterThan(0);
  });
  it.each([["Pagamento recebido", -78912, "CARD_PAYMENT"], ["Limite convertido em saldo 1/2", 23456, "CREDIT_CONVERSION"], ["PARC AUTOMATIC 05/12", 12345, "FINANCING_INSTALLMENT"], ["IOF internacional", 312, "IOF"], ["Mensalidade", 3890, "FEE"], ["Redução Mensalidade", -1500, "REFUND"], ["Juros de mora", 128, "INTEREST"], ["Loja 02/03", 3222, "PURCHASE_INSTALLMENT"]] as const)("classifies %s", (description, amount, kind) => expect(classifyCardEvent(description, amount)).toBe(kind));
  it("does not collapse legitimate identical purchases in one source", () => {
    expect(evidenceFingerprint("w", "a", "hash", candidate())).not.toBe(evidenceFingerprint("w", "a", "hash", candidate({ locator: "row:3" })));
    expect(evidenceFingerprint("w", "a", "hash", candidate())).toBe(evidenceFingerprint("w", "a", "hash", candidate()));
    expect(evidenceFingerprint("w", "a", "hash", candidate())).not.toBe(evidenceFingerprint("w", "other", "hash", candidate()));
  });
  it("requires review for probable matches and preserves manual records", () => {
    expect(reconcileCandidate(candidate(), [existing], "new").action).toBe("AMBIGUOUS");
    expect(reconcileCandidate(candidate(), [existing], "new", "manual").action).toBe("KEEP");
    expect(existing.description).toBe("Descrição manual");
    expect(reconcileCandidate(candidate({ amountCents: 99 }), [existing], "new", "manual").action).toBe("CONFLICT");
  });
  it("does not use equal amounts alone or merge subscription charges six days apart", () => {
    expect(reconcileCandidate(candidate({ merchant: "Outro local", description: "Outro local" }), [existing], "new").action).toBe("CREATE");
    expect(reconcileCandidate(candidate({ effectiveDate: "2026-10-03", purchasedDate: "2026-10-03" }), [existing], "new").action).toBe("CREATE");
  });
  it("recognizes the preserved bank description even after adding a display merchant", () => {
    expect(reconcileCandidate(candidate(), [{ ...existing, description: "Loja Exemplo", merchant: "Alias escolhido pelo usuário" }], "new").action).toBe("AMBIGUOUS");
  });
  it("blocks low confidence, missing dates and financing conversions", () => {
    for (const row of [candidate({ confidence: "LOW" }), candidate({ effectiveDate: null, purchasedDate: null, dateBasis: "UNKNOWN" }), candidate({ eventKind: "CREDIT_CONVERSION" })]) expect(reconcileCandidate(row, [], "new").action).toBe("CONFLICT");
  });
  it("never invents an issuer ID from a source row", () => expect(candidate().issuerExternalId).toBeNull());
  it("validates installment numbers and missing timestamp context", () => {
    expect(() => candidate({ installmentNumber: 5, installmentTotal: 3 })).toThrow();
    expect(() => candidate({ occurredAt: "2026-10-08T12:30:00Z", timezone: null })).toThrow();
  });
});

describe("spreadsheet and positioned PDF extraction", () => {
  it("reads multiple sheets, serial dates, repeated charges and FX without a second USD transaction", async () => {
    const workbook = new ExcelJS.Workbook();
    const a = workbook.addWorksheet("Primeira"); a.addRow(["Data", "Lançamento", "Parcelamento", "Valor", "Moeda"]);
    a.addRow([new Date("2026-10-04T00:00:00Z"), "Plano Mobilidade", null, 18.7]); a.addRow([new Date("2026-10-10T00:00:00Z"), "Plano Mobilidade", null, 18.7]);
    const b = workbook.addWorksheet("Segunda"); b.addRow(["Data", "Lançamento", "Valor", "Moeda"]);
    b.addRow([46304, "Plano internacional sintético", 111.65, "USD 22,00 (cotação R$ 5,075)"]);
    for (let i = 0; i < 22; i++) b.addRow([new Date("2026-10-11T00:00:00Z"), `Corrida ${i}`, i + 1.11]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const [doc] = await parseFinancialDocuments([{ name: "fake.xlsx", bytes }], true);
    expect(doc.candidates).toHaveLength(25); expect(doc.candidates.slice(0, 2).map(r => r.effectiveDate)).toEqual(["2026-10-04", "2026-10-10"]);
    expect(doc.candidates[2].effectiveDate).toMatch(/^2026-/); expect(doc.candidates[2]).toMatchObject({ originalCurrency: "USD", originalAmountCents: 2200, amountCents: 11165 });
  });
  it("separates PDF columns, skips summary/future zones, and resolves old installment years", () => {
    const item = (text: string, x: number, y: number) => ({ text, x, y });
    const rows = parsePositionedPdf([
      { page: 1, width: 600, items: [item("Itaú Gold Vencimento: 01/10/2026", 30, 700), item("Total desta fatura 8.123,45", 30, 650), item("01/10/2026 Boleto 8.123,45", 30, 630)] },
      { page: 2, width: 600, items: [item("Lançamentos: compras e saques", 130, 700), item("07/12 Loja Antiga 10/10 200,12", 130, 650), item("09/09 Outra Loja 33,11", 360, 650), item("Compras parceladas - próximas faturas", 360, 600), item("09/09 Previsão 01/12 40,00", 360, 580)] },
    ], true).candidates;
    expect(rows).toHaveLength(2); expect(rows[0].effectiveDate).toBe("2025-12-07"); expect(rows[1].effectiveDate).toBe("2026-09-09");
    expect(rows[0].dateBasis).toBe("CYCLE_CONFIRMED");
  });
  it("never derives a partial date from the computer year", () => {
    const { candidates } = parsePositionedPdf([{ page: 1, width: 600, items: [{ text: "07/12 Loja 23,45", x: 10, y: 20 }] }], true);
    expect(candidates[0].effectiveDate).toBeNull(); expect(candidates[0].confidence).toBe("LOW");
    expect(purchaseDateFromCycle("29/07", "2026-11-01", 25, 3)).toBe("2026-07-29");
    expect(purchaseDateFromCycle("31/02", "2026-11-01", 25, 3)).toBeNull();
  });
  it("keeps inconsistent FX as metadata review and creates no second currency purchase", () => {
    const item = (text: string, x: number, y: number) => ({ text, x, y });
    const { candidates } = parsePositionedPdf([{ page: 1, width: 600, items: [item("Itaú Gold Vencimento: 01/10/2026 Lançamentos: compras e saques", 20, 700)] }, { page: 3, width: 600, items: [item("Lançamentos internacionais", 360, 700), item("09/09 Plano sintético 111,65", 360, 680), item("22,00 22,00", 380, 660), item("Dólar de Conversão R$ 4,00", 380, 640)] }], true);
    expect(candidates.filter(c => c.eventKind === "PURCHASE")).toHaveLength(1);
    expect(candidates.find(c => c.eventKind === "METADATA_REVIEW")).toMatchObject({ amountCents: 11165, originalAmountCents: 2200, confidence: "LOW", relatedLocator: "page:3:col:1:y:680.00" });
  });
  it("retains unread PDF rows and undated fees instead of making expenses", () => {
    const { candidates } = parsePositionedPdf([{ page: 2, width: 600, items: [{ text: "Itaú Gold Lançamentos: compras e saques", x: 130, y: 700 }, { text: "09/09 descrição sem valor", x: 130, y: 650 }, { text: "Juros de mora 1,23", x: 360, y: 640 }] }], true);
    expect(candidates).toHaveLength(2); expect(candidates.every(r => r.effectiveDate === null)).toBe(true); expect(candidates[1].eventKind).toBe("INTEREST");
  });
});

describe("document boundary security", () => {
  it("accepts safe ZIP contents and rejects traversal, duplicates, encryption and bombs", () => {
    expect(Object.keys(safeUnzip(zipSync({ "ok.csv": strToU8("data") })))).toEqual(["ok.csv"]);
    expect(() => safeUnzip(zipSync({ "../escape.csv": strToU8("data") }))).toThrow(/inseguro/);
    expect(() => safeUnzip(zipSync({ "A.csv": strToU8("data"), "a.csv": strToU8("data") }))).toThrow(/duplicado/);
    expect(() => safeUnzip(zipSync({ "bomb.csv": new Uint8Array(1_000_000) }))).toThrow(/expansão/);
    const encrypted = zipSync({ "a.csv": strToU8("data") }); const b = Buffer.from(encrypted);
    const central = b.indexOf(Buffer.from([80, 75, 1, 2])); b.writeUInt16LE(1, central + 8);
    expect(() => safeUnzip(b)).toThrow(/criptografado/);
  });
  it("rejects executable/nested ZIP entries, fake signatures, macros and external XML", async () => {
    await expect(parseFinancialDocuments([{ name: "fake.png", bytes: strToU8("not an image") }], true)).rejects.toThrow(/assinatura/);
    await expect(parseFinancialDocuments([{ name: "evil.zip", bytes: zipSync({ "nested.zip": strToU8("bytes") }) }], true)).rejects.toThrow(/formato/);
    expect(() => safeUnzip(zipSync({ "xl/vbaProject.bin": strToU8("x") }), true)).toThrow(/macros/);
    expect(() => safeUnzip(zipSync({ "a.xml": strToU8('<!DOCTYPE x SYSTEM "file:///secret">') }), true)).toThrow(/XML externo/);
  });
  it("keeps every image explicitly pending without OCR", async () => {
    const bytes = new Uint8Array([255, 216, 255, 217]);
    const docs = await parseFinancialDocuments([{ name: "one.jpeg", bytes }, { name: "two.jpeg", bytes }], true);
    expect(docs).toHaveLength(2); expect(docs.every(d => d.candidates[0].confidence === "LOW" && d.candidates[0].occurredAt === null)).toBe(true);
  });
});
