"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";

const navLinks = [
  { href: "#recursos", label: "Recursos" },
  { href: "#pre-consulta", label: "Pré-consulta" },
  { href: "#portal", label: "Portal" },
  { href: "#ia", label: "IA assistiva" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      const wasOpen = menuOpen;
      setMenuOpen(false);
      const id = href.replace("#", "");
      const scroll = () => {
        const el = document.getElementById(id);
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: y, behavior: "smooth" });
      };
      if (wasOpen) {
        setTimeout(scroll, 200);
      } else {
        scroll();
      }
    },
    [menuOpen]
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md shadow-sm shadow-black/5 border-b border-border-neutral"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
          <NutriOpusLogo
            role="img"
            aria-label="NutriOpus"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-warm-surface transition-all duration-150"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* Lang toggle (advanced — PT/EN/ES) */}
          <div className="hidden sm:block"><LangToggle /></div>

          {/* Theme toggle (advanced — all themes) */}
          <ThemeToggle />

          {/* Demo */}
          <Link
            href="/demo/dashboard"
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm text-brand-blue font-semibold rounded-lg hover:bg-warm-surface transition-colors"
          >
            Demo
          </Link>

          {/* Entrar */}
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm text-text-primary font-medium rounded-lg hover:bg-warm-surface transition-colors"
          >
            Entrar
          </Link>

          {/* CTA principal */}
          <Link
            href="/cadastro"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-hover transition-colors shadow-sm shadow-brand-blue/20"
          >
            Criar conta
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile menu button */}
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
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="block px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-warm-surface transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center gap-2 pt-3 pb-1">
                <LangToggle />
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm text-text-primary font-medium rounded-lg border border-border-neutral hover:bg-warm-surface transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-hover transition-colors"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
