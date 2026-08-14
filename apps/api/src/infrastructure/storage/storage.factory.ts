import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { CloudinaryStorageProvider } from './cloudinary.provider.js';
import { MinioStorageProvider } from './minio.provider.js';
import { S3StorageProvider } from './s3.provider.js';
import type { StorageProvider } from './storage.interface.js';

let storageInstance: StorageProvider | null = null;

export const getStorageProvider = (): StorageProvider => {
  if (storageInstance) {
    return storageInstance;
  }

  const providerType = env.STORAGE_PROVIDER;

  switch (providerType) {
    case 'minio':
      storageInstance = new MinioStorageProvider();
      break;
    case 's3':
      storageInstance = new S3StorageProvider();
      break;
    case 'cloudinary':
      storageInstance = new CloudinaryStorageProvider();
      break;
    default:
      throw new AppError(
        `Unsupported storage provider: ${providerType}`,
        500,
        'STORAGE_CONFIG_ERROR',
      );
  }

  return storageInstance;
};
