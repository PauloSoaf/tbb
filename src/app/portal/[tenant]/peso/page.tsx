import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { PesoFormClient } from "./PesoFormClient";
import { Weight } from "lucide-react";
import { getPatientWeightHistory } from "@/services/patient-portal.service";
import { WeightHistoryChart } from "./WeightHistoryChart";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.weight.title", { defaultValue: "Registrar Peso" }) };
}

export default async function PortalPesoPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const [history, nutritionist] = await Promise.all([
    getPatientWeightHistory(session.patientId, session.nutritionistId),
    prisma.nutritionist.findUnique({
      where: { id: session.nutritionistId },
      select: { name: true },
    }),
  ]);

  const nutritionistName = nutritionist?.name ?? "sua nutricionista";
  const { t, locale } = await getServerTranslations();

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-blue-soft rounded-full flex items-center justify-center text-brand-blue">
          <Weight className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t("patient_portal.weight.title", { defaultValue: "Registrar Peso" })}</h1>
          <p className="text-sm text-text-secondary">{t("patient_portal.weight.subtitle", { defaultValue: "Acompanhe sua evolução" })}</p>
        </div>
      </div>

      <PesoFormClient tenantSlug={tenant} />

      {history.length >= 2 && <WeightHistoryChart history={history} />}

      {history.length > 0 && (
        <div className="bg-white border border-border-neutral rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">{t("patient_portal.weight.recent", { defaultValue: "Últimos registros" })}</h3>
          <ul className="divide-y divide-border-neutral text-sm">
            {history.slice(0, 8).map((m) => (
              <li key={m.id} className="flex justify-between py-2 text-text-secondary">
                <span>{new Date(m.measuredAt).toLocaleDateString(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR")}</span>
                <span className="font-semibold text-text-primary">{m.weight?.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-text-secondary text-center">
        {t("patient_portal.weight.shared_with", { name: nutritionistName, defaultValue: `Seu peso será compartilhado com ${nutritionistName} para acompanhamento.` })}
      </p>
    </div>
  );
}
