import { put, get, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import type { StorageProvider, UploadOptions } from "./storage-provider";
export class VercelBlobProvider implements StorageProvider {
  async uploadFile(buffer: Buffer, options: UploadOptions) {
    const folder = options.folder || "general";
    if (!/^[a-zA-Z0-9_-]+$/.test(folder)) throw new Error("Diretório inválido.");
    const blob = await put(`tbb/${folder}/${randomUUID()}`, buffer, { access: "private", addRandomSuffix: false, contentType: options.contentType });
    return blob.url;
  }
  async readFile(key: string) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) throw new Error("Arquivo não encontrado.");
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }
  async deleteFile(key: string) { await del(key); }
}
