"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { NutritionistConfigForm } from "@/components/config/NutritionistConfigForm";
import { GoogleCalendarConnect } from "@/components/settings/GoogleCalendarConnect";
import { GoogleCalendarFeedback } from "@/components/settings/GoogleCalendarFeedback";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AudioLines, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type ActionState = { error?: string; success?: boolean } | null;

type NutritionistDefaults = {
  name: string;
  crn: string;
  email: string;
  bio: string;
  whatsapp: string;
  clinicAddress: string;
  city: string;
  state: string;
  profileImageUrl: string;
  themePrimaryColor: string;
  specialtiesRaw: string;
};

interface ConfigPageClientProps {
  tenant: string;
  nutritionistSlug: string;
  hasGoogleToken: boolean;
  googleCalendarAvailable?: boolean;
  defaultValues: NutritionistDefaults;
  googleConnected?: string;
  googleError?: string;
  boundAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}

export function ConfigPageClient({
  tenant,
  nutritionistSlug,
  hasGoogleToken,
  googleCalendarAvailable = false,
  defaultValues,
  googleConnected,
  googleError,
  boundAction,
}: ConfigPageClientProps) {
  const { t } = useI18n();

  return (
    <>
      <DashboardHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      <div className="p-4 lg:p-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between p-4 bg-brand-blue-soft rounded-xl border border-brand-blue/20">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-blue" />
            <p className="text-sm text-brand-blue font-medium">
              {t("settings.public_page_desc")}
            </p>
          </div>
          <Link
            href={`/${tenant}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-hover shrink-0 ml-4"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("settings.view_page")}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PendingButtonLink
            href={`/dashboard/${tenant}/configuracoes/seguranca`}
            pendingLabel="Abrindo..."
            className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-border-neutral bg-card-bg p-4 transition-all hover:border-brand-blue/40 hover:bg-brand-blue/5"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-blue transition-colors">
                Governança & Segurança Ativa
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Trilha de auditoria, sessões conectadas e alertas.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-brand-blue transition-colors shrink-0" />
          </PendingButtonLink>

          <PendingButtonLink
            href={`/dashboard/${tenant}/configuracoes/privacidade`}
            pendingLabel="Abrindo..."
            className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-border-neutral bg-card-bg p-4 transition-all hover:border-brand-blue/40 hover:bg-brand-blue/5"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-blue transition-colors">
                Privacidade & Conformidade LGPD
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Aceite de termos, portabilidade e direito ao esquecimento.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-brand-blue transition-colors shrink-0" />
          </PendingButtonLink>

          <PendingButtonLink
            href={`/dashboard/${tenant}/configuracoes/transcricao`}
            pendingLabel="Abrindo..."
            className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-border-neutral bg-card-bg p-4 transition-all hover:border-brand-blue/40 hover:bg-brand-blue/5"
          >
            <div className="min-w-0 flex-1">
              <h4 className="flex items-center gap-2 text-sm font-bold text-text-primary group-hover:text-brand-blue transition-colors">
                <AudioLines className="h-4 w-4" />
                {t("transcription.settings.title")}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {t("transcription.automaticDescription")}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-brand-blue transition-colors shrink-0" />
          </PendingButtonLink>
        </div>

        <section
          id="professional-profile"
          tabIndex={-1}
          className="scroll-mt-6 rounded-xl border border-border-neutral bg-card-bg p-6 outline-none"
        >
          <NutritionistConfigForm
            action={boundAction}
            defaultValues={defaultValues}
          />
        </section>

        <GoogleCalendarFeedback connected={!!googleConnected} error={googleError} />

        <section id="google-calendar" tabIndex={-1} className="scroll-mt-6 outline-none">
          <GoogleCalendarConnect
            tenantSlug={tenant}
            connected={hasGoogleToken}
            available={googleCalendarAvailable}
          />
        </section>

        <p className="text-xs text-text-secondary text-center">
          {t("settings.slug_info")}{" "}
          <code className="bg-warm-beige px-1.5 py-0.5 rounded font-mono">{tenant}</code>
          {" "}— {t("settings.slug_warning")}
          {" "}{t("settings.auth_session")}{" "}
          <strong>{nutritionistSlug}</strong>
        </p>
      </div>
    </>
  );
}
