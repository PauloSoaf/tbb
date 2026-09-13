"use client";
import { PublicPageHeader } from "./PublicPageHeader";
import { PublicHero } from "./PublicHero";
import { HowItWorksSection } from "./HowItWorksSection";
import { SpecialtiesSection } from "./SpecialtiesSection";
import { PublicContactSection } from "./PublicContactSection";
import { PublicPortalSection } from "./PublicPortalSection";
import { PublicPageFooter } from "./PublicPageFooter";
import { FloatingLeaf } from "@/components/landing/FloatingLeaf";

export interface NutritionistPublicData {
  slug: string;
  name: string;
  crn: string;
  bio: string | null;
  whatsapp: string | null;
  email: string;
  clinicAddress: string | null;
  city: string;
  state: string;
  profileImageUrl: string | null;
  themePrimaryColor: string;
  specialties: string[];
}

interface PublicNutritionistPageProps {
  nutritionist: NutritionistPublicData;
  activePatientCount: number;
}

export function PublicNutritionistPage({
  nutritionist,
  activePatientCount,
}: PublicNutritionistPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <PublicPageHeader slug={nutritionist.slug} nutritionistName={nutritionist.name} />

      <main className="relative">
        {/* Subtle leaf decoration — positioned relative to page */}
        <FloatingLeaf
          className="absolute top-16 right-4 lg:right-12 pointer-events-none hidden md:block z-0"
          size={52}
          fillColor="#A7C7A1"
          strokeColor="#7BAE7F"
          fillOpacity={0.13}
          strokeOpacity={0.22}
        />
        <FloatingLeaf
          className="absolute top-[55%] left-2 pointer-events-none hidden xl:block z-0"
          size={36}
          fillColor="#E8DCC8"
          strokeColor="#b8894d"
          fillOpacity={0.15}
          strokeOpacity={0.18}
        />

        <PublicHero
          slug={nutritionist.slug}
          name={nutritionist.name}
          crn={nutritionist.crn}
          bio={nutritionist.bio}
          city={nutritionist.city}
          state={nutritionist.state}
          whatsapp={nutritionist.whatsapp}
          profileImageUrl={nutritionist.profileImageUrl}
          specialties={nutritionist.specialties}
          activePatientCount={activePatientCount}
        />

        <HowItWorksSection />

        {nutritionist.specialties.length > 0 && (
          <SpecialtiesSection specialties={nutritionist.specialties} />
        )}

        <PublicContactSection
          slug={nutritionist.slug}
          name={nutritionist.name}
          whatsapp={nutritionist.whatsapp}
          email={nutritionist.email}
          clinicAddress={nutritionist.clinicAddress}
          city={nutritionist.city}
          state={nutritionist.state}
        />

        <PublicPortalSection slug={nutritionist.slug} />
      </main>

      <PublicPageFooter />
    </div>
  );
}
