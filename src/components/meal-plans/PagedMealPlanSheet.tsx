"use client";

// Splits a meal-plan document into A4-proportioned page previews on screen —
// measuring each meal card's real rendered height and greedily packing them
// so NO card is ever cut across a page boundary. Print/PDF output is left
// untouched (browser pagination via the existing per-meal break-inside-avoid
// already worked correctly; this component only affects the on-screen
// preview, collapsing back into one continuous flow when printing).

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { MealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";

const A4_RATIO = 297 / 210; // height / width
const PAGE_PADDING_PX = 40; // fixed (not responsive) so JS measurement always matches what's rendered
const BLOCK_GAP_PX = 32; // matches space-y-8

interface MealBlock {
  key: string;
  node: ReactNode;
}

interface PagedMealPlanSheetProps {
  headerBlock: ReactNode;
  mealBlocks: MealBlock[];
  footerBlock: ReactNode;
  pdfStyle?: MealPlanPdfStyle;
  footerContext?: {
    pageLabel: string;
    ofLabel: string;
    generatedAt?: string | null;
    patientName?: string | null;
  };
}

interface Page {
  header?: boolean;
  meals: string[];
  footer?: boolean;
}

function watermarkPositionClass(position: MealPlanPdfStyle["watermarkPosition"]) {
  switch (position) {
    case "CENTER":
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    case "FOOTER":
      return "bottom-10 left-1/2 -translate-x-1/2";
    case "CORNER":
      return "right-8 top-8";
    case "DIAGONAL":
    default:
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[32deg]";
  }
}

function footerPositionClass(position: MealPlanPdfStyle["pageNumberPosition"]) {
  switch (position) {
    case "LEFT":
      return "left-10 text-left";
    case "CENTER":
      return "left-1/2 -translate-x-1/2 text-center";
    case "RIGHT":
    default:
      return "right-10 text-right";
  }
}

export function PagedMealPlanSheet({
  headerBlock,
  mealBlocks,
  footerBlock,
  pdfStyle,
  footerContext,
}: PagedMealPlanSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const mealRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pages, setPages] = useState<Page[] | null>(null);
  const [pageHeight, setPageHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const paginate = () => {
      // offsetWidth/offsetHeight (layout box) are used instead of
      // getBoundingClientRect (paint box) so a visual zoom applied by an
      // ancestor (transform: scale) NEVER changes pagination — only the
      // real, unscaled layout does.
      const width = container.offsetWidth;
      if (width === 0) return;
      // Reserve a footer strip only when the footer is baked into the exported
      // PDF. That keeps page numbers clear of meal cards in html2canvas.
      const pageFooterReserve = pdfStyle?.pageNumbers ? 24 : 0;
      const pageContentHeight = width * A4_RATIO - PAGE_PADDING_PX * 2 - pageFooterReserve;
      setPageHeight(width * A4_RATIO);

      const headerH = headerRef.current?.offsetHeight ?? 0;
      const footerH = footerRef.current?.offsetHeight ?? 0;
      const mealHeights = mealBlocks.map((m) => ({
        key: m.key,
        height: mealRefs.current.get(m.key)?.offsetHeight ?? 0,
      }));

      const result: Page[] = [];
      let current: Page = { header: true, meals: [] };
      let currentHeight = headerH;

      for (const { key, height } of mealHeights) {
        const additional = height + BLOCK_GAP_PX;
        // Never split a meal card — only break BEFORE it if the page already has content.
        if (currentHeight + additional > pageContentHeight && (current.header || current.meals.length > 0)) {
          result.push(current);
          current = { meals: [] };
          currentHeight = 0;
        }
        current.meals.push(key);
        currentHeight += additional;
      }

      if (currentHeight + footerH + BLOCK_GAP_PX <= pageContentHeight || (!current.header && current.meals.length === 0)) {
        current.footer = true;
        result.push(current);
      } else {
        result.push(current);
        result.push({ meals: [], footer: true });
      }

      setPages(result);
    };

    paginate();

    // Re-paginate when the available width changes (sidebar collapse/expand,
    // window resize) — page height is derived from width via the A4 ratio.
    const observer = new ResizeObserver(() => paginate());
    observer.observe(container);
    return () => observer.disconnect();
  }, [headerBlock, mealBlocks, footerBlock, pdfStyle?.pageNumbers]);

  const renderPageDecoration = (pageIndex: number, totalPages: number) => {
    const showWatermark = Boolean(
      pdfStyle?.watermarkEnabled &&
      (pdfStyle.watermarkRepeat || pageIndex === 0) &&
      (pdfStyle.watermarkType === "TEXT" ? pdfStyle.watermarkText : pdfStyle.watermarkImageUrl)
    );
    const showPageNumber = Boolean(pdfStyle?.pageNumbers && (pdfStyle.showFirstPage || pageIndex > 0));

    return (
      <>
        {showWatermark && pdfStyle && (
          <div
            aria-hidden
            className={`pointer-events-none absolute z-0 select-none ${watermarkPositionClass(pdfStyle.watermarkPosition)}`}
            style={{ opacity: pdfStyle.watermarkOpacity }}
          >
            {pdfStyle.watermarkType === "IMAGE" && pdfStyle.watermarkImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pdfStyle.watermarkImageUrl} alt="" className="h-40 w-40 object-contain" />
            ) : (
              <span className="whitespace-nowrap text-3xl font-bold tracking-[0.18em] text-slate-500">
                {pdfStyle.watermarkText}
              </span>
            )}
          </div>
        )}

        {showPageNumber && pdfStyle && footerContext && (
          <div
            className={`absolute bottom-4 z-10 max-w-[calc(100%-5rem)] text-[10px] font-medium leading-4 text-gray-500 ${footerPositionClass(pdfStyle.pageNumberPosition)}`}
          >
            <p>
              {pdfStyle.pageNumberFormat === "FRACTION"
                ? `${pageIndex + 1}/${totalPages}`
                : `${footerContext.pageLabel} ${pageIndex + 1} ${footerContext.ofLabel} ${totalPages}`}
            </p>
            {(pdfStyle.includeDate || pdfStyle.includePatientName) && (
              <p className="truncate text-[9px] text-gray-400">
                {[pdfStyle.includePatientName ? footerContext.patientName : null, pdfStyle.includeDate ? footerContext.generatedAt : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden measuring pass: same width/padding as real pages, laid out but invisible */}
      <div aria-hidden className="invisible absolute left-0 top-0 -z-10 w-full" style={{ padding: PAGE_PADDING_PX }}>
        <div ref={headerRef}>{headerBlock}</div>
        {mealBlocks.map((m) => (
          <div key={m.key} ref={(el) => { if (el) mealRefs.current.set(m.key, el); }} style={{ marginTop: BLOCK_GAP_PX }}>
            {m.node}
          </div>
        ))}
        <div ref={footerRef} style={{ marginTop: BLOCK_GAP_PX }}>{footerBlock}</div>
      </div>

      {pages === null ? (
        // Before the first measurement pass completes: render as a single page
        // so there is no blank flash (corrected before paint by useLayoutEffect
        // in the common case).
        <div
          className="bg-white text-text-primary rounded-md shadow-xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:p-0"
          style={{ padding: PAGE_PADDING_PX }}
        >
          {renderPageDecoration(0, 1)}
          <div className="relative z-10">
            {headerBlock}
            {mealBlocks.map((m) => (
              <div key={m.key} style={{ marginTop: BLOCK_GAP_PX }}>{m.node}</div>
            ))}
            <div style={{ marginTop: BLOCK_GAP_PX }}>{footerBlock}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0" data-pdf-page-count={pages.length}>
          {pages.map((page, i) => (
            <div
              key={i}
              data-pdf-page
              className="relative bg-white text-text-primary rounded-md shadow-xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:p-0 print:min-h-0"
              style={{ padding: PAGE_PADDING_PX, minHeight: pageHeight }}
            >
              {renderPageDecoration(i, pages.length)}
              <div className="relative z-10">
              {page.header && headerBlock}
              {page.meals.map((key, mi) => {
                const block = mealBlocks.find((m) => m.key === key);
                if (!block) return null;
                // No top margin only for the very first thing on the page.
                const isFirstOnPage = !page.header && mi === 0;
                return (
                  <div key={key} style={{ marginTop: isFirstOnPage ? 0 : BLOCK_GAP_PX }}>
                    {block.node}
                  </div>
                );
              })}
              {page.footer && (
                <div style={{ marginTop: page.header || page.meals.length > 0 ? BLOCK_GAP_PX : 0 }}>
                  {footerBlock}
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
