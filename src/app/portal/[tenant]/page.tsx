import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import {
  Calendar, TrendingUp, MessageCircle, Scale, Smile, CheckSquare,
  Flame, Trophy, ArrowRight, Apple, Phone, FileText, Target,
  BookOpen, Video, ClipboardList,
} from "lucide-react";
import { buildScheduleWhatsAppUrl } from "@/lib/utils/whatsapp";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { PortalLoadingLink } from "@/components/patient-portal/PortalLoadingLink";
import { buildPatientPortalHref, buildPatientPortalSlug } from "@/lib/utils/patientPortalRoute";

export const metadata: Metadata = { title: "Meu Portal | NutriOpus" };

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function PortalDashboardPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) {
    redirect(`/portal/${tenant}/login`);
  }

  const [{ patient }, nutritionist] = await Promise.all([
    getPortalPatientAction(tenant),
    prisma.nutritionist.findUnique({
      where: { slug: tenant },
      select: { name: true, profileImageUrl: true, whatsapp: true },
    }),
  ]);
  if (!patient) redirect(`/portal/${tenant}/login`);

  const patientSlug = buildPatientPortalSlug(patient);
  const portalHref = (path = "") => buildPatientPortalHref(tenant, patientSlug, path);

  const activePlan = patient.mealPlans?.[0] ?? null;
  const measurements = patient.patientMeasurements ?? [];
  const lastMeasurement = measurements[0] ?? null;
  const prevMeasurement = measurements[1] ?? null;

  const now = new Date();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const nextAppointment =
    [...(patient.appointments ?? [])]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find((a) => a.status === "SCHEDULED" && new Date(a.date) >= now) ?? null;

  const [unreadMessages, pendingTaskCount, checkedInToday, weekCheckins, goalsAchievedThisWeek] =
    await Promise.all([
      prisma.chatMessage.count({
        where: { patientId: session.patientId, nutritionistId: session.nutritionistId, sender: "NUTRITIONIST", readAt: null },
      }),
      prisma.patientTask.count({
        where: { patientId: session.patientId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.wellnessCheckin.count({
        where: { patientId: session.patientId, date: { gte: todayStart } },
      }),
      prisma.wellnessCheckin.findMany({
        where: { patientId: session.patientId, date: { gte: weekStart } },
        orderBy: { date: "desc" },
        select: { date: true, mood: true },
      }),
      prisma.patientGoal.count({
        where: { patientId: session.patientId, status: "ACHIEVED", achievedAt: { gte: weekStart } },
      }),
    ]);

  const checkinDates = new Set(weekCheckins.map((c) => new Date(c.date).toISOString().slice(0, 10)));
  let streak = 0;
  for (let i = 0; i <= 6; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    if (checkinDates.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  const avgMood =
    weekCheckins.length > 0
      ? weekCheckins.reduce((s, c) => s + c.mood, 0) / weekCheckins.length
      : null;
  const avgMoodRounded = avgMood !== null ? Math.round(avgMood) : null;
  const MOOD_EMOJI = ["", "ðŸ˜¢", "ðŸ˜•", "ðŸ˜", "ðŸ˜Š", "ðŸ˜"];

  const firstName = patient.name.split(" ")[0];

  const weightDelta =
    lastMeasurement?.weight && prevMeasurement?.weight
      ? (lastMeasurement.weight - prevMeasurement.weight).toFixed(1)
      : null;
  const weightDown = weightDelta !== null && Number(weightDelta) < 0;
  const weightUp = weightDelta !== null && Number(weightDelta) > 0;

  const whatsAppUrl = nutritionist?.whatsapp
    ? buildScheduleWhatsAppUrl(nutritionist.whatsapp, patient.name)
    : null;

  const nextApptDaysUntil = nextAppointment
    ? Math.ceil((new Date(nextAppointment.date).getTime() - todayStart.getTime()) / 86400000)
    : null;

  const { t, locale } = await getServerTranslations();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">

      {/* Greeting */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("patient_portal.dashboard.greeting", { name: firstName, defaultValue: `OlÃ¡, ${firstName}!` })}</h1>
          <p className="text-text-secondary text-sm mt-0.5">{t("patient_portal.dashboard.greeting_subtitle", { defaultValue: "Veja seu acompanhamento nutricional de hoje." })}</p>
        </div>
        {nutritionist && (
          <div className="flex items-center gap-2.5 bg-card-bg rounded-xl px-3 py-2 border border-border-neutral shrink-0">
            {nutritionist.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nutritionist.profileImageUrl} alt={nutritionist.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold">
                {nutritionist.name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-[10px] text-text-secondary font-medium">{t("patient_portal.dashboard.nutritionist_role", { defaultValue: "Nutricionista" })}</p>
              <p className="text-xs font-semibold text-text-primary">{nutritionist.name.split(" ")[0]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Week streak banner */}
      {(weekCheckins.length > 0 || goalsAchievedThisWeek > 0) && (
        <div className="bg-gradient-to-r from-brand-blue/5 to-emerald-50 dark:from-brand-blue/10 dark:to-emerald-900/10 rounded-2xl border border-brand-blue/10 p-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t("patient_portal.dashboard.week_highlight", { defaultValue: "Sua semana em destaque" })}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Flame className={`w-4 h-4 ${streak >= 3 ? "text-orange-500" : "text-text-secondary"}`} />
                <span className={`text-xl font-bold ${streak >= 3 ? "text-orange-500" : "text-text-primary"}`}>{streak}</span>
              </div>
              <span className="text-[11px] text-text-secondary text-center leading-tight">
                {streak === 1 ? t("patient_portal.dashboard.day_streak_one", { defaultValue: "dia seguido" }) : t("patient_portal.dashboard.day_streak_other", { defaultValue: "dias seguidos" })}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {avgMoodRounded !== null ? (
                <>
                  <span className="text-2xl">{MOOD_EMOJI[avgMoodRounded]}</span>
                  <span className="text-[11px] text-text-secondary text-center leading-tight">{t("patient_portal.dashboard.avg_mood", { defaultValue: "humor mÃ©dio" })}</span>
                </>
              ) : (
                <>
                  <Smile className="w-5 h-5 text-text-secondary" />
                  <span className="text-[11px] text-text-secondary text-center">{t("patient_portal.dashboard.no_checkins", { defaultValue: "Sem check-ins" })}</span>
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Trophy className={`w-4 h-4 ${goalsAchievedThisWeek > 0 ? "text-amber-500" : "text-text-secondary"}`} />
                <span className={`text-xl font-bold ${goalsAchievedThisWeek > 0 ? "text-amber-500" : "text-text-primary"}`}>{goalsAchievedThisWeek}</span>
              </div>
              <span className="text-[11px] text-text-secondary text-center leading-tight">
                {goalsAchievedThisWeek === 1 ? t("patient_portal.dashboard.goal_achieved_one", { defaultValue: "meta alcanÃ§ada" }) : t("patient_portal.dashboard.goal_achieved_other", { defaultValue: "metas alcanÃ§adas" })}
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(todayStart);
              d.setDate(d.getDate() - (6 - i));
              const done = checkinDates.has(d.toISOString().slice(0, 10));
              return (
                <div
                  key={i}
                  title={format(d, "EEE dd/MM", { locale: dateLocale })}
                  className={`flex-1 h-1.5 rounded-full ${done ? "bg-brand-blue" : "bg-border-neutral"}`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-text-secondary mt-1 text-right">{t("patient_portal.dashboard.days_with_checkin", { count: weekCheckins.length.toString(), defaultValue: `${weekCheckins.length}/7 dias com check-in` })}</p>
        </div>
      )}

      {/* Main cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Next appointment */}
        <div className="bg-card-bg rounded-2xl border border-border-neutral p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-brand-blue">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("patient_portal.dashboard.next_appointment", { defaultValue: "PrÃ³xima consulta" })}</span>
          </div>

          {nextAppointment ? (
            <>
              <div>
                <p className="font-bold text-text-primary text-lg">
                  {format(new Date(nextAppointment.date), "dd/MM/yyyy", { locale: dateLocale })}
                </p>
                {nextAppointment.startTime && (
                  <p className="text-sm text-text-secondary">{nextAppointment.startTime}</p>
                )}
                <p className={`text-xs font-semibold mt-1 ${
                  nextApptDaysUntil === 0 ? "text-emerald-600" :
                  nextApptDaysUntil !== null && nextApptDaysUntil <= 3 ? "text-amber-600" :
                  "text-text-secondary"
                }`}>
                  {nextApptDaysUntil === 0 ? t("patient_portal.dashboard.today", { defaultValue: "Hoje!" }) :
                   nextApptDaysUntil === 1 ? t("patient_portal.dashboard.tomorrow", { defaultValue: "AmanhÃ£" }) :
                   t("patient_portal.dashboard.in_days", { days: nextApptDaysUntil?.toString() ?? "0", defaultValue: `Em ${nextApptDaysUntil} dias` })}
                </p>
              </div>
              <PortalLoadingLink
                href={portalHref("agenda")}
                className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-medium hover:underline"
              >
                {t("patient_portal.dashboard.view_appointment", { defaultValue: "Ver consulta" })} <ArrowRight className="w-3.5 h-3.5" />
              </PortalLoadingLink>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-text-secondary">{t("patient_portal.dashboard.no_appointments", { defaultValue: "Nenhuma consulta agendada." })}</p>
              </div>
              {whatsAppUrl ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {t("patient_portal.dashboard.schedule_whatsapp", { defaultValue: "Marcar pelo WhatsApp" })}
                </a>
              ) : (
                <PortalLoadingLink
                  href={portalHref("chat")}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-medium hover:underline"
                >
                  {t("patient_portal.dashboard.talk_nutritionist", { defaultValue: "Falar com nutricionista" })} <ArrowRight className="w-3.5 h-3.5" />
                </PortalLoadingLink>
              )}
            </>
          )}
        </div>

        {/* Weight progress */}
        <div className="bg-card-bg rounded-2xl border border-border-neutral p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("patient_portal.dashboard.weight_progress", { defaultValue: "EvoluÃ§Ã£o de peso" })}</span>
          </div>

          {lastMeasurement ? (
            <>
              <div>
                <div className="flex items-end gap-2">
                  <p className="font-bold text-text-primary text-2xl">
                    {lastMeasurement.weight ? `${lastMeasurement.weight} kg` : "â€”"}
                  </p>
                  {weightDelta !== null && (
                    <span className={`text-sm font-semibold pb-0.5 ${weightDown ? "text-emerald-600" : weightUp ? "text-rose-500" : "text-text-secondary"}`}>
                      {weightDown ? "" : "+"}{weightDelta} kg
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {t("patient_portal.dashboard.last_record", { defaultValue: "Ãšltimo registro:" })} {format(new Date(lastMeasurement.measuredAt), "dd/MM/yyyy", { locale: dateLocale })}
                </p>
                {measurements.length > 1 && (
                  <div className="mt-2 flex gap-0.5 items-end h-8">
                    {measurements.slice(0, 8).reverse().map((m, i) => {
                      const maxW = Math.max(...measurements.slice(0, 8).map(x => x.weight ?? 0));
                      const minW = Math.min(...measurements.slice(0, 8).filter(x => x.weight).map(x => x.weight!));
                      const range = maxW - minW || 1;
                      const pct = m.weight ? ((m.weight - minW) / range) * 70 + 30 : 30;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${i === measurements.slice(0, 8).length - 1 ? "bg-brand-blue" : "bg-border-neutral"}`}
                          style={{ height: `${pct}%` }}
                          title={m.weight ? `${m.weight} kg` : "â€”"}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <PortalLoadingLink
                  href={portalHref("peso")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  {t("patient_portal.dashboard.log_weight", { defaultValue: "Registrar peso" })}
                </PortalLoadingLink>
                <PortalLoadingLink
                  href={portalHref("evolucao")}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary font-medium"
                >
                  {t("patient_portal.dashboard.view_progress", { defaultValue: "Ver evoluÃ§Ã£o" })} <ArrowRight className="w-3.5 h-3.5" />
                </PortalLoadingLink>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">{t("patient_portal.dashboard.no_records", { defaultValue: "Nenhum registro ainda." })}</p>
              <PortalLoadingLink
                href={portalHref("peso")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                {t("patient_portal.dashboard.log_first_weight", { defaultValue: "Registrar primeiro peso" })}
              </PortalLoadingLink>
            </>
          )}
        </div>
      </div>

      {/* Today's meal plan */}
      <div className="bg-card-bg rounded-2xl border border-border-neutral p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-amber-600">
            <Apple className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("patient_portal.dashboard.todays_menu", { defaultValue: "CardÃ¡pio de hoje" })}</span>
          </div>
          {activePlan && (
            <PortalLoadingLink
              href={portalHref("cardapio")}
              className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-1"
            >
              {t("patient_portal.dashboard.view_full_menu", { defaultValue: "Ver completo" })} <ArrowRight className="w-3 h-3" />
            </PortalLoadingLink>
          )}
        </div>

        {activePlan ? (
          <div>
            <p className="font-semibold text-text-primary mb-2">{activePlan.title}</p>
            <div className="space-y-1.5">
              {activePlan.meals.slice(0, 4).map((meal) => (
                <div key={meal.id} className="flex items-center gap-2.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-text-secondary font-medium">{meal.name}</span>
                  {meal.time && <span className="text-text-secondary text-xs ml-auto">{meal.time}</span>}
                </div>
              ))}
              {activePlan.meals.length > 4 && (
                <p className="text-xs text-text-secondary pt-1">
                  {t("patient_portal.dashboard.more_meals", { count: (activePlan.meals.length - 4).toString(), defaultValue: `+ ${activePlan.meals.length - 4} refeiÃ§Ãµes` })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {t("patient_portal.dashboard.plan_not_released", { defaultValue: "Seu plano alimentar ainda nÃ£o foi liberado pela nutricionista." })}
            </p>
            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                {t("patient_portal.dashboard.talk_whatsapp", { defaultValue: "Falar pelo WhatsApp" })}
              </a>
            ) : (
              <PortalLoadingLink
                href={portalHref("chat")}
                className="inline-flex items-center gap-1.5 text-sm text-brand-blue font-medium hover:underline shrink-0"
              >
                {t("patient_portal.dashboard.talk_nutritionist", { defaultValue: "Falar com nutricionista" })} <ArrowRight className="w-3.5 h-3.5" />
              </PortalLoadingLink>
            )}
          </div>
        )}
      </div>

      {/* Quick summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PortalLoadingLink
          href={portalHref("diario")}
          className="bg-card-bg rounded-xl border border-border-neutral p-3.5 hover:border-brand-blue/40 hover:shadow-sm transition-all"
        >
          <BookOpen className="w-5 h-5 text-violet-500 mb-2" />
          <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.diary", { defaultValue: "DiÃ¡rio" })}</p>
          <p className="text-xs text-text-secondary mt-0.5">{t("patient_portal.dashboard.log_meals", { defaultValue: "Registre refeiÃ§Ãµes" })}</p>
        </PortalLoadingLink>

        <PortalLoadingLink
          href={portalHref("checkin")}
          className={`bg-card-bg rounded-xl border p-3.5 hover:shadow-sm transition-all ${
            checkedInToday ? "border-emerald-200 dark:border-emerald-800" : "border-border-neutral hover:border-brand-blue/40"
          }`}
        >
          <Smile className={`w-5 h-5 mb-2 ${checkedInToday ? "text-emerald-500" : "text-yellow-500"}`} />
          <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.checkin", { defaultValue: "Check-in" })}</p>
          <p className="text-xs text-text-secondary mt-0.5">{checkedInToday ? t("patient_portal.dashboard.done_today", { defaultValue: "âœ“ Feito hoje" }) : t("patient_portal.dashboard.log_mood", { defaultValue: "Registrar humor" })}</p>
        </PortalLoadingLink>

        <PortalLoadingLink
          href={portalHref("chat")}
          className="relative bg-card-bg rounded-xl border border-border-neutral p-3.5 hover:border-brand-blue/40 hover:shadow-sm transition-all"
        >
          {unreadMessages > 0 && (
            <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
          <MessageCircle className="w-5 h-5 text-brand-blue mb-2" />
          <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.chat", { defaultValue: "Chat" })}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {unreadMessages > 0 ? t("patient_portal.dashboard.new_messages", { count: unreadMessages.toString(), defaultValue: `${unreadMessages} nova(s)` }) : t("patient_portal.dashboard.nutritionist_role", { defaultValue: "Nutricionista" })}
          </p>
        </PortalLoadingLink>

        <PortalLoadingLink
          href={portalHref("tarefas")}
          className="relative bg-card-bg rounded-xl border border-border-neutral p-3.5 hover:border-brand-blue/40 hover:shadow-sm transition-all"
        >
          {pendingTaskCount > 0 && (
            <span className="absolute top-2 right-2 bg-violet-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingTaskCount > 9 ? "9+" : pendingTaskCount}
            </span>
          )}
          <CheckSquare className="w-5 h-5 text-violet-500 mb-2" />
          <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.tasks", { defaultValue: "Tarefas" })}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {pendingTaskCount > 0 ? t("patient_portal.dashboard.pending_tasks", { count: pendingTaskCount.toString(), defaultValue: `${pendingTaskCount} pendente(s)` }) : t("patient_portal.dashboard.view_tasks", { defaultValue: "Ver tarefas" })}
          </p>
        </PortalLoadingLink>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t("patient_portal.dashboard.quick_actions", { defaultValue: "AÃ§Ãµes rÃ¡pidas" })}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { href: portalHref("peso"), label: t("patient_portal.dashboard.log_weight", { defaultValue: "Registrar peso" }), icon: Scale, color: "text-emerald-600" },
            { href: portalHref("diario"), label: t("patient_portal.dashboard.new_meal", { defaultValue: "Nova refeiÃ§Ã£o" }), icon: ClipboardList, color: "text-violet-600" },
            { href: portalHref("cardapio"), label: t("patient_portal.dashboard.view_menu", { defaultValue: "Ver cardÃ¡pio" }), icon: Apple, color: "text-amber-600" },
            { href: portalHref("chat"), label: t("patient_portal.dashboard.chat", { defaultValue: "Chat" }), icon: MessageCircle, color: "text-brand-blue" },
            { href: portalHref("calculadora"), label: t("patient_portal.dashboard.taco", { defaultValue: "TACO" }), icon: Target, color: "text-cyan-600" },
            { href: portalHref("evolucao"), label: t("patient_portal.dashboard.progress", { defaultValue: "EvoluÃ§Ã£o" }), icon: TrendingUp, color: "text-rose-600" },
          ].map(({ href, label, icon: Icon, color }) => (
            <PortalLoadingLink
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-3.5 bg-card-bg rounded-xl border border-border-neutral hover:border-brand-blue/40 hover:shadow-sm hover:-translate-y-0.5 transition-all text-center"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-[11px] font-medium text-text-secondary leading-tight">{label}</span>
            </PortalLoadingLink>
          ))}
        </div>
      </div>

      {/* More links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PortalLoadingLink href={portalHref("arquivos")} className="flex items-center gap-3 p-4 bg-card-bg rounded-xl border border-border-neutral hover:border-brand-blue/40 hover:shadow-sm transition-all">
          <FileText className="w-5 h-5 text-slate-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.files", { defaultValue: "Arquivos" })}</p>
            <p className="text-xs text-text-secondary">{patient.documents?.length ? t("patient_portal.dashboard.files_count", { count: patient.documents.length.toString(), defaultValue: `${patient.documents.length} arquivo(s)` }) : t("patient_portal.dashboard.view_documents", { defaultValue: "Ver documentos" })}</p>
          </div>
        </PortalLoadingLink>
        <PortalLoadingLink href={portalHref("agenda")} className="flex items-center gap-3 p-4 bg-card-bg rounded-xl border border-border-neutral hover:border-brand-blue/40 hover:shadow-sm transition-all">
          <Calendar className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.schedule", { defaultValue: "Agenda" })}</p>
            <p className="text-xs text-text-secondary">
              {nextAppointment
                ? `${t("patient_portal.dashboard.next", { defaultValue: "PrÃ³xima:" })} ${format(new Date(nextAppointment.date), "dd/MM", { locale: dateLocale })}`
                : t("patient_portal.dashboard.view_consultations", { defaultValue: "Ver consultas" })}
            </p>
          </div>
        </PortalLoadingLink>
        <PortalLoadingLink href={portalHref("atendimentos")} className="flex items-center gap-3 p-4 bg-card-bg rounded-xl border border-border-neutral hover:border-brand-blue/40 hover:shadow-sm transition-all">
          <Video className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{t("patient_portal.dashboard.video_consultations", { defaultValue: "Videoconsultas" })}</p>
            <p className="text-xs text-text-secondary">{t("patient_portal.dashboard.online_consultations", { defaultValue: "Atendimentos online" })}</p>
          </div>
        </PortalLoadingLink>
      </div>
    </div>
  );
}

