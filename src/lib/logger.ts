import winston from 'winston';

// Extended logger interface with AI-specific methods
interface ExtendedLogger {
  aiRequest: (correlationId: string, request: {
    endpoint?: string;
    model?: string;
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
    headers?: any;
    [key: string]: any;
  }) => void;

  aiResponse: (correlationId: string, response: {
    status?: number;
    statusText?: string;
    duration?: number;
    rawBody?: string;
    headers?: any;
    [key: string]: any;
  }) => void;

  aiError: (correlationId: string, message: string, error?: Error | any, context?: {
    request?: any;
    response?: any;
    [key: string]: any;
  }) => void;

  aiIntent: (correlationId: string, context: {
    query: string;
    intent?: any;
    confidence?: number;
    fallback?: boolean;
    [key: string]: any;
  }) => void;

  aiContext: (correlationId: string, context: {
    query: string;
    resultCount?: number;
    searchDuration?: number;
    contextUsed?: boolean;
    [key: string]: any;
  }) => void;

  detailedError: (message: string, error?: Error | any, context?: any) => void;

  validation: (message: string, data?: any) => void;

  api: (message: string, method?: string, url?: string, statusCode?: number, duration?: number, userId?: string, ip?: string, userAgent?: string) => void;

  stream: {
    write: (message: string) => void;
  };

  prisma: (message: string, error?: Error | any, context?: any) => void;

  auth: (message: string, error?: Error | any, context?: any) => void;

  database: (message: string, error?: Error | any, context?: any) => void;

  socket: (message: string, event?: string, socketId?: string, data?: any) => void;

  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Enhanced detailed error format for console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, category, userId, requestId, method, url, statusCode, errorName, errorCode } = info;

    let output = `${timestamp} ${level}: ${message}`;

    // Add category if present
    if (category) output += ` [${category}]`;

    // Add request context for API errors
    if (method && url) output += ` | ${method} ${url}`;
    if (statusCode) output += ` | Status: ${statusCode}`;

    // Add user context
    if (userId) output += ` | User: ${userId}`;
    if (requestId) output += ` | Request: ${requestId}`;

    // Add error details
    if (errorName) output += ` | Error: ${errorName}`;
    if (errorCode) output += ` | Code: ${errorCode}`;

    // Add stack trace
    if (stack) {
      output += '\n' + '='.repeat(80) + '\n';
      output += 'STACK TRACE:\n';
      output += stack + '\n';
      output += '='.repeat(80);
    }

    return output;
  })
);

// Enhanced detailed format for file logs
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

// Define which transports the logger must use
const transports = [
  // Console transport for development with enhanced format
  new winston.transports.Console({
    format: consoleFormat
  }),

  // Detailed error log file
  new winston.transports.File({
    filename: 'logs/errors.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    level: 'error',
    format: fileFormat,
  }),

  // Combined log file for all entries
  new winston.transports.File({
    filename: 'logs/app.log',
    maxsize: 10485760, // 10MB
    maxFiles: 3,
    format: fileFormat,
  }),
];

// Create the base logger
const baseLogger = winston.createLogger({
  level: 'error', // Only log errors (suppress warnings)
  levels,
  transports,
  exitOnError: false,
});

// Create the extended logger
const logger: ExtendedLogger = {
  ...baseLogger,
  // Ensure basic winston methods are properly bound
  error: (message: string, ...meta: any[]) => baseLogger.error(message, ...meta),
  warn: (message: string, ...meta: any[]) => baseLogger.warn(message, ...meta),
  info: (message: string, ...meta: any[]) => baseLogger.info(message, ...meta),
  debug: (message: string, ...meta: any[]) => baseLogger.debug(message, ...meta),
  stream: {
    write: (message: string) => {
      // Morgan-compatible stream implementation will be added below
      baseLogger.info(message.trim());
    }
  },
  aiRequest: (correlationId: string, request: any) => {
    baseLogger.info(`AI Request [${correlationId}]`, { category: 'ai', type: 'request', ...request })
  },
  aiResponse: (correlationId: string, response: any) => {
    baseLogger.info(`AI Response [${correlationId}]`, { category: 'ai', type: 'response', ...response })
  },
  aiError: (correlationId: string, message: string, error?: Error, context?: any) => {
    baseLogger.error(`AI Error [${correlationId}]: ${message}`, { category: 'ai', type: 'error', error: error?.message, stack: error?.stack, ...context })
  },
  aiIntent: (correlationId: string, context: any) => {
    baseLogger.debug(`AI Intent [${correlationId}]`, { category: 'ai', type: 'intent', ...context })
  },
  aiContext: (correlationId: string, context: any) => {
    baseLogger.debug(`AI Context [${correlationId}]`, { category: 'ai', type: 'context', ...context })
  },
  detailedError: (message: string, error?: Error, context?: any) => {
    baseLogger.error(message, { category: 'detailed_error', error: error?.message, stack: error?.stack, ...context })
  },
  validation: (message: string, data?: any) => {
    baseLogger.warn(message, { category: 'validation', data })
  },
  api: (message: string, method?: string, url?: string, statusCode?: number, duration?: number, userId?: string, ip?: string, userAgent?: string) => {
    baseLogger.info(message, { category: 'api', method, url, statusCode, duration, userId, ip, userAgent })
  },
  prisma: (message: string, error?: Error, context?: any) => {
    baseLogger.error(message, { category: 'prisma', error: error?.message, stack: error?.stack, ...context })
  },
  auth: (message: string, error?: Error, context?: any) => {
    baseLogger.error(message, { category: 'auth', error: error?.message, stack: error?.stack, ...context })
  },
  database: (message: string, error?: Error, context?: any) => {
    baseLogger.error(message, { category: 'database', error: error?.message, stack: error?.stack, ...context })
  },
  socket: (message: string, event?: string, socketId?: string, data?: any) => {
    baseLogger.info(message, { category: 'socket', event, socketId, data })
  }
};

// Helper function to gather system context
const getSystemContext = () => {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    }
  };
};

// Enhanced error logging method
logger.detailedError = (
  message: string,
  error?: Error | any,
  context?: {
    userId?: string;
    requestId?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    [key: string]: any;
  }
) => {
  const errorInfo: any = {
    message,
    category: 'detailed_error',
    ...getSystemContext(),
    ...context,
  };

  if (error) {
    errorInfo.errorName = error instanceof Error ? error.name : 'Unknown';
    errorInfo.errorMessage = error instanceof Error ? error.message : String(error);
    errorInfo.errorCode = error.code;
    errorInfo.errorStack = error instanceof Error ? error.stack : undefined;

    // Add custom error properties
    if (error.status) errorInfo.statusCode = error.status;
    if (error.type) errorInfo.errorType = error.type;
    if (error.path) errorInfo.errorPath = error.path;
  }

  baseLogger.error(message, errorInfo);
};

// Database error logging with enhanced details
logger.database = (message: string, error?: Error | any, context?: any) => {
  logger.detailedError(message, error, {
    category: 'database',
    ...context
  });
};

// API error logging with enhanced details
logger.api = (message: string, method?: string, url?: string, statusCode?: number, duration?: number, userId?: string, ip?: string, userAgent?: string) => {
  baseLogger.info(message, { category: 'api', method, url, statusCode, duration, userId, ip, userAgent });
};

// Prisma error logging with enhanced details
logger.prisma = (message: string, error?: Error | any, context?: any) => {
  logger.detailedError(message, error, {
    category: 'prisma',
    prismaCode: error?.code,
    prismaMeta: error?.meta,
    prismaClientVersion: error?.clientVersion,
    ...context
  });
};

// Authentication error logging
logger.auth = (message: string, error?: Error | any, context?: {
  userId?: string;
  email?: string;
  provider?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}) => {
  logger.detailedError(message, error, {
    category: 'auth',
    ...context
  });
};

// Validation error logging
logger.validation = (message: string, error?: Error | any, context?: {
  field?: string;
  value?: any;
  validationRules?: any;
  [key: string]: any;
}) => {
  logger.detailedError(message, error, {
    category: 'validation',
    ...context
  });
};

// AI-specific logging methods with correlation IDs
const generateCorrelationId = () => {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sanitize sensitive data from logs
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['apiKey', 'token', 'password', 'secret', 'key'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
};

// AI Request logging
logger.aiRequest = (correlationId: string, request: {
  endpoint?: string;
  model?: string;
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  headers?: any;
  [key: string]: any;
}) => {
  baseLogger.info('AI Request Started', {
    category: 'ai_request',
    correlationId,
    ...sanitizeData(request)
  });
};

// AI Response logging
logger.aiResponse = (correlationId: string, response: {
  status?: number;
  statusText?: string;
  duration?: number;
  rawBody?: string;
  headers?: any;
  [key: string]: any;
}) => {
  baseLogger.info('AI Response Received', {
    category: 'ai_response',
    correlationId,
    ...sanitizeData(response)
  });
};

// AI Error logging with full context
logger.aiError = (correlationId: string, message: string, error?: Error | any, context?: {
  request?: any;
  response?: any;
  [key: string]: any;
}) => {
  logger.detailedError(message, error, {
    category: 'ai_error',
    correlationId,
    ...sanitizeData(context)
  });
};

// AI Intent Analysis logging
logger.aiIntent = (correlationId: string, context: {
  query: string;
  intent?: any;
  confidence?: number;
  fallback?: boolean;
  [key: string]: any;
}) => {
  const level = context.fallback ? 'warn' : 'info';
  baseLogger[level](`AI Intent Analysis${context.fallback ? ' (Fallback)' : ''}`, {
    category: 'ai_intent',
    correlationId,
    ...sanitizeData(context)
  });
};

// AI Context Search logging
logger.aiContext = (correlationId: string, context: {
  query: string;
  resultCount?: number;
  searchDuration?: number;
  contextUsed?: boolean;
  [key: string]: any;
}) => {
  baseLogger.info('AI Context Search', {
    category: 'ai_context',
    correlationId,
    ...sanitizeData(context)
  });
};

// Create a stream for Morgan HTTP logging (convert HTTP errors to detailed errors)
const enhancedStream = {
  write: (message: string) => {
    // Only log HTTP requests that have error status codes
    const statusCodeMatch = message.match(/\" (4\d{2}|5\d{2}) /);
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1]);
      const methodMatch = message.match(/\"(GET|POST|PUT|DELETE|PATCH) /);
      const method = methodMatch ? methodMatch[1] : 'UNKNOWN';
      const urlMatch = message.match(/ (\/[^\s]*) HTTP/);
      const url = urlMatch ? urlMatch[1] : '/unknown';

      logger.api(`HTTP Error: ${statusCode} ${method} ${url}`, method, url, statusCode);
    }
  }
};

// Replace the existing stream with enhanced version
logger.stream = enhancedStream;

export { generateCorrelationId };

export default logger;