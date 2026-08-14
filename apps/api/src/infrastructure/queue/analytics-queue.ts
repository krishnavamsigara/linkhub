import { Queue, Worker, type Job } from 'bullmq';
import pino from 'pino';

import { env } from '../../config/index.js';
import { linkRepository } from '../../modules/links/link.repository.js';
import { parseUserAgent } from '../../utils/user-agent.parser.js';

const logger = pino({ level: env.LOG_LEVEL || 'info' });

export interface RecordClickJobData {
  linkId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  timestamp: string;
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

export const analyticsQueue = new Queue<RecordClickJobData>(
  'link-analytics',
  redisOptions,
);

export const analyticsWorker = new Worker<RecordClickJobData>(
  'link-analytics',
  async (job: Job<RecordClickJobData>) => {
    const { linkId, ipAddress, userAgent, referrer, timestamp } = job.data;
    logger.debug({ linkId, ipAddress }, 'Processing background analytics click job');

    try {
      const { deviceType, browser, os } = parseUserAgent(userAgent);

      // Create detailed click record in database
      await linkRepository.createClickRecord({
        linkId,
        ipAddress,
        userAgent,
        referrer: referrer || 'Direct',
        deviceType,
        browser,
        os,
        clickedAt: new Date(timestamp),
      });

      // Increment link total click count
      await linkRepository.incrementClicks(linkId);

      logger.debug({ linkId, browser, deviceType }, 'Recorded click analytics successfully');
    } catch (error) {
      logger.error({ err: error, linkId }, 'Failed to record background click analytics');
      throw error;
    }
  },
  redisOptions,
);

analyticsWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Analytics queue click job completed');
});

analyticsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Analytics queue click job failed');
});
