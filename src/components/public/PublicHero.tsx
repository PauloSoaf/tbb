"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";
import { useI18n } from "@/lib/i18n/I18nContext";

export function PublicHero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-warm-surface to-warm-beige">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-blue-soft rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-attention rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-32 text-center">
        <div className="flex justify-center mb-12">
          <NutriOpusLogo
            role="img"
            aria-label="NutriOpus"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue-soft text-brand-blue rounded-full text-sm font-medium mb-8">
          <NutriOpusIcon size={24} className="h-6 w-6 object-contain" />
          {t("public_landing.hero.badge")}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
          {t("public_landing.hero.title_start")}{" "}
          <span className="text-brand-blue">{t("public_landing.hero.title_highlight")}</span>
        </h1>

        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("public_landing.hero.description")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-xl
              font-semibold text-lg shadow-lg shadow-brand-blue/25
              hover:bg-brand-blue-hover hover:shadow-xl hover:shadow-brand-blue/30
              transition-all duration-300 hover:-translate-y-0.5"
          >
            {t("public_landing.hero.create_account")}
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-card-bg text-text-primary rounded-xl
              font-semibold text-lg border border-border-neutral
              hover:border-brand-blue hover:text-brand-blue
              transition-all duration-300"
          >
            {t("public_landing.hero.already_have_account")}
          </Link>
        </div>
      </div>
    </section>
  );
}
