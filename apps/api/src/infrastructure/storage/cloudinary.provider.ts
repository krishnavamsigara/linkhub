import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import https from 'node:https';
import http from 'node:http';

import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import type {
  StorageProvider,
  StorageStreamResult,
  StorageUploadResult,
} from './storage.interface.js';

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      throw new AppError(
        'Cloudinary cloud_name, api_key, and api_secret must be configured',
        500,
        'STORAGE_CONFIG_ERROR',
      );
    }

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(
    key: string,
    fileBuffer: Buffer,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    return new Promise((resolve, reject) => {
      const publicId = key.replace(/\.[^/.]+$/, ''); // Strip extension for public_id
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          type: 'authenticated', // Keep private for access protection
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new AppError(
                `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
                500,
                'STORAGE_UPLOAD_ERROR',
              ),
            );
          }
          resolve({ key, url: result.secure_url });
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  async delete(key: string): Promise<void> {
    try {
      const publicId = key.replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
    } catch (error) {
      throw new AppError(
        `Cloudinary delete failed: ${(error as Error).message}`,
        500,
        'STORAGE_DELETE_ERROR',
      );
    }
  }

  async getStream(key: string): Promise<StorageStreamResult> {
    try {
      const signedUrl = await this.getSignedUrl(key, 300);
      return new Promise((resolve, reject) => {
        const client = signedUrl.startsWith('https') ? https : http;
        client
          .get(signedUrl, (res) => {
            if (res.statusCode !== 200) {
              return reject(
                new AppError(
                  'Cloudinary image not found or stream error',
                  res.statusCode || 404,
                  'STORAGE_FILE_NOT_FOUND',
                ),
              );
            }

            resolve({
              stream: res,
              contentType: res.headers['content-type'],
              contentLength: res.headers['content-length']
                ? parseInt(res.headers['content-length'], 10)
                : undefined,
            });
          })
          .on('error', (err) => {
            reject(
              new AppError(
                `Cloudinary stream fetch failed: ${err.message}`,
                500,
                'STORAGE_STREAM_ERROR',
              ),
            );
          });
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Cloudinary getStream failed: ${(error as Error).message}`,
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
      const publicId = key.replace(/\.[^/.]+$/, '');
      const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

      const url = cloudinary.url(publicId, {
        resource_type: 'image',
        type: 'authenticated',
        sign_url: true,
        expires_at: expiresAt,
        secure: true,
      });

      return url;
    } catch (error) {
      throw new AppError(
        `Cloudinary signed URL generation failed: ${(error as Error).message}`,
        500,
        'STORAGE_SIGNED_URL_ERROR',
      );
    }
  }
}
