import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ saveFixedExpense: vi.fn(), archiveFixedExpense: vi.fn() }));
import { FixedExpensesDialog, shortMonth, type FixedExpenseRow } from "../FixedExpensesDialog";

// Synthetic figures only.
const expense = (patch: Partial<FixedExpenseRow> = {}): FixedExpenseRow => ({ id: "e1", name: "Resort sintético", amountCents: 55_000, dueDay: 2, notes: null, endsOn: null, cardAccountId: null, ...patch });
const render = (expenses: FixedExpenseRow[] = [], cards = [{ id: "c1", name: "Cartão A" }]) =>
  renderToStaticMarkup(createElement(FixedExpensesDialog, { expenses, cards, currentMonth: "2032-10" })).replace(/<!-- -->/g, "");

describe("the fixed expense form", () => {
  it("asks for an optional end date and says what it does", () => {
    const html = render();
    expect(html).toContain("Termina em (opcional)");
    expect(html).toMatch(/<input type="date" min="2000-01-01" max="2100-12-31" name="endsOn"/);
    expect(html).toContain("Até o mês dessa data o gasto conta");
    expect(html).not.toMatch(/name="endsOn"[^>]*required/);
  });
  it("offers the credit cards as an optional link, with \"not on a card\" first, and explains why it matters", () => {
    const html = render([], [{ id: "c1", name: "Cartão A" }, { id: "c2", name: "Cartão B" }]);
    expect(html).toContain("Cobrado no cartão (opcional)");
    expect(html).toMatch(/<select name="cardAccountId"[^>]*><option value="" selected="">Não é no cartão<\/option><option value="c1">Cartão A<\/option><option value="c2">Cartão B<\/option>/);
    expect(html).toContain("A fatura mant\u00e9m seu valor integral");
  });
  it("shows no card question when there is no credit card to choose from", () => {
    expect(render([], [])).not.toContain("cardAccountId");
  });
  it("opens an edit form with the saved end date and card already chosen", () => {
    const html = render([expense({ endsOn: "2032-12-02", cardAccountId: "c1" })]);
    expect(html).toMatch(/type="date" min="2000-01-01" max="2100-12-31" name="endsOn" value="2032-12-02"/);
    expect(html).toMatch(/<option value="c1" selected="">Cartão A<\/option>/);
  });
});

describe("the list of fixed expenses", () => {
  it("writes the end month by hand, the same on the server and in the browser", () => {
    expect(shortMonth("2032-12-02")).toBe("dez/2032");
    expect(shortMonth("2033-01-31")).toBe("jan/2033");
  });
  it("says when an expense ends, when it already ended, and which card it is charged to", () => {
    const html = render([expense({ endsOn: "2032-12-02", cardAccountId: "c1" }), expense({ id: "e2", name: "Curso sintético", endsOn: "2032-08-30" }), expense({ id: "e3", name: "Sem fim", dueDay: null })]);
    expect(html).toContain("Previsto para dia 2 · termina em dez/2032 · cobrado no cartão Cartão A");
    expect(html).toContain("encerrado em ago/2032");
    expect(html.match(/data-ended="true"/g)).toHaveLength(1);
    expect(html).toContain("Dia não definido");
  });
  it("an expense that ends this month has not ended yet", () => {
    expect(render([expense({ endsOn: "2032-10-31" })])).toContain("termina em out/2032");
  });
  it("points out a link to a card that is no longer active instead of hiding it", () => {
    expect(render([expense({ cardAccountId: "gone" })])).toContain("cartão arquivado");
  });
});
