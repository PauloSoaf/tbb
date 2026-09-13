import { LocalStorageProvider } from "./local-storage.provider";
import { VercelBlobProvider } from "./vercel-blob.provider";
import { StorageProvider } from "./storage-provider";

const providerType = process.env.STORAGE_PROVIDER
  || (process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local");

if (process.env.NODE_ENV === "production" && providerType === "local") {
  console.warn(
    "NutriOpus storage is using local uploads in production. Files saved under /uploads are not persistent. Set STORAGE_PROVIDER=vercel-blob and BLOB_READ_WRITE_TOKEN."
  );
}

export const storage: StorageProvider = 
  providerType === "vercel-blob" 
    ? new VercelBlobProvider() 
    : new LocalStorageProvider();
