"use server";
import { revalidatePath } from "next/cache";
import { uploadTrackedFile, deleteTrackedFile } from "@/lib/storage/tracked-upload";
import { operationalStorageLimits } from "@/services/storageUsage.service";
export type FileActionState = { error?: string; success?: string } | null;
export async function uploadFileAction(_previous: FileActionState, form: FormData): Promise<FileActionState> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.name || !file.size) return { error: "Selecione um arquivo." };
  if (file.size > operationalStorageLimits().single) return { error: "O arquivo excede o limite por upload." };
  try {
    await uploadTrackedFile(Buffer.from(await file.arrayBuffer()), { fileName: file.name, mimeType: file.type || "application/octet-stream", purpose: "attachment" });
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível enviar o arquivo." }; }
  revalidatePath("/settings");
  return { success: "Arquivo enviado e disponível no seu espaço." };
}
export async function deleteFileAction(_previous: FileActionState, form: FormData): Promise<FileActionState> {
  const id = form.get("id");
  if (typeof id !== "string" || !id) return { error: "Arquivo inválido." };
  try { await deleteTrackedFile(id); }
  catch { return { error: "Não foi possível excluir o arquivo deste espaço." }; }
  revalidatePath("/settings");
  return { success: "Arquivo excluído." };
}
