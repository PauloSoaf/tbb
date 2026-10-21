"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { useI18n } from "@/lib/i18n/I18nContext";
import { FinanceWriteProvider } from "./FinanceWriteAccess";

const PrivacyContext = createContext({ enabled: false, toggle: () => {} });
const rootsSelector = "#main-content, dialog[open], [role=dialog], .modal-backdrop, .modal-overlay, [role=tooltip], [class*=text-chart-tooltip], .floating-calculator-window";
const chartSelector = ".salary-donut, [data-finance-chart], .finance-spending-heatmap, svg:not(.lucide), canvas, [role=img]:not(.lucide), [role=progressbar], progress, meter, .credit-limit-bar, .credit-limit-track, .credit-limit-segments, .statement-composition-bar, .funding-chart";
const number = /\p{N}/u;
/** Areas that show the person's real money: the finance module and the connected-bank screen. */
const PRIVATE_AREAS = ["/finance", "/integrations/open-finance"];
export const privateArea = (pathname: string | null) => Boolean(pathname && PRIVATE_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`)));
const pendingBoundary = "[data-finance-privacy-boundary]:not([data-finance-hydrated])";

/** A streamed client subtree must hydrate before the scanner adds attributes or keyboard stops. */
export function useFinancePrivacyBoundary() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.setAttribute("data-finance-hydrated", "true");
    return () => { element?.removeAttribute("data-finance-hydrated"); };
  }, []);
  return { ref, "data-finance-privacy-boundary": "" };
}

/** Wrap the resolved server page, so streamed RSC content is not scanned before React claims it. */
export function FinancePrivacyBoundary({ children, canWrite = true }: { children: ReactNode; canWrite?: boolean }) {
  const boundary = useFinancePrivacyBoundary();
  return <FinanceWriteProvider canWrite={canWrite}><section {...boundary} className="finance-privacy-boundary">{children}</section></FinanceWriteProvider>;
}

/** Visual privacy for the financial routes, including portals. Attributes leave React's text nodes intact.
 * New data, tooltips and form values are scanned before the next paint through a MutationObserver. */
export function FinancePrivacyProvider({ initialEnabled, children }: { initialEnabled: boolean; children?: ReactNode }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(initialEnabled);
  const scope = useRef<HTMLDivElement>(null);
  const active = enabled && privateArea(pathname);
  const toggle = useCallback(() => {
    const next = !enabled;
    document.cookie = `tbb-finance-privacy=${next ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setEnabled(next);
  }, [enabled]);
  const context = useMemo(() => ({ enabled, toggle }), [enabled, toggle]);

  useEffect(() => {
    if (!active) return;
    const scopeElement = scope.current;
    document.documentElement.dataset.financePrivate = "true";
    const tagged = new Set<HTMLElement | SVGElement>();
    const focusable = new Set<HTMLElement>();
    let queued = false, stopped = false;
    function mark(element: HTMLElement | SVGElement, kind: string) {
      // Closed dialogs can hydrate lazily. They are scanned when opened, never while hidden.
      if (element.closest("[data-finance-privacy-skip],dialog:not([open]),[hidden],[aria-hidden=true]") || !element.checkVisibility({ visibilityProperty: true })) return;
      element.setAttribute("data-finance-sensitive", kind); tagged.add(element);
      if (element instanceof HTMLElement && !element.matches("a,button,input,select,textarea,[tabindex]") && !element.closest("a,button,input,select,textarea")) {
        element.tabIndex = 0; focusable.add(element);
      }
    }
    function scan() {
      queued = false;
      if (stopped) return;
      const roots = document.querySelectorAll(rootsSelector);
      if ([...roots].some(root => root.matches(pendingBoundary) || root.querySelector(pendingBoundary))) {
        scopeElement?.removeAttribute("data-privacy-ready");
        return;
      }
      for (const root of roots) {
        // Tag the stable native wrapper, not the custom element whose Shadow DOM upgrades during hydration.
        for (const value of root.querySelectorAll<HTMLElement>("[data-finance-number]")) mark(value, "number");
        for (const value of root.querySelectorAll<HTMLElement>("number-flow-react,number-flow")) {
          if (!value.closest("[data-finance-number]")) mark(value.parentElement ?? value, "number");
        }
        for (const chart of root.querySelectorAll<HTMLElement | SVGElement>(chartSelector)) {
          if (!chart.parentElement?.closest("[data-finance-sensitive=chart]")) mark(chart, "chart");
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!parent || !number.test(node.textContent ?? "") || parent.closest("script,style,noscript,option,number-flow-react,number-flow,[data-finance-number],[data-finance-sensitive=chart],[data-finance-privacy-skip],dialog:not([open]),[hidden],[aria-hidden=true]")) continue;
          mark(parent, "number");
        }
        for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type=password]):not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select")) {
          const value = input instanceof HTMLSelectElement ? input.selectedOptions[0]?.text ?? "" : input.value;
          if (number.test(value)) mark(input, "input");
        }
      }
      scopeElement?.setAttribute("data-privacy-ready", "true");
    }
    function schedule() { if (!queued && !stopped) { queued = true; queueMicrotask(scan); } }
    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "value", "open", "hidden", "aria-hidden", "data-finance-hydrated"] });
    document.addEventListener("input", schedule, true);
    document.addEventListener("change", schedule, true);
    return () => {
      stopped = true; observer.disconnect();
      document.removeEventListener("input", schedule, true); document.removeEventListener("change", schedule, true);
      delete document.documentElement.dataset.financePrivate;
      scopeElement?.removeAttribute("data-privacy-ready");
      for (const element of tagged) element.removeAttribute("data-finance-sensitive");
      for (const element of focusable) element.removeAttribute("tabindex");
    };
  }, [active, pathname]);

  return <PrivacyContext.Provider value={context}><div ref={scope} className="finance-privacy-scope" data-finance-private={active ? "true" : undefined}>{children}</div></PrivacyContext.Provider>;
}

const copy = {
  pt: { hide: "Ocultar valores e gráficos", show: "Mostrar valores e gráficos", hint: "Modo privado: valores e gráficos ficam desfocados. Passe o mouse ou use o foco para revelar apenas o que quiser ler." },
  en: { hide: "Hide values and charts", show: "Show values and charts", hint: "Private mode blurs values and charts. Hover or focus to temporarily reveal what you want to read." },
  es: { hide: "Ocultar valores y gráficos", show: "Mostrar valores y gráficos", hint: "El modo privado difumina valores y gráficos. Pasa el cursor o usa el foco para revelar lo que quieras leer." },
};
export function FinancePrivacyToggle() {
  const { enabled, toggle } = useContext(PrivacyContext);
  const { locale } = useI18n();
  const text = copy[locale];
  return <AppTooltip content={text.hint} side="bottom"><button type="button" className="icon-button finance-privacy-toggle" data-finance-privacy-skip data-active={enabled || undefined} aria-label={enabled ? text.show : text.hide} aria-pressed={enabled} onClick={toggle}>{enabled ? <EyeOff size={19}/> : <Eye size={19}/>}</button></AppTooltip>;
}
