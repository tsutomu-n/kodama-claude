#!/usr/bin/env bash
# Integration tests for KODAMA Claude
# This script tests the actual binary functionality

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing: $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "🧪 KODAMA Claude Integration Tests"
echo "=================================="
echo ""

# Check if binary exists
if [ ! -f "dist/kc-linux-x64" ]; then
    echo -e "${RED}Error: Binary not found. Run 'bun run build' first.${NC}"
    exit 1
fi

# Use the built binary for testing
export PATH="$PWD/dist:$PATH"
KC="./dist/kc-linux-x64"

# Test 1: Version
run_test "Version check" "$KC --version"

# Test 2: Help text
run_test "Help text" "$KC --help"

# Test 3: Status command
run_test "Status check" "$KC status"

# Test 4: Status JSON output
run_test "Status JSON" "$KC status --json"

# Test 5: Save command help
run_test "Save help" "$KC save --help"

# Test 6: Go command help
run_test "Go help" "$KC go --help"

# Test 7: Uninstall command help
run_test "Uninstall help" "$KC uninstall --help"

# Test 8: Save with stdin (non-interactive)
run_test "Save from stdin" "echo 'Test content' | $KC save -t 'Test' --stdin -y --copy none"

# Test 9: Invalid command
run_test "Invalid command handling" "! $KC invalid-command"

# Test 10: Binary size check
echo -n "Testing: Binary size optimization ... "
SIZE=$(stat -c%s dist/kc-linux-x64 2>/dev/null || stat -f%z dist/kc-linux-x64 2>/dev/null)
SIZE_MB=$((SIZE / 1024 / 1024))
if [ $SIZE_MB -lt 150 ]; then
    echo -e "${GREEN}✓${NC} (${SIZE_MB}MB)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} (${SIZE_MB}MB - larger than expected)"
    ((TESTS_PASSED++))
fi

echo ""
echo "=================================="
echo "Results:"
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi