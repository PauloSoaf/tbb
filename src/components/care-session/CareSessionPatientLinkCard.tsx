"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Copy, XCircle } from "lucide-react";
import { generateCareSessionPatientLinkAction, invalidateCareSessionPatientLinkAction } from "@/actions/care-session-link.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
  sessionId: string;
  hasExistingToken: boolean;
}

export function CareSessionPatientLinkCard({ tenantSlug, sessionId, hasExistingToken }: Props) {
  const { t } = useI18n();
  const [pendingAction, setPendingAction] = useState<"generate" | "invalidate" | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(hasExistingToken);

  const handleGenerate = async () => {
    setPendingAction("generate");
    try {
      const res = await generateCareSessionPatientLinkAction(tenantSlug, sessionId);
      if (res.success && res.token) {
        const link = `${window.location.origin}/portal/${tenantSlug}/atendimentos/${sessionId}?token=${res.token}`;
        setGeneratedLink(link);
        setHasToken(true);
        toast.success(t("care_session_link.generated_toast"));
      } else {
        toast.error(t("care_session_link.generate_error"));
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleInvalidate = async () => {
    setPendingAction("invalidate");
    try {
      const res = await invalidateCareSessionPatientLinkAction(tenantSlug, sessionId);
      if (res.success) {
        setGeneratedLink(null);
        setHasToken(false);
        toast.success(t("care_session_link.invalidated_toast"));
      } else {
        toast.error(t("care_session_link.invalidate_error"));
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success(t("care_session_link.copied_toast"));
  };

  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-brand-blue" />
        <h3 className="font-semibold text-text-primary">{t("care_session_link.title")}</h3>
      </div>

      {!hasToken && !generatedLink ? (
        <div>
          <p className="text-sm text-text-secondary mb-3">{t("care_session_link.description")}</p>
          <AsyncButton
            onClick={handleGenerate}
            pending={pendingAction === "generate"}
            pendingLabel={t("care_session_link.generating")}
            disabled={pendingAction !== null && pendingAction !== "generate"}
            className="w-full px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {t("care_session_link.generate")}
          </AsyncButton>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">{t("care_session_link.expires_notice")}</p>

          {generatedLink ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generatedLink}
                className="flex-1 text-xs bg-transparent text-text-primary border border-border-neutral rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <button
                onClick={handleCopy}
                className="p-2 bg-surface-warm hover:bg-border-neutral text-text-primary rounded-lg transition-colors"
                title={t("care_session_link.copy_tooltip")}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">{t("care_session_link.active")}</span>
              <AsyncButton
                onClick={handleGenerate}
                pending={pendingAction === "generate"}
                pendingLabel={t("care_session_link.generating")}
                disabled={pendingAction !== null && pendingAction !== "generate"}
                className="text-xs text-green-700 dark:text-green-400 underline hover:text-green-800 dark:hover:text-green-300"
              >
                {t("care_session_link.regenerate")}
              </AsyncButton>
            </div>
          )}

          {hasToken && (
            <AsyncButton
              onClick={handleInvalidate}
              pending={pendingAction === "invalidate"}
              pendingLabel="Invalidando..."
              disabled={pendingAction !== null && pendingAction !== "invalidate"}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              {t("care_session_link.invalidate")}
            </AsyncButton>
          )}
        </div>
      )}
    </div>
  );
}
