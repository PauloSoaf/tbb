"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  connected: boolean;
  error?: string;
}

export function GoogleCalendarFeedback({ connected, error }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    if (connected) {
      toast.success(t("settings.google_connect_success"));
    } else if (error) {
      const msg = error === "not-configured"
        ? t("settings.google_not_configured")
        : error === "2"
          ? t("settings.google_oauth_error")
          : t("settings.google_connect_error");
      toast.error(msg);
    }
  }, [connected, error, t]);

  return null;
}
