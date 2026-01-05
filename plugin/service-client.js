// Service client for plugin-to-service IPC
// Implements Issue #13: Separate callback server as brew service
//
// This module connects to the standalone callback service via Unix socket
// and handles:
// - Session registration
// - Nonce requests for permission notifications
// - Permission response callbacks
// - Auto-starting the service if not running

import { createConnection } from 'net'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { debug } from './logger.js'

// Default socket path (same as service)
const DEFAULT_SOCKET_PATH = '/tmp/opencode-pilot.sock'

// Get the plugin directory to find the service
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Connection state
let socket = null
let sessionId = null
let socketPath = DEFAULT_SOCKET_PATH
let permissionHandler = null
let pendingNonceRequests = new Map() // permissionId -> resolve/reject

/**
 * Check if connected to the service
 * @returns {boolean} True if connected
 */
export function isConnected() {
  return socket !== null && !socket.destroyed
}

/**
 * Set the handler for permission responses
 * @param {Function} handler - Called with (permissionId, response) when permission response received
 */
export function setPermissionHandler(handler) {
  permissionHandler = handler
}

/**
 * Try to start the service if not running
 * Spawns the service as a detached process
 * @returns {Promise<boolean>} True if service was started or already running
 */
async function ensureServiceRunning() {
  // Check if socket exists (service likely running)
  if (existsSync(DEFAULT_SOCKET_PATH)) {
    debug('Service socket exists, assuming service is running')
    return true
  }
  
  // Find the service directory - check relative paths from plugin
  const candidates = [
    join(__dirname, '..', 'service', 'server.js'),      // npm package structure
    join(__dirname, '..', '..', 'service', 'server.js'), // development structure
  ]
  
  let serverPath = null
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      serverPath = candidate
      break
    }
  }
  
  if (!serverPath) {
    debug('Could not find server.js, cannot auto-start service')
    return false
  }
  
  debug(`Auto-starting service from: ${serverPath}`)
  
  // Spawn service as detached process
  const child = spawn('node', [serverPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  })
  
  // Unref so parent can exit independently
  child.unref()
  
  // Wait a bit for service to start and create socket
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Check if socket was created
  if (existsSync(DEFAULT_SOCKET_PATH)) {
    debug('Service started successfully')
    return true
  }
  
  debug('Service did not start (socket not created)')
  return false
}

/**
 * Connect to the callback service
 * @param {Object} options
 * @param {string} options.sessionId - OpenCode session ID
 * @param {string} [options.socketPath] - Unix socket path (default: /tmp/opencode-pilot.sock)
 * @returns {Promise<boolean>} True if connected successfully
 */
export async function connectToService(options) {
  socketPath = options.socketPath || DEFAULT_SOCKET_PATH
  sessionId = options.sessionId
  
  debug(`Service connecting: socketPath=${socketPath}, sessionId=${sessionId}`)
  
  // Try to ensure service is running first
  await ensureServiceRunning()
  
  return new Promise((resolve) => {
    // Create new socket and capture reference to avoid race conditions
    // When a connection fails, error and close events both fire. If a
    // reconnection succeeds before the old close event fires, the close
    // handler would incorrectly clear the new socket. By capturing the
    // socket reference in a closure and checking against it, we ensure
    // only events from the current socket affect the global state.
    const newSocket = createConnection(socketPath)
    socket = newSocket
    
    let buffer = ''
    
    newSocket.on('connect', () => {
      debug('Service connected, registering session')
      // Register session
      sendMessage({
        type: 'register',
        sessionId,
      })
    })
    
    newSocket.on('data', (data) => {
      buffer += data.toString()
      
      // Process complete messages (newline-delimited JSON)
      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        
        if (!line.trim()) continue
        
        try {
          const message = JSON.parse(line)
          handleMessage(message, resolve)
        } catch (error) {
          // Silently ignore invalid messages
        }
      }
    })
    
    newSocket.on('error', (err) => {
      debug(`Service connection error: ${err.message}`)
      // Only clear global state if this is still the active socket
      if (socket === newSocket) {
        socket = null
      }
      resolve(false)
    })
    
    newSocket.on('close', () => {
      debug('Service connection closed')
      // Only clear global state if this is still the active socket
      // This prevents race conditions when a failed connection's close
      // event fires after a successful reconnection
      if (socket === newSocket) {
        socket = null
        
        // Reject any pending nonce requests
        for (const [permissionId, { reject }] of pendingNonceRequests) {
          reject(new Error('Service connection closed'))
        }
        pendingNonceRequests.clear()
      }
    })
  })
}

/**
 * Disconnect from the callback service
 */
export async function disconnectFromService() {
  if (socket) {
    socket.destroy()
    socket = null
  }
  sessionId = null
}

/**
 * Try to reconnect to the callback service if disconnected
 * Uses the session ID from the last successful connection
 * Will auto-start service if not running
 * @returns {Promise<boolean>} True if reconnected successfully
 */
export async function tryReconnect() {
  // If already connected, nothing to do
  if (isConnected()) {
    return true
  }
  
  // Try to ensure service is running
  await ensureServiceRunning()
  
  // If we have a session ID from a previous connection, try to reconnect
  if (sessionId) {
    return connectToService({ sessionId, socketPath })
  }
  
  return false
}

/**
 * Request a nonce from the service for a permission request
 * @param {string} permissionId - Permission request ID
 * @returns {Promise<string>} The generated nonce
 */
export function requestNonce(permissionId) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      reject(new Error('Not connected to service'))
      return
    }
    
    // Store pending request
    pendingNonceRequests.set(permissionId, { resolve, reject })
    
    // Send request
    sendMessage({
      type: 'create_nonce',
      sessionId,
      permissionId,
    })
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (pendingNonceRequests.has(permissionId)) {
        pendingNonceRequests.delete(permissionId)
        reject(new Error('Nonce request timed out'))
      }
    }, 5000)
  })
}

/**
 * Send a message to the service
 * @param {Object} message - Message to send
 */
function sendMessage(message) {
  if (socket && !socket.destroyed) {
    socket.write(JSON.stringify(message) + '\n')
  }
}

/**
 * Handle a message from the service
 * @param {Object} message - Parsed message
 * @param {Function} [connectResolve] - Resolve function for connection promise
 */
function handleMessage(message, connectResolve) {
  debug(`Service message received: type=${message.type}`)
  switch (message.type) {
    case 'registered':
      debug('Session registered with service')
      if (connectResolve) {
        connectResolve(true)
      }
      break
      
    case 'nonce_created':
      // Resolve pending nonce request
      const pending = pendingNonceRequests.get(message.permissionId)
      if (pending) {
        pendingNonceRequests.delete(message.permissionId)
        pending.resolve(message.nonce)
      }
      break
      
    case 'permission_response':
      // Forward to handler
      if (permissionHandler) {
        permissionHandler(message.permissionId, message.response)
      }
      break
      
    default:
      // Silently ignore unknown message types
      break
  }
}
