// HTTP callback server for permission responses
// Implements Issue #4: Callback server module

/**
 * Start the HTTP callback server
 * @param {number} port - Port to listen on
 * @param {Function} onPermissionResponse - Callback when permission response received
 *   Called with (sessionId, permissionId, response) where response is 'once'|'always'|'reject'
 * @returns {import('http').Server} The HTTP server instance
 */
export function startCallbackServer(port, onPermissionResponse) {
  // TODO: Implement in Issue #4
  // Endpoints:
  //   GET /health - Health check
  //   POST /callback?token=xxx&response=once|always|reject - Permission response
  throw new Error('Not implemented - see Issue #4')
}
