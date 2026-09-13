"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Leaf, MessageCircle, ClipboardList, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { TiltCard } from "@/components/landing/TiltCard";
import { NutritionistProfileCard } from "./NutritionistProfileCard";

interface PublicHeroProps {
  slug: string;
  name: string;
  crn: string;
  bio: string | null;
  city: string;
  state: string;
  whatsapp: string | null;
  profileImageUrl: string | null;
  specialties: string[];
  activePatientCount?: number;
}

export function PublicHero({
  slug,
  name,
  crn,
  bio,
  city,
  state,
  whatsapp,
  profileImageUrl,
  specialties,
  activePatientCount,
}: PublicHeroProps) {
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: reduced ? { opacity: 1 } : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  });

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <section
      id="sobre"
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-warm-surface to-warm-beige scroll-mt-[68px]"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-blue-soft/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-violet-100/15 dark:bg-violet-900/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* ── Left: Copy ── */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-blue-soft text-brand-blue rounded-full text-sm font-medium mb-6"
            >
              <Leaf className="w-3.5 h-3.5" />
              {t("public_page.hero.badge")}
            </motion.div>

            {/* H1 */}
            <motion.h1
              {...fadeUp(0.1)}
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-text-primary leading-[1.15] mb-5"
            >
              {t("public_page.hero.title")}{" "}
              <span className="text-brand-blue">{name}</span>
            </motion.h1>

            {/* Bio / Subtitle */}
            <motion.p
              {...fadeUp(0.2)}
              className="text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              {bio || t("public_page.profile.no_bio")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              {...fadeUp(0.3)}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link
                href={`/${slug}/pre-consulta`}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-semibold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover hover:shadow-xl hover:shadow-brand-blue/25 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto justify-center"
              >
                <ClipboardList className="w-4 h-4" />
                {t("public_page.actions.fill_preconsultation")}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto justify-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t("public_page.actions.whatsapp")}
                </a>
              )}

              <Link
                href={`/portal/${slug}/login`}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t("public_page.actions.patient_login")}
              </Link>
            </motion.div>
          </div>

          {/* ── Right: Profile card (desktop) ── */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.3 }}
            className="hidden lg:block"
          >
            <TiltCard maxTilt={5}>
              <NutritionistProfileCard
                name={name}
                crn={crn}
                city={city}
                state={state}
                profileImageUrl={profileImageUrl}
                specialties={specialties}
                activePatientCount={activePatientCount}
              />
            </TiltCard>
          </motion.div>

          {/* ── Mobile: Profile card without tilt ── */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="lg:hidden"
          >
            <NutritionistProfileCard
              name={name}
              crn={crn}
              city={city}
              state={state}
              profileImageUrl={profileImageUrl}
              specialties={specialties}
              activePatientCount={activePatientCount}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
