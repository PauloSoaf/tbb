import { prisma } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

export async function listPatientDocuments(
  nutritionistId: string,
  patientId: string
) {
  return prisma.document.findMany({
    where: { patientId, nutritionistId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(
  nutritionistId: string,
  patientId: string,
  data: {
    type: DocumentType;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    size?: number;
  }
) {
  return prisma.document.create({
    data: {
      nutritionistId,
      patientId,
      type: data.type,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      size: data.size,
    },
  });
}

export async function deleteDocument(
  nutritionistId: string,
  documentId: string
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, nutritionistId },
  });

  if (!doc) {
    throw new Error("Documento não encontrado");
  }

  return prisma.document.delete({
    where: { id: documentId },
  });
}
