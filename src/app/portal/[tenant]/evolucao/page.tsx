import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { getWellnessCheckins } from "@/services/patient-portal.service";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { TrendingDown, TrendingUp, Minus, BarChart3 } from "lucide-react";
import { EvolucaoChart } from "./EvolucaoChart";
import { WellnessChart } from "./WellnessChart";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.progress.title", { defaultValue: "Minha Evolução" }) };
}

export default async function EvolucaoPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { patient } = await getPortalPatientAction(tenant);
  const measurements = patient?.patientMeasurements ?? [];
  const wellnessCheckins = patient ? await getWellnessCheckins(patient.id, 30) : [];

  // Progress cards calculations
  const first = measurements[measurements.length - 1]; // oldest (sorted desc)
  const latest = measurements[0];
  const weightDiff = first?.weight && latest?.weight ? +(latest.weight - first.weight).toFixed(1) : null;
  const fatDiff = first?.bodyFatPercentage && latest?.bodyFatPercentage
    ? +(latest.bodyFatPercentage - first.bodyFatPercentage).toFixed(1)
    : null;

  const { t, locale } = await getServerTranslations();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">
        {t("patient_portal.progress.title", { defaultValue: "Minha Evolução" })}
      </h1>

      {measurements.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          {weightDiff !== null && (
            <div className={`rounded-2xl p-4 text-center ${weightDiff < 0 ? "bg-emerald-50" : weightDiff > 0 ? "bg-rose-50" : "bg-gray-50"}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${weightDiff < 0 ? "text-emerald-600" : weightDiff > 0 ? "text-rose-600" : "text-gray-500"}`}>
                {weightDiff < 0 ? <TrendingDown className="w-4 h-4" /> : weightDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                <span className="text-lg font-bold">{weightDiff > 0 ? "+" : ""}{weightDiff} kg</span>
              </div>
              <p className="text-xs text-text-secondary">{t("patient_portal.progress.weight_change", { defaultValue: "Variação de peso" })}</p>
            </div>
          )}
          {fatDiff !== null && (
            <div className={`rounded-2xl p-4 text-center ${fatDiff < 0 ? "bg-emerald-50" : fatDiff > 0 ? "bg-rose-50" : "bg-gray-50"}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${fatDiff < 0 ? "text-emerald-600" : fatDiff > 0 ? "text-rose-600" : "text-gray-500"}`}>
                {fatDiff < 0 ? <TrendingDown className="w-4 h-4" /> : fatDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                <span className="text-lg font-bold">{fatDiff > 0 ? "+" : ""}{fatDiff}%</span>
              </div>
              <p className="text-xs text-text-secondary">{t("patient_portal.progress.body_fat", { defaultValue: "Gordura corporal" })}</p>
            </div>
          )}
          <div className="rounded-2xl p-4 text-center bg-brand-blue/5">
            <div className="flex items-center justify-center gap-1 mb-1 text-brand-blue">
              <BarChart3 className="w-4 h-4" />
              <span className="text-lg font-bold">{measurements.length}</span>
            </div>
            <p className="text-xs text-text-secondary">{t("patient_portal.progress.measurements_count", { defaultValue: "Avaliação(ões)" })}</p>
          </div>
        </div>
      )}

      {wellnessCheckins.length >= 2 && (
        <WellnessChart checkins={wellnessCheckins} />
      )}

      {measurements.length === 0 ? (
        <div className="text-center text-text-secondary mt-8">
          <p>{t("patient_portal.progress.no_measurements", { defaultValue: "Nenhuma avaliação registrada ainda." })}</p>
        </div>
      ) : (
        <>
          {measurements.length >= 2 && (
            <EvolucaoChart measurements={measurements} />
          )}

          <div className="space-y-4">
            {measurements.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-border-neutral p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary">
                    {format(new Date(m.measuredAt), "dd 'de' MMMM 'de' yyyy", { locale: dateLocale })}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {m.weight && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.weight", { defaultValue: "Peso" })}</p>
                      <p className="font-semibold text-text-primary">{m.weight} kg</p>
                    </div>
                  )}
                  {m.bmi && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.bmi", { defaultValue: "IMC" })}</p>
                      <p className="font-semibold text-text-primary">{m.bmi.toFixed(1)}</p>
                      {m.bmiClassification && (
                        <p className="text-xs text-text-secondary">{m.bmiClassification}</p>
                      )}
                    </div>
                  )}
                  {m.bodyFatPercentage && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.body_fat_percentage", { defaultValue: "% Gordura" })}</p>
                      <p className="font-semibold text-text-primary">{m.bodyFatPercentage.toFixed(1)}%</p>
                    </div>
                  )}
                  {m.leanMassKg && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.lean_mass", { defaultValue: "Massa Magra" })}</p>
                      <p className="font-semibold text-text-primary">{m.leanMassKg.toFixed(1)} kg</p>
                    </div>
                  )}
                  {m.waist && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.waist", { defaultValue: "Cintura" })}</p>
                      <p className="font-semibold text-text-primary">{m.waist} cm</p>
                    </div>
                  )}
                  {m.hip && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text-secondary">{t("patient_portal.progress.hip", { defaultValue: "Quadril" })}</p>
                      <p className="font-semibold text-text-primary">{m.hip} cm</p>
                    </div>
                  )}
                </div>
                {m.notes && (
                  <p className="text-sm text-text-secondary mt-3 italic">{m.notes}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
