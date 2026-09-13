"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu, X, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PublicPageHeaderProps {
  slug: string;
  nutritionistName: string;
}

export function PublicPageHeader({ slug, nutritionistName }: PublicPageHeaderProps) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 68;
    window.scrollTo({ top: y, behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  const navLinks = [
    { id: "sobre", label: t("public_page.sections.about") },
    { id: "especialidades", label: t("public_page.sections.specialties") },
    { id: "atendimento", label: t("public_page.sections.care") },
    { id: "contato", label: t("public_page.sections.contact") },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md shadow-sm shadow-black/5 border-b border-border-neutral"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
          <NutriOpusLogo
            role="img"
            aria-label="NutriOpus"
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* Desktop name */}
        <span className="hidden lg:block text-sm text-text-secondary truncate max-w-[180px]">
          {nutritionistName}
        </span>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-warm-surface transition-all duration-150"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:block"><LangToggle /></div>
          <ThemeToggle />
          <Link
            href={`/portal/${slug}/login`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-hover transition-colors shadow-sm shadow-brand-blue/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            {t("public_page.actions.patient_login")}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-warm-surface transition-colors"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-background/95 backdrop-blur-md border-b border-border-neutral"
          >
            <div className="px-4 py-3 space-y-0.5">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-warm-surface transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex items-center gap-2 pt-3 pb-1">
                <LangToggle />
                <Link
                  href={`/portal/${slug}/login`}
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-hover transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t("public_page.actions.patient_login")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
