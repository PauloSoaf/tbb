import React from "react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { LgpdClient } from "@/components/lgpd/LgpdClient";
import { lgpdService } from "@/services/lgpd.service";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function PrivacySettingsPage(props: PageProps) {
  const { tenant } = await props.params;
  const { session } = await assertTenantAccess(tenant);

  const [consents, requests, patients] = await Promise.all([
    lgpdService.listConsentRecords(session.nutritionistId),
    lgpdService.listDataSubjectRequests(session.nutritionistId),
    prisma.patient.findMany({
      where: { nutritionistId: session.nutritionistId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">
      <DashboardHeader
        title="Central de Privacidade & Conformidade LGPD"
        subtitle="Gerencie consentimentos, portabilidade estruturada e solicitações de titulares da clínica com auditoria ativa."
        breadcrumbs={[
          { label: "Dashboard", href: `/dashboard/${tenant}` },
          { label: "Configurações", href: `/dashboard/${tenant}/config` },
          { label: "Privacidade & LGPD", current: true },
        ]}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppBackButton
              href={`/dashboard/${tenant}/config`}
              label="Voltar para Configurações"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                Conformidade LGPD & Central de Privacidade
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Armazene históricos imutáveis de aceite (Art. 7º) e atenda a requisições de portabilidade e exclusão de titulares (Art. 18).
              </p>
            </div>
          </div>
        </div>

        <LgpdClient
          tenantSlug={tenant}
          initialConsents={consents}
          initialRequests={requests}
          patients={patients}
        />
      </main>
    </div>
  );
}
