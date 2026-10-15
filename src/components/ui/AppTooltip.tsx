"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface AppTooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayMs?: number;
  disabled?: boolean;
  /** Touch screens have no hover: a tap opens and closes the tooltip. Mouse and keyboard keep hover/focus. */
  touchToggle?: boolean;
}

const VIEWPORT_PADDING = 8;
const GAP = 8;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function AppTooltip({
  content,
  children,
  className = "",
  side = "top",
  align = "center",
  delayMs = 80,
  disabled = false,
  touchToggle = false,
}: AppTooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<string>("mouse");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const visible = open && !disabled;

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    showTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const horizontal =
      align === "start"
        ? triggerRect.left
        : align === "end"
        ? triggerRect.right - tooltipRect.width
        : triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const vertical =
      align === "start"
        ? triggerRect.top
        : align === "end"
        ? triggerRect.bottom - tooltipRect.height
        : triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;

    let top = triggerRect.top - tooltipRect.height - GAP;
    let left = horizontal;

    if (side === "bottom") top = triggerRect.bottom + GAP;
    if (side === "left") {
      top = vertical;
      left = triggerRect.left - tooltipRect.width - GAP;
    }
    if (side === "right") {
      top = vertical;
      left = triggerRect.right + GAP;
    }

    const overTop = top < VIEWPORT_PADDING;
    const overBottom = top + tooltipRect.height > viewportHeight - VIEWPORT_PADDING;
    const overLeft = left < VIEWPORT_PADDING;
    const overRight = left + tooltipRect.width > viewportWidth - VIEWPORT_PADDING;

    if (side === "top" && overTop) top = triggerRect.bottom + GAP;
    if (side === "bottom" && overBottom) top = triggerRect.top - tooltipRect.height - GAP;
    if (side === "left" && overLeft) left = triggerRect.right + GAP;
    if (side === "right" && overRight) left = triggerRect.left - tooltipRect.width - GAP;

    setPosition({
      top: clamp(top, VIEWPORT_PADDING, viewportHeight - tooltipRect.height - VIEWPORT_PADDING),
      left: clamp(left, VIEWPORT_PADDING, viewportWidth - tooltipRect.width - VIEWPORT_PADDING),
      ready: true,
    });
  }, [align, side]);

  const show = useCallback(() => {
    if (disabled || (touchToggle && pointerTypeRef.current === "touch")) return;
    clearTimers();
    showTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delayMs);
  }, [clearTimers, delayMs, disabled, touchToggle]);

  const hide = useCallback(() => {
    clearTimers();
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPosition((current) => ({ ...current, ready: false }));
    }, 40);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!visible || !touchToggle) return;
    // A tap anywhere else closes a tooltip that was opened by touch.
    const closeOutside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) { setOpen(false); setPosition((current) => ({ ...current, ready: false })); }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [visible, touchToggle]);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(updatePosition);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPosition((current) => ({ ...current, ready: false }));
      }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      aria-describedby={visible ? tooltipId : undefined}
      onPointerDown={touchToggle ? (event) => { pointerTypeRef.current = event.pointerType; } : undefined}
      onClick={touchToggle ? () => { if (pointerTypeRef.current === "touch" && !disabled) { clearTimers(); setOpen((current) => !current); if (open) setPosition((current) => ({ ...current, ready: false })); } } : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={tooltipId}
            ref={tooltipRef}
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
              opacity: position.ready ? 1 : 0,
            }}
            className="pointer-events-none fixed z-[1000] max-w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-[var(--tooltip-border,var(--border-neutral))] bg-[var(--tooltip-bg,var(--card-bg))] px-2.5 py-1.5 text-xs font-medium leading-snug text-[var(--tooltip-foreground,var(--text-primary))] shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur transition-opacity duration-100"
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}
