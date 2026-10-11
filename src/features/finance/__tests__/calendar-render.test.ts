import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ search: "month=2032-02&day=2032-02-29" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock("next/link", () => ({ default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => createElement("a", { href, className }, children) }));
vi.mock("@/lib/i18n/I18nContext", () => ({ useI18n: () => ({ locale: "pt" }) }));
vi.mock("../actions", () => ({ saveTransaction: vi.fn() }));
vi.mock("../CardExpenseDialog", () => ({ CardExpenseDialog: () => createElement("dialog", { className: "card-expense-dialog" }), CardExpenseButton: ({ children }: { children: ReactNode }) => createElement("button", {}, children) }));
vi.mock("motion/react", () => ({ useReducedMotion: () => true, AnimatePresence: ({ children }: { children: ReactNode }) => children, motion: {
  div: ({ children, className }: { children: ReactNode; className: string }) => createElement("div", { className }, children),
} }));
import { FinanceSpendingCalendar } from "../FinanceSpendingCalendar";
import type { CardExpenseStatement } from "../CardExpenseDialog";
const props = { today: "2032-02-29", initialMonth: { month: "2032-02", entries: [] }, accounts: [], categories: [] };
const render = (extra: Partial<Parameters<typeof FinanceSpendingCalendar>[0]> = {}) => renderToStaticMarkup(createElement(FinanceSpendingCalendar, { ...props, ...extra }));
beforeEach(() => { state.search = "month=2032-02&day=2032-02-29"; });
describe("calendar presentation", () => {
  it("initially shows only the compact strip and keeps dashboard query parameters independent", () => {
    state.search = "scope=me&month=2040-07&day=2040-07-12";
    const html = render({ compact: true });
    expect(html.match(/class="finance-cal-mini-day"/g)).toHaveLength(29);
    expect(html).not.toContain('class="finance-cal-days"');
    expect(html).not.toContain('class="finance-cal-day-panel"');
    expect(html).toContain('/finance/calendar?month=2032-02&amp;day=2032-02-29');
  });
  it("does not announce unqueried adjacent days as zero spending", () => {
    const html = render();
    const adjacent = [...html.matchAll(/<button[^>]*data-outside="true"[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]);
    expect(adjacent.length).toBeGreaterThan(0);
    for (const button of adjacent) {
      expect(button).toContain("Abrir o mês deste dia");
      expect(button).not.toContain("sem gastos");
      expect(button).not.toContain("R$");
    }
  });
  it("omits forms and mutation controls without WRITE even if card management was passed", () => {
    const html = render({ canWrite: false, canManageCards: true });
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain("Gasto no cartão");
    expect(html).not.toMatch(/<button[^>]*>[\s\S]*?Despesa<\/button>/);
    expect(render({ canWrite: true })).toContain('class="modal finance-calendar-add-dialog"');
  });
  it("explains undetailed statements without inventing daily purchases or expenses", () => {
    const statement: CardExpenseStatement = { id: "synthetic-bill", accountId: "card", kind: "STATEMENT", status: "OPEN", dueDate: "2032-03-12", closingDate: null, closingDay: null, referenceMonth: null, amountCents: 123456, detailedCents: 0 };
    const html = render({ statements: [statement], canManageCards: true });
    expect(html).toContain("Só as compras registradas aparecem nos dias");
    expect(html).toContain('href="/finance/statements"');
    expect(html).not.toContain("1.234,56");
    expect(html).not.toContain('class="finance-cal-entry"');
  });
  it("supports the lower date boundary and validates invalid URL days", () => {
    state.search = "month=1900-02&day=1900-02-29";
    expect(render({ initialMonth: { month: "1900-02", entries: [] } })).toContain('data-day="1900-02-01"');
    state.search = "month=1900-01";
    expect(() => render({ initialMonth: { month: "1900-01", entries: [] } })).not.toThrow();
  });
  it("disables navigation into the unsupported month at the upper boundary", () => {
    state.search = "month=9998-11";
    const html = render({ initialMonth: { month: "9998-11", entries: [] } });
    const adjacent = [...html.matchAll(/<button[^>]*data-day="9998-12-[^"]+"[^>]*>/g)].map(match => match[0]);
    expect(adjacent.length).toBeGreaterThan(0);
    expect(adjacent.every(button => button.includes('disabled=""'))).toBe(true);
  });
});
