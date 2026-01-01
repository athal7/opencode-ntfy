// HMAC-signed tokens for callback authentication
// Implements Issue #5: Token security module

/**
 * Create a signed token for callback URL
 *
 * Token contains: { sessionId, permissionId, exp }
 * Signed with HMAC-SHA256 using NTFY_CALLBACK_SECRET or auto-generated secret
 *
 * @param {string} sessionId - OpenCode session ID
 * @param {string} permissionId - Permission request ID
 * @returns {string} Base64url-encoded signed token
 */
export function createToken(sessionId, permissionId) {
  // TODO: Implement in Issue #5
  throw new Error('Not implemented - see Issue #5')
}

/**
 * Verify and decode a callback token
 *
 * @param {string} token - The token to verify
 * @returns {Object|null} Decoded payload { sessionId, permissionId, exp } or null if invalid
 */
export function verifyToken(token) {
  // TODO: Implement in Issue #5
  return null
}
