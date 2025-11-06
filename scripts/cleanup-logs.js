#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logsDir = path.join(__dirname, '..', 'logs');
const DEV_PORT = process.env.PORT || 3000;

/**
 * Kill any process using the development port
 */
function killPortProcess() {
  try {
    console.log(`🔧 Checking port ${DEV_PORT} for existing processes...`);

    // Check if port is in use first
    try {
      execSync(`netstat -ano | findstr :${DEV_PORT}`, { stdio: 'ignore' });
      console.log(`⚠️  Port ${DEV_PORT} is in use, killing process...`);

      // Use kill-port package to kill the process
      const killCommand = `npx kill-port ${DEV_PORT}`;
      execSync(killCommand, { stdio: 'pipe' });
      console.log(`🗑️  Successfully killed process using port ${DEV_PORT}`);

      // Wait a moment for the process to fully terminate
      setTimeout(() => {
        console.log(`✅ Port ${DEV_PORT} is now free`);
      }, 1000);

    } catch (netstatError) {
      // Port is not in use, which is what we want
      console.log(`✅ Port ${DEV_PORT} is already free`);
    }

  } catch (error) {
    console.warn(`⚠️  Warning: Could not check/kill port ${DEV_PORT}:`, error.message);
    // Don't exit the process - continue with log cleanup even if port killing fails
  }
}

/**
 * Clean up all log files before starting a new server session
 * This ensures fresh logs for each development session
 */
function cleanupLogs() {
  try {
    console.log('🧹 Cleaning up old log files...');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Created logs directory');
      return;
    }

    // Read all files in logs directory
    const files = fs.readdirSync(logsDir);

    // Remove all .log files and audit.json files but keep .gitkeep
    let removedCount = 0;
    files.forEach(file => {
      // Remove log files
      if (file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        fs.unlinkSync(filePath);
        removedCount++;
        console.log(`  🗑️  Removed: ${file}`);
      }
      // Remove Next.js audit.json files (these shouldn't be in logs folder)
      else if (file.includes('-audit.json')) {
        const filePath = path.join(logsDir, file);
        fs.unlinkSync(filePath);
        removedCount++;
        console.log(`  🗑️  Removed audit file: ${file}`);
      }
    });

    if (removedCount > 0) {
      console.log(`✅ Cleaned up ${removedCount} log file(s)`);
    } else {
      console.log('✅ No log files to clean');
    }

    console.log('📝 Ready for fresh logging session\n');
  } catch (error) {
    console.error('❌ Error cleaning up logs:', error.message);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  // Kill port process first, then clean up logs
  killPortProcess();
  cleanupLogs();
}

module.exports = { cleanupLogs, killPortProcess };