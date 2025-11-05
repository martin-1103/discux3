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

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.stack ? '\n' + info.stack : ''
    }`
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // Single log file for everything
  new winston.transports.File({
    filename: 'logs/app.log',
    maxsize: 10485760, // 10MB
    maxFiles: 3,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: 'warn', // Only log warnings and errors
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add database-specific logging method
logger.database = (message: string, meta?: any) => {
  logger.error(`[DATABASE] ${message}`, {
    ...meta,
    category: 'database'
  });
};

// Add API-specific logging method
logger.api = (message: string, meta?: any) => {
  logger.info(`[API] ${message}`, {
    ...meta,
    category: 'api'
  });
};

// Add Prisma-specific logging method
logger.prisma = (message: string, meta?: any) => {
  logger.error(`[PRISMA] ${message}`, {
    ...meta,
    category: 'prisma'
  });
};

// Create a stream for Morgan HTTP logging
logger.stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

export default logger;