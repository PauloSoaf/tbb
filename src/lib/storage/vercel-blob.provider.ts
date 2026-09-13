import { StorageProvider, UploadOptions } from "./storage-provider";
import { put, del } from "@vercel/blob";

export class VercelBlobProvider implements StorageProvider {
  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<string> {
    const folder = options.folder || "general";
    const safeName = options.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${folder}/${safeName}`;

    const blob = await put(path, buffer, {
      access: "public",
      addRandomSuffix: true,
    });

    return blob.url;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    try {
      await del(fileUrl);
    } catch (err) {
      console.error(`Failed to delete blob: ${fileUrl}`, err);
    }
  }

  getPublicUrl(path: string): string {
    return path; // Vercel Blob returns the full public URL
  }
}
