import { Queue, Worker, type Job } from 'bullmq';
import sharp from 'sharp';
import pino from 'pino';

import { env } from '../../config/index.js';
import { prisma } from '../database/prisma.js';
import { getStorageProvider } from '../storage/index.js';

const logger = pino({ level: env.LOG_LEVEL || 'info' });

export interface ProcessAvatarJobData {
  userId: string;
  fileBufferBase64: string;
  filename: string;
  mimeType: string;
}

const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
};

const redisOptions = {
  connection: {
    ...parseRedisUrl(env.REDIS_URL),
    maxRetriesPerRequest: null,
  },
};

export const avatarQueue = new Queue<ProcessAvatarJobData>('avatar-processing', redisOptions);

export const avatarWorker = new Worker<ProcessAvatarJobData>(
  'avatar-processing',
  async (job: Job<ProcessAvatarJobData>) => {
    const { userId, fileBufferBase64, filename, mimeType } = job.data;
    logger.info({ userId, filename }, 'Processing avatar background job started');

    try {
      const originalBuffer = Buffer.from(fileBufferBase64, 'base64');

      // Process image using Sharp (resize to 400x400 PNG for consistent high quality)
      const processedBuffer = await sharp(originalBuffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .png({ quality: 85, compressionLevel: 8 })
        .toBuffer();

      const key = `avatars/${userId}-${Date.now()}.png`;
      const storage = getStorageProvider();

      // Upload processed file to active storage provider (MinIO / S3 / Cloudinary)
      await storage.upload(key, processedBuffer, 'image/png');

      // Fetch profile to delete old avatar if exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile?.avatarKey) {
        try {
          await storage.delete(existingProfile.avatarKey);
          logger.info({ oldKey: existingProfile.avatarKey }, 'Deleted old avatar file from storage');
        } catch (cleanupErr) {
          logger.warn({ err: cleanupErr }, 'Failed to delete old avatar file from storage');
        }
      }

      // Update Profile record in DB
      await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          avatarKey: key,
          avatarMimeType: 'image/png',
          avatarStatus: 'COMPLETED',
        },
        update: {
          avatarKey: key,
          avatarMimeType: 'image/png',
          avatarStatus: 'COMPLETED',
        },
      });

      logger.info({ userId, key }, 'Avatar processing and upload completed successfully');
    } catch (error) {
      logger.error({ err: error, userId }, 'Avatar processing failed');

      await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          avatarStatus: 'FAILED',
        },
        update: {
          avatarStatus: 'FAILED',
        },
      });

      throw error;
    }
  },
  redisOptions,
);

avatarWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Avatar queue job completed');
});

avatarWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Avatar queue job failed');
});
