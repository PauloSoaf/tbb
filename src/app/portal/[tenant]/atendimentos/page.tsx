import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPatientCareSessions } from "@/services/care-session.service";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Video, Calendar } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.consultations.page_title", { defaultValue: "Meus Atendimentos" }) };
}

export default async function PortalAtendimentosPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const sessions = await getPatientCareSessions(session.patientId, session.nutritionistId);
  const { t, locale } = await getServerTranslations();

  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">
        {t("patient_portal.consultations.title", { defaultValue: "Atendimentos Online" })}
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {t("patient_portal.consultations.subtitle", { defaultValue: "Suas consultas por vídeo" })}
      </p>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {t("patient_portal.consultations.empty", { defaultValue: "Nenhum atendimento online" })}
          </p>
          <p className="text-sm mt-1">
            {t("patient_portal.consultations.empty_desc", { defaultValue: "Sua nutricionista irá agendar uma consulta online aqui." })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const statusLabel: Record<string, { label: string; color: string }> = {
              SCHEDULED: { label: t("appointments.status.scheduled"), color: "bg-blue-100 text-blue-700" },
              WAITING: { label: t("appointments.status.waiting"), color: "bg-amber-100 text-amber-700" },
              IN_PROGRESS: { label: t("appointments.status.in_progress"), color: "bg-green-100 text-green-700" },
              COMPLETED: { label: t("appointments.status.completed"), color: "bg-gray-100 text-gray-600" },
              CANCELED: { label: t("appointments.status.canceled"), color: "bg-red-100 text-red-700" },
              NO_SHOW: { label: t("appointments.status.no_show"), color: "bg-orange-100 text-orange-700" },
            };
            const st = statusLabel[s.status] ?? { label: s.status, color: "bg-gray-100 text-gray-600" };
            const canEnter = s.status === "SCHEDULED" || s.status === "WAITING" || s.status === "IN_PROGRESS";
            return (
              <div key={s.id} className="bg-card-bg border border-border-neutral rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-blue-soft rounded-lg shrink-0">
                      <Video className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {s.title ?? t("patient_portal.consultations.default_title", { defaultValue: "Consulta online" })}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(s.createdAt), "dd 'de' MMMM, yyyy", { locale: dateLocale })}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                {canEnter && (
                  <div className="mt-3 pt-3 border-t border-border-neutral/50">
                    <Link
                      href={`/portal/${tenant}/atendimentos/${s.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      {t("patient_portal.consultations.enter_session", { defaultValue: "Entrar na consulta" })}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
