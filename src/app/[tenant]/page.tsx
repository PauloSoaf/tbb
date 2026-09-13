import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNutritionistBySlug } from "@/services/nutritionist.service";
import { PublicNutritionistPage } from "@/components/public-page/PublicNutritionistPage";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface TenantPageProps {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const { tenant } = await params;
  const nutritionist = await getNutritionistBySlug(tenant);
  const { t } = await getServerTranslations();
  
  if (!nutritionist) return {};
  
  return {
    title: `${nutritionist.name} | NutriOpus`,
    description: nutritionist.bio
      ?? t("public_page.metadata.desc", { name: nutritionist.name, defaultValue: `Atendimento nutricional com ${nutritionist.name}. Preencha sua pré-consulta, fale pelo WhatsApp e acesse seu portal do paciente.` }),
    openGraph: {
      title: `${nutritionist.name} | NutriOpus`,
      description: nutritionist.bio ?? t("public_page.metadata.og_desc", { name: nutritionist.name, defaultValue: `Agende sua consulta com ${nutritionist.name}.` }),
      type: "profile",
    },
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant } = await params;
  const [nutritionist, activePatientCount] = await Promise.all([
    getNutritionistBySlug(tenant),
    prisma.patient
      .count({ where: { nutritionist: { slug: tenant }, status: "ACTIVE" } })
      .catch(() => 0),
  ]);

  if (!nutritionist) {
    notFound();
  }

  return (
    <PublicNutritionistPage
      nutritionist={{
        slug: nutritionist.slug,
        name: nutritionist.name,
        crn: nutritionist.crn,
        bio: nutritionist.bio,
        whatsapp: nutritionist.whatsapp,
        email: nutritionist.email,
        clinicAddress: nutritionist.clinicAddress,
        city: nutritionist.city,
        state: nutritionist.state,
        profileImageUrl: nutritionist.profileImageUrl,
        themePrimaryColor: nutritionist.themePrimaryColor,
        specialties: nutritionist.specialties,
      }}
      activePatientCount={activePatientCount}
    />
  );
}
