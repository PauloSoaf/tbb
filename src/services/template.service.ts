import { prisma } from "@/lib/prisma";
import { TemplateType } from "@prisma/client";

export async function listNutritionistTemplates(nutritionistId: string) {
  return prisma.template.findMany({
    where: { nutritionistId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTemplate(
  nutritionistId: string,
  data: {
    title: string;
    type: TemplateType;
    content?: string;
    fileName?: string;
    fileUrl?: string;
    mimeType?: string;
    size?: number;
  }
) {
  return prisma.template.create({
    data: {
      nutritionistId,
      ...data,
    },
  });
}

export async function deleteTemplate(
  nutritionistId: string,
  templateId: string
) {
  const template = await prisma.template.findFirst({
    where: { id: templateId, nutritionistId },
  });

  if (!template) {
    throw new Error("Modelo não encontrado");
  }

  return prisma.template.delete({
    where: { id: templateId },
  });
}
