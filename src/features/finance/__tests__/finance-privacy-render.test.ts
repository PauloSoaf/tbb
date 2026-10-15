import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const route = vi.hoisted(() => ({ pathname: "/finance" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/lib/i18n/I18nContext", () => ({ useI18n: () => ({ locale: "pt" }) }));
import { FinancePrivacyBoundary, FinancePrivacyProvider, FinancePrivacyToggle } from "../FinancePrivacy";

function render(enabled: boolean) {
  return renderToStaticMarkup(createElement(FinancePrivacyProvider, { initialEnabled: enabled }, createElement(FinancePrivacyToggle), createElement("main", { id: "main-content" }, "Saldo R$ 7.000,00")));
}
describe("financial privacy before hydration", () => {
  it("keeps streamed server page content behind a pending boundary on the first render", () => {
    const html = renderToStaticMarkup(createElement(FinancePrivacyBoundary, null, createElement("p", null, "Saldo R$ 700,00")));
    expect(html).toContain('data-finance-privacy-boundary=""');
    expect(html).not.toContain('data-finance-hydrated=');
    expect(html).toContain("Saldo R$ 700,00");
  });
  it("honours the server cookie on the first render, allowing CSS to protect the initial page", () => {
    route.pathname = "/finance";
    const html = render(true);
    expect(html).toContain('data-finance-private="true"');
    expect(html).not.toContain('data-privacy-ready="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Mostrar valores e gráficos");
  });
  it("leaves normal rendering readable until the user enables privacy", () => {
    route.pathname = "/finance/statements";
    const html = render(false);
    expect(html).not.toContain('data-finance-private="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Ocultar valores e gráficos");
  });
  it("keeps the preference without blurring non-financial routes", () => {
    route.pathname = "/tasks";
    expect(render(true)).not.toContain('data-finance-private="true"');
  });
});
