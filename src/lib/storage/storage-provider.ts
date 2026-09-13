export interface UploadOptions { fileName: string; folder?: string; contentType?: string }
/** Provider keys are internal. Private files are served only after workspace authorization. */
export interface StorageProvider {
  uploadFile(buffer: Buffer, options: UploadOptions): Promise<string>;
  readFile(key: string): Promise<Uint8Array>;
  deleteFile(key: string): Promise<void>;
}
