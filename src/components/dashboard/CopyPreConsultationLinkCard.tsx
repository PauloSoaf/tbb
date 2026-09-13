"use client";

import { Link2 } from "lucide-react";
import { CopyPreConsultaLink } from "./CopyPreConsultaLink";
import { useI18n } from "@/lib/i18n/I18nContext";

export function CopyPreConsultationLinkCard({ tenant }: { tenant: string }) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-border-neutral bg-card-bg p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold text-text-primary">{t("dashboard.share_pre_consultation")}</h2>
          <p className="text-sm text-text-secondary">{t("dashboard.share_pre_consultation_desc")}</p>
        </div>
      </div>
      <CopyPreConsultaLink tenantSlug={tenant} />
    </section>
  );
}
