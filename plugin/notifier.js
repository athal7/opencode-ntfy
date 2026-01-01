// ntfy HTTP client for sending notifications
// Implements Issue #3: Notifier module

/**
 * Send a basic notification to ntfy
 * @param {Object} options
 * @param {string} options.server - ntfy server URL
 * @param {string} options.topic - ntfy topic name
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {number} [options.priority] - Priority (1-5, default 3)
 * @param {string[]} [options.tags] - Emoji tags
 */
export async function sendNotification({ server, topic, title, message, priority, tags }) {
  // TODO: Implement in Issue #3
  // Will use native fetch() to POST to ntfy server
  throw new Error('Not implemented - see Issue #3')
}

/**
 * Send a permission notification with action buttons
 * @param {Object} options
 * @param {string} options.server - ntfy server URL
 * @param {string} options.topic - ntfy topic name
 * @param {string} options.callbackUrl - Base URL for callbacks
 * @param {string} options.sessionId - OpenCode session ID
 * @param {string} options.permissionId - Permission request ID
 * @param {string} options.tool - Tool requesting permission
 * @param {string} options.description - Permission description
 */
export async function sendPermissionNotification({
  server,
  topic,
  callbackUrl,
  sessionId,
  permissionId,
  tool,
  description,
}) {
  // TODO: Implement in Issue #3
  // Will include action buttons: Allow Once, Allow Always, Reject
  throw new Error('Not implemented - see Issue #3')
}
