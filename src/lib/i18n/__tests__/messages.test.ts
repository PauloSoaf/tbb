import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "../I18nContext";
import { localeMessages, type Locale } from "../messages";
function ShellLabels() { const { t } = useI18n(); return createElement("button", { "aria-label": t("shell.sidebar_collapse") }, t("shell.back")); }
describe("server translation snapshot", () => {
  it.each<[Locale, string, string]>([["pt", "Voltar", "Recolher menu"], ["en", "Back", "Collapse menu"], ["es", "Volver", "Contraer menú"]])("renders navigation labels in %s without key fallbacks", (locale, back, collapse) => {
    const messages = localeMessages(locale);
    const snapshot = JSON.parse(JSON.stringify(messages));
    expect(renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale, initialMessages: snapshot }, createElement(ShellLabels)))).toBe(`<button aria-label="${collapse}">${back}</button>`);
  });
  it("honors the serialized server labels even if the client's dictionary differs", () => {
    const messages = { ...localeMessages("pt"), "shell.back": "Voltar ao resumo" };
    expect(renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "pt", initialMessages: messages }, createElement(ShellLabels)))).toContain("Voltar ao resumo");
  });
});
