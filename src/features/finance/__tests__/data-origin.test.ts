import { describe, expect, it } from "vitest";
import { parseFinanceOrigin, transactionOriginLabel, transactionOriginWhere, transactionOriginSql } from "../data-origin";
import { sameFinancialOccurrence } from "../source-identity";

describe("financial sources and exact occurrence identity", () => {
  it("uses a validated consolidated default", () => {
    expect(parseFinanceOrigin("anything")).toBe("combined");
    expect(parseFinanceOrigin("open-finance")).toBe("open-finance");
    expect(transactionOriginWhere("combined")).toEqual({});
  });
  it("recognizes bank imports despite their shared DOCUMENT_V2 storage type", () => {
    expect(transactionOriginLabel({ source: "DOCUMENT_V2", tags: ["open-finance"] })).toBe("Open Finance");
    expect(transactionOriginLabel({ source: "DOCUMENT_V2", tags: [] })).toBe("Importação");
    expect(transactionOriginLabel({ source: "MANUAL" })).toBe("Manual");
  });
  it("retains both sources of a single reconciled entry", () => {
    expect(transactionOriginLabel({ source: "CSV", evidence: [{ source: { fileName: "Open Finance · Synthetic bank" } }] })).toBe("Importação + Open Finance");
    expect(transactionOriginWhere("open-finance")).toHaveProperty("OR");
    expect(transactionOriginWhere("imported")).toHaveProperty("OR");
    expect(transactionOriginWhere("manual")).toHaveProperty("NOT");
    expect(transactionOriginLabel({source:"MANUAL",evidence:[{source:{fileName:"Open Finance · Synthetic bank"}}]})).toBe("Manual + Open Finance");
    expect(transactionOriginSql("open-finance").sql).toContain('"FinancialEvidence"');
  });
  const original = { accountId: "synthetic-cash", type: "EXPENSE", amountCents: 1250, date: "2032-10-20", description: "Loja de teste", cardStatementId: null, installmentNumber: null, installmentTotal: null };
  it("accepts an exact occurrence with normalized accents and casing", () => {
    expect(sameFinancialOccurrence(original, { ...original, date: new Date("2032-10-20"), description: "LOJA DE TESTE" })).toBe(true);
  });
  it.each([
    { date: "2032-10-21" }, { amountCents: 1300 }, { accountId: "other-bank" },
    { description: "Outra loja" }, { type: "REFUND" }, { cardStatementId: "another-cycle" },
    { installmentNumber: 2, installmentTotal: 4 },
  ])("keeps a different occurrence for review: %s", patch => {
    expect(sameFinancialOccurrence(original, { ...original, ...patch })).toBe(false);
  });
  it("does not infer identity from unnamed or tiny descriptions", () => {
    expect(sameFinancialOccurrence({ ...original, description: "PIX" }, { ...original, description: "PIX" })).toBe(false);
  });
});
