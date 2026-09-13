"use client";

// Screen-only controls for the PDF preview.
//
// Zoom is a PURE visual magnifier — like zooming a PDF viewer — implemented
// with `transform: scale()`, which (unlike the CSS `zoom` property) never
// changes the layout box model. The content is rendered once at a pinned
// natural width; PagedMealPlanSheet measures via offsetWidth/offsetHeight
// (also transform-immune), so word wrap and page breaks are 100% independent
// of the zoom level — zooming never reflows a single word or moves a page
// break.
//
// Two distinct actions: "Imprimir" (browser print dialog) and "Baixar PDF"
// (a real PDF file generated client-side from the exact A4 page previews,
// via html2canvas + jsPDF). Both control clusters are print:hidden.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Download, Loader2, Minus, Plus, Printer, RotateCcw, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { consumeMealPlanPdfQuotaAction } from "@/actions/billing.action";

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

interface PdfPreviewControlsProps {
  children: ReactNode;
  fileName: string;
}

export function PdfPreviewControls({ children, fileName }: PdfPreviewControlsProps) {
  const [zoom, setZoom] = useState(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // measures how much horizontal space is available (never itself scaled)
  const availableRef = useRef<HTMLDivElement>(null);
  // the actual content: pinned to a fixed natural width, then visually scaled
  const contentRef = useRef<HTMLDivElement>(null);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = availableRef.current;
    if (!el) return;
    const measure = () => setNaturalWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setNaturalHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth, children]);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  const resetZoom = () => setZoom(100);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const quota = await consumeMealPlanPdfQuotaAction();
      if (!quota.allowed) {
        toast.error(`Limite de ${quota.limit} PDFs deste mês do seu plano atual foi atingido. Faça upgrade para gerar mais.`);
        return;
      }

      // The layout is ALREADY zoom-independent (transform-only), so there is
      // no need to reset zoom before capturing — html2canvas is told to
      // ignore the CSS transform via `pageEls` being read at their natural,
      // untransformed DOM size (offsetWidth/offsetHeight-based), and we
      // capture the pristine natural-width node directly.
      const root = contentRef.current;
      const pageEls = root ? Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-page]")) : [];
      if (pageEls.length === 0) return;

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const A4_WIDTH_MM = 210;

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          ignoreElements: (el) => el.hasAttribute("data-pdf-ignore"),
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const heightMm = (canvas.height / canvas.width) * A4_WIDTH_MM;
        if (i > 0) doc.addPage();
        doc.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, heightMm);
      }

      doc.save(`${slugify(fileName) || "plano-alimentar"}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const scale = zoom / 100;
  const scaledWidth = naturalWidth != null ? naturalWidth * scale : undefined;
  const scaledHeight = naturalHeight != null ? naturalHeight * scale : undefined;

  return (
    <>
      {/* Accessibility / zoom settings — top-right, below the navbar. Kept on
          the RIGHT so it never sits under the left sidebar at any width. */}
      <div className="fixed top-24 right-4 sm:right-8 z-50 print:hidden">
        {settingsOpen && (
          <div className="absolute right-0 top-12 w-64 rounded-2xl border border-border-neutral bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-text-primary">Acessibilidade</p>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Fechar configurações"
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Tamanho da visualização (zoom da página, não altera o texto do documento)
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                aria-label="Diminuir zoom"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-neutral text-text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-sm font-semibold text-text-primary tabular-nums">{zoom}%</span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                aria-label="Aumentar zoom"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-neutral text-text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              {zoom !== 100 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  aria-label="Restaurar zoom padrão"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-neutral text-text-secondary hover:bg-gray-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          aria-label="Configurações de acessibilidade"
          className={`flex items-center gap-2 rounded-full shadow-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
            settingsOpen
              ? "bg-brand-blue text-white border-brand-blue"
              : "bg-white text-text-primary border-border-neutral hover:bg-gray-50"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Acessibilidade</span>
          {zoom !== 100 && (
            <span className={`text-xs font-bold tabular-nums ${settingsOpen ? "text-white" : "text-brand-blue"}`}>
              {zoom}%
            </span>
          )}
        </button>
      </div>

      {/* Print + Download — two distinct actions, bottom-right (also clear of the sidebar) */}
      <div className="fixed bottom-8 right-4 sm:right-8 z-50 print:hidden flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={generating}
          className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-full shadow-lg hover:bg-brand-hover transition-all hover:scale-105 font-medium disabled:opacity-70 disabled:hover:scale-100"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {generating ? "Gerando PDF..." : "Baixar PDF"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white border border-border-neutral text-text-primary px-6 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-105 font-medium"
        >
          <Printer className="w-5 h-5" />
          Imprimir
        </button>
      </div>

      {/* Available-space probe — plain w-full, never transformed, always
          reports the real (unzoomed) width offered by the page layout. */}
      <div ref={availableRef} className="w-full print:hidden" />

      {/* Reserves the correctly scaled footprint in the page flow so
          surrounding content/scroll behaves right at any zoom level. */}
      <div
        className="mx-auto overflow-visible print:!w-auto print:!h-auto"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <div
          ref={contentRef}
          className="print:!w-auto print:![transform:none]"
          style={{ width: naturalWidth ?? undefined, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
