"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ClipboardList, Ruler, ArrowRight, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PatientOverviewQuickCardsProps {
  tenant: string;
  patientRouteParam: string;
  anamneseCount: number;
  latestAnamneseDate: string | null;
  measurementCount: number;
  latestMeasurementDate: string | null;
}

export function PatientOverviewQuickCards({
  tenant,
  patientRouteParam,
  anamneseCount,
  latestAnamneseDate,
  measurementCount,
  latestMeasurementDate,
}: PatientOverviewQuickCardsProps) {
  const { t } = useI18n();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const getCountLabel = (count: number) => {
    if (count === 0) return t("patient_overview_cards.records_count_zero");
    if (count === 1) return t("patient_overview_cards.records_count_one");
    return t("patient_overview_cards.records_count_other", { count });
  };

  const cards = [
    {
      key: "prontuario",
      title: t("patient_overview_cards.prontuario_title"),
      description: t("patient_overview_cards.prontuario_desc"),
      meta: t("patient_overview_cards.main_area"),
      href: "#prontuario",
      Icon: FileText,
      tone: "primary" as const,
      isHash: true,
    },
    {
      key: "anamneses",
      title: t("patient_overview_cards.anamneses_title"),
      description: latestAnamneseDate
        ? t("patient_overview_cards.last_on", {
            date: format(new Date(latestAnamneseDate), "dd/MM/yyyy", { locale: ptBR }),
          })
        : t("patient_overview_cards.anamneses_empty"),
      meta: getCountLabel(anamneseCount),
      href: `/dashboard/${tenant}/pacientes/${patientRouteParam}/anamnese`,
      Icon: ClipboardList,
      tone: "neutral" as const,
      isHash: false,
    },
    {
      key: "antropometria",
      title: t("patient_overview_cards.antropometria_title"),
      description: latestMeasurementDate
        ? t("patient_overview_cards.last_on", {
            date: format(new Date(latestMeasurementDate), "dd/MM/yyyy", { locale: ptBR }),
          })
        : t("patient_overview_cards.antropometria_empty"),
      meta: getCountLabel(measurementCount),
      href: `/dashboard/${tenant}/pacientes/${patientRouteParam}/medidas`,
      Icon: Ruler,
      tone: "neutral" as const,
      isHash: false,
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3" aria-label="Atalhos clínicos do paciente">
      {cards.map(({ key, title, description, meta, href, Icon, tone, isHash }) => {
        const isLoading = loadingKey === key;

        return (
          <Link
            key={key}
            href={href}
            onClick={() => {
              if (!isHash) {
                setLoadingKey(key);
              }
            }}
            className={`group relative rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
              tone === "primary"
                ? "border-brand-blue/30 bg-brand-blue/10 hover:border-brand-blue/50"
                : "border-border-neutral bg-card-bg hover:border-brand-blue/40"
            } ${isLoading ? "ring-2 ring-brand-blue/30 opacity-90" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                  tone === "primary"
                    ? "bg-brand-blue text-white shadow-sm"
                    : "bg-brand-blue-soft text-brand-blue"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-1 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-blue" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-text-primary group-hover:text-brand-blue transition-colors">
                  {title}
                </h2>
                <span className="rounded-full bg-card-bg/70 border border-border-neutral/60 px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                  {meta}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-text-secondary">{description}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
