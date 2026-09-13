import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { updateNutritionistConfigAction } from "@/actions/updateNutritionistConfig.action";
import { prisma } from "@/lib/prisma";
import { ConfigPageClient } from "@/components/config/ConfigPageClient";

interface ConfigPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ googleConnected?: string; googleError?: string }>;
}

export async function generateMetadata() {
  return { title: "Configurações | NutriOpus" };
}

export default async function ConfigPage({ params, searchParams }: ConfigPageProps) {
  const { tenant } = await params;
  const { googleConnected, googleError } = await searchParams;
  const { session } = await assertTenantAccess(tenant, { allowedRoles: ["NUTRITIONIST", "ADMIN"] });

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { slug: tenant },
  });

  if (!nutritionist) {
    throw new Error("Nutritionist not found");
  }

  const boundAction = updateNutritionistConfigAction.bind(null, tenant);

  return (
    <ConfigPageClient
      tenant={tenant}
      nutritionistSlug={session.nutritionistSlug}
      hasGoogleToken={!!nutritionist.googleAccessToken}
      googleCalendarAvailable={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      )}
      defaultValues={{
        name: nutritionist.name,
        crn: nutritionist.crn ?? "",
        email: nutritionist.email,
        bio: nutritionist.bio ?? "",
        whatsapp: nutritionist.whatsapp ?? "",
        clinicAddress: nutritionist.clinicAddress ?? "",
        city: nutritionist.city,
        state: nutritionist.state,
        profileImageUrl: nutritionist.profileImageUrl ?? "",
        themePrimaryColor: nutritionist.themePrimaryColor ?? "",
        specialtiesRaw: nutritionist.specialties.join(", "),
      }}
      googleConnected={googleConnected}
      googleError={googleError}
      boundAction={boundAction}
    />
  );
}
