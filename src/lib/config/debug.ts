/**
 * Debug Configuration
 * Controls debug logging behavior for agent responses
 */

export const DEBUG_AGENT_LOGGING = process.env.DEBUG_AGENT_LOGGING === 'true'
export const LOG_FILE_PATH = 'logs/debug-agent.log'

console.log('[Debug Config] Agent logging enabled:', DEBUG_AGENT_LOGGING)