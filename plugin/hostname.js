// Callback host configuration
// Implements Issue #6: Host discovery module

/**
 * Get the callback host for ntfy action buttons
 *
 * Priority:
 * 1. NTFY_CALLBACK_HOST env var (explicit configuration)
 * 2. Fallback to 'localhost' (interactive features local-only)
 *
 * @returns {string} The callback host
 */
export function getCallbackHost() {
  if (process.env.NTFY_CALLBACK_HOST) {
    console.log(`[opencode-ntfy] Using callback host: ${process.env.NTFY_CALLBACK_HOST}`)
    return process.env.NTFY_CALLBACK_HOST
  }

  console.warn('[opencode-ntfy] NTFY_CALLBACK_HOST not set, using localhost (interactive features local-only)')
  return 'localhost'
}

// Keep old name for backwards compatibility
export const discoverCallbackHost = () => getCallbackHost()
