"use client";

// Small shared UI bits for Demo Mode pages — kept in one module so demo
// screens stay compact and visually consistent with the real design system
// (same tokens: card-bg, border-neutral, brand-blue, surface-warm…).

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { useI18n } from "@/lib/i18n/I18nContext";

export function DemoCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-border-neutral bg-card-bg p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-text-primary">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function DemoStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border-neutral bg-card-bg p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-primary">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

/** Lightweight inline SVG sparkline — no chart library on the demo bundle. */
export function DemoSparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2) {
    return <div className={`h-16 rounded-xl bg-surface-warm ${className}`} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - min) / range) * 32}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`h-16 w-full ${className}`} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-blue, #2563eb)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Disabled control for features that require the real backend. */
export function DemoUnavailable({ children, notice }: { children: ReactNode; notice?: string }) {
  const { t } = useI18n();
  return (
    <AppTooltip content={notice ?? t("demo.notice.unavailable_in_demo")} side="top" align="center">
      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-border-neutral bg-surface-warm px-3 py-2 text-sm font-semibold text-text-secondary opacity-70">
        <Lock className="h-3.5 w-3.5" />
        {children}
      </span>
    </AppTooltip>
  );
}
