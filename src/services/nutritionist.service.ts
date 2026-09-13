import { prisma } from "@/lib/prisma";

export async function getNutritionistBySlug(slug: string) {
  return prisma.nutritionist.findUnique({
    where: { slug },
  });
}

export async function getNutritionistById(id: string) {
  return prisma.nutritionist.findUnique({
    where: { id },
  });
}

export async function updateNutritionistConfig(
  nutritionistId: string,
  data: {
    name?: string;
    crn?: string;
    bio?: string;
    whatsapp?: string;
    email?: string;
    clinicAddress?: string;
    city?: string;
    state?: string;
    profileImageUrl?: string | null;
    themePrimaryColor?: string;
    specialties?: string[];
  }
) {
  return prisma.nutritionist.update({
    where: { id: nutritionistId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.crn !== undefined && { crn: data.crn }),
      ...(data.bio !== undefined && { bio: data.bio || null }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp || null }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.clinicAddress !== undefined && {
        clinicAddress: data.clinicAddress || null,
      }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl,
      ...(data.themePrimaryColor !== undefined && {
        themePrimaryColor: data.themePrimaryColor,
      }),
      ...(data.specialties !== undefined && { specialties: data.specialties }),
    },
  });
}
