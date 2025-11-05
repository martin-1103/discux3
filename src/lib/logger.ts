import winston from 'winston';

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

// Create the logger
const logger = winston.createLogger({
  level: 'error', // Only log errors (suppress warnings)
  levels,
  transports,
  exitOnError: false,
});

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
    errorInfo.errorName = error.name;
    errorInfo.errorMessage = error.message;
    errorInfo.errorCode = error.code;
    errorInfo.errorStack = error.stack;

    // Add custom error properties
    if (error.status) errorInfo.statusCode = error.status;
    if (error.type) errorInfo.errorType = error.type;
    if (error.path) errorInfo.errorPath = error.path;
  }

  logger.error(message, errorInfo);
};

// Database error logging with enhanced details
logger.database = (message: string, error?: Error | any, context?: any) => {
  logger.detailedError(message, error, {
    category: 'database',
    ...context
  });
};

// API error logging with enhanced details
logger.api = (message: string, error?: Error | any, context?: {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}) => {
  logger.detailedError(message, error, {
    category: 'api',
    ...context
  });
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

// Create a stream for Morgan HTTP logging (convert HTTP errors to detailed errors)
logger.stream = {
  write: (message: string) => {
    // Only log HTTP requests that have error status codes
    const statusCodeMatch = message.match(/\" (4\d{2}|5\d{2}) /);
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1]);
      const methodMatch = message.match(/\"(GET|POST|PUT|DELETE|PATCH) /);
      const method = methodMatch ? methodMatch[1] : 'UNKNOWN';
      const urlMatch = message.match(/ (\/[^\s]*) HTTP/);
      const url = urlMatch ? urlMatch[1] : '/unknown';

      logger.api(`HTTP Error: ${statusCode} ${method} ${url}`, new Error(`HTTP ${statusCode}`), {
        method,
        url,
        statusCode,
        category: 'http_error'
      });
    }
  }
};

export default logger;