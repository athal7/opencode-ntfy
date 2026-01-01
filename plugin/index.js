// opencode-ntfy - ntfy notification plugin for OpenCode
//
// This plugin sends notifications via ntfy.sh when:
// - Permission requests need approval (interactive)
// - Session goes idle after delay
// - Errors or retries occur
//
// Configuration via environment variables:
//   NTFY_TOPIC (required) - Your ntfy topic name
//   NTFY_SERVER - ntfy server URL (default: https://ntfy.sh)
//   NTFY_CALLBACK_HOST - Callback host for interactive notifications
//   NTFY_CALLBACK_PORT - Callback server port (default: 4097)
//   NTFY_IDLE_DELAY_MS - Idle notification delay (default: 300000)

// Configuration from environment
const config = {
  topic: process.env.NTFY_TOPIC,
  server: process.env.NTFY_SERVER || 'https://ntfy.sh',
  callbackPort: parseInt(process.env.NTFY_CALLBACK_PORT || '4097', 10),
  idleDelayMs: parseInt(process.env.NTFY_IDLE_DELAY_MS || '300000', 10),
}

export const Notify = async ({ $, client, directory }) => {
  if (!config.topic) {
    console.log('[opencode-ntfy] NTFY_TOPIC not set, plugin disabled')
    return {}
  }

  console.log(`[opencode-ntfy] Initialized for topic: ${config.topic}`)

  // TODO: Issue #6 - Discover callback host
  // TODO: Issue #4 - Start callback server

  const cwd = process.cwd()
  const dir = cwd.split('/').pop() || cwd
  let idleTimer = null

  return {
    event: async ({ event }) => {
      // TODO: Issue #2 - Handle session.status events (idle notifications)
      // TODO: Issue #3 - Handle permission.updated events
      // TODO: Issue #7 - Handle error and retry events
    },
  }
}

export default Notify
