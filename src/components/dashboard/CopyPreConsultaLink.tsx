"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  tenantSlug: string;
}

export function CopyPreConsultaLink({ tenantSlug }: Props) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://nutriopus.com.br";

  const link = `${appUrl}/${tenantSlug}/pre-consulta`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(t("dashboard.link_copied_success") || "Link de pré-consulta copiado.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 transition-colors text-sm font-medium"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          {t("dashboard.link_copied")}
        </>
      ) : (
        <>
          <Link2 className="w-3.5 h-3.5" />
          {t("dashboard.copy_pre_consultation_link")}
        </>
      )}
    </button>
  );
}
