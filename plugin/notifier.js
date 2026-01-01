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
  const body = {
    topic,
    title,
    message,
  }

  // Add optional fields only if provided
  if (priority !== undefined) {
    body.priority = priority
  }
  if (tags && tags.length > 0) {
    body.tags = tags
  }

  try {
    const response = await fetch(server, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.warn(`[opencode-ntfy] Notification failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.warn(`[opencode-ntfy] Failed to send notification: ${error.message}`)
  }
}

/**
 * Send a permission notification with action buttons
 * @param {Object} options
 * @param {string} options.server - ntfy server URL
 * @param {string} options.topic - ntfy topic name
 * @param {string} options.callbackUrl - Base URL for callbacks
 * @param {string} options.token - Signed token for callback authentication
 * @param {string} options.tool - Tool requesting permission
 * @param {string} options.description - Permission description
 */
export async function sendPermissionNotification({
  server,
  topic,
  callbackUrl,
  token,
  tool,
  description,
}) {
  const body = {
    topic,
    title: 'OpenCode: Permission',
    message: `${tool}: ${description}`,
    priority: 4,
    tags: ['lock'],
    actions: [
      {
        action: 'http',
        label: 'Allow Once',
        url: `${callbackUrl}?token=${token}&response=once`,
        method: 'POST',
        clear: true,
      },
      {
        action: 'http',
        label: 'Allow Always',
        url: `${callbackUrl}?token=${token}&response=always`,
        method: 'POST',
        clear: true,
      },
      {
        action: 'http',
        label: 'Reject',
        url: `${callbackUrl}?token=${token}&response=reject`,
        method: 'POST',
        clear: true,
      },
    ],
  }

  try {
    const response = await fetch(server, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.warn(`[opencode-ntfy] Permission notification failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.warn(`[opencode-ntfy] Failed to send permission notification: ${error.message}`)
  }
}
