"use client";

// /demo = the REAL public nutritionist page with demo data. The dashboard
// sidebar's "Página Pública" item (href = /demo when tenant="demo") lands
// here, mirroring how the real app links to /{tenant}.
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PublicNutritionistPage } from "@/components/public-page/PublicNutritionistPage";
import { demoNutritionist } from "@/demo/demo-data";
import { demoRoutes } from "@/demo/demo-routes";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function DemoPublicPage() {
  const { t } = useI18n();

  return (
    <div>
      {/* Slim return bar (the public page has no app shell, like the real one) */}
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-amber-300/40 bg-amber-50 px-3 py-1.5 dark:border-amber-700/40 dark:bg-amber-950/40">
        <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          {t("demo.banner.badge")}
        </span>
        <Link
          href={demoRoutes.dashboard}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover"
        >
          <LayoutDashboard className="h-3 w-3" />
          {t("demo.switcher.nutritionist_view")}
        </Link>
      </div>

      <PublicNutritionistPage
        nutritionist={{
          slug: "demo",
          name: demoNutritionist.name,
          crn: demoNutritionist.crn,
          bio: "Nutricionista clínica com foco em emagrecimento saudável e reeducação alimentar.",
          whatsapp: "(92) 99999-0000",
          email: "fabiola.demo@exemplo.com",
          clinicAddress: "Av. Exemplo, 1000 — Sala 42",
          city: demoNutritionist.city,
          state: "AM",
          profileImageUrl: null,
          themePrimaryColor: "#2563eb",
          specialties: ["Emagrecimento", "Nutrição esportiva", "Saúde da mulher"],
        }}
        activePatientCount={4}
      />
    </div>
  );
}
