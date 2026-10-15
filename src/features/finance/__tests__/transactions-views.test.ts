import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({ saveGridTransactions: vi.fn(), bulkTransactions: vi.fn() }));
import { CsvExcelGrid } from "../CsvExcelGrid";
import { FinanceDataGrid, type FinanceGridRow } from "../FinanceDataGrid";
import { LedgerView } from "../LedgerView";

const accounts = [{ id: "acc", name: "Conta sintética" }];
const categories = [{ id: "cat", name: "Alimentação" }];
const saved = (id: string, description: string, notes = ""): FinanceGridRow => ({ id, date: "2032-03-10", description, merchant: "", categoryId: "cat", accountId: "acc", type: "EXPENSE", amount: "35,00", tags: "", notes, source: "MANUAL", createdAt: "2032-03-10T12:00:00.000Z", updatedAt: "2032-03-10T12:00:00.000Z" });
const draft = (id: string, description = ""): FinanceGridRow => ({ id, date: "2032-03-11", description, merchant: "", categoryId: "", accountId: "", type: "EXPENSE", amount: "", tags: "", notes: "", source: "DRAFT", draft: true });
const none = new Map<string, string>();
const noop = () => undefined;
const positions = (html: string, ...needles: string[]) => needles.map((needle) => html.indexOf(needle));

describe("F01 · the three views show drafts first", () => {
  const ordered = [draft("d-new", "Rascunho novo"), saved("a", "Padaria"), saved("b", "Mercado")];

  it("Lista: the editable draft card comes before every saved row", () => {
    const html = renderToStaticMarkup(createElement(LedgerView, { rows: ordered, accounts, categories, timeZone: "America/Manaus", invalid: none, onUpdate: noop, onRemoveDraft: noop }));
    const [draftAt, firstSaved] = positions(html, 'class="ledger-draft"', 'class="ledger-row"');
    expect(draftAt).toBeGreaterThan(-1);
    expect(draftAt).toBeLessThan(firstSaved);
    expect(html).toContain('data-row-id="d-new"');
    expect(html).toContain("Não salvo");
  });

  it("CSV / Excel: the draft is the first body row, marked as unsaved and discardable", () => {
    const html = renderToStaticMarkup(createElement(CsvExcelGrid, { rows: ordered, accounts, categories, invalid: none, onUpdate: noop, onSmartFill: noop, onAdd: noop, onRemoveDraft: noop, onOpenDetails: noop }));
    const body = html.slice(html.indexOf("<tbody>"));
    expect(body.indexOf("data-draft")).toBeGreaterThan(-1);
    expect(body.indexOf("data-draft")).toBeLessThan(body.indexOf("Padaria"));
    expect(body).toContain("Não salvo");
    expect(body).toContain('aria-label="Descartar este rascunho"');
  });

  it("Planilha: a draft passed last is rendered first, ahead of the saved rows", () => {
    const html = renderToStaticMarkup(createElement(FinanceDataGrid, { initialRows: [saved("a", "Padaria"), saved("b", "Mercado"), draft("d-late", "Rascunho tardio")], accounts, categories, today: "2032-03-11" }));
    const body = html.slice(html.indexOf("<tbody>"));
    const [draftAt, padaria, mercado] = positions(body, "Rascunho tardio", "Padaria", "Mercado");
    expect(draftAt).toBeGreaterThan(-1);
    expect(draftAt).toBeLessThan(padaria);
    expect(padaria).toBeLessThan(mercado);
    expect(body).toContain("Não salvo");
  });
});

describe("F02 · notes in the views", () => {
  it("Planilha: a note icon with the note's text only on rows that have one; the others offer to add it", () => {
    const html = renderToStaticMarkup(createElement(FinanceDataGrid, { initialRows: [saved("a", "Almoço", "dividido com Alexandre"), saved("b", "Cinema")], accounts, categories, today: "2032-03-11" }));
    expect(html).toContain("Observação de Almoço: dividido com Alexandre");
    expect(html).toContain("Adicionar observação a Cinema");
    expect(html.match(/data-has-note="true"/g)).toHaveLength(1);
  });

  it("Lista: expands to show the note, the details and the timestamps; the preview only exists with a note", () => {
    const html = renderToStaticMarkup(createElement(LedgerView, { rows: [saved("a", "Almoço", "dividido com Alexandre"), saved("b", "Cinema")], accounts, categories, timeZone: "America/Manaus", invalid: none, onUpdate: noop, onRemoveDraft: noop }));
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html.match(/class="ledger-note-preview"/g)).toHaveLength(1);
    expect(html).toContain("dividido com Alexandre");
    expect(html).toContain("Observação (opcional)");
    expect(html).toContain("Atualizado em");
  });

  it("CSV: the note has its own column; a multi-line note opens the details panel instead of being flattened", () => {
    const rows = [saved("a", "Almoço", "linha 1\nlinha 2"), saved("b", "Cinema", "uma linha")];
    const html = renderToStaticMarkup(createElement(CsvExcelGrid, { rows, accounts, categories, invalid: none, onUpdate: noop, onSmartFill: noop, onAdd: noop, onRemoveDraft: noop, onOpenDetails: noop }));
    expect(html).toContain("Observação");
    expect(html).toContain('class="excel-note-multiline"');
    expect(html).toContain('value="uma linha"');
  });

  it("escapes note text so it can never become markup", () => {
    const html = renderToStaticMarkup(createElement(LedgerView, { rows: [saved("a", "Almoço", '<img src=x onerror=alert(1)> & "aspas"')], accounts, categories, timeZone: "America/Manaus", invalid: none, onUpdate: noop, onRemoveDraft: noop }));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
