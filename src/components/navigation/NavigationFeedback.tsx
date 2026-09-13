"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAVIGATION_TIMEOUT_MS = 15_000;

function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || (anchor.target && anchor.target.toLowerCase() !== "_self")
    || anchor.hasAttribute("download")
    || anchor.getAttribute("aria-disabled") === "true"
    || anchor.dataset.navigationFeedback === "off"
  ) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  return destination.pathname !== current.pathname || destination.search !== current.search;
}

/**
 * Provides one consistent, immediate signal for every internal navigation,
 * including legacy links that have not yet adopted PendingButtonLink.
 */
export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const pendingAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearPending = () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      pendingAnchorRef.current?.removeAttribute("data-navigation-pending");
      pendingAnchorRef.current = null;
      setPending(false);
    };

    clearPending();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !isPlainInternalNavigation(event, anchor)) return;

      pendingAnchorRef.current?.removeAttribute("data-navigation-pending");
      pendingAnchorRef.current = anchor;
      anchor.setAttribute("data-navigation-pending", "true");
      setPending(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        pendingAnchorRef.current?.removeAttribute("data-navigation-pending");
        pendingAnchorRef.current = null;
        timeoutRef.current = null;
        setPending(false);
      }, NAVIGATION_TIMEOUT_MS);
    };

    // Capture before Next's Link handler calls preventDefault() to perform the
    // client transition; a bubbling listener would miss most Next links.
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      pendingAnchorRef.current?.removeAttribute("data-navigation-pending");
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-1 overflow-hidden bg-brand-blue/15" role="status" aria-live="polite">
      <div className="h-full w-full animate-pulse bg-brand-blue shadow-[0_0_12px_var(--brand-blue)] motion-reduce:animate-none" />
      <span className="sr-only">Carregando página...</span>
    </div>
  );
}
