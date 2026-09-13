import {
  getBirthdaysThisWeekCached,
  getDashboardStatsCached,
  getLowMoodAlertsCached,
  getPatientsNeedingActionCached,
  getPatientsWithoutRecentCheckinCached,
  getRecentAnamnesesCached,
  getRecentAttentionPointsCached,
  getTodayAppointmentsCached,
  getTodayCheckinsCached,
  getUnreadMessagesSummaryCached,
  getUpcomingAppointmentsCached,
} from "@/lib/cache/dashboard-cache";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant } = await params;
  const { session, nutritionist } = await assertTenantAccess(tenant);

  const [
    stats,
    recentAnamneses,
    attentionPoints,
    lowMoodAlerts,
    todayCheckins,
    patientsInactive,
    birthdays,
    todayAppointments,
    upcomingAppointments,
    patientsNeedingAction,
    unreadMessages,
  ] = await Promise.all([
    getDashboardStatsCached(session.nutritionistId),
    getRecentAnamnesesCached(session.nutritionistId, 3),
    getRecentAttentionPointsCached(session.nutritionistId),
    getLowMoodAlertsCached(session.nutritionistId).catch(() => []),
    getTodayCheckinsCached(session.nutritionistId).catch(() => []),
    getPatientsWithoutRecentCheckinCached(session.nutritionistId).catch(() => 0),
    getBirthdaysThisWeekCached(session.nutritionistId).catch(() => []),
    getTodayAppointmentsCached(session.nutritionistId).catch(() => []),
    getUpcomingAppointmentsCached(session.nutritionistId).catch(() => []),
    getPatientsNeedingActionCached(session.nutritionistId).catch(() => []),
    getUnreadMessagesSummaryCached(session.nutritionistId).catch(() => []),
  ]);

  return (
    <DashboardPageClient
      data={{
        tenant,
        nutritionistName: nutritionist.name,
        nutritionistHasGoogleToken: Boolean(nutritionist.googleAccessToken),
        googleCalendarAvailable: Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
        nutritionistBio: nutritionist.bio,
        nutritionistCity: nutritionist.city,
        nutritionistProfileImageUrl: nutritionist.profileImageUrl,
        stats,
        recentAnamneses,
        attentionPoints,
        lowMoodAlerts,
        todayCheckins,
        patientsInactive,
        birthdays,
        todayAppointments,
        upcomingAppointments,
        patientsNeedingAction,
        unreadMessages,
      }}
    />
  );
}
