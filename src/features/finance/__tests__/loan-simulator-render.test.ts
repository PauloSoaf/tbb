import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../loan-actions", () => ({ saveLoanComparison: vi.fn(), deleteLoanComparison: vi.fn() }));
vi.mock("@/components/TbbCharts", () => ({ LoanCostChart: ({ data }: { data: unknown[] }) => createElement("div", { "data-chart": "loan-cost", "data-points": String(data.length) }) }));
import { LoanSimulator, type SavedComparison } from "../LoanSimulator";
import { emptyBudget, emptyForm, payloadOf, simulate } from "../loan-comparison";

// Synthetic figures only: nothing here is anyone's real bill, income or rate.
const base = { today: "2032-10-12", locale: "pt-BR", suggestedIncomeCents: 550_000, suggestedCommitmentsCents: 200_000, saved: [] as SavedComparison[],
  statements: [{ id: "st1", label: "Cartão sintético · vence 03/11/2032", outstandingCents: 420_000 }] };
const render = (extra: Partial<Parameters<typeof LoanSimulator>[0]> = {}) => renderToStaticMarkup(createElement(LoanSimulator, { ...base, ...extra })).replace(/<!-- -->/g, "");
const saved = (patch: { forms?: ReturnType<typeof emptyForm>[]; budget?: Parameters<typeof emptyBudget>[0] } = {}): SavedComparison => ({
  id: "c1", name: "Fatura de novembro", updatedOn: "2032-10-12",
  payload: payloadOf(simulate(patch.forms ?? [
    emptyForm("now", "2032-10-12", { name: "Quitar agora", system: "CASH", product: "CARD_STATEMENT" }),
    emptyForm("x12", "2032-10-12", { name: "Parcelar em 12x", product: "CARD_STATEMENT", rate: "3,99", installments: "12", informedCet: "60" }),
    emptyForm("loan", "2032-10-12", { name: "Empréstimo", rate: "2,2", installments: "24" }),
  ], emptyBudget({ needed: "4.200,00", income: "5.500,00", commitments: "2.000,00", ...patch.budget }))),
});
const buttonTag = (html: string, label: string) => new RegExp(`<button[^>]*>(?:(?!</button>).)*${label}`).exec(html)?.[0] ?? "";

describe("F06 · the simulator screen, before anything is typed", () => {
  it("says up front that it is a study: no contract, no offer, no bank access, no password", () => {
    const html = render();
    expect(html).toContain("É uma simulação para comparar caminhos");
    expect(html).toContain("não contrata nada, não é oferta e não acessa seu banco nem pede senha");
    expect(html).toContain("informados por você");
    expect(html).toContain("estimativa");
    expect(html).toContain("Salvar não cria dívida, parcela nem altera nenhuma fatura");
  });
  it("starts with two scenarios, pay now and installments, and no numbers or errors made up", () => {
    const html = render();
    expect(html).toContain("Cenários (2/5)");
    expect(html).toContain("Quitar agora");
    expect(html).toContain("Parcelar a fatura");
    expect(html).toContain("Informe o valor a resolver para ver os números.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("loan-problems"); // no red alert before the user has typed anything
    expect(html).not.toContain("Mais barato");
  });
  it("starts from the plan's income and fixed expenses, and says what it assumed", () => {
    const html = render();
    expect(html).toMatch(/renda R\$\s5\.500,00 · gastos R\$\s2\.000,00/);
    expect(html).toContain('value="5500,00"');
    expect(html).toContain('value="2000,00"');
    expect(html).toContain("Começa só com seus gastos fixos");
  });
  it("without an income it asks for one instead of judging the budget", () => {
    const html = render({ suggestedIncomeCents: 0, suggestedCommitmentsCents: 0 });
    expect(html).toContain("informe a renda para ver se cabe");
  });
  it("offers the open and future bills to start from, with their amounts", () => {
    const html = render();
    expect(html).toContain("Digitar o valor");
    expect(html).toMatch(/Cartão sintético · vence 03\/11\/2032 · R\$\s4\.200,00/);
  });
  it("cannot save before the comparison has a name", () => {
    const html = render();
    expect(buttonTag(html, "Salvar comparação")).toContain("disabled");
    expect(html).not.toContain("Salvar como nova");
  });
});

describe("F06 · the comparison", () => {
  const html = () => render({ initial: saved() });

  it("labels each figure by where it comes from: estimated here, informed by the bank, or typed by the user", () => {
    const out = html();
    for (const heading of ["Pago na hora", "Maior parcela", "Total pago", "Custo do crédito", "CET estimado", "CET informado", "Pior mês", "Meses no vermelho"]) expect(out, heading).toContain(`>${heading}</th>`);
    expect(out).toContain("estimado</small>");
    expect(out).toContain("informado por você</small>");
    expect(out).toMatch(/60,00% a\.a\./); // the CET typed in, shown as informed
  });
  it("answers two different questions, cheapest overall and most room in the budget, and explains the difference", () => {
    const out = html();
    expect(out.match(/Mais barato/g)).toHaveLength(1);
    expect(out.match(/Mais folga no orçamento/g)).toHaveLength(1);
    expect(out).toContain("Menor parcela não significa menor custo");
    // paying R$ 4.200 at once is the cheapest, but it leaves that month R$ 700 short
    expect(out).toMatch(/-R\$\s700,00/);
    expect(out).toContain('data-negative="true"');
  });
  it("draws the cost chart only when there is something to compare", () => {
    expect(html()).toContain('data-chart="loan-cost" data-points="3"');
    expect(render()).not.toContain("data-chart");
  });
  it("shows the schedule month by month, with what is left of the income", () => {
    const out = html();
    expect(out).toContain("Cronograma e fluxo de caixa");
    expect(out.match(/<th scope="row">\d+<\/th>/g)).toHaveLength(12);
    expect(out).toContain("Sobra do mês");
    expect(out).toContain("Saldo devedor");
  });
  it("shows what is paid on the spot as its own first row", () => {
    const out = render({ initial: saved({ forms: [
      emptyForm("now", "2032-10-12", { name: "Quitar agora", system: "CASH" }),
      emptyForm("down", "2032-10-12", { name: "Entrada e 6x", rate: "2", installments: "6", down: "1.000,00", iof: "30,00" }),
    ] }) });
    expect(out).toContain('<th scope="row">Na hora</th>');
    expect(out).toMatch(/Na hora<\/th><td>12\/10\/2032<\/td><td class="statement-amount">R\$\s1\.030,00/);
  });
  it("keeps an incomplete scenario out of the numbers and says what is missing", () => {
    const out = render({ initial: saved({ forms: [
      emptyForm("now", "2032-10-12", { name: "Quitar agora", system: "CASH" }),
      emptyForm("norate", "2032-10-12", { name: "Sem taxa", rate: "" }),
    ] }) });
    expect(out).toContain("Incompleto");
    expect(out).toContain("Informe a taxa mensal para calcular.");
    expect(out).toContain("Sem dados suficientes para comparar: Sem taxa.");
    expect(out).not.toContain("Mais barato"); // one complete scenario is not a comparison
    expect(out).not.toContain("data-chart"); // nor is it worth a chart
  });
  it("does not rank anything when the income is unknown, and still compares the cost", () => {
    const out = render({ initial: saved({ budget: { income: "" } }) });
    expect(out).toContain("Informe a renda mensal para ver qual opção cabe melhor no orçamento");
    expect(out.match(/Mais barato/g)).toHaveLength(1);
    expect(out).not.toContain("Mais folga no orçamento");
  });
  it("warns about the 100% cap on a card bill whose charges reach the original debt", () => {
    const out = render({ initial: saved({ forms: [
      emptyForm("now", "2032-10-12", { name: "Quitar agora", system: "CASH", product: "CARD_STATEMENT" }),
      emptyForm("heavy", "2032-10-12", { name: "Parcelar longo", product: "CARD_STATEMENT", rate: "14", installments: "60" }),
    ] }) });
    expect(out).toContain("teto legal de 100%");
  });
});

describe("F06 · saved comparisons", () => {
  it("lists them with the date in the workspace's format, and a labelled way to delete each", () => {
    const out = render({ saved: [saved()] });
    expect(out).toContain("Fatura de novembro");
    expect(out).toContain("3 cenário(s) · atualizada em 12/10/2032");
    expect(out).toContain('aria-label="Excluir a comparação Fatura de novembro"');
    expect(out).toContain(">Abrir<");
  });
  it("reopening one offers to update it or to save a copy, never silently overwriting", () => {
    const out = render({ initial: saved() });
    expect(out).toContain("Atualizar a salva");
    expect(out).toContain("Salvar como nova");
    expect(out).toContain('value="Fatura de novembro"');
    expect(buttonTag(out, "Atualizar a salva")).not.toContain("disabled");
  });
});
