import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

// Error boundary for catching unhandled errors
export class ErrorBoundary extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Give time for logging before shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    reason: reason.toString(),
    stack: reason.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });

  // Give time for logging before shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Middleware to catch errors in API routes
export function withErrorHandler(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const timestamp = new Date().toISOString();
      const url = req.url;
      const method = req.method;

      if (error instanceof Error) {
        logger.error(`API Error in ${method} ${url}`, {
          message: error.message,
          stack: error.stack,
          url,
          method,
          timestamp,
          userAgent: req.headers.get('user-agent'),
          ip: req.ip || 'unknown'
        });
      } else {
        logger.error(`Unknown API Error in ${method} ${url}`, {
          error: String(error),
          url,
          method,
          timestamp,
          userAgent: req.headers.get('user-agent'),
          ip: req.ip || 'unknown'
        });
      }

      // Return appropriate error response
      const statusCode = error instanceof ErrorBoundary ? error.statusCode : 500;
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Something went wrong',
          timestamp
        },
        { status: statusCode }
      );
    }
  };
}

// Error logging utility functions
export const logError = (error: Error, context?: string) => {
  logger.error(`Application Error${context ? ` in ${context}` : ''}`, {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

export const logWarning = (message: string, context?: string, meta?: any) => {
  logger.warn(`Warning${context ? ` in ${context}` : ''}`, {
    message,
    context,
    ...meta,
    timestamp: new Date().toISOString()
  });
};

export const logInfo = (message: string, context?: string, meta?: any) => {
  logger.info(`Info${context ? ` in ${context}` : ''}`, {
    message,
    context,
    ...meta,
    timestamp: new Date().toISOString()
  });
};

// React Error Boundary component for client-side errors
export function createErrorBoundary(componentName: string) {
  return class ErrorBoundary {
    static getDerivedStateFromError(error: Error) {
      logError(error, componentName);
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: any) {
      logger.error(`React Error Boundary: ${componentName}`, {
        message: error.message,
        stack: error.stack,
        errorInfo,
        component: componentName,
        timestamp: new Date().toISOString()
      });
    }
  };
}