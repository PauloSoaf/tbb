"use client";
import Link from "next/link";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";
import { useI18n } from "@/lib/i18n/I18nContext";

export function PublicPageFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="py-8 bg-warm-beige border-t border-border-neutral">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <NutriOpusLogo
            role="img"
            aria-label="NutriOpus"
            className="h-6 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>{t("public_page.footer.powered_by")} · © {year}</span>
          <Link href="/privacidade" className="hover:text-text-primary underline underline-offset-2 transition-colors">
            {t("public_page.footer.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
