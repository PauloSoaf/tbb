"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AttentionBadge } from "./AttentionBadge";
import { Eye, AlertCircle, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { getDateFnsLocale } from "@/lib/i18n/formatters";

interface AnamneseSummaryCardProps {
  responseId: string;
  patientId?: string;
  patientName: string;
  submittedAt: Date;
  status: string;
  summary: string | null;
  attentionPoints: string[];
  tenantSlug: string;
}

export function AnamneseSummaryCard({
  responseId,
  patientId,
  patientName,
  submittedAt,
  status,
  summary,
  attentionPoints,
  tenantSlug,
}: AnamneseSummaryCardProps) {
  const { t, locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);

  const statusMap: Record<string, { text: string; pill: string; border: string }> = {
    NEW: {
      text: t("dashboard.anamnesis_status.new"),
      pill: "bg-brand-blue-soft text-brand-blue",
      border: "border-l-brand-blue",
    },
    REVIEWED: {
      text: t("dashboard.anamnesis_status.reviewed"),
      pill: "bg-emerald-50 text-emerald-700",
      border: "border-l-emerald-500",
    },
    ARCHIVED: {
      text: t("dashboard.anamnesis_status.archived"),
      pill: "bg-gray-100 text-gray-500",
      border: "border-l-gray-300",
    },
  };

  const statusInfo = statusMap[status] || statusMap.NEW;

  return (
    <div
      className={`bg-card-bg rounded-xl border border-border-neutral border-l-4 ${statusInfo.border}
        p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{patientName}</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {format(new Date(submittedAt), `dd/MM/yyyy '${t("common.at")}' HH:mm`, {
              locale: dateLocale,
            })}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.pill}`}
        >
          {statusInfo.text}
        </span>
      </div>

      {summary && (
        <p className="text-sm text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {summary}
        </p>
      )}

      {attentionPoints.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {attentionPoints.slice(0, 3).map((point, i) => (
            <AttentionBadge key={i} text={point.split(":")[0]} />
          ))}
          {attentionPoints.length > 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-warm-surface rounded-full">
              <AlertCircle className="w-3 h-3" />+{attentionPoints.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          prefetch={false}
          href={`/dashboard/${tenantSlug}/anamnese/${responseId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue transition-colors duration-200 hover:text-brand-blue-hover"
        >
          <Eye className="h-4 w-4" />
          {t("dashboard.view_anamnesis")}
        </Link>
        {patientId && (
          <Link
            prefetch={false}
            href={`/dashboard/${tenantSlug}/pacientes/${patientId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-brand-blue"
          >
            <User className="h-4 w-4" />
            {t("dashboard.open_patient")}
          </Link>
        )}
      </div>
    </div>
  );
}
