import { getPatientHref } from "@/services/patient-route.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel de Bem-estar | NutriOpus" };

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getWellnessPanelData } from "@/services/patient.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Smile, AlertCircle } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string }>;
}

const MOOD_EMOJI = ["", "😢", "😕", "😐", "😊", "😁"];
const MOOD_LABEL = ["", "Muito mal", "Mal", "Neutro", "Bem", "Ótimo"];

function MoodBar({ value }: { value: number }) {
  const pct = ((value - 1) / 4) * 100;
  const color = value <= 2 ? "bg-red-400" : value === 3 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`}} />
      </div>
      <span className="text-xs text-text-secondary w-8">{value.toFixed(1)}</span>
    </div>
  );
}

export default async function BemEstarPage({ params }: Props) {
  const { tenant } = await params;
  const { session } = await assertTenantAccess(tenant);

  const data = await getWellnessPanelData(session.nutritionistId);

  const withCheckins = data.filter((d) => d.checkinCount > 0);
  const noCheckins = data.filter((d) => d.checkinCount === 0);

  const totalCheckins = data.reduce((s, d) => s + d.checkinCount, 0);
  const overallAvgMood = withCheckins.length > 0
    ? withCheckins.reduce((s, d) => s + (d.avgMood ?? 0), 0) / withCheckins.length
    : null;

  return (
    <>
      <DashboardHeader
        title="Painel de Bem-estar"
        subtitle="Check-ins dos pacientes nos últimos 7 dias"
      />

      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card-bg rounded-xl border border-border-neutral p-4">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Pacientes ativos</p>
            <p className="text-3xl font-bold text-text-primary dark:text-slate-200 mt-2">{data.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-border-neutral p-4">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Com check-in (7d)</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{withCheckins.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-border-neutral p-4">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Sem check-in</p>
            <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{noCheckins.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-border-neutral p-4">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Humor médio geral</p>
            <p className="text-3xl font-bold text-text-primary dark:text-slate-200 mt-2">
              {overallAvgMood != null ? (
                <>{MOOD_EMOJI[Math.round(overallAvgMood)]} {overallAvgMood.toFixed(1)}</>
              ) : "—"}
            </p>
          </div>
        </div>

        {/* Patients with checkins */}
        {withCheckins.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-slate-200 mb-3 flex items-center gap-2">
              <Smile className="w-4 h-4 text-emerald-500" />
              Pacientes com check-in ({withCheckins.length})
            </h2>
            <div className="bg-card-bg rounded-2xl border border-border-neutral overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-neutral bg-gray-50/50 dark:bg-card-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Último</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Humor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden md:table-cell">Média 7d</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide hidden md:table-cell">Check-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {withCheckins.map(({ patient, latest, checkinCount, avgMood }) => (
                    <tr key={patient.id} className="border-b border-border-neutral last:border-0 hover:bg-gray-50/40 hover:bg-warm-beige/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={getPatientHref({ tenant: tenant, patient: patient })}
                          className="font-medium text-text-primary dark:text-slate-200 hover:text-brand-blue transition-colors"
                        >
                          {patient.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {latest ? format(new Date(latest.date), "dd/MM", { locale: ptBR }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <span title={MOOD_LABEL[latest.mood]}>
                            {MOOD_EMOJI[latest.mood]} {MOOD_LABEL[latest.mood]}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {avgMood != null ? <MoodBar value={avgMood} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                          {checkinCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Patients without checkins */}
        {noCheckins.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-slate-200 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Sem check-in nos últimos 7 dias ({noCheckins.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {noCheckins.map(({ patient }) => (
                <Link
                  key={patient.id}
                  href={getPatientHref({ tenant: tenant, patient: patient })}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
                >
                  <p className="font-medium text-amber-900 dark:text-amber-300 text-sm">{patient.name}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Nenhum check-in registrado</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {data.length === 0 && (
          <div className="text-center text-text-secondary py-16">
            <Smile className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
            <p>Nenhum paciente ativo encontrado.</p>
          </div>
        )}

        {totalCheckins === 0 && data.length > 0 && (
          <div className="text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-8">
            <Smile className="w-10 h-10 mx-auto mb-3 text-amber-300 dark:text-amber-500" />
            <p className="font-medium text-amber-800 dark:text-amber-300">Nenhum check-in registrado ainda.</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Os pacientes podem fazer check-in diário pelo portal deles.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
