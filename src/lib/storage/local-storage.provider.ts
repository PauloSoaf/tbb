import type { StorageProvider, UploadOptions } from "./storage-provider";
import { writeFile, readFile, unlink, mkdir, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
export function resolveStoragePath(root: string, key: string) {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(key)) throw new Error("Chave de arquivo inválida.");
  const base = resolve(root);
  const path = resolve(base, key);
  if (!path.startsWith(`${base}${sep}`)) throw new Error("Caminho de arquivo inválido.");
  return path;
}
export class LocalStorageProvider implements StorageProvider {
  private root = resolve(process.env.TBB_STORAGE_PATH || ".tbb-data/uploads");
  async uploadFile(buffer: Buffer, options: UploadOptions) {
    const folder = options.folder || "general";
    const key = `${folder}/${randomUUID()}`;
    const path = resolveStoragePath(this.root, key);
    await mkdir(resolve(this.root, folder), { recursive: true, mode: 0o700 });
    const directory = await realpath(resolve(this.root, folder));
    const root = await realpath(this.root);
    if (!directory.startsWith(`${root}${sep}`)) throw new Error("Diretório inválido.");
    await writeFile(path, buffer, { mode: 0o600, flag: "wx" });
    return key;
  }
  private async existingPath(key: string) {
    const path = await realpath(resolveStoragePath(this.root, key));
    const root = await realpath(this.root);
    if (!path.startsWith(`${root}${sep}`)) throw new Error("Caminho inválido.");
    return path;
  }
  async readFile(key: string) { return readFile(await this.existingPath(key)); }
  async deleteFile(key: string) { await unlink(await this.existingPath(key)); }
}
