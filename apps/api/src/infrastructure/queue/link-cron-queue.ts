import { Queue, Worker, type Job } from 'bullmq';
import pino from 'pino';

import { env } from '../../config/index.js';
import { linkService } from '../../modules/links/link.service.js';

const logger = pino({ level: env.LOG_LEVEL || 'info' });

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

export const linkCronQueue = new Queue('link-cron-cleanup', redisOptions);

export const linkCronWorker = new Worker(
  'link-cron-cleanup',
  async (_job: Job) => {
    logger.info('[LinkCronJob] Starting expired links cleanup cron job...');
    try {
      const deletedCount = await linkService.cleanupExpiredLinks();
      if (deletedCount > 0) {
        logger.info(
          { deletedCount },
          `[LinkCronJob] Cleaned up and deleted ${deletedCount} expired links`,
        );
      } else {
        logger.debug('[LinkCronJob] No expired links to delete');
      }
    } catch (error) {
      logger.error(
        { err: error },
        '[LinkCronJob] Error executing expired links cleanup',
      );
      throw error;
    }
  },
  redisOptions,
);

export const initializeLinkCronJob = async () => {
  try {
    if (typeof (linkCronQueue as any).upsertJobScheduler === 'function') {
      await (linkCronQueue as any).upsertJobScheduler(
        'cleanup-expired-links',
        {
          pattern: '*/5 * * * *',
        },
      );
    } else {
      await linkCronQueue.add(
        'cleanup-expired-links',
        {},
        {
          repeat: {
            pattern: '*/5 * * * *',
          },
        } as any,
      );
    }
    logger.info(
      '[LinkCronJob] Repeatable cron job registered (runs every 5 minutes)',
    );
  } catch (error) {
    logger.error({ err: error }, '[LinkCronJob] Failed to register cron job');
  }
};
