import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Plus, Eye, Pencil } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AnamneseDeleteButton } from "@/components/anamnese/AnamneseDeleteButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Anamneses do Paciente | NutriOpus" };

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NEW: { label: "Nova", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  REVIEWED: { label: "Revisada", className: "bg-green-500/15 text-green-700 dark:text-green-300" },
  ARCHIVED: { label: "Arquivada", className: "bg-gray-500/15 text-gray-700 dark:text-gray-300" },
};

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function PatientAnamnesePage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const [patient, anamneses, { t }] = await Promise.all([
    getPatientById(nutritionist.id, patientId),
    prisma.anamneseResponse.findMany({
      where: { patientId, nutritionistId: nutritionist.id },
      orderBy: { submittedAt: "desc" },
    }),
    getServerTranslations(),
  ]);

  if (!patient) notFound();

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title={t("anamnese_page.title")}
        subtitle={patient.name}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientSlug}` },
          { label: t("anamnese_page.title"), current: true },
        ]}
        backButton={{
          href: `/dashboard/${tenant}/pacientes/${patientSlug}`,
          label: t("navigation.back_to", { label: patient.name }),
        }}
      />

      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-brand-blue" />
              {t("anamnese_page.title")}
            </h1>
            <p className="text-text-secondary text-sm">{patient.name}</p>
          </div>
          <Link
            href={`/dashboard/${tenant}/pacientes/${patientSlug}/anamnese/nova`}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-brand-blue/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("anamnese_page.new_anamnese")}
          </Link>
        </div>

        {anamneses.length === 0 ? (
          <div className="bg-card-bg border border-border-neutral rounded-xl p-12 text-center shadow-sm">
            <ClipboardList className="w-12 h-12 text-text-secondary/30 mx-auto mb-3" />
            <p className="text-text-secondary mb-4">{t("anamnese_page.empty_desc")}</p>
            <Link
              href={`/dashboard/${tenant}/pacientes/${patientSlug}/anamnese/nova`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-brand-blue/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t("anamnese_page.register_first")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {anamneses.map((anamnese) => {
              const statusInfo = STATUS_LABELS[anamnese.status] ?? STATUS_LABELS.NEW;
              return (
                <div
                  key={anamnese.id}
                  className="bg-card-bg border border-border-neutral rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-blue/30 transition-colors shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {format(new Date(anamnese.submittedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {anamnese.summary ? (
                      <p className="text-sm text-text-secondary line-clamp-2">{anamnese.summary}</p>
                    ) : (
                      <p className="text-sm text-text-secondary italic">{t("anamnese_page.no_summary")}</p>
                    )}
                    {anamnese.attentionPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {anamnese.attentionPoints.slice(0, 3).map((point, i) => (
                          <span key={i} className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                            {point}
                          </span>
                        ))}
                        {anamnese.attentionPoints.length > 3 && (
                          <span className="text-xs text-text-secondary">+{anamnese.attentionPoints.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/dashboard/${tenant}/anamnese/${anamnese.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-brand-blue border border-border-neutral hover:border-brand-blue/30 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/${tenant}/anamnese/${anamnese.id}/editar`}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-brand-blue border border-border-neutral hover:border-brand-blue/30 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Link>
                    <AnamneseDeleteButton tenant={tenant} responseId={anamnese.id} compact />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
