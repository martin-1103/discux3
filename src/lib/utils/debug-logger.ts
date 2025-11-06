import fs from 'fs'
import path from 'path'
import { DEBUG_AGENT_LOGGING, LOG_FILE_PATH } from '@/lib/config/debug'

/**
 * Simple debug logger that writes to file and console
 * Only active when DEBUG_AGENT_LOGGING=true
 */
export const debugLog = (tag: string, message: string, data?: any) => {
  // Early return if debugging is disabled
  if (!DEBUG_AGENT_LOGGING) {
    return
  }

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
  const logEntry = `[${timestamp}] [${tag}] ${message}`

  // Console output for development
  if (data) {
    console.log(logEntry, data)
  } else {
    console.log(logEntry)
  }

  // Ensure logs directory exists
  try {
    const logsDir = path.dirname(LOG_FILE_PATH)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Append to file
    const fileEntry = logEntry + (data ? ` ${JSON.stringify(data)}` : '') + '\n'
    fs.appendFileSync(LOG_FILE_PATH, fileEntry)

  } catch (error) {
    console.error('[Debug Logger] Failed to write to log file:', error)
  }
}

/**
 * Initialize debug log file with header
 */
export const initializeDebugLog = () => {
  if (!DEBUG_AGENT_LOGGING) {
    return
  }

  try {
    const logsDir = path.dirname(LOG_FILE_PATH)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    const header = `\n=== AGENT DEBUG LOG - ${new Date().toISOString()} ===\n`
    fs.appendFileSync(LOG_FILE_PATH, header)

    console.log('[Debug Logger] Initialized log file:', LOG_FILE_PATH)
  } catch (error) {
    console.error('[Debug Logger] Failed to initialize log file:', error)
  }
}