"use client";

import { useState } from "react";
import Link from "next/link";
import { AudioLines, ClipboardList, FileText, Loader2, Ruler, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type ClinicalTab = "prontuario" | "anamnese" | "anthropometry" | "transcription";

interface CareSessionClinicalTabsProps {
  tenantSlug: string;
  patientId: string;
  patientName: string;
  notes: string;
  clinicalSummary: string;
  savingNotes: boolean;
  onNotesChange: (value: string) => void;
  onClinicalSummaryChange: (value: string) => void;
  onSaveNotes: () => void;
  latestAnamnese?: {
    id: string;
    status: string;
    submittedAt: string;
  } | null;
  latestMeasurement?: {
    id: string;
    measuredAt: string;
    weight: number | null;
    bmi: number | null;
    bodyFatPercentage: number | null;
  } | null;
  transcriptionContent?: React.ReactNode;
}

const tabs: Array<{ id: ClinicalTab; icon: typeof FileText; labelKey: string; fallback: string }> = [
  { id: "prontuario", icon: FileText, labelKey: "care_session.clinical_tabs.prontuario", fallback: "Prontuario" },
  { id: "anamnese", icon: ClipboardList, labelKey: "care_session.clinical_tabs.anamnese", fallback: "Anamnese" },
  { id: "anthropometry", icon: Ruler, labelKey: "care_session.clinical_tabs.anthropometry", fallback: "Antropometria" },
  { id: "transcription", icon: AudioLines, labelKey: "transcription.title", fallback: "Transcricao" },
];

export function CareSessionClinicalTabs({
  tenantSlug,
  patientId,
  patientName,
  notes,
  clinicalSummary,
  savingNotes,
  onNotesChange,
  onClinicalSummaryChange,
  onSaveNotes,
  latestAnamnese,
  latestMeasurement,
  transcriptionContent,
}: CareSessionClinicalTabsProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ClinicalTab>(
    transcriptionContent ? "transcription" : "prontuario"
  );
  const patientBaseHref = `/dashboard/${tenantSlug}/pacientes/${patientId}`;

  return (
    <aside className="rounded-2xl border border-border-neutral bg-card-bg shadow-sm">
      <div className="border-b border-border-neutral p-3">
        <p className="px-1 text-xs font-bold uppercase tracking-wide text-brand-blue">
          {t("care_session.clinical_tabs.title", { defaultValue: "Apoio clinico" })}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-warm-surface p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-card-bg text-brand-blue shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline lg:hidden xl:inline">
                  {t(tab.labelKey, { defaultValue: tab.fallback })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {activeTab === "prontuario" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">
                {t("care_session.notes_internal_label")}
              </label>
              <textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border-neutral bg-warm-surface p-3 text-sm text-text-primary outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                placeholder={t("care_session.notes_internal_placeholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">
                {t("care_session.notes_clinical_label")}
              </label>
              <textarea
                value={clinicalSummary}
                onChange={(event) => onClinicalSummaryChange(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border-neutral bg-warm-surface p-3 text-sm text-text-primary outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                placeholder={t("care_session.notes_clinical_placeholder")}
              />
            </div>
            <button
              type="button"
              onClick={onSaveNotes}
              disabled={savingNotes}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
            >
              {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingNotes ? t("care_session.notes_saving") : t("care_session.notes_save")}
            </button>
          </div>
        )}

        {activeTab === "anamnese" && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {latestAnamnese
                ? t("care_session.clinical_tabs.latest_anamnese", {
                    date: new Date(latestAnamnese.submittedAt).toLocaleDateString(),
                    defaultValue: `Ultima anamnese em ${new Date(latestAnamnese.submittedAt).toLocaleDateString()}`,
                  })
                : t("care_session.clinical_tabs.no_anamnese", { defaultValue: "Nenhuma anamnese registrada para este paciente." })}
            </p>
            <div className="grid gap-2">
              {latestAnamnese && (
                <Link
                  href={`/dashboard/${tenantSlug}/anamnese/${latestAnamnese.id}`}
                  className="rounded-xl border border-border-neutral px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand-blue/30 hover:text-brand-blue"
                >
                  {t("care_session.clinical_tabs.open_latest_anamnese", { defaultValue: "Abrir ultima anamnese" })}
                </Link>
              )}
              <Link
                href={`${patientBaseHref}/anamnese/nova`}
                className="rounded-xl bg-brand-blue px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
              >
                {t("care_session.clinical_tabs.new_anamnese", { defaultValue: "Nova anamnese" })}
              </Link>
              <Link
                href={`${patientBaseHref}/anamnese`}
                className="rounded-xl border border-border-neutral px-3 py-2 text-center text-sm font-semibold text-text-secondary transition-colors hover:border-brand-blue/30 hover:text-brand-blue"
              >
                {t("care_session.clinical_tabs.history", { defaultValue: "Ver historico" })}
              </Link>
            </div>
          </div>
        )}

        {activeTab === "anthropometry" && (
          <div className="space-y-3">
            {latestMeasurement ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Peso" value={latestMeasurement.weight ? `${latestMeasurement.weight} kg` : "-"} />
                <Metric label="IMC" value={latestMeasurement.bmi ? String(latestMeasurement.bmi) : "-"} />
                <Metric label="% Gord." value={latestMeasurement.bodyFatPercentage ? `${latestMeasurement.bodyFatPercentage}%` : "-"} />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                {t("care_session.clinical_tabs.no_measurement", { defaultValue: "Nenhum registro antropometrico cadastrado." })}
              </p>
            )}
            <div className="grid gap-2">
              <PendingButtonLink
                href={`${patientBaseHref}/avaliacoes/nova`}
                pendingLabel="Abrindo..."
                className="rounded-xl bg-brand-blue px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
              >
                {t("care_session.clinical_tabs.new_measurement", { defaultValue: "Nova avaliacao" })}
              </PendingButtonLink>
              <PendingButtonLink
                href={`${patientBaseHref}/avaliacoes`}
                pendingLabel="Abrindo..."
                className="rounded-xl border border-border-neutral px-3 py-2 text-center text-sm font-semibold text-text-secondary transition-colors hover:border-brand-blue/30 hover:text-brand-blue"
              >
                {t("care_session.clinical_tabs.measurement_history", { defaultValue: "Historico antropometrico" })}
              </PendingButtonLink>
            </div>
          </div>
        )}

        {activeTab === "transcription" &&
          (transcriptionContent ?? (
            <p className="text-sm text-text-secondary">
              {t("transcription.inactive")}
            </p>
          ))}

        <p className="mt-4 text-xs text-text-secondary">
          {t("care_session.clinical_tabs.patient_context", {
            name: patientName,
            defaultValue: `Contexto de ${patientName} durante o atendimento.`,
          })}
        </p>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-neutral bg-warm-surface p-2">
      <p className="text-[11px] font-semibold uppercase text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
