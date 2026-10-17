import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ saveFixedExpense: vi.fn(), archiveFixedExpense: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/finance", useSearchParams: () => new URLSearchParams() }));
import { AllocationMembers, SalaryAllocationCard } from "../SalaryAllocationCard";
import { buildSalaryAllocation } from "../salary-allocation";
import type { FixedItem } from "../fixed-expenses";
import type { BillGroup } from "../salary-allocation";
import type { MonthPlan } from "../salary-plan";

// Synthetic figures only.
const item = (name: string, cents: number, kind: FixedItem["kind"] = "FIXED", patch: Partial<FixedItem> = {}): FixedItem => ({ kind, id: name, name, cents, plannedCents: cents, postedCents: 0, ...patch });
const bill = (key: string, toPayCents: number, paidCents = 0): BillGroup => ({ key, label: `Fatura ${key}`, toPayCents, paidCents, statements: [{ id: `${key}-1`, dueDate: "2032-10-20", toPayCents, paidCents }] });
type Input = { income?: number; items?: FixedItem[]; bills?: BillGroup[]; variable?: number; variablesKnown?: boolean; canSeeBills?: boolean; excluded?: number };
const render = ({ income = 550_000, items = [], bills = [], variable = 0, variablesKnown = true, canSeeBills = true, excluded = 0 }: Input = {}) => {
  const month = (key: string, index: number): MonthPlan => ({ month: key, incomeCents: income, items, bills: index === 0 ? bills : [], variableCents: index === 0 ? variable : 0, variablesKnown: index === 0 ? variablesKnown : false });
  return renderToStaticMarkup(createElement(SalaryAllocationCard, { plan: { months: ["2032-10", "2032-11", "2032-12"].map(month), canSeeBills, excludedDebtMinimumsCents: excluded }, expenses: [], cards: [], currentMonth: "2032-10" })).replace(/<!-- -->/g, "");
};

describe("the salary plan card", () => {
  it("keeps the privacy scanner out of the server-rendered chart until its client effect runs", () => {
    const html = render({ items: [item("Moradia", 100_000)] });
    expect(html).toContain('data-finance-privacy-boundary=""');
    expect(html).not.toContain('data-finance-hydrated=');
    expect(html.match(/class="salary-note"/g)).toHaveLength(3);
  });
  it("the Other detail shows all original names and amounts from both charts", () => {
    const allocation = buildSalaryAllocation({ incomeCents: 200_000, items: [item("Principal", 40_000), item("Segundo", 30_000), item("Streaming", 2_300, "SUBSCRIPTION"), item("Pequeno", 1_200)], variableCents: 0, maxItems: 3 });
    const other = allocation.slices.find(slice => slice.key === "other")!;
    const html = renderToStaticMarkup(createElement(AllocationMembers, { members: other.members! }));
    expect(html).toContain("Streaming"); expect(html).toContain("23,00"); expect(html).toContain("Assinatura");
    expect(html).toContain("Pequeno"); expect(html).toContain("12,00");
  });
  it("shows two charts, one with everything and one with only the fixed expenses", () => {
    const html = render({ items: [item("Gasolina", 120_000)], bills: [bill("Cartão A", 200_000)], variable: 40_000 });
    expect(html).toContain("Fixos, faturas e variáveis");
    expect(html).toContain("Só gastos fixos");
    expect(html.match(/class="salary-panel"/g)).toHaveLength(2);
    const [complete, fixedOnly] = html.split('<section class="salary-panel"').slice(1);
    expect(complete).toContain("Fatura Cartão A");
    expect(complete).toContain("Variáveis do mês");
    expect(fixedOnly).not.toContain("Fatura Cartão A");
    expect(fixedOnly).not.toContain("Variáveis do mês");
    expect(fixedOnly).toContain("Gasolina");
  });

  it("lists every destination with amount and percentage as text, so a chart never depends on color", () => {
    const html = render({ items: [item("Gasolina", 120_000), item("Diarista", 70_000), item("Cabelo", 40_000)] });
    for (const text of ["Gasolina", "Diarista", "Cabelo", "Sobra prevista"]) expect(html).toContain(text);
    expect(html).toContain("1.200,00");
    expect(html).toContain("3.200,00"); // what is left of the income
    expect(html).toMatch(/21,8%|22%/);
  });

  it("gives each figure one accessible description with every slice in it", () => {
    const html = render({ items: [item("Gasolina", 120_000)], bills: [bill("Cartão A", 200_000)] });
    const labels = [...html.matchAll(/<svg[^>]*role="img"[^>]*aria-label="([^"]+)"/g)].map((match) => match[1]);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toMatch(/^Fixos, faturas e variáveis\. Renda prevista R\$\s?5\.500,00: .*Fatura Cartão A/);
    expect(labels[1]).toMatch(/^Só gastos fixos\. Renda prevista R\$\s?5\.500,00: Gasolina/);
  });

  it("draws one arc per slice in each chart, all inside the circle (basis points of a 10 000 path)", () => {
    const html = render({ items: [item("Gasolina", 120_000), item("Cabelo", 40_000)], bills: [bill("Cartão A", 100_000)] });
    // complete: 2 fixed + 1 bill + free, plus the track; fixed only: 2 fixed + free, plus the track
    expect(html.match(/pathLength="10000"/g)).toHaveLength(4 + 3);
    const lengths = [...html.matchAll(/stroke-dasharray="(\d+) (\d+)"/g)].map((match) => Number(match[1]) + Number(match[2]));
    expect(lengths.every((total) => total === 10_000)).toBe(true);
  });

  it("keeps a planned card expense additional when no linked purchase proves coverage", () => {
    const html = render({ items: [item("Claude", 12_000, "FIXED", { cardId: "Cartão A" })], bills: [bill("Cartão A", 100_000)] });
    const complete = html.split('<section class="salary-panel"')[1];
    expect(complete).toContain("Claude");
    expect(complete).toContain("no cartão");
    expect(complete).toContain("1.000,00");
    expect(complete).not.toContain("880,00");
    expect(complete).toMatch(/Fatura Cartão A<\/span><b>R\$\s?1\.000,00/);
  });

  it("warns when the fixed expenses and the bills together pass the income, and says what to do", () => {
    const html = render({ items: [item("Aluguel", 300_000)], bills: [bill("Cartão A", 300_000), bill("Cartão B", 100_000)] });
    expect(html).toContain("Os compromissos passam do que a renda comporta");
    expect(html).toContain("tirá-la só deste gráfico");
    expect(html).toMatch(/R\$\s1\.500,00 acima da renda prevista de/); // fixed 3.000 + bills 4.000 against an income of 5.500
    expect(html.match(/role="alert"/g)).toHaveLength(1); // one alert, not the same warning twice
    expect(render({ items: [item("Aluguel", 100_000)], bills: [bill("Cartão A", 100_000)] })).not.toContain("passam do que a renda comporta");
  });

  it("shows a shortfall as an alert with its amount and no free slice, never a negative share", () => {
    const html = render({ income: 200_000, items: [item("Aluguel", 250_000)] });
    expect(html).toContain('role="alert"');
    expect(html).toContain("acima da renda prevista em");
    expect(html).toContain("500,00");
    expect(html).not.toContain("Sobra prevista</span>");
    expect(html).not.toMatch(/-\d+(,\d+)?%/);
    expect(html).toContain("Gastos fixos acima da renda prevista em"); // the fixed-only chart has its own alert
  });

  it("starts in the current month, can go forward but not back, and names the month in words", () => {
    const html = render({ items: [item("Aluguel", 100_000)] });
    expect(html).toContain("Outubro de 2032");
    expect(html).toMatch(/aria-label="Mês anterior" disabled/);
    expect(html).not.toMatch(/aria-label="Próximo mês" disabled/);
  });

  it("says what is not in the plan: card purchases come through the bill, and a plan is not the bank balance", () => {
    const html = render({ items: [item("Gasolina", 1_000)] });
    expect(html).toContain("Fixos apenas planejados no cartão não reduzem o valor da fatura");
    expect(html).toContain("Sobra prevista não é saldo bancário");
    expect(html).not.toContain("Variáveis futuras ainda não foram lançadas");
    expect(render({ items: [item("Gasolina", 1_000)], variablesKnown: false })).toContain("Variáveis futuras ainda não foram lançadas");
  });

  it("tells about debt minimums left out, and about bills only the owner can see", () => {
    expect(render({ items: [item("Gasolina", 1_000)], excluded: 35_000 })).toContain("Pagamentos mínimos de dívidas (R$");
    expect(render({ items: [item("Gasolina", 1_000)], canSeeBills: false })).toContain("As faturas de cartão são dados pessoais do titular");
    expect(render({ items: [item("Gasolina", 1_000)] })).not.toContain("dados pessoais do titular");
  });

  it("without income it still lists the commitments, and says the income is not set", () => {
    const html = render({ income: 0, items: [item("Aluguel", 100_000)] });
    expect(html).toContain("renda não definida");
    expect(html).toContain("Aluguel");
  });

  it("with nothing planned it explains what to do", () => {
    expect(render({ income: 0, items: [] })).toContain("Cadastre a renda prevista");
  });

  it("offers the grouping toggle as a labelled button group and the shortcut to edit the fixed expenses", () => {
    const html = render({ items: [item("Gasolina", 1_000)] });
    expect(html).toContain('role="group"');
    expect(html).toContain("Por item");
    expect(html).toContain("Por tipo");
    expect(html).toContain("Registrar gastos fixos");
  });
});
