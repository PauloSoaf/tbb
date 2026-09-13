import React from "react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { SecurityAndAuditClient } from "@/components/security/SecurityAndAuditClient";

interface PageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function SecuritySettingsPage(props: PageProps) {
  const { tenant } = await props.params;
  await assertTenantAccess(tenant);
  const { t } = await getServerTranslations();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">
      <DashboardHeader
        title={t("security.title")}
        subtitle={t("security.subtitle")}
        breadcrumbs={[
          { label: "Dashboard", href: `/dashboard/${tenant}` },
          { label: "Configurações", href: `/dashboard/${tenant}/configuracoes` },
          { label: t("security.title"), current: true },
        ]}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppBackButton
              href={`/dashboard/${tenant}/configuracoes`}
              label="Voltar para Configurações"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                {t("security.title")}
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                {t("security.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <SecurityAndAuditClient tenantSlug={tenant} />
      </main>
    </div>
  );
}
