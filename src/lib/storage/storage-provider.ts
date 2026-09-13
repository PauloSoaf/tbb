export interface UploadOptions {
  fileName: string;
  folder?: string;
}

export interface StorageProvider {
  /**
   * Uploads a file buffer and returns the public URL.
   */
  uploadFile(buffer: Buffer, options: UploadOptions): Promise<string>;

  /**
   * Deletes a file by its public URL or path.
   */
  deleteFile(fileUrl: string): Promise<void>;

  /**
   * Returns the full public URL of a file.
   */
  getPublicUrl(path: string): string;
}
