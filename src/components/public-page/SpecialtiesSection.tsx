"use client";
import { Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const SPECIALTY_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-700/40",
  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-700/40",
  "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-700/40",
  "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-700/40",
  "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-700/40",
  "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-700/40",
  "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-700/40",
  "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-700/40",
];

interface SpecialtiesSectionProps {
  specialties: string[];
}

export function SpecialtiesSection({ specialties }: SpecialtiesSectionProps) {
  const { t } = useI18n();

  if (specialties.length === 0) return null;

  return (
    <section id="especialidades" className="py-20 bg-background scroll-mt-[68px]">
      <div className="max-w-5xl mx-auto px-4">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold mb-4">
            <Leaf className="w-3 h-3" />
            {t("public_page.sections.specialties")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t("public_page.sections.specialties_subtitle")}
          </h2>
        </ScrollReveal>

        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {specialties.map((specialty, i) => {
            const colorClass = SPECIALTY_COLORS[i % SPECIALTY_COLORS.length];
            return (
              <ScrollReveal key={specialty} delay={i * 0.05}>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${colorClass} hover:scale-105 hover:shadow-sm transition-all duration-200 cursor-default select-none`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {specialty}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
