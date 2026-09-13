"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AttentionBadge } from "@/components/dashboard/AttentionBadge";
import { ReviewButton } from "@/components/dashboard/ReviewButton";
import { AiSummaryCard } from "@/components/anamnese/AiSummaryCard";
import { useI18n } from "@/lib/i18n/I18nContext";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  HeartPulse,
  Utensils,
  AlertTriangle,
  Shield,
  FileText,
  Printer,
  Pencil,
} from "lucide-react";
import { AnamneseDeleteButton } from "@/components/anamnese/AnamneseDeleteButton";

type AnamneseData = {
  id: string;
  status: string;
  patientId: string;
  submittedAt: string;
  summary: string | null;
  attentionPoints: string[];
  patient: { name: string };
  payload: Record<string, string>;
};

interface AnamneseDetailPageClientProps {
  tenant: string;
  anamnese: AnamneseData;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-brand-blue" />
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DataRow({
  label,
  value,
  emptyLabel = "Sem resposta",
}: {
  label: string;
  value: string | undefined;
  emptyLabel?: string;
}) {
  const hasValue = value && value.trim();
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      {hasValue ? (
        <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="mt-1 inline-flex rounded-full border border-dashed border-border-neutral px-2 py-0.5 text-xs font-medium text-text-secondary">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

export function AnamneseDetailPageClient({ tenant, anamnese }: AnamneseDetailPageClientProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;
  const payload = anamnese.payload;

  const statusLabels: Record<string, { text: string; className: string }> = {
    NEW: { text: t("anamnese.status_new"), className: "bg-brand-blue-soft text-brand-blue" },
    REVIEWED: { text: t("anamnese.status_reviewed"), className: "bg-emerald-50 text-emerald-700" },
    ARCHIVED: { text: t("anamnese.status_archived"), className: "bg-gray-100 text-gray-600" },
  };

  const statusInfo = statusLabels[anamnese.status] || statusLabels.NEW;
  const noAnswerLabel = t("anamnese.no_answer", { defaultValue: "Sem resposta" });

  return (
    <>
      <DashboardHeader title={t("anamnese.title")} subtitle={anamnese.patient.name} />

      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href={`/dashboard/${tenant}/pacientes/${anamnese.patientId}`}
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("anamnese.back_to_patient")}
          </Link>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
            <Link
              href={`/dashboard/${tenant}/anamnese/${anamnese.id}/imprimir`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-beige hover:bg-border-neutral
                text-text-secondary text-xs font-medium rounded-full transition-colors"
              target="_blank"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("anamnese.print")}
            </Link>
            <Link
              href={`/dashboard/${tenant}/anamnese/${anamnese.id}/editar`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-bg hover:bg-warm-surface border border-border-neutral
                text-text-secondary text-xs font-medium rounded-full transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("anamnese.edit", { defaultValue: "Editar" })}
            </Link>
            <ReviewButton responseId={anamnese.id} currentStatus={anamnese.status} />
            <AnamneseDeleteButton
              tenant={tenant}
              responseId={anamnese.id}
              redirectHref={`/dashboard/${tenant}/pacientes/${anamnese.patientId}/anamnese`}
            />
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-neutral p-5">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-text-secondary">{t("anamnese.patient")}</span>{" "}
              <span className="font-medium text-text-primary">{anamnese.patient.name}</span>
            </div>
            <div>
              <span className="text-text-secondary">{t("anamnese.submitted_at")}</span>{" "}
              <span className="font-medium text-text-primary">
                {format(new Date(anamnese.submittedAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: dateLocale })}
              </span>
            </div>
          </div>
        </div>

        {anamnese.summary && (
          <div className="bg-brand-blue-soft/50 rounded-xl border border-brand-blue/10 p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-brand-blue" />
              <h2 className="text-lg font-semibold text-text-primary">{t("anamnese.summary_title")}</h2>
            </div>
            <p className="text-text-secondary leading-relaxed">{anamnese.summary}</p>
          </div>
        )}

        <AiSummaryCard anamnesisData={payload} />

        {anamnese.attentionPoints.length > 0 && (
          <div className="bg-attention/50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-text-primary">{t("anamnese.attention_points")}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {anamnese.attentionPoints.map((point, i) => (
                <AttentionBadge key={i} text={point} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section icon={User} title={t("anamnese.personal_data")}>
            <DataRow label={t("anamnese.name")} value={payload.name} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.phone")} value={payload.phone} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.email")} value={payload.email} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.birth_date")} value={payload.birthDate} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.weight")} value={payload.weight ? `${payload.weight} kg` : undefined} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.height")} value={payload.height ? `${payload.height} cm` : undefined} emptyLabel={noAnswerLabel} />
          </Section>

          <Section icon={FileText} title={t("anamnese.main_goal")}>
            <DataRow label={t("anamnese.goal")} value={payload.goal} emptyLabel={noAnswerLabel} />
          </Section>

          <Section icon={HeartPulse} title={t("anamnese.health_history")}>
            <DataRow label={t("anamnese.diseases")} value={payload.diseases} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.surgeries")} value={payload.surgeries} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.medications")} value={payload.medications} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.family_history")} value={payload.familyHistory} emptyLabel={noAnswerLabel} />
          </Section>

          <Section icon={Utensils} title={t("anamnese.dietary_routine")}>
            <DataRow label={t("anamnese.routine")} value={payload.dietaryRoutine} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.meal_times")} value={payload.mealTimes} emptyLabel={noAnswerLabel} />
          </Section>

          <Section icon={AlertTriangle} title={t("anamnese.habits_symptoms")}>
            <DataRow label={t("anamnese.sleep")} value={payload.sleepHabits} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.gut_health")} value={payload.gutHealth} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.symptoms")} value={payload.symptoms} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.allergies")} value={payload.allergies} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.intolerances")} value={payload.intolerances} emptyLabel={noAnswerLabel} />
            <DataRow label={t("anamnese.dietary_restrictions")} value={payload.dietaryRestrictions} emptyLabel={noAnswerLabel} />
          </Section>
        </div>

        <Section icon={Shield} title={t("anamnese.consent")}>
          <p className="text-sm text-emerald-600 font-medium">{t("anamnese.consent_agreed_short")}</p>
        </Section>
      </div>
    </>
  );
}
