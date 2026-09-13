import { uploadTrackedFile, deleteTrackedFile } from "@/lib/storage/tracked-upload"

export interface TranscriptionAudioUploadResult {
  url: string
  storageKey: string
}

/**
 * Uploads an audio file to the transcription storage folder.
 *
 * Files are stored under:
 *   transcriptions/{nutritionistId}/{patientId}/{fileName}
 *
 * Returns the public URL and the storage key (which is the same URL for
 * most providers — use it for later deletion).
 */
export async function uploadTranscriptionAudio(
  file: {
    buffer: Buffer
    fileName: string
    mimeType: string
    sizeBytes: number
  },
  nutritionistId: string,
  patientId: string,
  uploadedByUserId?: string
): Promise<TranscriptionAudioUploadResult> {
  const folder = `transcriptions/${nutritionistId}/${patientId}`

  const url = await uploadTrackedFile(nutritionistId, file.buffer, {
    fileName: file.fileName,
    folder,
    purpose: "transcription-audio",
    resourceId: patientId,
    uploadedByUserId,
  })

  // For all current storage providers the URL is the storage key
  return { url, storageKey: url }
}

/**
 * Deletes a previously uploaded transcription audio file.
 *
 * @param storageKey - The value returned as `storageKey` from uploadTranscriptionAudio
 */
export async function deleteTranscriptionAudio(nutritionistId: string, storageKey: string): Promise<void> {
  await deleteTrackedFile(nutritionistId, storageKey)
}
