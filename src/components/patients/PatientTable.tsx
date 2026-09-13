"use client";

import { getPatientHref } from "@/lib/utils/patientRoute";
import { calculateAge } from "@/lib/utils/calculateAge";
import { calculateBMI } from "@/lib/utils/calculateBMI";
import { classifyBMI } from "@/lib/utils/classifyBMI";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { PatientActionLink } from "./PatientActionLink";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Info } from "lucide-react";

interface PatientRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: Date | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  status: string;
  anamneseResponses: { submittedAt: Date }[];
  wellnessCheckins?: { mood: number; energy: number; date: Date | string }[];
  appointments?: { date: Date | string }[];
  patientTags?: { label: string; color: string }[];
}

interface PatientTableProps {
  patients: PatientRow[];
  tenantSlug: string;
}

export function PatientTable({ patients, tenantSlug }: PatientTableProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-neutral">
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_name", { defaultValue: "Nome" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_phone", { defaultValue: "Telefone" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_goal", { defaultValue: "Objetivo" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_age", { defaultValue: "Idade" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <div className="flex items-center gap-1">
                {t("patients_list.table_bmi", { defaultValue: "IMC" })}
                <span title="Índice de Massa Corporal: Medida internacional usada para calcular se uma pessoa está no peso ideal.">
                  <Info className="w-3.5 h-3.5 text-text-tertiary" />
                </span>
              </div>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_status", { defaultValue: "Status" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_last_anamnese", { defaultValue: "Última Anamnese" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_mood", { defaultValue: "Humor" })}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t("patients_list.table_last_appointment", { defaultValue: "Última Consulta" })}
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[140px]">
              {t("patients_list.table_action", { defaultValue: "Ação" })}
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const age = patient.birthDate
              ? calculateAge(patient.birthDate)
              : null;
            const bmi = calculateBMI(patient.weight, patient.height);
            const bmiClass = classifyBMI(bmi);
            const lastAnamnese = patient.anamneseResponses[0];
            const lastMood = patient.wellnessCheckins?.[0]?.mood ?? null;
            const lastAppointment = patient.appointments?.[0] ?? null;
            const MOOD_EMOJI = ["", "😢", "😕", "😐", "😊", "😁"];
            const MOOD_LABEL = ["", t("patients_list.table_mood_1", { defaultValue: "Muito mal" }), t("patients_list.table_mood_2", { defaultValue: "Mal" }), t("patients_list.table_mood_3", { defaultValue: "Neutro" }), t("patients_list.table_mood_4", { defaultValue: "Bem" }), t("patients_list.table_mood_5", { defaultValue: "Ótimo" })];

            return (
              <tr
                key={patient.id}
                className="border-b border-border-neutral/50 hover:bg-warm-surface transition-colors duration-150"
              >
                <td className="py-3.5 px-4">
                  <span className="font-medium text-text-primary block">
                    {patient.name}
                  </span>
                  {patient.patientTags && patient.patientTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {patient.patientTags.map((t) => (
                        <span
                          key={t.label}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-sm text-text-secondary">
                  {patient.phone}
                </td>
                <td className="py-3.5 px-4 text-sm text-text-secondary max-w-[200px] truncate">
                  {patient.goal || "—"}
                </td>
                <td className="py-3.5 px-4 text-sm text-text-secondary">
                  {age !== null ? t("patients_list.table_years_old", { count: age, defaultValue: `${age} anos` }) : "—"}
                </td>
                <td className="py-3.5 px-4">
                  {bmi ? (
                    <span className="text-sm font-medium">
                      {bmi}{" "}
                      <span className="text-xs text-text-secondary">
                        ({bmiClass.label})
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-text-secondary">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
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
                </td>
                <td className="py-3.5 px-4 text-sm text-text-secondary">
                  {lastAnamnese
                    ? format(
                        new Date(lastAnamnese.submittedAt),
                        "dd/MM/yyyy",
                        { locale: dateLocale }
                      )
                    : "—"}
                </td>
                <td className="py-3.5 px-4 text-sm" title={lastMood != null ? MOOD_LABEL[lastMood] : t("patients_list.table_no_checkin", { defaultValue: "Sem check-in" })}>
                  {lastMood != null ? (
                    <span>{MOOD_EMOJI[lastMood]}</span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-sm text-text-secondary">
                  {lastAppointment
                    ? format(new Date(lastAppointment.date), "dd/MM/yyyy", { locale: dateLocale })
                    : "—"}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PatientActionLink
                      href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "anamnese" })}
                      variant="report"
                    />
                    <PatientActionLink
                      href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "avaliacoes" })}
                      variant="measurements"
                    />
                    <PatientActionLink
                      href={getPatientHref({ tenant: tenantSlug, patient: patient })}
                      variant="view"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
