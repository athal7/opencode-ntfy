// Callback host discovery (Tailscale, env var, localhost)
// Implements Issue #6: Host discovery module

/**
 * Discover the callback host for ntfy action buttons
 *
 * Discovery order:
 * 1. NTFY_CALLBACK_HOST env var (explicit, highest priority)
 * 2. Tailscale CLI - `tailscale status --json` → Self.DNSName
 * 3. Fallback to 'localhost' (interactive features local-only)
 *
 * @param {Function} $ - Bun shell API for executing commands
 * @returns {Promise<string>} The discovered callback host
 */
export async function discoverCallbackHost($) {
  // 1. Explicit env var
  if (process.env.NTFY_CALLBACK_HOST) {
    console.log(`[opencode-ntfy] Using callback host from env: ${process.env.NTFY_CALLBACK_HOST}`)
    return process.env.NTFY_CALLBACK_HOST
  }

  // TODO: Issue #6 - Implement Tailscale discovery

  // 3. Fallback to localhost
  console.warn('[opencode-ntfy] No callback host found, using localhost (interactive features local-only)')
  return 'localhost'
}
