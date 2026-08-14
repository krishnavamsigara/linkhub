import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import type {
  StorageProvider,
  StorageStreamResult,
  StorageUploadResult,
} from './storage.interface.js';

export class MinioStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const useSsl = env.MINIO_USE_SSL;
    const protocol = useSsl ? 'https' : 'http';
    const endpoint = `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

    this.bucket = env.MINIO_BUCKET;
    this.client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
      tls: useSsl,
    });
  }

  async upload(
    key: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.client.send(command);
      return { key };
    } catch (error) {
      throw new AppError(
        `MinIO upload failed: ${(error as Error).message}`,
        500,
        'STORAGE_UPLOAD_ERROR',
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      throw new AppError(
        `MinIO delete failed: ${(error as Error).message}`,
        500,
        'STORAGE_DELETE_ERROR',
      );
    }
  }

  async getStream(key: string): Promise<StorageStreamResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new AppError('File stream is empty', 404, 'STORAGE_FILE_NOT_FOUND');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error) {
      if (
        (error as Error).name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        throw new AppError(
          'File not found in MinIO storage',
          404,
          'STORAGE_FILE_NOT_FOUND',
        );
      }
      throw new AppError(
        `MinIO fetch stream failed: ${(error as Error).message}`,
        500,
        'STORAGE_STREAM_ERROR',
      );
    }
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      throw new AppError(
        `MinIO presigned URL generation failed: ${(error as Error).message}`,
        500,
        'STORAGE_SIGNED_URL_ERROR',
      );
    }
  }
}
