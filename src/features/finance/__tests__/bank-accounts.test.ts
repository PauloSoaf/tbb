import { describe, expect, it } from "vitest";
import { groupBankAccounts, invoiceFunding, type BankAccount } from "../bank-accounts";
import type { StatementRow } from "../card-statements";

const account = (patch: Partial<BankAccount> = {}): BankAccount => ({ id: "cash", name: "Conta sintética", institution: "Banco Exemplo", type: "CHECKING", balanceCents: 24000, ...patch });
const card = account({ id: "card", type: "CREDIT_CARD", balanceCents: -100 });
const statement = (patch: Partial<StatementRow> = {}): StatementRow => ({ id: "bill", accountId: "card", accountName: "Cartão sintético", kind: "STATEMENT", status: "OPEN", amountCents: 36000, dueDate: "2032-01-12", closingDate: null, closingDay: null, referenceMonth: "2032-01", paidAt: null, reconciliation: "NOT_REQUIRED", overlapsStatementId: null, notes: null, ...patch });

describe("bank products", () => {
  it("groups checking, multiple reserves and credit in one bank without mixing their balances", () => {
    const banks = groupBankAccounts([account(), card, account({ id: "reserve1", type: "SAVINGS", balanceCents: 8000 }), account({ id: "reserve2", type: "SAVINGS", balanceCents: 2000 })]);
    expect(banks).toHaveLength(1);
    expect(banks[0]).toMatchObject({ cashCents: 24000, reserveCents: 10000, hasCash: true });
    expect(banks[0].accounts).toHaveLength(4);
  });
  it("recognizes brand aliases, accents and names without institution", () => {
    expect(groupBankAccounts([account({ institution: "Itaú" }), account({ id: "alias", institution: "Itau Unibanco" }), account({ id: "no-bank", institution: null, name: "Itaú · Cartão" })])).toHaveLength(1);
  });
  it("keeps unknown accounts without an institution separate", () => {
    expect(groupBankAccounts([account({ institution: null }), account({ id: "other", institution: null })])).toHaveLength(2);
  });
  it("does not group different banks or include unassigned", () => {
    expect(groupBankAccounts([account(), account({ id: "another", institution: "Banco Diferente" }), account({ institution: "__TBB_UNASSIGNED__" })])).toHaveLength(2);
  });
  it("keeps a credit-only bank visible with an unknown cash balance", () => {
    expect(groupBankAccounts([card])[0]).toMatchObject({ hasCash: false, cashCents: 0 });
  });
  it("respects an explicit unknown institution even when a product name mentions another bank", () => {
    expect(groupBankAccounts([account({ institution: "Nubank" }), account({ id: "other", institution: "Banco Exemplo", name: "Transferências do Nubank" })])).toHaveLength(2);
  });
});

describe("automatic possible debt", () => {
  it("compares registered spendable cash with unpaid effective invoice totals", () => {
    expect(invoiceFunding([account(), card], [statement()], "2032-01-10")).toMatchObject({ cashCents: 24000, openCents: 36000, shortfallCents: 12000, afterInvoicesCents: -12000 });
  });
  it("excludes reserves, investments, limits, unassigned and credit ledger balances from cash", () => {
    const accounts = [account(), card, account({ id: "s", type: "SAVINGS", balanceCents: 50000 }), account({ id: "i", type: "INVESTMENT", balanceCents: 90000 }), account({ id: "u", institution: "__TBB_UNASSIGNED__", balanceCents: 90000 })];
    expect(invoiceFunding(accounts, [statement()], "2032-01-10")).toMatchObject({ cashCents: 24000, reserveCents: 50000, shortfallCents: 12000 });
  });
  it("counts digital wallet and cash, netting negative account balances", () => {
    expect(invoiceFunding([account({ balanceCents: -5000 }), account({ id: "wallet", type: "DIGITAL_WALLET", balanceCents: 7000 }), account({ id: "notes", type: "CASH", balanceCents: 3000 }), card], [statement()], "2032-01-10").cashCents).toBe(5000);
  });
  it("distinguishes absent cash from a registered zero balance", () => {
    expect(invoiceFunding([card], [statement()], "2032-01-10").hasCash).toBe(false);
    expect(invoiceFunding([card, account({ balanceCents: 0 })], [statement()], "2032-01-10").hasCash).toBe(true);
  });
  it("marks missing invoice records rather than implying all cards are covered", () => {
    expect(invoiceFunding([account(), card], [], "2032-01-10").missingStatementCount).toBe(1);
    expect(invoiceFunding([account(), card], [statement({ status: "PAID" })], "2032-01-10").missingStatementCount).toBe(0);
  });
  it("excludes paid, forecasts and statements of inactive or foreign cards", () => {
    const rows = [statement(), statement({ status: "PAID" }), statement({ kind: "MONTHLY_PROJECTION", status: "FORECAST" }), statement({ accountId: "foreign" })];
    expect(invoiceFunding([account(), card], rows, "2032-01-10").openCents).toBe(36000);
  });
  it("consumes today's cash once across months, includes known futures, rolls overdue into today", () => {
    const rows = [statement({ dueDate: "2031-12-12" }), statement({ id: "future", status: "FUTURE_KNOWN", dueDate: "2032-02-12", amountCents: 10000 })];
    const result = invoiceFunding([account(), card], rows, "2032-01-10");
    expect(result.overdueCount).toBe(1);
    expect(result.timeline).toEqual([{ month: "2032-01", amountCents: 36000, cumulativeCents: 36000, shortfallCents: 12000 }, { month: "2032-02", amountCents: 10000, cumulativeCents: 46000, shortfallCents: 22000 }]);
    expect(result.openCents).toBe(36000);
  });
  it("updates the possible debt as the cash balance or invoice status changes", () => {
    expect(invoiceFunding([account({ balanceCents: 40000 }), card], [statement()], "2032-01-10").shortfallCents).toBe(0);
    expect(invoiceFunding([account(), card], [statement({ status: "PAID" })], "2032-01-10").shortfallCents).toBe(0);
  });
});
