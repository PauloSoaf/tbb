"use client";
import { useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Leaf, Play, Sparkles } from "lucide-react";
import { TiltCard } from "./TiltCard";
import { HeroDashboardMockup } from "./HeroDashboardMockup";
import { FloatingNotifications } from "./FloatingNotifications";
import { FloatingLeaf } from "./FloatingLeaf";

const heroCtaBase =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold leading-none whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:ring-offset-2 focus:ring-offset-background";

export function LandingHero() {
  const reduced = useReducedMotion();

  const scrollToResources = useCallback(() => {
    const el = document.getElementById("recursos");
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
  }, []);

  const fadeUp = (delay: number) => ({
    initial: reduced ? { opacity: 1 } : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  });

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-warm-surface to-warm-beige">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-blue-soft/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-100/40 dark:bg-emerald-900/15 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-violet-100/20 dark:bg-violet-900/10 rounded-full blur-3xl" />
      </div>

      {/* Decorative leaves */}
      <FloatingLeaf
        className="absolute top-16 right-8 lg:right-16 pointer-events-none hidden md:block"
        size={62}
        fillColor="#A7C7A1"
        strokeColor="#7BAE7F"
        fillOpacity={0.16}
        strokeOpacity={0.26}
      />
      <FloatingLeaf
        className="absolute bottom-28 left-6 pointer-events-none hidden lg:block"
        size={40}
        fillColor="#E8DCC8"
        strokeColor="#b8894d"
        fillOpacity={0.18}
        strokeOpacity={0.22}
      />
      <FloatingLeaf
        className="absolute top-[45%] right-3 pointer-events-none hidden xl:block"
        size={32}
        fillColor="#BFE3C0"
        strokeColor="#7BAE7F"
        fillOpacity={0.13}
        strokeOpacity={0.2}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* ── Left: Copy ── */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-blue-soft text-brand-blue rounded-full text-sm font-medium mb-7">
              <Leaf className="w-3.5 h-3.5" />
              Plataforma clínica para nutricionistas
            </motion.div>

            {/* H1 */}
            <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl lg:text-[52px] xl:text-6xl font-bold text-text-primary leading-[1.12] mb-6">
              Tudo que a nutricionista precisa{" "}
              <span className="text-brand-blue">em uma única plataforma</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p {...fadeUp(0.2)} className="text-lg sm:text-xl text-text-secondary max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Pré-consulta, prontuário, antropometria, planos alimentares, agenda,
              portal do paciente, atendimento online e IA assistiva — tudo para
              tornar sua rotina clínica mais leve.
            </motion.p>

            {/* CTAs */}
            <motion.div {...fadeUp(0.3)} className="mx-auto grid w-full max-w-[440px] grid-cols-1 gap-2.5 sm:grid-cols-2 lg:mx-0">
              <Link
                href="/cadastro"
                className={`${heroCtaBase} group bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 hover:bg-brand-blue-hover hover:shadow-xl hover:shadow-brand-blue/25`}
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo/dashboard"
                className={`${heroCtaBase} border border-border-neutral bg-card-bg text-text-primary shadow-sm hover:-translate-y-0.5 hover:border-brand-blue/45 hover:text-brand-blue hover:shadow-md`}
              >
                <Play className="w-4 h-4" />
                Ver demo interativa
              </Link>
              <Link
                href="/login"
                className={`${heroCtaBase} border border-transparent bg-card-bg/45 text-text-secondary hover:border-border-neutral hover:bg-card-bg hover:text-brand-blue hover:shadow-sm`}
              >
                Já tenho conta
              </Link>
              <button
                onClick={scrollToResources}
                className={`${heroCtaBase} border border-transparent bg-card-bg/45 text-text-secondary hover:border-border-neutral hover:bg-card-bg hover:text-brand-blue hover:shadow-sm`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ver recursos
              </button>
            </motion.div>
          </div>

          {/* ── Right: Dashboard mockup (desktop) ── */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="relative hidden lg:block"
          >
            {/* Padding wrapper so floating cards don't clip */}
            <div className="relative py-14 px-16">
              <TiltCard maxTilt={6}>
                <HeroDashboardMockup />
              </TiltCard>
              <FloatingNotifications />
            </div>
          </motion.div>

          {/* ── Mobile: mockup without tilt/floats ── */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="lg:hidden"
          >
            <HeroDashboardMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
