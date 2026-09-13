import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { getWellnessCheckins } from "@/services/patient-portal.service";
import { CheckinClient } from "./CheckinClient";
import { startOfDay, format, differenceInDays } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.checkin.title", { defaultValue: "Check-in Diário" }) };
}

export default async function CheckinPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) {
    redirect(`/portal/${tenant}/login`);
  }

  const { patient } = await getPortalPatientAction(tenant);
  if (!patient) redirect(`/portal/${tenant}/login`);

  const recentCheckins = await getWellnessCheckins(patient.id, 14);

  const todayStart = startOfDay(new Date());
  const todayCheckin = recentCheckins.find((c) => {
    const d = new Date(c.date);
    return d.getFullYear() === todayStart.getFullYear()
      && d.getMonth() === todayStart.getMonth()
      && d.getDate() === todayStart.getDate();
  }) ?? null;

  const now = new Date();
  const nextAppointment = [...(patient.appointments ?? [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .find((a) => a.status === "SCHEDULED" && new Date(a.date) >= now) ?? null;

  const daysUntilAppt = nextAppointment
    ? differenceInDays(new Date(nextAppointment.date), todayStart)
    : null;

  const { t, locale } = await getServerTranslations();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {t("patient_portal.checkin.title", { defaultValue: "Check-in Diário" })}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {t("patient_portal.checkin.subtitle", { defaultValue: "Registre como você está se sentindo hoje para o seu nutricionista acompanhar." })}
        </p>
      </div>

      {/* Lembrete da próxima consulta */}
      {nextAppointment && daysUntilAppt !== null && daysUntilAppt <= 7 && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/20">
          <CalendarClock className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-blue">
              {daysUntilAppt === 0
                ? t("patient_portal.checkin.appointment_today", { defaultValue: "Sua consulta é hoje!" })
                : daysUntilAppt === 1
                ? t("patient_portal.checkin.appointment_tomorrow", { defaultValue: "Sua consulta é amanhã!" })
                : t("patient_portal.checkin.appointment_in_days", { days: daysUntilAppt.toString(), defaultValue: `Consulta em ${daysUntilAppt} dias` })}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {format(new Date(nextAppointment.date), "dd 'de' MMMM", { locale: dateLocale })}
              {nextAppointment.startTime ? ` às ${nextAppointment.startTime}` : ""}
            </p>
          </div>
        </div>
      )}

      <CheckinClient
        tenantSlug={tenant}
        todayCheckin={todayCheckin ?? null}
        recentCheckins={recentCheckins}
      />
    </div>
  );
}
