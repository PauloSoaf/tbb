import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { BeforeConsultSection } from "@/components/landing/BeforeConsultSection";
import { MealPlanSection } from "@/components/landing/MealPlanSection";
import { PatientPortalSection } from "@/components/landing/PatientPortalSection";
import { AISection } from "@/components/landing/AISection";
import { EvolutionSection } from "@/components/landing/EvolutionSection";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "NutriOpus | Plataforma para Nutricionistas",
  description:
    "Organize pacientes, pré-consultas, prontuários, antropometria, planos alimentares, agenda, portal do paciente e atendimento online em uma plataforma moderna para nutricionistas.",
  openGraph: {
    title: "NutriOpus | Plataforma para Nutricionistas",
    description:
      "Da pré-consulta ao acompanhamento: prontuário, planos alimentares, portal do paciente, IA assistiva e agenda em uma única plataforma.",
    type: "website",
    locale: "pt_BR",
    siteName: "NutriOpus",
  },
  keywords: [
    "nutricionista",
    "software nutrição",
    "pré-consulta digital",
    "prontuário clínico",
    "plano alimentar",
    "portal do paciente",
    "gestão clínica nutricional",
    "anamnese online",
    "antropometria",
    "atendimento online nutricionista",
  ],
};

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <FeaturesSection />
        <BeforeConsultSection />
        <MealPlanSection />
        <PatientPortalSection />
        <AISection />
        <EvolutionSection />
        <LandingCTA />
      </main>
      <LandingFooter />
    </>
  );
}
