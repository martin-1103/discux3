import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Create extended Prisma client with logging
export class LoggedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Log queries
    (this as any).$on('query', (e: any) => {
      const queryTime = e.duration;
      const slowQueryThreshold = 1000; // 1 second

      if (queryTime > slowQueryThreshold) {
        logger.warn(`Slow Query Detected (${queryTime}ms)`, {
          query: e.query,
          params: e.params,
          duration: queryTime,
          timestamp: e.timestamp,
          target: e.target
        });
      }

      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Prisma Query`, {
          query: e.query,
          params: e.params,
          duration: queryTime,
          timestamp: e.timestamp,
          target: e.target
        });
      }
    });

    // Log errors
    (this as any).$on('error', (e: any) => {
      logger.prisma('Database Error', null, {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });

    // Log info
    (this as any).$on('info', (e: any) => {
      logger.info(`Prisma Info`, {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });

    // Log warnings
    (this as any).$on('warn', (e: any) => {
      logger.warn(`Prisma Warning`, {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });
  }

  // Override methods to add custom error handling
  async safeQuery<T>(queryFn: () => Promise<T>, context: string = 'Unknown'): Promise<T | null> {
    try {
      return await queryFn();
    } catch (error) {
      logger.database(`Query failed in ${context}`, error, {
        context,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  // Safe message creation with error logging
  async safeCreateMessage(data: any, context: string = 'createMessage') {
    try {
      return await this.message.create({ data });
    } catch (error) {
      logger.database(`Failed to create message in ${context}`, error, {
        data,
        context,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Safe message fetching with error logging
  async safeGetMessages(roomId: string, context: string = 'getMessages') {
    try {
      return await this.message.findMany({
        where: { roomId },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      logger.database(`Failed to get messages in ${context}`, error, {
        roomId,
        context,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Check database connection
  async checkConnection(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      logger.info('Database connection successful', {
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      logger.database('Database connection failed', error, {
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}

// Create singleton instance
let prismaInstance: LoggedPrismaClient | null = null;

export function getPrismaClient(): LoggedPrismaClient {
  if (!prismaInstance) {
    prismaInstance = new LoggedPrismaClient();
  }
  return prismaInstance;
}

// Export the client with proper typing
export const prisma = getPrismaClient();

// Connection utility
export const ensureDatabaseConnection = async (): Promise<boolean> => {
  try {
    const isConnected = await prisma.checkConnection();
    if (!isConnected) {
      logger.error('Failed to connect to database', {
        timestamp: new Date().toISOString()
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Database connection check failed', error, {
      timestamp: new Date().toISOString()
    });
    return false;
  }
};