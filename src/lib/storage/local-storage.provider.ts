import { StorageProvider, UploadOptions } from "./storage-provider";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const BASE_UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export class LocalStorageProvider implements StorageProvider {
  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<string> {
    const folder = options.folder || "general";
    const targetDir = join(BASE_UPLOAD_DIR, folder);

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const uniqueId = randomBytes(8).toString("hex");
    const safeName = options.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const finalFileName = `${uniqueId}-${safeName}`;
    const filePath = join(targetDir, finalFileName);

    await writeFile(filePath, buffer);

    return `/uploads/${folder}/${finalFileName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith("/uploads/")) return;

    // Convert relative URL back to absolute file path
    const relativePath = fileUrl.replace("/uploads/", "");
    const absolutePath = join(BASE_UPLOAD_DIR, relativePath);

    if (existsSync(absolutePath)) {
      try {
        await unlink(absolutePath);
      } catch (err) {
        console.error(`Failed to delete local file: ${absolutePath}`, err);
      }
    }
  }

  getPublicUrl(path: string): string {
    return path; // For local storage, the path is already the public URL (e.g., /uploads/...)
  }
}

export const storage = new LocalStorageProvider();
