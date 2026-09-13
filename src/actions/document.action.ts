"use server";

import { invalidatePatientFiles } from "@/lib/cache/invalidate-nutriopus-cache";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { createDocument, deleteDocument } from "@/services/document.service";
import { DocumentType } from "@prisma/client";
import { uploadTrackedFile, deleteTrackedFile, StorageQuotaExceededError } from "@/lib/storage/tracked-upload";

export async function uploadDocumentAction(
  tenant: string,
  patientId: string,
  formData: FormData
) {
  const { session } = await assertTenantAccess(tenant);

  const file = formData.get("file") as File;
  const type = formData.get("type") as DocumentType;

  if (!file || !type) {
    return { error: "Arquivo ou tipo ausente." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "O arquivo excede o limite de 5MB." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileUrl = await uploadTrackedFile(session.nutritionistId, buffer, {
      fileName: file.name,
      folder: `documents/${tenant}/${patientId}`,
      purpose: "patient-document",
      resourceId: patientId,
      uploadedByUserId: session.userId,
    });

    // Save record to database
    await createDocument(session.nutritionistId, patientId, {
      type,
      fileName: file.name,
      fileUrl,
      mimeType: file.type,
      size: file.size,
    });

    invalidatePatientFiles({ nutritionistId: session.nutritionistId, tenant, patientId });
    return { success: true };
  } catch (error) {
    if (error instanceof StorageQuotaExceededError) {
      return { error: error.message };
    }
    console.error("Upload error:", error);
    return { error: "Erro interno ao processar o upload." };
  }
}

export async function deleteDocumentAction(
  tenant: string,
  patientId: string,
  documentId: string,
  fileUrl: string
) {
  const { session } = await assertTenantAccess(tenant);

  try {
    // Delete file using storage provider
    await deleteTrackedFile(session.nutritionistId, fileUrl);

    // Delete DB record
    await deleteDocument(session.nutritionistId, documentId);

    invalidatePatientFiles({ nutritionistId: session.nutritionistId, tenant, patientId });
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { error: "Erro ao excluir o arquivo." };
  }
}
