import { describe, expect, it } from "vitest";
import { dayOf, normalizeBankTransaction, type NormalizeContext } from "../normalize";
import type { PluggyTransaction } from "../pluggy-schemas";

const context: NormalizeContext = { timezone: "America/Manaus", ownerTaxNumbers: ["123.456.789-09"], syncFrom: null };
const tx = (extra: Record<string, unknown> = {}): PluggyTransaction => ({ id: "t-1", description: "Padaria Central", amount: 12.34, date: "2026-10-15T00:00:00.000Z", type: "DEBIT", status: "POSTED", currencyCode: "BRL", ...extra }) as PluggyTransaction;
const candidate = (extra: Record<string, unknown> = {}, ctx = context) => { const result = normalizeBankTransaction(tx(extra), ctx); if (result.kind !== "candidate") throw new Error(`skipped: ${result.reason}`); return result.candidate; };

describe("dayOf", () => {
  it("keeps a plain date or midnight UTC on the same calendar day, even in a timezone behind UTC", () => {
    expect(dayOf("2026-10-15", "America/Manaus")).toBe("2026-10-15");
    expect(dayOf("2026-10-15T00:00:00.000Z", "America/Manaus")).toBe("2026-10-15");
  });
  it("converts a real time of day to the workspace timezone", () => {
    expect(dayOf("2026-10-15T02:30:00.000Z", "America/Manaus")).toBe("2026-10-14");
    expect(dayOf("2026-10-15T18:30:00.000Z", "America/Manaus")).toBe("2026-10-15");
  });
  it("rejects garbage", () => { expect(dayOf("not a date", "America/Manaus")).toBeNull(); });
});

describe("normalizeBankTransaction", () => {
  it("turns a debit into a confirmed spending candidate with integer cents, whatever the sign of the amount", () => {
    for (const amount of [12.34, -12.34]) {
      const row = candidate({ amount });
      expect([row.amountCents, row.eventKind, row.confidence, row.problems, row.effectiveDate, row.dateBasis]).toEqual([1234, "PURCHASE", "CONFIRMED", [], "2026-10-15", "POSTED_DATE"]);
    }
  });

  it("uses the declared direction, not the sign: a credit is income", () => {
    expect(candidate({ type: "CREDIT", amount: -50 }).eventKind).toBe("INCOME");
  });

  it("rounds decimal money to the cent without float drift", () => {
    expect(candidate({ amount: 0.1 + 0.2 }).amountCents).toBe(30);
    expect(candidate({ amount: 19.99 }).amountCents).toBe(1999);
    expect(candidate({ amount: 1234567.89 }).amountCents).toBe(123456789);
  });

  it("identifies by the provider id when there is one, and by the Pluggy id otherwise", () => {
    expect(candidate({ providerId: "OF-77" }).issuerExternalId).toBe("pluggy-provider:OF-77");
    expect(candidate().issuerExternalId).toBe("pluggy:t-1");
    expect(candidate().locator).toBe("pluggy:t-1");
  });

  it("skips what has not settled, what predates the window and what cannot be read", () => {
    expect(normalizeBankTransaction(tx({ status: "PENDING" }), context)).toMatchObject({ kind: "skipped", reason: "PENDING" });
    expect(normalizeBankTransaction(tx({ date: "2026-09-30T00:00:00.000Z" }), { ...context, syncFrom: "2026-10-01" })).toMatchObject({ kind: "skipped", reason: "BEFORE_WINDOW" });
    expect(normalizeBankTransaction(tx({ date: "2026-10-01T00:00:00.000Z" }), { ...context, syncFrom: "2026-10-01" })).toMatchObject({ kind: "candidate" });
    for (const bad of [{ amount: 0 }, { date: "nope" }, { currencyCode: "USD" }, { amount: 99999999999 }]) expect(normalizeBankTransaction(tx(bad), context)).toMatchObject({ kind: "skipped", reason: "INVALID" });
  });

  it("does not guess the direction when the bank leaves it out", () => {
    const row = candidate({ type: undefined, amount: -9 });
    expect([row.eventKind, row.confidence]).toEqual(["PURCHASE", "PROBABLE"]);
    expect(row.problems[0]).toContain("sentido");
  });

  it("never lets a card bill payment through as spending: the purchases already count", () => {
    for (const description of ["Pagamento de fatura Nubank", "PGTO FATURA CARTAO", "Pagamento da fatura do cartão"]) {
      const row = candidate({ description });
      expect([row.eventKind, row.confidence]).toEqual(["TRANSFER", "PROBABLE"]);
      expect(row.problems.join(" ")).toContain("fatura");
    }
  });

  it("recognises money moving between the holder's own accounts by tax number, without keeping it", () => {
    const own = candidate({ type: "CREDIT", description: "Pix recebido", paymentData: { payer: { name: "Alguém", documentNumber: { type: "CPF", value: "12345678909" } } } });
    expect([own.eventKind, own.confidence]).toEqual(["TRANSFER", "PROBABLE"]);
    expect(JSON.stringify(own)).not.toContain("12345678909");
    const other = candidate({ type: "CREDIT", description: "Pix recebido", paymentData: { payer: { name: "Outra", documentNumber: { type: "CPF", value: "98765432100" } } } });
    expect(other.eventKind).toBe("INCOME");
  });

  it("keeps payments to third parties as spending when the holder is the payer", () => {
    const row = candidate({ paymentData: {
      payer: { documentNumber: { type: "CPF", value: "12345678909" } },
      receiver: { documentNumber: { type: "CPF", value: "98765432100" } },
    } });
    expect([row.eventKind, row.confidence, row.problems]).toEqual(["PURCHASE", "CONFIRMED", []]);
  });

  it("keeps third-party receipts as income when the holder is the receiver", () => {
    const row = candidate({ type: "CREDIT", paymentData: {
      payer: { documentNumber: { type: "CPF", value: "98765432100" } },
      receiver: { documentNumber: { type: "CPF", value: "12345678909" } },
    } });
    expect([row.eventKind, row.confidence, row.problems]).toEqual(["INCOME", "CONFIRMED", []]);
  });

  it("recognises outgoing transfers to another account held by the same person", () => {
    const row = candidate({ paymentData: {
      payer: { documentNumber: { type: "CPF", value: "12345678909" } },
      receiver: { documentNumber: { type: "CPF", value: "123.456.789-09" } },
    } });
    expect([row.eventKind, row.confidence]).toEqual(["TRANSFER", "PROBABLE"]);
    expect(JSON.stringify(row)).not.toContain("12345678909");
  });

  it("classifies refunds and charges", () => {
    expect(candidate({ type: "CREDIT", description: "Estorno compra" }).eventKind).toBe("REFUND");
    expect(candidate({ description: "IOF internacional" }).eventKind).toBe("IOF");
    expect(candidate({ description: "Tarifa mensal" }).eventKind).toBe("FEE");
    expect(candidate({ description: "Juros do cheque especial" }).eventKind).toBe("INTEREST");
    expect(candidate({ type: "CREDIT", description: "Tarifa devolvida" }).eventKind).toBe("INCOME");
  });

  it("keeps the merchant, tags the origin and bounds long text", () => {
    const row = candidate({ merchant: { name: "  Mercado Bom  " }, description: "x".repeat(500), descriptionRaw: "y".repeat(5000) });
    expect([row.merchant, row.tags, row.description.length, row.rawDescription.length]).toEqual(["Mercado Bom", ["open-finance"], 300, 2000]);
  });
});
