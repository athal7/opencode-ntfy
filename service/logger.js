// Debug logging module for opencode-pilot service
// Writes to ~/.local/share/opencode-pilot/debug.log when enabled via PILOT_DEBUG=true

import { appendFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

// Maximum log file size before rotation (1MB)
export const MAX_LOG_SIZE = 1024 * 1024

// Default log path
const DEFAULT_LOG_PATH = join(homedir(), '.local', 'share', 'opencode-pilot', 'debug.log')

// Module state
let enabled = false
let logPath = DEFAULT_LOG_PATH

/**
 * Initialize the logger
 * Checks PILOT_DEBUG env var
 */
export function initLogger() {
  const envDebug = process.env.PILOT_DEBUG
  enabled = envDebug !== undefined && envDebug !== '' && envDebug !== 'false' && envDebug !== '0'
  
  if (enabled) {
    try {
      const dir = dirname(logPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    } catch {
      // Silently ignore
    }
  }
}

/**
 * Write a debug log entry
 * @param {string} message - Log message
 * @param {Object} [data] - Optional data to include
 */
export function debug(message, data) {
  if (!enabled) return
  
  try {
    rotateIfNeeded()
    
    const timestamp = new Date().toISOString()
    let entry = `[${timestamp}] ${message}`
    
    if (data !== undefined) {
      entry += typeof data === 'object' ? ' ' + JSON.stringify(data) : ' ' + String(data)
    }
    
    entry += '\n'
    
    const dir = dirname(logPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    appendFileSync(logPath, entry)
  } catch {
    // Silently ignore
  }
}

function rotateIfNeeded() {
  try {
    if (!existsSync(logPath)) return
    const stats = statSync(logPath)
    if (stats.size > MAX_LOG_SIZE) {
      unlinkSync(logPath)
    }
  } catch {
    // Silently ignore
  }
}

// Auto-init on import
initLogger()
