"use client";

// Blocked screen — creating a care session (and the native call it opens)
// requires the real backend. Shown when "Novo atendimento" is clicked in demo.
import Link from "next/link";
import { ArrowLeft, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { demoRoutes } from "@/demo/demo-routes";

export default function DemoNewCareSessionBlockedPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-border-neutral bg-card-bg p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
          <Video className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-text-primary">{t("demo.notice.unavailable_in_demo")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("demo.notice.native_call_disabled")}</p>
        <p className="mt-1 text-sm text-text-secondary">{t("demo.notice.no_backend")}</p>
        <Link
          href={demoRoutes.careSessions}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("demo.pages.back")}
        </Link>
      </div>
    </div>
  );
}
