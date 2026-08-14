import { describe, it, expect } from 'vitest';
import { MinioStorageProvider } from '../../src/infrastructure/storage/minio.provider.js';
import { getStorageProvider } from '../../src/infrastructure/storage/storage.factory.js';

describe('StorageFactory', () => {
  it('should instantiate MinioStorageProvider when STORAGE_PROVIDER is minio', () => {
    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(MinioStorageProvider);
  });
});
