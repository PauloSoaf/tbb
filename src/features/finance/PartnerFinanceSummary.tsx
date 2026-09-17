"use client";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useFinanceCopy } from "./finance-copy";

export type FinanceScopeMetrics = { netWorthCents: number; incomeCents: number; expensesCents: number; balanceCents: number };

const localeCode = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;

function combine(me: FinanceScopeMetrics, partner: FinanceScopeMetrics): FinanceScopeMetrics {
  return {
    netWorthCents: me.netWorthCents + partner.netWorthCents,
    incomeCents: me.incomeCents + partner.incomeCents,
    expensesCents: me.expensesCents + partner.expensesCents,
    balanceCents: me.balanceCents + partner.balanceCents,
  };
}

export function PartnerFinanceSummary({ scope, me, partner, partnerName }: { scope: "partner" | "together"; me: FinanceScopeMetrics; partner: FinanceScopeMetrics; partnerName: string }) {
  const copy = useFinanceCopy();
  const { locale, t } = useI18n();
  const currency = (cents: number) => new Intl.NumberFormat(localeCode[locale], { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
  const savingsRate = (metrics: FinanceScopeMetrics) => (metrics.incomeCents ? Math.round(metrics.balanceCents / metrics.incomeCents * 100) : 0);

  const columns = scope === "partner"
    ? [{ key: "partner", label: partnerName, metrics: partner, readOnly: true }]
    : [
        { key: "me", label: t("partner.me"), metrics: me, readOnly: false },
        { key: "partner", label: partnerName, metrics: partner, readOnly: true },
        { key: "together", label: t("partner.together"), metrics: combine(me, partner), readOnly: true },
      ];

  return <section className="finance-overview-page">
    <div className="finance-monitor-grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}>
      {columns.map((column) => <article key={column.key} className="finance-overview-card stack">
        <header className="finance-card-heading">
          <div><h2>{column.label}</h2>{column.readOnly && <p className="muted">{t("partner.readonly_note")}</p>}</div>
        </header>
        <div className="finance-kpi-strip">
          <article className="finance-kpi" data-tone="primary"><div><small>{copy("netWorth")}</small><strong>{currency(column.metrics.netWorthCents)}</strong></div></article>
          <article className="finance-kpi" data-tone="success"><div><small>{copy("income")}</small><strong>{currency(column.metrics.incomeCents)}</strong></div></article>
          <article className="finance-kpi" data-tone="danger"><div><small>{copy("expenses")}</small><strong>{currency(column.metrics.expensesCents)}</strong></div></article>
          <article className="finance-kpi" data-tone={column.metrics.balanceCents >= 0 ? "success" : "danger"}><div><small>{copy("balance")}</small><strong>{currency(column.metrics.balanceCents)}</strong><span>{savingsRate(column.metrics)}%</span></div></article>
        </div>
      </article>)}
    </div>
  </section>;
}
