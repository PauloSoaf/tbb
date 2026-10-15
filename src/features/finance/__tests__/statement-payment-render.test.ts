import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../statement-actions", () => ({ registerStatementPayment: vi.fn(), undoManualStatementPayment: vi.fn() }));
import { StatementPaymentDialog, UndoPaymentButton, type PayableView } from "../StatementPaymentDialog";

const statement: PayableView = { id: "s1", version: "2032-10-10T10:00:00.000Z", accountId: "card", accountName: "Cartão sintético", dueDate: "2032-10-01", declaredCents: 500_000, addedCents: 0, paidCents: 0, outstandingCents: 500_000, amountIsOutstanding: false, sourceAsOf: "2032-09-24" };
const render = (extra: Partial<Parameters<typeof StatementPaymentDialog>[0]> = {}) => renderToStaticMarkup(createElement(StatementPaymentDialog, { statement, today: "2032-10-12", carryOptions: [{ id: "s2", dueDate: "2032-11-03", amountCents: 570_000, status: "OPEN" }], ...extra }));

describe("F03 · the payment dialog", () => {
  it("opens with nothing chosen: one click can never mark a bill paid", () => {
    const html = render();
    expect(html).not.toMatch(/<input[^>]*type="radio"[^>]*checked/);
    expect(html).toContain("O que aconteceu com esta fatura?");
    expect(html).not.toContain("Confirmo que esta fatura foi paga"); // the confirmation only appears after a valid choice
    expect(html).not.toContain("<form"); // nothing is submitted by markup alone
  });

  it("shows the bill's figures: total, payments already recorded and what is left", () => {
    const html = render({ statement: { ...statement, paidCents: 200_000, outstandingCents: 300_000 } });
    expect(html).toContain("Total da fatura");
    expect(html).toContain("Pagamentos já registrados");
    expect(html).toContain("Saldo restante");
    expect(html).toContain("3.000,00");
    expect(html).toContain("Quitar o saldo restante (");
  });

  it("offers the three outcomes with plain-language text and a labelled trigger", () => {
    const html = render();
    expect(html).toContain("Paguei só uma parte");
    expect(html).toContain("o resto foi para a próxima fatura");
    expect(html).toContain("Marcar como paga");
    expect(html).toContain('aria-label="Marcar como paga a fatura de Cartão sintético com vencimento 01/10/2032"');
  });

  it("the compact trigger is icon-only but still named", () => {
    const html = render({ compact: true });
    expect(html).toContain('class="icon-button"');
    expect(html).toContain("aria-label=");
  });

  it("the final button starts disabled", () => {
    expect(render()).toMatch(/<button[^>]*disabled[^>]*>Confirmar pagamento<\/button>/);
  });
});

describe("F03 · undo", () => {
  it("is a named button that asks again before reopening anything", () => {
    const html = renderToStaticMarkup(createElement(UndoPaymentButton, { statementId: "s1", version: "v", label: "Cartão 01/10/2032" }));
    expect(html).toContain("Desfazer baixa");
    expect(html).toContain("aria-label=\"Desfazer a baixa manual: Cartão 01/10/2032\"");
    expect(html).not.toContain("Sim, desfazer");
  });
});
