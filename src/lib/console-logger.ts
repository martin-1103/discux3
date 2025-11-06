// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Create file-based console logger
class ConsoleLogger {
  private logFile: string;
  private isEnabled: boolean;

  constructor() {
    this.logFile = 'logs/console.log';
    this.isEnabled = true;
    this.setupConsoleRedirection();
  }

  private setupConsoleRedirection() {
    // Override console methods to also log to files (only warnings and errors)
    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      // Don't log INFO to file - just show in console
    };

    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      this.logToFile('ERROR', args);
      // Removed logger dependency to fix circular dependency
    };

    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      this.logToFile('WARN', args);
      // Removed logger dependency to fix circular dependency
    };

    console.info = (...args: any[]) => {
      originalConsole.info(...args);
      // Don't log INFO to file - just show in console
    };

    console.debug = (...args: any[]) => {
      originalConsole.debug(...args);
      // Don't log DEBUG to file - just show in console
    };
  }

  private logToFile(level: string, args: any[]) {
    if (!this.isEnabled) return;

    try {
      const fs = require('fs');
      const path = require('path');

      const logMessage = `[${new Date().toISOString()}] ${level}: ${args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}\n`;

      const logsDir = path.dirname(this.logFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      // Don't log to console to avoid infinite loops
      originalConsole.error('Failed to write to console log file:', error);
    }
  }

  // Method to disable console redirection (useful for tests)
  disable() {
    this.isEnabled = false;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  }

  // Method to enable console redirection
  enable() {
    this.isEnabled = true;
    this.setupConsoleRedirection();
  }

  // Method to get current log file path
  getLogFilePath(): string {
    return this.logFile;
  }
}

// Create and export singleton instance
export const consoleLogger = new ConsoleLogger();

// Export the original console for emergency use
export { originalConsole };

// Initialize console logging immediately
console.log('🔧 Console logging initialized');