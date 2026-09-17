import { describe, expect, it } from "vitest";
import { parseInvestmentCsv } from "./import-parser";

describe("investment CSV parser", () => {
  it("parses the documented generic format with Brazilian numbers", () => {
    const [row] = parseInvestmentCsv("Data;Tipo;Ticker;Quantidade;Preço;Valor;Taxas;Instituição\n15/09/2026;Compra;PETR4;10;31,25;312,50;1,50;XP");
    expect(row).toMatchObject({ date: "2026-09-15", type: "BUY", ticker: "PETR4", quantity: "10", grossAmountCents: 31_250, feesCents: 150, institution: "XP" });
    expect(row.unitPriceCents?.toString()).toBe("3125");
  });

  it("recognizes common B3 export headers and derives total from price", () => {
    const [row] = parseInvestmentCsv("Data do Negócio;Tipo de Movimentação;Código de Negociação;Quantidade;Preço;Instituição\n2026-09-15;Venda;VALE3;2;58,1234;Corretora X");
    expect(row).toMatchObject({ date: "2026-09-15", type: "SELL", ticker: "VALE3", quantity: "2", grossAmountCents: 11_625, institution: "Corretora X" });
    expect(row.unitPriceCents?.toString()).toBe("5812.34");
  });

  it("rejects files without required columns or with unknown operations", () => {
    expect(() => parseInvestmentCsv("Data;Ticker;Quantidade;Preço\n15/09/2026;PETR4;1;30")).toThrow(/type/);
    expect(() => parseInvestmentCsv("Data;Tipo;Ticker;Quantidade;Preço\n15/09/2026;Bonificação;PETR4;1;30")).toThrow(/Operação não reconhecida/);
  });
});
