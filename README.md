# opencode-pilot

Automation layer for [OpenCode](https://github.com/sst/opencode) - notifications, mobile UI, and workflow orchestration.

> **Version 0.x** - Pre-1.0 software. Minor versions may contain breaking changes.

## Features

- **Idle notifications** - Get notified when OpenCode has been waiting for input
- **Mobile UI** - View sessions and respond from your phone via ntfy action buttons
- **Interactive permissions** - Approve/reject permission requests from anywhere
- **Error & retry alerts** - Stay informed when something needs attention

## Installation

Add the plugin to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-pilot"]
}
```

OpenCode auto-installs npm plugins on startup.

## Quick Start

1. **Create config** at `~/.config/opencode-pilot/config.json`:

   ```json
   {
     "topic": "your-secret-topic",
     "callbackHost": "your-machine.tailnet.ts.net"
   }
   ```

2. **Start the service** (in a separate terminal):

   ```bash
   npx opencode-pilot start
   ```

3. **Run OpenCode** - notifications will be sent to your ntfy topic!

## Configuration

Create `~/.config/opencode-pilot/config.json`:

```json
{
  "topic": "your-secret-topic",
  "server": "https://ntfy.sh",
  "token": "tk_xxx",
  "callbackHost": "your-machine.tailnet.ts.net",
  "callbackPort": 4097,
  "idleDelayMs": 300000
}
```

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `topic` | *(required)* | Your ntfy topic name |
| `server` | `https://ntfy.sh` | ntfy server URL |
| `token` | *(none)* | ntfy access token for protected topics |
| `callbackHost` | *(none)* | Hostname for callbacks (e.g., Tailscale hostname) |
| `callbackPort` | `4097` | Callback service port |
| `callbackHttps` | `false` | Use HTTPS via Tailscale Serve |
| `idleDelayMs` | `300000` | Idle notification delay (default: 5 minutes) |
| `debug` | `false` | Enable debug logging to file |
| `debugPath` | *(see below)* | Custom path for debug log file |

### Environment Variables

Environment variables override config file values:

| Variable | Config Key |
|----------|------------|
| `NTFY_TOPIC` | `topic` |
| `NTFY_SERVER` | `server` |
| `NTFY_TOKEN` | `token` |
| `NTFY_CALLBACK_HOST` | `callbackHost` |
| `NTFY_CALLBACK_PORT` | `callbackPort` |
| `NTFY_DEBUG` | `debug` |
| `NTFY_DEBUG_PATH` | `debugPath` |

## Service Management

```bash
# Start the service (foreground)
npx opencode-pilot start

# Check status
npx opencode-pilot status

# View logs (if debug enabled)
tail -f ~/.config/opencode-pilot/debug.log
```

For persistent service management, consider using your system's service manager (launchd on macOS, systemd on Linux).

## Features in Detail

### Idle Notifications

When OpenCode goes idle (waiting for input), you'll receive a notification with an **Open Session** button that opens a mobile-friendly UI to view and respond.

### Interactive Permissions

Permission requests show action buttons:
- **Allow Once** - Approve this specific request
- **Allow Always** - Approve and remember for this tool
- **Reject** - Deny the request

### Agent & Model Selection

The mobile UI supports selecting different agents and models when responding to sessions, giving you the same flexibility as the desktop interface.

## Network Requirements

The callback service listens on port 4097 (configurable). For remote access:

1. Your phone must reach the callback host on the callback port
2. **Tailscale users**: Use your machine's Tailscale hostname (e.g., `macbook.tail1234.ts.net`)

### HTTPS with Tailscale Serve (Recommended)

For better iOS Safari compatibility:

```bash
tailscale serve --bg 4097
```

Then set `"callbackHttps": true` in your config.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  OpenCode   │────▶│    Plugin    │────▶│  ntfy.sh    │
│ (localhost) │     │  (in-proc)   │     │  (cloud)    │
└─────────────┘     └──────────────┘     └─────────────┘
       ▲                   │                    │
       │                   ▼                    ▼
       │            ┌──────────────┐     ┌─────────────┐
       └────────────│   Service    │◀────│   Phone     │
                    │   :4097      │     │ (ntfy app)  │
                    └──────────────┘     └─────────────┘
```

## Troubleshooting

### Notifications not arriving

1. Check ntfy topic: `curl -d "test" ntfy.sh/your-topic`
2. Verify config: `cat ~/.config/opencode-pilot/config.json | jq .`
3. Check plugin is loaded in OpenCode

### Permission buttons not working

1. Ensure service is running: `npx opencode-pilot status`
2. Verify `callbackHost` is reachable from your phone
3. Check service logs for errors

### Debug Logging

For detailed troubleshooting, enable debug logging in your config:

```json
{
  "debug": true
}
```

Debug logs are written to `~/.config/opencode-pilot/debug.log` and include:
- Events received from OpenCode
- Idle timer start/cancel
- Notification send attempts (success/failure)
- Service connection status

Use `NTFY_DEBUG_PATH` or `debugPath` to customize the log file location.

## Related

- [opencode-devcontainers](https://github.com/athal7/opencode-devcontainers) - Run multiple devcontainer instances for OpenCode

## License

MIT
