"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientMobileCard } from "@/components/patients/PatientMobileCard";
import { PatientsStatsGrid } from "@/components/patients/PatientsStatsGrid";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";
import { Search, Users, UserPlus, Tag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type PatientRow = {
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
};

type PatientsStats = {
  totalPatients: number;
  activePatients: number;
  patientsWithoutPlan: number;
  patientsWithUpcomingAppointments: number;
};

interface PacientesPageClientProps {
  tenant: string;
  patients: PatientRow[];
  availableTags: { label: string; color: string }[];
  stats: PatientsStats;
  filters: {
    q?: string;
    status?: string;
    engagement?: string;
    sort?: string;
    tag?: string;
  };
  showCreatedSuccess?: boolean;
}

export function PacientesPageClient({
  tenant,
  patients,
  availableTags,
  stats,
  filters,
  showCreatedSuccess = false,
}: PacientesPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const creationToastShown = useRef(false);
  const [pendingFilter, setPendingFilter] = useState<string | null>(null);
  const { q, status, engagement, sort, tag } = filters;

  useEffect(() => {
    if (!showCreatedSuccess || creationToastShown.current) return;

    creationToastShown.current = true;
    toast.success(t("patients_list.created_success", { defaultValue: "Paciente cadastrado com sucesso!" }));
    router.replace(routes.patients(tenant), { scroll: false });
  }, [router, showCreatedSuccess, t, tenant]);

  const STATUS_OPTIONS = [
    { value: "", label: t("patients_list.status_all") },
    { value: "ACTIVE", label: t("patients_list.status_active") },
    { value: "INACTIVE", label: t("patients_list.status_inactive") },
    { value: "ARCHIVED", label: t("patients_list.status_archived") },
  ];

  const ENGAGEMENT_OPTIONS = [
    { value: "", label: t("patients_list.status_all") },
    { value: "WITH_CHECKIN", label: t("patients_list.engagement_with_checkin") },
    { value: "WITHOUT_CHECKIN", label: t("patients_list.engagement_without_checkin") },
    { value: "WITH_PLAN", label: t("patients_list.engagement_with_plan") },
  ];

  const SORT_OPTIONS = [
    { value: "", label: t("patients_list.sort_recent") },
    { value: "name", label: t("patients_list.sort_name") },
    { value: "oldest", label: t("patients_list.sort_oldest") },
  ];

  return (
    <>
      <DashboardHeader
        title={t("patients_list.title")}
        subtitle={t("patients_list.subtitle")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.patients"), current: true },
        ]}
      />

      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <PatientsStatsGrid stats={stats} />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form
            className="flex flex-col gap-3 flex-1"
            aria-busy={pendingFilter !== null || undefined}
            onSubmit={(event) => {
              const submitter = event.nativeEvent.submitter as HTMLButtonElement | null;
              setPendingFilter(submitter ? `${submitter.name}:${submitter.value}` : "search");
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder={t("patients_list.search_placeholder")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                    text-text-primary placeholder:text-text-secondary/50
                    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                    transition-all duration-200"
                />
                {pendingFilter === "search" && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-blue" aria-label="Buscando pacientes" />
                )}
                {engagement && <input type="hidden" name="engagement" value={engagement} />}
                {tag && <input type="hidden" name="tag" value={tag} />}
              </div>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="submit"
                    name="status"
                    value={opt.value}
                    disabled={pendingFilter !== null}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      (status ?? "") === opt.value
                        ? "bg-brand-blue text-white"
                        : "bg-card-bg border border-border-neutral text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {pendingFilter === `status:${opt.value}` && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary font-medium">{t("patients_list.checkin_7_days")}</span>
              {ENGAGEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="submit"
                  name="engagement"
                  value={opt.value}
                  disabled={pendingFilter !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    (engagement ?? "") === opt.value
                      ? "bg-emerald-600 text-white"
                      : "bg-card-bg border border-border-neutral text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {pendingFilter === `engagement:${opt.value}` && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                  {opt.label}
                </button>
              ))}
              {status && <input type="hidden" name="status" value={status} />}
              {tag && <input type="hidden" name="tag" value={tag} />}
            </div>
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-secondary font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {t("patients_list.tags")}
                </span>
                <button
                  type="submit"
                  name="tag"
                  value=""
                  disabled={pendingFilter !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    !tag
                      ? "bg-slate-700 text-white"
                      : "bg-card-bg border border-border-neutral text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {pendingFilter === "tag:" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                  {t("patients_list.all_tags")}
                </button>
                {availableTags.map((tagItem) => {
                  const isActive = tag === tagItem.label;
                  return (
                    <button
                      key={tagItem.label}
                      type="submit"
                      name="tag"
                      value={tagItem.label}
                      disabled={pendingFilter !== null}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
                        isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
                      }`}
                      style={
                        isActive
                          ? { backgroundColor: tagItem.color, borderColor: tagItem.color }
                          : { borderColor: tagItem.color, color: tagItem.color }
                      }
                    >
                      {pendingFilter === `tag:${tagItem.label}` && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                      {tagItem.label}
                    </button>
                  );
                })}
                {status && <input type="hidden" name="status" value={status} />}
                {engagement && <input type="hidden" name="engagement" value={engagement} />}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary font-medium">{t("patients_list.sort_by")}</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="submit"
                  name="sort"
                  value={opt.value}
                  disabled={pendingFilter !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    (sort ?? "") === opt.value
                      ? "bg-brand-blue text-white"
                      : "bg-card-bg border border-border-neutral text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {pendingFilter === `sort:${opt.value}` && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                  {opt.label}
                </button>
              ))}
              {status && <input type="hidden" name="status" value={status} />}
              {engagement && <input type="hidden" name="engagement" value={engagement} />}
              {tag && <input type="hidden" name="tag" value={tag} />}
            </div>
          </form>
          <PendingButtonLink
            prefetch={false}
            href={`/dashboard/${tenant}/pacientes/novo`}
            pendingLabel={t("common.loading", { defaultValue: "Abrindo..." })}
            id="btn-novo-paciente"
            className="inline-flex items-center justify-center gap-2 px-5 py-3
              bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold
              rounded-xl transition-colors duration-200 shadow-sm hover:shadow-md shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            {t("patients_list.new_patient")}
          </PendingButtonLink>
        </div>

        {patients.length === 0 ? (
          <div className="bg-card-bg rounded-xl border border-border-neutral p-12 text-center">
            <Users className="w-12 h-12 text-text-secondary/40 mx-auto mb-4" />
            <h3 className="font-semibold text-text-primary mb-2">
              {q || tag ? t("patients_list.not_found") : t("patients_list.no_patients_yet")}
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              {q || tag
                ? t("patients_list.try_another_search")
                : t("patients_list.register_first_manual")}
            </p>
            {!q && !tag && (
              <PendingButtonLink
                prefetch={false}
                href={`/dashboard/${tenant}/pacientes/novo`}
                pendingLabel={t("common.loading", { defaultValue: "Abrindo..." })}
                className="inline-flex items-center gap-2 px-4 py-2
                  bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium
                  rounded-lg transition-colors duration-200"
              >
                <UserPlus className="w-4 h-4" />
                {t("patients_list.register_first")}
              </PendingButtonLink>
            )}
          </div>
        ) : (
          <>
            <div className="bg-card-bg rounded-xl border border-border-neutral overflow-hidden hidden md:block">
              <PatientTable patients={patients} tenantSlug={tenant} />
            </div>
            <div className="md:hidden space-y-3">
              {patients.map((patient) => (
                <PatientMobileCard key={patient.id} patient={patient} tenantSlug={tenant} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
