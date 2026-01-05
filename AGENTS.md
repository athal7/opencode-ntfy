# Agent Instructions

## Pre-Commit: Documentation Check

Before committing changes, verify documentation is updated to reflect code changes:

1. **README.md** - Update if changes affect:
   - Configuration options (config.json keys or env vars)
   - CLI commands (`opencode-pilot <command>`)
   - Notification types or behavior
   - Installation or setup steps
   - Service management

2. **CONTRIBUTING.md** - Update if changes affect:
   - Development setup or workflow
   - Test commands or patterns
   - Plugin architecture

## Post-PR: Release and Upgrade Workflow

After a PR is merged to main, follow this workflow to upgrade the local installation:

### 1. Watch CI Run

Watch the CI workflow until it completes (creates release via semantic-release and publishes to npm):

```bash
gh run watch -R athal7/opencode-pilot
```

### 2. Verify Release Created

Confirm the new release was published:

```bash
gh release list -R athal7/opencode-pilot -L 1
npm view opencode-pilot version
```

### 3. Restart OpenCode

OpenCode auto-updates npm plugins. Simply restart any running OpenCode sessions to get the latest version.

### 4. Restart Service

If the callback service is running, restart it:

```bash
# Stop current service (Ctrl+C) and restart
npx opencode-pilot start
```

### 5. Verify Upgrade

```bash
npx opencode-pilot status
```

### 6. Config Migration (if needed)

Check release notes for breaking changes:

```bash
gh release view -R athal7/opencode-pilot
```

Config file location: `~/.config/opencode-pilot/config.json`

If new config options were added or format changed, update the config file. Current config keys:
- `topic` (required) - ntfy topic name
- `server` (default: `https://ntfy.sh`) - ntfy server URL
- `token` - ntfy access token for protected topics
- `callbackHost` - hostname for interactive notifications
- `callbackPort` (default: `4097`) - callback server port
- `idleDelayMs` (default: `300000`) - idle notification delay
- `idleNotify` (default: `true`) - enable idle notifications
- `errorNotify` (default: `true`) - enable error notifications
- `errorDebounceMs` (default: `60000`) - error debounce window
- `retryNotifyFirst` (default: `true`) - notify on first retry
- `retryNotifyAfter` (default: `3`) - notify after N retries
- `debug` (default: `false`) - enable debug logging to file
- `debugPath` - custom path for debug log file (default: `~/.config/opencode-pilot/debug.log`)

Environment variables override config file values with `NTFY_` prefix (e.g., `NTFY_TOPIC`).
