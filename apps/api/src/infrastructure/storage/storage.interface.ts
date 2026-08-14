import type { Readable } from 'node:stream';

export interface StorageStreamResult {
  stream: Readable;
  contentType?: string | undefined;
  contentLength?: number | undefined;
}

export interface StorageUploadResult {
  key: string;
  url?: string | undefined;
}

export interface StorageProvider {
  upload(
    key: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult>;

  delete(key: string): Promise<void>;

  getStream(key: string): Promise<StorageStreamResult>;

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
