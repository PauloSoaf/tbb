"use client";
import { ClipboardList, BrainCircuit, HeartHandshake, LayoutDashboard } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export function HowItWorksSection() {
  const { t } = useI18n();

  const steps = [
    {
      icon: ClipboardList,
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      accent: "border-blue-200 dark:border-blue-800",
      number: "01",
      title: t("public_page.how_it_works.step_1_title"),
      description: t("public_page.how_it_works.step_1_description"),
    },
    {
      icon: BrainCircuit,
      color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
      accent: "border-violet-200 dark:border-violet-800",
      number: "02",
      title: t("public_page.how_it_works.step_2_title"),
      description: t("public_page.how_it_works.step_2_description"),
    },
    {
      icon: HeartHandshake,
      color: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
      accent: "border-rose-200 dark:border-rose-800",
      number: "03",
      title: t("public_page.how_it_works.step_3_title"),
      description: t("public_page.how_it_works.step_3_description"),
    },
    {
      icon: LayoutDashboard,
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      accent: "border-emerald-200 dark:border-emerald-800",
      number: "04",
      title: t("public_page.how_it_works.step_4_title"),
      description: t("public_page.how_it_works.step_4_description"),
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-warm-surface scroll-mt-[68px]">
      <div className="max-w-5xl mx-auto px-4">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            {t("public_page.sections.how_it_works")}
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            {t("public_page.sections.how_it_works_subtitle")}
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 0.07} direction="up">
              <div className={`relative h-full bg-card-bg rounded-2xl p-5 border ${step.accent} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}>
                {/* Step number */}
                <div className="text-[11px] font-bold text-text-secondary/40 tracking-widest mb-3">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.color} mb-4`}>
                  <step.icon className="w-5 h-5" />
                </div>

                <h3 className="font-semibold text-text-primary mb-2 text-sm leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {step.description}
                </p>

                {/* Connector arrow (hidden on last) */}
                {i < 3 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-border-neutral hidden lg:flex items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 rotate-0 text-border-neutral">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
