import { prisma } from "@/lib/prisma";

export async function getTenantBySlug(slug: string) {
  return prisma.nutritionist.findUnique({
    where: { slug },
  });
}
