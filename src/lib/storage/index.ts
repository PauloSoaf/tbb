import { LocalStorageProvider } from "./local-storage.provider";
import { VercelBlobProvider } from "./vercel-blob.provider";
import type { StorageProvider } from "./storage-provider";
const provider = process.env.STORAGE_PROVIDER || "local";
if (!["local", "vercel-blob"].includes(provider)) throw new Error("STORAGE_PROVIDER inválido.");
export const storage: StorageProvider = provider === "vercel-blob" ? new VercelBlobProvider() : new LocalStorageProvider();
