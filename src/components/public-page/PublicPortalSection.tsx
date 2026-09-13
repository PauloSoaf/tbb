"use client";
import Link from "next/link";
import { LayoutDashboard, ArrowRight, Scale, FileText, BookOpen, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface PublicPortalSectionProps {
  slug: string;
}

export function PublicPortalSection({ slug }: PublicPortalSectionProps) {
  const { t } = useI18n();

  const features = [
    { icon: BookOpen, label: "Cardápio", color: "text-brand-blue" },
    { icon: Scale, label: "Evolução", color: "text-emerald-600 dark:text-emerald-400" },
    { icon: FileText, label: "Arquivos", color: "text-violet-600 dark:text-violet-400" },
    { icon: TrendingUp, label: "Progresso", color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <section id="portal" className="py-20 bg-background scroll-mt-[68px]">
      <div className="max-w-5xl mx-auto px-4">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-brand-blue-soft via-background to-emerald-50/40 dark:from-blue-900/20 dark:via-background dark:to-emerald-900/10 rounded-2xl border border-border-neutral p-8 sm:p-10 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid sm:grid-cols-2 gap-8 items-center">
              {/* Left: text */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-card-bg border border-border-neutral rounded-full text-xs font-semibold text-text-secondary mb-5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-brand-blue" />
                  {t("public_page.sections.patient_portal")}
                </div>

                <h2 className="text-2xl font-bold text-text-primary mb-4 leading-tight">
                  {t("public_page.sections.patient_portal_desc")}
                </h2>

                <Link
                  href={`/portal/${slug}/login`}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-semibold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover hover:-translate-y-0.5 transition-all duration-300 mt-2"
                >
                  {t("public_page.actions.access_portal")}
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Right: feature grid */}
              <div className="grid grid-cols-2 gap-3">
                {features.map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 bg-card-bg rounded-xl px-3.5 py-3 border border-border-neutral"
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
