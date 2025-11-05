#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

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
  cleanupLogs();
}

module.exports = { cleanupLogs };