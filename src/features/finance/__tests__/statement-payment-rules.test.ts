import { describe, expect, it } from "vitest";
import { outstandingOf, planStatementPayment, type CarryTarget, type PayableStatement, type PaymentRequest } from "../statement-payment";

const TODAY = "2032-10-12";
const bill = (patch: Partial<PayableStatement> = {}): PayableStatement => ({
  id: "s1", accountId: "card", kind: "STATEMENT", status: "OPEN", dueDate: "2032-10-01", outstandingCents: 500_000,
  amountIsOutstanding: false, sourceAsOf: "2032-09-24", rolledIntoStatementId: null, ...patch,
});
const next = (patch: Partial<CarryTarget> = {}): CarryTarget => ({ id: "s2", accountId: "card", kind: "STATEMENT", status: "OPEN", dueDate: "2032-11-03", rolledIntoStatementId: null, ...patch });
const request = (patch: Partial<PaymentRequest> = {}): PaymentRequest => ({ mode: "FULL", amountCents: null, paidOn: "2032-10-05", unknownDate: false, carryTarget: null, carryIncluded: false, ...patch });
const plan = (statement: PayableStatement, req: PaymentRequest) => planStatementPayment(statement, req, TODAY);
const error = (statement: PayableStatement, req: PaymentRequest) => { const result = plan(statement, req); return result.ok ? null : result.error; };

describe("F03 · what is still owed", () => {
  const base = { status: "OPEN" as const, declaredCents: 500_000, addedCents: 0, amountIsOutstanding: false, sourceAsOf: "2032-09-24" };
  it("subtracts every known payment from an open bill", () => {
    expect(outstandingOf({ ...base, payments: [{ amountCents: 100_000, date: "2032-10-02" }, { amountCents: 50_000, date: null }] })).toMatchObject({ paidCents: 150_000, effectiveCents: 350_000 });
  });
  it("adds purchases entered on top of the declared amount, and never goes below zero", () => {
    expect(outstandingOf({ ...base, addedCents: 20_000, payments: [] }).effectiveCents).toBe(520_000);
    expect(outstandingOf({ ...base, payments: [{ amountCents: 900_000, date: "2032-10-02" }] }).effectiveCents).toBe(0);
  });
  it("keeps the face value of a paid bill, whatever was paid", () => {
    expect(outstandingOf({ ...base, status: "PAID", payments: [{ amountCents: 100_000, date: "2032-10-02" }] }).effectiveCents).toBe(500_000);
  });
  it("when the bank figure is already net of payments, only later payments reduce it", () => {
    const outstanding = { ...base, amountIsOutstanding: true };
    const lines = [{ amountCents: 100_000, date: "2032-09-20" }, { amountCents: 40_000, date: "2032-10-02" }, { amountCents: 10_000, date: null }];
    expect(outstandingOf({ ...outstanding, payments: lines })).toMatchObject({ paidCents: 150_000, deductibleCents: 40_000, effectiveCents: 460_000 });
  });
});

describe("F03 · which bills can receive a payment", () => {
  it("refuses forecasts, paid, future and already carried bills, and bills with nothing to pay", () => {
    expect(error(bill({ kind: "MONTHLY_PROJECTION" }), request())).toContain("previsões");
    expect(error(bill({ status: "PAID" }), request())).toBe("Esta fatura já está paga.");
    expect(error(bill({ status: "FUTURE_KNOWN" }), request())).toContain("ainda não está aberta");
    expect(error(bill({ rolledIntoStatementId: "s2" }), request())).toContain("já foi transportado");
    expect(error(bill({ outstandingCents: 0 }), request())).toContain("não tem saldo");
  });
});

describe("F03 · paying it all", () => {
  it("pays exactly what is left, closes the bill and records the day", () => {
    expect(plan(bill(), request())).toEqual({ ok: true, plan: { payment: { amountCents: 500_000, date: "2032-10-05" }, closes: true, carry: null, paidAt: "2032-10-05", outstandingAfterCents: 0 } });
  });
  it("accepts an unknown day without inventing one", () => {
    expect(plan(bill(), request({ unknownDate: true, paidOn: "2032-10-05" }))).toMatchObject({ ok: true, plan: { payment: { amountCents: 500_000, date: null }, paidAt: null } });
    expect(plan(bill(), request({ paidOn: null }))).toMatchObject({ ok: true, plan: { payment: { date: null } } });
  });
  it("rejects another amount, a future day and an impossible day", () => {
    expect(error(bill(), request({ amountCents: 400_000 }))).toContain("saldo restante");
    expect(error(bill(), request({ paidOn: "2032-10-13" }))).toBe("A data do pagamento não pode estar no futuro.");
    expect(error(bill(), request({ paidOn: "2032-02-31" }))).toBe("Informe uma data de pagamento válida.");
  });
});

describe("F03 · a partial payment is never a settlement", () => {
  it("keeps the bill open with the balance reduced", () => {
    expect(plan(bill(), request({ mode: "PARTIAL", amountCents: 200_000 }))).toEqual({ ok: true, plan: { payment: { amountCents: 200_000, date: "2032-10-05" }, closes: false, carry: null, paidAt: null, outstandingAfterCents: 300_000 } });
  });
  it("needs an amount, rejects more than owed and sends 'exactly everything' to the settlement option", () => {
    expect(error(bill(), request({ mode: "PARTIAL" }))).toBe("Informe o valor pago.");
    expect(error(bill(), request({ mode: "PARTIAL", amountCents: 500_001 }))).toContain("maior que o saldo");
    expect(error(bill(), request({ mode: "PARTIAL", amountCents: 500_000 }))).toContain("Quitar o saldo restante");
  });
  it("when the bank figure already reflects payments, requires a day after its own date", () => {
    const outstanding = bill({ amountIsOutstanding: true });
    expect(error(outstanding, request({ mode: "PARTIAL", amountCents: 1_000, unknownDate: true }))).toContain("Informe a data");
    expect(error(outstanding, request({ mode: "PARTIAL", amountCents: 1_000, paidOn: "2032-09-24" }))).toContain("já considera pagamentos até 24/09/2032");
    expect(plan(outstanding, request({ mode: "PARTIAL", amountCents: 1_000, paidOn: "2032-09-25" })).ok).toBe(true);
  });
});

describe("F03 · closing a bill whose balance already moved on", () => {
  const closed = (patch: Partial<PaymentRequest> = {}) => request({ mode: "CLOSE_CARRIED", paidOn: null, ...patch });
  const rolled = (patch: Partial<PayableStatement> = {}) => bill({ rolledIntoStatementId: "s2", outstandingCents: 400_000, ...patch });

  it("only closes the bill: nothing is paid, nothing is moved, the carry link stays", () => {
    expect(plan(rolled(), closed())).toEqual({ ok: true, plan: { payment: null, closes: true, carry: null, paidAt: null, outstandingAfterCents: 0 } });
  });
  it("is only for bills that really carried their balance", () => {
    expect(error(bill(), closed())).toContain("não tem saldo transportado");
  });
  it("closes a carried bill even when nothing is left to pay, and ignores any amount typed", () => {
    expect(plan(rolled({ outstandingCents: 0 }), closed({ amountCents: 999 })).ok).toBe(true);
  });
  it("uses a given day only if it is real and not in the future; an unknown day stays unknown", () => {
    expect(plan(rolled(), closed({ paidOn: "2032-10-02" }))).toMatchObject({ ok: true, plan: { paidAt: "2032-10-02" } });
    expect(plan(rolled(), closed({ paidOn: "2032-10-02", unknownDate: true }))).toMatchObject({ ok: true, plan: { paidAt: null } });
    expect(error(rolled(), closed({ paidOn: "2032-10-13" }))).toContain("futuro");
    expect(error(rolled(), closed({ paidOn: "2032-02-31" }))).toContain("data válida");
  });
  it("never closes a paid, future or forecast bill", () => {
    expect(error(rolled({ status: "PAID" }), closed())).toBe("Esta fatura já está paga.");
    expect(error(rolled({ status: "FUTURE_KNOWN" }), closed())).toContain("ainda não está aberta");
    expect(error(rolled({ kind: "MONTHLY_PROJECTION" }), closed())).toContain("previsões");
  });
  it("the other modes still refuse a bill that already carried its balance", () => {
    for (const mode of ["FULL", "PARTIAL", "CARRY"] as const) expect(error(rolled(), request({ mode, amountCents: 1_000 }))).toContain("já foi transportado");
  });
});

describe("F03 · carrying the balance into the next bill", () => {
  const carry = (patch: Partial<PaymentRequest> = {}) => request({ mode: "CARRY", amountCents: 100_000, carryTarget: next(), carryIncluded: true, ...patch });

  it("pays part, closes this bill and moves exactly the rest, once", () => {
    expect(plan(bill(), carry())).toEqual({ ok: true, plan: { payment: { amountCents: 100_000, date: "2032-10-05" }, closes: true, carry: { nextId: "s2", cents: 400_000 }, paidAt: "2032-10-05", outstandingAfterCents: 0 } });
  });
  it("works with nothing paid and with an unknown payment day", () => {
    expect(plan(bill(), carry({ amountCents: null }))).toMatchObject({ ok: true, plan: { payment: null, carry: { cents: 500_000 }, paidAt: null } });
    expect(plan(bill(), carry({ unknownDate: true }))).toMatchObject({ ok: true, plan: { payment: { amountCents: 100_000, date: null }, paidAt: null, carry: { cents: 400_000 } } });
  });
  it("requires the explicit confirmation that the next bill already includes the balance", () => {
    expect(error(bill(), carry({ carryIncluded: false }))).toContain("já está incluído no total da fatura seguinte");
  });
  it("sends a fully paid balance to the settlement option", () => {
    expect(error(bill(), carry({ amountCents: 500_000 }))).toContain("Quitar o saldo restante");
  });
  it("accepts only a later open or known bill of the same card that did not carry itself", () => {
    expect(error(bill(), carry({ carryTarget: null }))).toContain("Escolha a fatura");
    expect(error(bill(), carry({ carryTarget: next({ accountId: "other" }) }))).toContain("mesmo cartão");
    expect(error(bill(), carry({ carryTarget: next({ status: "PAID" }) }))).toContain("aberta ou futura");
    expect(error(bill(), carry({ carryTarget: next({ kind: "MONTHLY_PROJECTION" }) }))).toContain("aberta ou futura");
    expect(error(bill(), carry({ carryTarget: next({ rolledIntoStatementId: "s3" }) }))).toContain("já transportou");
    expect(error(bill(), carry({ carryTarget: next({ dueDate: "2032-10-01" }) }))).toContain("vencer depois");
    expect(error(bill(), carry({ carryTarget: next({ dueDate: null }) }))).toContain("vencer depois");
    expect(plan(bill(), carry({ carryTarget: next({ status: "FUTURE_KNOWN" }) })).ok).toBe(true);
  });
});
