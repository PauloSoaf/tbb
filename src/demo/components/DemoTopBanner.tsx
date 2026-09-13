"use client";

// The ONLY demo-specific chrome: a slim banner ABOVE the real app shell.
// Everything below it (sidebar, header, pages) is the real NutriOpus.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Stethoscope, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { demoRoutes } from "../demo-routes";
import { useDemo } from "../demo-context";

export function DemoTopBanner({ variant }: { variant: "dashboard" | "portal" }) {
  const { t } = useI18n();
  const router = useRouter();
  const { resetDemo } = useDemo();

  const switchHref = variant === "dashboard" ? demoRoutes.portal : demoRoutes.dashboard;
  const switchLabel =
    variant === "dashboard" ? t("demo.switcher.patient_view") : t("demo.switcher.nutritionist_view");

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300/40 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-950/40 print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5">
        <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          {t("demo.banner.badge")}
        </span>
        <p className="hidden min-w-0 flex-1 truncate text-xs font-medium text-amber-900 dark:text-amber-200 sm:block">
          {t("demo.banner.description")}
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href={switchHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover"
          >
            {variant === "dashboard" ? <Users className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
            {switchLabel}
          </Link>
          <button
            type="button"
            onClick={() => {
              resetDemo();
              toast.success(t("demo.reset.success"));
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            <RotateCcw className="h-3 w-3" />
            {t("demo.switcher.reset")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label={t("demo.switcher.exit")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            <X className="h-3 w-3" />
            {t("demo.switcher.exit")}
          </button>
        </div>
      </div>
    </div>
  );
}
