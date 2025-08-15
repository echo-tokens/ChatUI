#!/bin/bash

# Railway Service Test Runner for LibreChat
# This script runs all tests related to Railway service integration

set -e

echo "🚂 Starting LibreChat Railway Service Tests..."
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the tests directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the tests directory.${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    npm install
fi

# Create coverage directory if it doesn't exist
mkdir -p coverage

echo ""
echo -e "${BLUE}Running Railway Service Integration Tests...${NC}"
echo "--------------------------------------------"

# Function to run test suites with proper error handling
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    
    if npm run $test_command; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Track test results
total_tests=0
passed_tests=0

# Run unit tests
echo ""
echo -e "${BLUE}1. Unit Tests${NC}"
echo "-------------"

total_tests=$((total_tests + 1))
if run_test_suite "Railway Content Handler Tests" "test:unit -- railway-service/content-handler.test.js"; then
    passed_tests=$((passed_tests + 1))
fi

total_tests=$((total_tests + 1))
if run_test_suite "Railway Endpoint Configuration Tests" "test:unit -- railway-service/endpoint-config.test.js"; then
    passed_tests=$((passed_tests + 1))
fi

total_tests=$((total_tests + 1))
if run_test_suite "AdTile Component Tests" "test:components"; then
    passed_tests=$((passed_tests + 1))
fi

# Run integration tests
echo ""
echo -e "${BLUE}2. Integration Tests${NC}"
echo "-------------------"

total_tests=$((total_tests + 1))
if run_test_suite "Railway Service Integration Tests" "test:integration"; then
    passed_tests=$((passed_tests + 1))
fi

# Run all Railway-specific tests
echo ""
echo -e "${BLUE}3. All Railway Tests${NC}"
echo "------------------"

total_tests=$((total_tests + 1))
if run_test_suite "Complete Railway Test Suite" "test:railway"; then
    passed_tests=$((passed_tests + 1))
fi

# Generate coverage report
echo ""
echo -e "${BLUE}4. Coverage Report${NC}"
echo "------------------"

if npm run test:coverage -- --silent; then
    echo -e "${GREEN}✅ Coverage report generated${NC}"
    echo "📊 Coverage report available in: tests/coverage/lcov-report/index.html"
else
    echo -e "${YELLOW}⚠️  Coverage report generation failed${NC}"
fi

# Print test summary
echo ""
echo "============================================="
echo -e "${BLUE}🚂 Railway Service Test Summary${NC}"
echo "============================================="

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}✅ All tests passed! ($passed_tests/$total_tests)${NC}"
    echo ""
    echo -e "${GREEN}🎉 Railway service integration is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy your Railway service"
    echo "2. Update ECHO_STREAM_BASE_URL in .env"
    echo "3. Test with live Railway service"
    exit 0
else
    failed_tests=$((total_tests - passed_tests))
    echo -e "${RED}❌ $failed_tests test(s) failed out of $total_tests${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please fix failing tests before deploying${NC}"
    echo ""
    echo "To debug specific tests:"
    echo "  npm run test:verbose -- <test-file>"
    echo "  npm run test:watch -- <test-file>"
    exit 1
fi 