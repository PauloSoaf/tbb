"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useFinanceCopy, type FinanceCopyKey } from "./finance-copy";
import type { CreditLimitBreakdown as Breakdown, CreditRisk } from "./credit-limit";

const localeCode = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;
const riskKey: Record<Exclude<CreditRisk, "none">, FinanceCopyKey> = { info: "riskInfo", attention: "riskAttention", high: "riskHigh", critical: "riskCritical" };

/** Green available, yellow open bills, orange known future bills. Segments never exceed the bar;
 * an excess is spelled out apart, and values are always given in reais, not by color alone. */
export function CreditLimitBreakdown({ breakdown, editHref, compact = false }: { breakdown: Breakdown; editHref?: string; compact?: boolean }) {
  const t = useFinanceCopy();
  const { locale } = useI18n();
  const language = localeCode[locale];
  const money = (cents: number) => new Intl.NumberFormat(language, { style: "currency", currency: "BRL" }).format(cents / 100);
  const percent = (basisPoints: number) => `${(basisPoints / 100).toLocaleString(language, { maximumFractionDigits: basisPoints % 100 ? 1 : 0 })}%`;
  if (!breakdown.hasLimit || !breakdown.segments || breakdown.committedBasisPoints === null) {
    return <div className="credit-limit" data-risk="none" data-compact={compact || undefined}>
      <div className="credit-limit-head"><span>{t("limitMissing")}</span>{editHref && <Link href={editHref}>{t("limitInform")}</Link>}</div>
      <small className="credit-limit-known">{t("limitOpen")} {money(breakdown.openCents)} · {t("limitFuture")} {money(breakdown.futureCents)}</small>
    </div>;
  }
  const segments = [
    { key: "available", label: t("limitAvailable"), cents: breakdown.availableCents ?? 0, basisPoints: breakdown.segments.available },
    { key: "open", label: t("limitOpen"), cents: breakdown.openCents, basisPoints: breakdown.segments.open },
    { key: "future", label: t("limitFuture"), cents: breakdown.futureCents, basisPoints: breakdown.segments.future },
  ];
  const description = `${t("limitOf")} ${money(breakdown.limitCents!)}: ${segments.map((item) => `${item.label} ${money(item.cents)}`).join(", ")}${breakdown.excessCents ? `. ${t("limitExcess")} ${money(breakdown.excessCents)}` : ""}.`;
  const notes = [
    breakdown.unreconciledCents > 0 && `${t("limitUnreconciled")} ${money(breakdown.unreconciledCents)}.`,
    breakdown.forecastCents + breakdown.pendingCents > 0 && `${t("limitForecasts")} ${money(breakdown.forecastCents + breakdown.pendingCents)}.`,
    breakdown.incomplete && t("limitIncomplete"),
  ].filter(Boolean);
  return <div className="credit-limit" data-risk={breakdown.risk} data-compact={compact || undefined}>
    <div className="credit-limit-head"><span>{breakdown.risk === "none" ? t("limitOf") : t(riskKey[breakdown.risk])}</span><strong>{percent(breakdown.committedBasisPoints)} {t("limitCommitted")}</strong></div>
    <div className="credit-limit-bar" role="img" aria-label={description} title={description} tabIndex={compact ? undefined : 0}>
      {segments.filter((item) => item.basisPoints > 0).map((item) => <span key={item.key} data-segment={item.key} style={{ width: `${item.basisPoints / 100}%` }} title={`${item.label}: ${money(item.cents)}`}/>)}
    </div>
    <ul className="credit-limit-legend">
      {segments.map((item) => <li key={item.key}><i data-segment={item.key} aria-hidden="true"/><span>{item.label}</span><b>{money(item.cents)}</b></li>)}
    </ul>
    {breakdown.excessCents > 0 && <p className="credit-limit-excess" role="status"><AlertTriangle size={14} aria-hidden="true"/>{t("limitExcess")}: {money(breakdown.excessCents)}</p>}
    {!compact && notes.map((note) => <small className="credit-limit-note" key={String(note)}>{note}</small>)}
    {!compact && <small className="credit-limit-note">{t("limitEstimate")}</small>}
  </div>;
}
