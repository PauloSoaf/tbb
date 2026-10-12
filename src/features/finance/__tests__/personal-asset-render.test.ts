import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
vi.mock("../personal-asset-actions", () => ({ savePersonalAsset: vi.fn(), setPersonalAssetArchived: vi.fn() }));
import { PersonalAssetsPage } from "../PersonalAssetsPage";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import type { PersonalAssetRow } from "../personal-assets";
const asset: PersonalAssetRow = { id: "asset", name: "Synthetic vehicle", kind: "VEHICLE", valueCents: 12345, valuationDate: "2032-01-09", purchaseValueCents: null, purchaseDate: null, notes: null, debtId: null, debt: null, archivedAt: null, version: 1 };
describe("personal asset controls", () => {
  it("hides all mutation forms from readers", () => {
    const html = renderToStaticMarkup(createElement(PersonalAssetsPage, { assets: [asset], debts: [], today: "2032-01-10", canWrite: false }));
    expect(html).toContain("Synthetic vehicle");
    expect(html).not.toContain("<form"); expect(html).not.toContain("<dialog");
  });
  it("provides creation, versioned editing and confirmation for archiving", () => {
    const html = renderToStaticMarkup(createElement(PersonalAssetsPage, { assets: [asset], debts: [], today: "2032-01-10", canWrite: true }));
    expect(html).toContain("Cadastrar bem"); expect(html).toContain('name="version"'); expect(html).toContain('value="ARCHIVE"');
    expect(html).toContain("Isso não registra uma venda"); expect(html).toContain('max="2032-01-10"');
  });
  it("keeps archived assets available for restoration without including them in the total", () => {
    const html = renderToStaticMarkup(createElement(PersonalAssetsPage, { assets: [{ ...asset, archivedAt: "2032-01-10" }], debts: [], today: "2032-01-10", canWrite: true }));
    expect(html).toContain("Nenhum bem cadastrado"); expect(html).toContain('value="RESTORE"');
    expect(html).toContain("Bens arquivados");
  });
  it.each(["en", "es"] as const)("renders localized controls with %s SSR locale", locale => {
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale }, createElement(PersonalAssetsPage, { assets: [asset], debts: [], today: "2032-01-10", canWrite: true })));
    expect(html).toContain(locale === "en" ? "Add asset" : "Registrar bien");
    expect(html).not.toContain("Cadastrar bem");
  });
});
