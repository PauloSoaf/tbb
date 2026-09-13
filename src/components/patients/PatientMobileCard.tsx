"use client";

import { getPatientHref } from "@/lib/utils/patientRoute";
import { Phone, Target, Info } from "lucide-react";
import { calculateAge } from "@/lib/utils/calculateAge";
import { calculateBMI } from "@/lib/utils/calculateBMI";
import { classifyBMI } from "@/lib/utils/classifyBMI";
import { PatientActionLink } from "./PatientActionLink";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PatientData {
  id: string;
  name: string;
  phone: string;
  birthDate: Date | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  status: string;
  wellnessCheckins?: { mood: number }[];
  patientTags?: { label: string; color: string }[];
}

interface PatientMobileCardProps {
  patient: PatientData;
  tenantSlug: string;
}

export function PatientMobileCard({
  patient,
  tenantSlug,
}: PatientMobileCardProps) {
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;
  const bmi = calculateBMI(patient.weight, patient.height);
  const bmiClass = classifyBMI(bmi);
  const lastMood = patient.wellnessCheckins?.[0]?.mood ?? null;
  const MOOD_EMOJI = ["", "😢", "😕", "😐", "😊", "😁"];
  const { t } = useI18n();
  const MOOD_LABEL = ["", t("patients_list.table_mood_1", { defaultValue: "Muito mal" }), t("patients_list.table_mood_2", { defaultValue: "Mal" }), t("patients_list.table_mood_3", { defaultValue: "Neutro" }), t("patients_list.table_mood_4", { defaultValue: "Bem" }), t("patients_list.table_mood_5", { defaultValue: "Ótimo" })];

  return (
    <div className="md:hidden bg-card-bg rounded-xl border border-border-neutral p-4 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-primary">{patient.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-text-secondary text-sm">
            <Phone className="w-3.5 h-3.5" />
            {patient.phone}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastMood != null && (
            <span className="text-lg" title={MOOD_LABEL[lastMood]}>
              {MOOD_EMOJI[lastMood]}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              patient.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700"
                : patient.status === "INACTIVE"
                ? "bg-gray-100 text-gray-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {patient.status === "ACTIVE"
              ? t("patients_list.status_active", { defaultValue: "Ativo" })
              : patient.status === "INACTIVE"
              ? t("patients_list.status_inactive", { defaultValue: "Inativo" })
              : t("patients_list.status_archived", { defaultValue: "Arquivado" })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        {patient.goal && (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{patient.goal}</span>
          </div>
        )}
        {age !== null && (
          <div className="text-text-secondary">{t("patients_list.table_years_old", { count: age, defaultValue: `${age} anos` })}</div>
        )}
        {bmi !== null && (
          <div className="text-text-secondary col-span-2 flex items-center gap-1">
            {t("patients_list.table_bmi", { defaultValue: "IMC" })}
            <span title="Índice de Massa Corporal: Medida internacional usada para calcular se uma pessoa está no peso ideal.">
              <Info className="w-3.5 h-3.5 text-text-tertiary" />
            </span>
            : {bmi} ({bmiClass.label})
          </div>
        )}
      </div>

      {patient.patientTags && patient.patientTags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {patient.patientTags.map((t) => (
            <span
              key={t.label}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <PatientActionLink
          href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "anamnese" })}
          variant="report"
          compact
          className="flex-1"
        />
        <PatientActionLink
          href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "avaliacoes" })}
          variant="measurements"
          compact
          className="flex-1"
        />
        <PatientActionLink
          href={getPatientHref({ tenant: tenantSlug, patient: patient })}
          variant="view"
          compact
          className="flex-[2]"
        />
      </div>
    </div>
  );
}
