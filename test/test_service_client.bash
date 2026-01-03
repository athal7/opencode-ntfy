#!/usr/bin/env bash
#
# Tests for plugin/service-client.js - IPC client for plugin-to-service communication
# Issue #13: Separate callback server as brew service
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_helper.bash"

PLUGIN_DIR="$(dirname "$SCRIPT_DIR")/plugin"

echo "Testing service-client.js module..."
echo ""

# =============================================================================
# File Structure Tests
# =============================================================================

test_service_client_file_exists() {
  assert_file_exists "$PLUGIN_DIR/service-client.js"
}

test_service_client_js_syntax() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  node --check "$PLUGIN_DIR/service-client.js" 2>&1 || {
    echo "service-client.js has syntax errors"
    return 1
  }
}

# =============================================================================
# Export Tests
# =============================================================================

test_service_client_exports_connect() {
  grep -q "export.*function connectToService\|export.*connectToService" "$PLUGIN_DIR/service-client.js" || {
    echo "connectToService export not found in service-client.js"
    return 1
  }
}

test_service_client_exports_disconnect() {
  grep -q "export.*function disconnectFromService\|export.*disconnectFromService" "$PLUGIN_DIR/service-client.js" || {
    echo "disconnectFromService export not found in service-client.js"
    return 1
  }
}

test_service_client_exports_request_nonce() {
  grep -q "export.*function requestNonce\|export.*requestNonce" "$PLUGIN_DIR/service-client.js" || {
    echo "requestNonce export not found in service-client.js"
    return 1
  }
}

test_service_client_exports_is_connected() {
  grep -q "export.*function isConnected\|export.*isConnected" "$PLUGIN_DIR/service-client.js" || {
    echo "isConnected export not found in service-client.js"
    return 1
  }
}

test_service_client_exports_check_idle() {
  # Issue #34: Service client should export checkIdle for deduplication
  grep -q "export.*function checkIdle\|export.*checkIdle" "$PLUGIN_DIR/service-client.js" || {
    echo "checkIdle export not found in service-client.js"
    return 1
  }
}

# =============================================================================
# Implementation Tests
# =============================================================================

test_service_client_uses_net_module() {
  grep -q "net\|createConnection\|connect" "$PLUGIN_DIR/service-client.js" || {
    echo "net module usage not found in service-client.js"
    return 1
  }
}

test_service_client_has_socket_path() {
  grep -q "socket\|\.sock" "$PLUGIN_DIR/service-client.js" || {
    echo "Socket path handling not found in service-client.js"
    return 1
  }
}

test_service_client_handles_registration() {
  grep -q "register\|session" "$PLUGIN_DIR/service-client.js" || {
    echo "Session registration not found in service-client.js"
    return 1
  }
}

test_service_client_handles_nonce_request() {
  grep -q "create_nonce\|nonce" "$PLUGIN_DIR/service-client.js" || {
    echo "Nonce request handling not found in service-client.js"
    return 1
  }
}

test_service_client_handles_permission_response() {
  grep -q "permission_response\|onPermissionResponse" "$PLUGIN_DIR/service-client.js" || {
    echo "Permission response handling not found in service-client.js"
    return 1
  }
}

test_service_client_no_console_output() {
  # Should NOT have console output (silenced to avoid TUI interference)
  if grep -q "console\.\(error\|warn\|log\)" "$PLUGIN_DIR/service-client.js"; then
    echo "Console output found - should be silent to avoid TUI interference"
    return 1
  fi
}

test_service_client_handles_connection_errors() {
  grep -q "error\|ECONNREFUSED\|ENOENT" "$PLUGIN_DIR/service-client.js" || {
    echo "Connection error handling not found in service-client.js"
    return 1
  }
}

test_service_client_handles_check_idle_message() {
  # Issue #34: Service client should handle check_idle message type
  grep -q "check_idle\|idle_check" "$PLUGIN_DIR/service-client.js" || {
    echo "check_idle message handling not found in service-client.js"
    return 1
  }
}

# =============================================================================
# Functional Tests (requires Node.js and running service)
# =============================================================================

test_service_client_connects_to_service() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, isConnected } from './plugin/service-client.js';
    
    // Start service with test socket
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    
    // Connect client
    const connected = await connectToService({
      sessionId: 'test-session',
      socketPath,
    });
    
    if (!connected) {
      console.log('FAIL: Failed to connect to service');
      await stopService(service);
      process.exit(1);
    }
    
    if (!isConnected()) {
      console.log('FAIL: isConnected() returned false after connection');
      await stopService(service);
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_requests_nonce() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, requestNonce } from './plugin/service-client.js';
    
    // Start service with test socket
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    
    // Connect client
    await connectToService({
      sessionId: 'test-session',
      socketPath,
    });
    
    // Request nonce
    const nonce = await requestNonce('perm-123');
    
    if (!nonce || typeof nonce !== 'string') {
      console.log('FAIL: Did not receive valid nonce: ' + nonce);
      await disconnectFromService();
      await stopService(service);
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_receives_permission_response() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, requestNonce, setPermissionHandler } from './plugin/service-client.js';
    
    // Start service with test socket
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    const port = service.httpServer.address().port;
    
    // Set up handler to receive response
    let receivedPermissionId, receivedResponse;
    setPermissionHandler((permissionId, response) => {
      receivedPermissionId = permissionId;
      receivedResponse = response;
    });
    
    // Connect client
    await connectToService({
      sessionId: 'test-session',
      socketPath,
    });
    
    // Request nonce
    const nonce = await requestNonce('perm-456');
    
    // Simulate callback from ntfy
    const res = await fetch('http://localhost:' + port + '/callback?nonce=' + nonce + '&response=once', {
      method: 'POST'
    });
    
    if (res.status !== 200) {
      console.log('FAIL: Callback returned ' + res.status);
      await disconnectFromService();
      await stopService(service);
      process.exit(1);
    }
    
    // Wait for handler to be called
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (receivedPermissionId !== 'perm-456') {
      console.log('FAIL: Wrong permissionId: ' + receivedPermissionId);
      await disconnectFromService();
      await stopService(service);
      process.exit(1);
    }
    
    if (receivedResponse !== 'once') {
      console.log('FAIL: Wrong response: ' + receivedResponse);
      await disconnectFromService();
      await stopService(service);
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_handles_service_not_running() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { connectToService, isConnected } from './plugin/service-client.js';
    
    // Try to connect to non-existent service
    const socketPath = '/tmp/opencode-ntfy-nonexistent-' + process.pid + '.sock';
    
    const connected = await connectToService({
      sessionId: 'test-session',
      socketPath,
    });
    
    if (connected) {
      console.log('FAIL: Should not have connected to non-existent service');
      process.exit(1);
    }
    
    if (isConnected()) {
      console.log('FAIL: isConnected() should return false');
      process.exit(1);
    }
    
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

# =============================================================================
# Issue #34: Idle Notification Deduplication Functional Tests
# =============================================================================

test_service_client_check_idle_returns_boolean() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, checkIdle } from './plugin/service-client.js';
    
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    
    await connectToService({ sessionId: 'test-session', socketPath });
    
    const shouldSend = await checkIdle('test-repo');
    
    if (typeof shouldSend !== 'boolean') {
      console.log('FAIL: checkIdle should return boolean, got: ' + typeof shouldSend);
      process.exit(1);
    }
    
    if (shouldSend !== true) {
      console.log('FAIL: First idle check should return true');
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_check_idle_returns_false_for_duplicate() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, checkIdle } from './plugin/service-client.js';
    
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    
    await connectToService({ sessionId: 'test-session', socketPath });
    
    // First check - allowed
    await checkIdle('test-repo');
    
    // Second check - duplicate, should be suppressed
    const shouldSend = await checkIdle('test-repo');
    
    if (shouldSend !== false) {
      console.log('FAIL: Duplicate idle check should return false');
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_check_idle_returns_true_when_disconnected() {
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { checkIdle, isConnected } from './plugin/service-client.js';
    
    // Not connected - checkIdle should return true (fallback behavior)
    if (isConnected()) {
      console.log('FAIL: Should not be connected');
      process.exit(1);
    }
    
    const shouldSend = await checkIdle('test-repo');
    
    if (shouldSend !== true) {
      console.log('FAIL: checkIdle should return true when not connected');
      process.exit(1);
    }
    
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

test_service_client_check_idle_concurrent_calls() {
  # Issue #34: Test that concurrent checkIdle calls for same repo don't lose requests
  if ! command -v node &>/dev/null; then
    echo "SKIP: node not available"
    return 0
  fi
  
  local result
  result=$(node --experimental-vm-modules -e "
    import { startService, stopService } from './service/server.js';
    import { connectToService, disconnectFromService, checkIdle } from './plugin/service-client.js';
    
    const socketPath = '/tmp/opencode-ntfy-test-' + process.pid + '.sock';
    const service = await startService({ httpPort: 0, socketPath });
    
    await connectToService({ sessionId: 'test-session', socketPath });
    
    // Make concurrent calls - both should complete (not hang)
    const results = await Promise.all([
      checkIdle('test-repo'),
      checkIdle('test-repo'),
    ]);
    
    // First should be true, second should be false (suppressed)
    // But the key test is that both complete without hanging
    if (typeof results[0] !== 'boolean' || typeof results[1] !== 'boolean') {
      console.log('FAIL: Both calls should return booleans, got: ' + results);
      process.exit(1);
    }
    
    await disconnectFromService();
    await stopService(service);
    console.log('PASS');
  " 2>&1) || {
    echo "Functional test failed: $result"
    return 1
  }
  
  if ! echo "$result" | grep -q "PASS"; then
    echo "$result"
    return 1
  fi
}

# =============================================================================
# Run Tests
# =============================================================================

echo "File Structure Tests:"

for test_func in \
  test_service_client_file_exists \
  test_service_client_js_syntax
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "Export Tests:"

for test_func in \
  test_service_client_exports_connect \
  test_service_client_exports_disconnect \
  test_service_client_exports_request_nonce \
  test_service_client_exports_is_connected \
  test_service_client_exports_check_idle
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "Implementation Tests:"

for test_func in \
  test_service_client_uses_net_module \
  test_service_client_has_socket_path \
  test_service_client_handles_registration \
  test_service_client_handles_nonce_request \
  test_service_client_handles_permission_response \
  test_service_client_no_console_output \
  test_service_client_handles_connection_errors \
  test_service_client_handles_check_idle_message
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "Functional Tests:"

for test_func in \
  test_service_client_connects_to_service \
  test_service_client_requests_nonce \
  test_service_client_receives_permission_response \
  test_service_client_handles_service_not_running
do
  run_test "${test_func#test_}" "$test_func"
done

echo ""
echo "Idle Deduplication Tests (Issue #34):"

for test_func in \
  test_service_client_check_idle_returns_boolean \
  test_service_client_check_idle_returns_false_for_duplicate \
  test_service_client_check_idle_returns_true_when_disconnected \
  test_service_client_check_idle_concurrent_calls
do
  run_test "${test_func#test_}" "$test_func"
done

print_summary
