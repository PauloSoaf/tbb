"use client";

import { useMemo, type FC, type SVGProps } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FilePlus2,
  MessageCircle,
  Paperclip,
  Printer,
  Ruler,
  Stethoscope,
  TrendingUp,
  Utensils,
  Weight,
} from "lucide-react";
import { getPatientHref } from "@/services/patient-route.service";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { ExportButtons } from "@/components/patients/ExportButtons";
import { ResendPortalLinkButton } from "@/components/patients/ResendPortalLinkButton";
import { ExportPatientDataButton } from "@/components/patients/export/ExportPatientDataButton";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type IconType = FC<SVGProps<SVGSVGElement>>;

interface PatientActionSidebarPatient {
  id: string;
  name: string;
  email?: string | null;
}

interface ActionItem {
  key: string;
  label: string;
  href: string;
  icon: IconType;
  group: "quick" | "reports" | "communication";
  tone?: "primary" | "neutral";
}

interface Props {
  tenant: string;
  patient: PatientActionSidebarPatient;
  expanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Real grid-column rail — sized entirely by the parent grid track (see
 * PatientRecordPageLayout), never by its own width/position. Below `lg` it
 * renders as a horizontal scrollable toolbar; from `lg` up as a vertical
 * rail; the expand toggle (labels + grouped sections) only takes effect
 * from `xl` up, where the parent grid has room for a real 320px column.
 */
export function PatientActionSidebar({ tenant, patient, expanded, onToggleExpanded }: Props) {
  const { t } = useI18n();

  const patientHref = (suffix?: string, hash?: string) =>
    getPatientHref({ tenant, patient, suffix, hash });

  const quickItems = useMemo<ActionItem[]>(
    () => [
      { key: "prontuario", label: t("patient_record.sidebar.clinical_summary"), href: patientHref(undefined, "prontuario"), icon: FilePlus2, group: "quick", tone: "primary" },
      { key: "new-evaluation", label: t("patient_record.sidebar.new_evaluation"), href: patientHref("avaliacoes/nova"), icon: Ruler, group: "quick", tone: "primary" },
      { key: "add-weight", label: t("patient_record.sidebar.add_weight"), href: patientHref("medidas/nova"), icon: Weight, group: "quick", tone: "primary" },
      { key: "new-appointment", label: t("patient_record.sidebar.new_appointment"), href: `/dashboard/${tenant}/atendimentos/novo?patientId=${patient.id}`, icon: Stethoscope, group: "quick", tone: "primary" },
      { key: "new-meal-plan", label: t("patient_record.sidebar.new_meal_plan"), href: patientHref("planos/novo"), icon: Utensils, group: "quick" },
      { key: "schedule", label: t("patient_record.sidebar.schedule"), href: `/dashboard/${tenant}/agenda?patientId=${patient.id}`, icon: CalendarPlus, group: "quick" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient.id, tenant]
  );

  const reportItems = useMemo<ActionItem[]>(
    () => [
      { key: "ficha", label: t("patient_record.sidebar.clinical_record"), href: patientHref("ficha"), icon: Printer, group: "reports" },
      { key: "meal-plans", label: t("patient_record.sidebar.meal_plans"), href: patientHref("planos"), icon: Utensils, group: "reports" },
      { key: "evaluations", label: t("patient_record.sidebar.evaluations"), href: patientHref("avaliacoes"), icon: Ruler, group: "reports" },
      { key: "adipometer", label: t("patient_record.sidebar.adipometer"), href: patientHref("avaliacoes/adipometro"), icon: Activity, group: "reports" },
      { key: "files", label: t("patient_record.sidebar.files"), href: patientHref("arquivos"), icon: Paperclip, group: "reports" },
      { key: "evolution-report", label: t("patient_record.sidebar.evolution_report"), href: patientHref("relatorio"), icon: TrendingUp, group: "reports" },
      { key: "adherence-report", label: t("patient_record.sidebar.adherence_report"), href: patientHref("adesao"), icon: BarChart3, group: "reports" },
      { key: "appointments", label: t("patient_record.sidebar.appointments_history"), href: patientHref("consultas"), icon: CalendarDays, group: "reports" },
      { key: "anamnesis", label: t("patient_record.sidebar.anamnesis"), href: patientHref("anamnese"), icon: ClipboardList, group: "reports" },
      { key: "diary", label: t("patient_record.sidebar.food_diary"), href: patientHref("diario"), icon: BookOpen, group: "reports" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient.id, tenant]
  );

  const communicationItems = useMemo<ActionItem[]>(
    () => [
      { key: "chat", label: t("patient_record.sidebar.chat"), href: patientHref("chat"), icon: MessageCircle, group: "communication" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient.id, tenant]
  );

  const railItems = [...quickItems, ...reportItems.slice(0, 4), ...communicationItems];

  return (
    <div
      data-patient-action-rail={expanded ? "expanded" : "collapsed"}
      className={`flex h-full flex-col rounded-2xl border border-border-neutral shadow-sm ${
        expanded ? "bg-card-bg" : "bg-[var(--sidebar-background)]"
      }`}
    >
      {/* Toggle — only meaningful from xl up (parent grid ignores it below xl) */}
      <div className={`hidden items-center gap-2 border-b border-border-neutral xl:flex ${expanded ? "justify-between p-2" : "justify-center p-3"}`}>
        {expanded && (
          <p className="min-w-0 truncate px-1 text-[11px] font-bold uppercase tracking-wide text-brand-blue">
            {t("patient_record.sidebar.quick_actions")}
          </p>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? t("patient_record.sidebar.collapse") : t("patient_record.sidebar.expand")}
          className={`flex h-12 shrink-0 items-center justify-center rounded-xl border border-border-neutral bg-card-bg text-text-secondary shadow-sm transition-colors hover:border-brand-blue/30 hover:bg-brand-blue-soft hover:text-brand-blue ${
            expanded ? "ml-auto w-11 xl:h-11" : "w-full"
          }`}
        >
          {expanded ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile/tablet horizontal toolbar (< lg): quick + a few reports, icon-only */}
      <div className="flex gap-2 overflow-x-auto p-2 lg:hidden" role="toolbar" aria-label={t("patient_record.sidebar.quick_actions")}>
        {railItems.map((item) => (
          <RailButton key={item.key} item={item} />
        ))}
      </div>

      {/* Desktop vertical rail (>= lg) */}
      <div className={`hidden flex-1 flex-col gap-4 overflow-y-auto lg:flex ${expanded ? "p-2" : "p-3"}`}>
        <Group title={t("patient_record.sidebar.quick_actions")} items={quickItems} expanded={expanded} />
        <Group title={t("patient_record.sidebar.reports")} items={reportItems} expanded={expanded} />
        <Group title={t("patient_record.sidebar.communication")} items={communicationItems} expanded={expanded} />

        {/* Portal & export — only meaningful expanded; lives ONLY here (not duplicated elsewhere) */}
        <div className={expanded ? "hidden space-y-1.5 border-t border-border-neutral pt-3 xl:block" : "hidden"}>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
            {t("patient_record.sidebar.portal_export")}
          </p>
          <div className="space-y-1.5 rounded-xl border border-border-neutral bg-surface-warm p-2">
            {patient.email && (
              <ResendPortalLinkButton tenantSlug={tenant} patientId={patient.id} patientEmail={patient.email} />
            )}
            <ExportPatientDataButton tenantSlug={tenant} patientId={patient.id} />
            <div className="border-t border-border-neutral px-2 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <Download className="h-3.5 w-3.5" />
                {t("patient_record.sidebar.export_csv")}
              </p>
              <ExportButtons patientId={patient.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailButton({ item }: { item: ActionItem }) {
  const Icon = item.icon;
  return (
    <AppTooltip content={item.label} side="bottom" align="center">
      <PendingButtonLink
        prefetch={false}
        href={item.href}
        pendingLabel={null}
        aria-label={item.label}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          item.tone === "primary"
            ? "border-brand-blue/25 bg-brand-blue/10 text-brand-blue hover:border-brand-blue/45 hover:bg-brand-blue/15"
            : "border-border-neutral bg-surface-warm text-text-secondary hover:border-brand-blue/30 hover:text-brand-blue"
        }`}
      >
        <Icon className="h-5 w-5" />
      </PendingButtonLink>
    </AppTooltip>
  );
}

function Group({ title, items, expanded }: { title: string; items: ActionItem[]; expanded: boolean }) {
  return (
    <div className="space-y-2">
      <p className={expanded ? "hidden px-1 text-[11px] font-bold uppercase tracking-wide text-text-secondary xl:block" : "hidden"}>
        {title}
      </p>
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isPrimary = item.tone === "primary";
          return (
            <AppTooltip key={item.key} content={item.label} side="left" align="center">
              <PendingButtonLink
                prefetch={false}
                href={item.href}
                pendingLabel={expanded ? "Abrindo..." : null}
                aria-label={item.label}
                className={`group flex h-12 w-full items-center gap-3 rounded-xl border text-sm font-semibold shadow-sm transition-colors justify-center px-0 ${
                  expanded ? "xl:h-11 xl:justify-start xl:px-3" : ""
                } ${
                  isPrimary
                    ? "border-brand-blue/25 bg-brand-blue/10 text-brand-blue hover:border-brand-blue/45 hover:bg-brand-blue-soft"
                    : "border-border-neutral bg-card-bg text-text-secondary hover:border-brand-blue/30 hover:bg-brand-blue-soft hover:text-brand-blue"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {expanded && <span className="hidden min-w-0 truncate xl:inline">{item.label}</span>}
              </PendingButtonLink>
            </AppTooltip>
          );
        })}
      </div>
    </div>
  );
}
