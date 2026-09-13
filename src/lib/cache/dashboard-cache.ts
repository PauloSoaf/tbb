import { unstable_cache } from "next/cache";
import { cacheTags } from "./cache-tags";
import {
  getBirthdaysThisWeek,
  getDashboardStats,
  getLowMoodAlerts,
  getPatientsNeedingAction,
  getPatientsWithoutRecentCheckin,
  getRecentAnamneses,
  getRecentAttentionPoints,
  getTodayAppointments,
  getTodayCheckins,
  getUnreadMessagesSummary,
  getUpcomingAppointments,
} from "@/services/dashboard.service";

// Server-side cache for dashboard data.
// Each function is scoped to a nutritionistId — cross-tenant leaks are impossible
// because the cache key includes nutritionistId and the DB query filters by it.
// TTLs are long because mutations call revalidateTag({ expire: 0 }) immediately.
// Today's appointments: 120s (refreshed often), messages: 30s, stable data: 300s.

const STABLE_TTL = 300; // 5 min — stats, birthdays, attention
const APPOINTMENTS_TTL = 120; // 2 min — today / upcoming appointments
const MESSAGES_TTL = 30; // 30s — unread messages (latency-sensitive)

function dashboardTag(nutritionistId: string) {
  return [cacheTags.dashboard(nutritionistId)];
}

export function getDashboardStatsCached(nutritionistId: string) {
  return unstable_cache(
    () => getDashboardStats(nutritionistId),
    ["dashboard-stats", nutritionistId],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getRecentAnamnesesCached(nutritionistId: string, limit = 3) {
  return unstable_cache(
    () => getRecentAnamneses(nutritionistId, limit),
    ["dashboard-anamneses", nutritionistId, String(limit)],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getRecentAttentionPointsCached(nutritionistId: string) {
  return unstable_cache(
    () => getRecentAttentionPoints(nutritionistId),
    ["dashboard-attention", nutritionistId],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getLowMoodAlertsCached(nutritionistId: string) {
  return unstable_cache(
    () => getLowMoodAlerts(nutritionistId),
    ["dashboard-low-mood", nutritionistId],
    { revalidate: APPOINTMENTS_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getTodayCheckinsCached(nutritionistId: string) {
  return unstable_cache(
    () => getTodayCheckins(nutritionistId),
    ["dashboard-today-checkins", nutritionistId],
    { revalidate: APPOINTMENTS_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getPatientsWithoutRecentCheckinCached(nutritionistId: string) {
  return unstable_cache(
    () => getPatientsWithoutRecentCheckin(nutritionistId),
    ["dashboard-inactive-checkin", nutritionistId],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getBirthdaysThisWeekCached(nutritionistId: string) {
  return unstable_cache(
    () => getBirthdaysThisWeek(nutritionistId),
    ["dashboard-birthdays", nutritionistId],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getTodayAppointmentsCached(nutritionistId: string) {
  return unstable_cache(
    () => getTodayAppointments(nutritionistId),
    ["dashboard-today-appts", nutritionistId],
    { revalidate: APPOINTMENTS_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getUpcomingAppointmentsCached(nutritionistId: string, limit = 5) {
  return unstable_cache(
    () => getUpcomingAppointments(nutritionistId, limit),
    ["dashboard-upcoming-appts", nutritionistId, String(limit)],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getPatientsNeedingActionCached(nutritionistId: string, limit = 8) {
  return unstable_cache(
    () => getPatientsNeedingAction(nutritionistId, limit),
    ["dashboard-needing-action", nutritionistId, String(limit)],
    { revalidate: STABLE_TTL, tags: dashboardTag(nutritionistId) }
  )();
}

export function getUnreadMessagesSummaryCached(nutritionistId: string, limit = 5) {
  return unstable_cache(
    () => getUnreadMessagesSummary(nutritionistId, limit),
    ["dashboard-unread-msgs", nutritionistId, String(limit)],
    { revalidate: MESSAGES_TTL, tags: dashboardTag(nutritionistId) }
  )();
}
