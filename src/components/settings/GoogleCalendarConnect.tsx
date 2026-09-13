"use client";

import { useState, useTransition } from "react";
import { CalendarDays, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { disconnectGoogleCalendarAction } from "@/actions/google-calendar.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { toast } from "sonner";

interface Props {
  tenantSlug: string;
  connected: boolean;
  available: boolean;
}

export function GoogleCalendarConnect({
  tenantSlug,
  connected: initialConnected,
  available,
}: Props) {
  const { t } = useI18n();
  const [connected, setConnected] = useState(initialConnected);
  const [isPending, startTransition] = useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      const res = await disconnectGoogleCalendarAction(tenantSlug);
      if (res.success) {
        setConnected(false);
        toast.success(t("settings.google_disconnect_success"));
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="bg-white border border-border-neutral rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">{t("settings.google_calendar")}</h3>
          <p className="text-xs text-text-secondary">{t("settings.google_calendar_desc")}</p>
        </div>
        <div className="ml-auto">
          {connected ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" /> {t("settings.google_connected")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
              <XCircle className="w-4 h-4" /> {t("settings.google_disconnected")}
            </span>
          )}
        </div>
      </div>

      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-60"
        >
          {isPending ? t("settings.google_disconnecting") : t("settings.google_disconnect")}
        </button>
      ) : available ? (
        // OAuth starts at a Route Handler that redirects to Google, so this
        // must be a document navigation rather than a client-side route.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          {t("settings.google_connect")}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
        >
          <ExternalLink className="w-4 h-4" />
          {t("settings.google_connect")}
        </button>
      )}

      {!connected && !available && (
        <p className="text-xs text-amber-700" role="status">
          {t("settings.google_not_configured")}
        </p>
      )}

      <p className="text-xs text-text-secondary">
        {t("settings.google_calendar_note")}
      </p>
    </div>
  );
}
