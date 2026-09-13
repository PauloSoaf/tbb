"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children directly into document.body via a React portal.
 * This ensures fixed/absolute positioned overlays (drawers, modals) are
 * never clipped or covered by parent stacking contexts (sticky sidebar,
 * navbar z-index, etc.).
 */
export function FloatingPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.dataset.floatingPortal = "true";
    document.body.appendChild(el);
    portalRef.current = el;
    setMounted(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!mounted || !portalRef.current) return null;
  return createPortal(children, portalRef.current);
}
