#!/usr/bin/env bash
#
# Tests for opencode-ntfy plugin
#
# These tests verify plugin file structure and JavaScript syntax.
# Pure function tests will be added as modules are implemented.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_helper.bash"

PLUGIN_DIR="$(dirname "$SCRIPT_DIR")/plugin"

echo "Testing opencode-ntfy plugin..."
echo ""

# =============================================================================
# Plugin File Structure Tests
# =============================================================================

test_plugin_index_exists() {
  assert_file_exists "$PLUGIN_DIR/index.js"
}

test_plugin_notifier_exists() {
  assert_file_exists "$PLUGIN_DIR/notifier.js"
}

test_plugin_callback_exists() {
  assert_file_exists "$PLUGIN_DIR/callback.js"
}

test_plugin_hostname_exists() {
  assert_file_exists "$PLUGIN_DIR/hostname.js"
}

test_plugin_tokens_exists() {
  assert_file_exists "$PLUGIN_DIR/tokens.js"
}

# =============================================================================
# JavaScript Syntax Validation Tests
# =============================================================================

test_index_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/index.js" 2>&1 || {
    echo "index.js has syntax errors"
    return 1
  }
}

test_notifier_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/notifier.js" 2>&1 || {
    echo "notifier.js has syntax errors"
    return 1
  }
}

test_callback_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/callback.js" 2>&1 || {
    echo "callback.js has syntax errors"
    return 1
  }
}

test_hostname_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/hostname.js" 2>&1 || {
    echo "hostname.js has syntax errors"
    return 1
  }
}

test_tokens_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/tokens.js" 2>&1 || {
    echo "tokens.js has syntax errors"
    return 1
  }
}

# =============================================================================
# Plugin Export Structure Tests
# =============================================================================

test_index_exports_notify() {
  grep -q "export const Notify" "$PLUGIN_DIR/index.js" || {
    echo "Notify export not found in index.js"
    return 1
  }
}

test_index_has_default_export() {
  grep -q "export default" "$PLUGIN_DIR/index.js" || {
    echo "Default export not found in index.js"
    return 1
  }
}

test_notifier_exports_send_notification() {
  grep -q "export.*sendNotification" "$PLUGIN_DIR/notifier.js" || {
    echo "sendNotification export not found in notifier.js"
    return 1
  }
}

test_notifier_exports_send_permission_notification() {
  grep -q "export.*sendPermissionNotification" "$PLUGIN_DIR/notifier.js" || {
    echo "sendPermissionNotification export not found in notifier.js"
    return 1
  }
}

test_callback_exports_start_callback_server() {
  grep -q "export.*startCallbackServer" "$PLUGIN_DIR/callback.js" || {
    echo "startCallbackServer export not found in callback.js"
    return 1
  }
}

test_hostname_exports_discover_callback_host() {
  grep -q "export.*discoverCallbackHost" "$PLUGIN_DIR/hostname.js" || {
    echo "discoverCallbackHost export not found in hostname.js"
    return 1
  }
}

test_tokens_exports_create_token() {
  grep -q "export.*createToken" "$PLUGIN_DIR/tokens.js" || {
    echo "createToken export not found in tokens.js"
    return 1
  }
}

test_tokens_exports_verify_token() {
  grep -q "export.*verifyToken" "$PLUGIN_DIR/tokens.js" || {
    echo "verifyToken export not found in tokens.js"
    return 1
  }
}

# =============================================================================
# OpenCode Runtime Integration Tests
# =============================================================================
# These tests verify the plugin doesn't hang opencode on startup and
# works correctly in the real OpenCode runtime.
#
# Tests run if opencode is installed and plugin is configured.
# Skipped in CI unless explicitly enabled.

# Helper to check if we can run integration tests
can_run_integration_tests() {
  # Check opencode is installed
  if ! command -v opencode &>/dev/null; then
    return 1
  fi
  
  # Check plugin is installed
  if [[ ! -f "$HOME/.config/opencode/plugins/opencode-ntfy/index.js" ]]; then
    return 1
  fi
  
  return 0
}

# Cross-platform timeout wrapper
# Uses perl alarm which works on macOS and Linux
run_with_timeout() {
  local timeout_secs="$1"
  shift
  perl -e "alarm $timeout_secs; exec @ARGV" "$@" 2>&1
}

# Run opencode and capture output (with timeout)
run_opencode() {
  local prompt="$1"
  local timeout="${2:-60}"
  
  run_with_timeout "$timeout" opencode run --format json "$prompt"
}

test_opencode_starts_within_timeout() {
  if ! can_run_integration_tests; then
    echo "SKIP: opencode integration tests disabled"
    return 0
  fi
  
  # CRITICAL: Verify opencode starts within 10 seconds
  # This catches plugin initialization hangs that would block startup indefinitely.
  
  local start_time end_time elapsed output
  start_time=$(date +%s)
  
  # Use a short timeout - if plugin hangs, this will fail
  output=$(run_with_timeout 10 opencode run --format json "Say hi" 2>&1)
  local exit_code=$?
  
  end_time=$(date +%s)
  elapsed=$((end_time - start_time))
  
  if [[ $exit_code -ne 0 ]]; then
    # Check if it was a timeout (exit code 142 = SIGALRM)
    if [[ $exit_code -eq 142 ]] || [[ "$output" == *"Alarm clock"* ]]; then
      echo "FAIL: opencode startup timed out after ${elapsed}s (plugin may be hanging)"
      echo "Output: $output"
      return 1
    fi
    echo "opencode run failed (exit $exit_code): $output"
    return 1
  fi
  
  # Verify we got a response
  if ! echo "$output" | grep -q '"type"'; then
    echo "No valid JSON output from opencode"
    echo "Output: $output"
    return 1
  fi
  
  return 0
}

test_opencode_plugin_loads() {
  if ! can_run_integration_tests; then
    echo "SKIP: opencode integration tests disabled"
    return 0
  fi
  
  # Plugin should load without errors - check opencode doesn't report plugin failures
  local output
  output=$(run_opencode "Say hello" 30) || {
    echo "opencode run failed: $output"
    return 1
  }
  
  # Check that output doesn't contain plugin error messages
  if echo "$output" | grep -qi "plugin.*error\|failed to load"; then
    echo "Plugin load error detected"
    echo "Output: $output"
    return 1
  fi
  
  return 0
}

test_opencode_ntfy_disabled_without_topic() {
  if ! can_run_integration_tests; then
    echo "SKIP: opencode integration tests disabled"
    return 0
  fi
  
  # Without NTFY_TOPIC, plugin should disable gracefully (not crash)
  # Unset NTFY_TOPIC temporarily
  local old_topic="${NTFY_TOPIC:-}"
  unset NTFY_TOPIC
  
  local output
  output=$(run_opencode "Say hi" 30)
  local exit_code=$?
  
  # Restore
  if [[ -n "$old_topic" ]]; then
    export NTFY_TOPIC="$old_topic"
  fi
  
  if [[ $exit_code -ne 0 ]]; then
    echo "opencode failed without NTFY_TOPIC: $output"
    return 1
  fi
  
  return 0
}

# =============================================================================
# Run Tests
# =============================================================================

echo "Plugin File Structure Tests:"

for test_func in \
  test_plugin_index_exists \
  test_plugin_notifier_exists \
  test_plugin_callback_exists \
  test_plugin_hostname_exists \
  test_plugin_tokens_exists
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "JavaScript Syntax Validation Tests:"

for test_func in \
  test_index_js_syntax \
  test_notifier_js_syntax \
  test_callback_js_syntax \
  test_hostname_js_syntax \
  test_tokens_js_syntax
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "Plugin Export Structure Tests:"

for test_func in \
  test_index_exports_notify \
  test_index_has_default_export \
  test_notifier_exports_send_notification \
  test_notifier_exports_send_permission_notification \
  test_callback_exports_start_callback_server \
  test_hostname_exports_discover_callback_host \
  test_tokens_exports_create_token \
  test_tokens_exports_verify_token
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "OpenCode Runtime Integration Tests (CI=${CI:-false}):"

for test_func in \
  test_opencode_starts_within_timeout \
  test_opencode_plugin_loads \
  test_opencode_ntfy_disabled_without_topic
do
  # Don't use setup/teardown for integration tests - use real HOME
  run_test "${test_func#test_}" "$test_func"
done

print_summary
