#!/bin/bash

##############################################################################
# ClickUp MCP Test Suite Runner Script
#
# This script simplifies running the complete test suite with proper setup
# and error handling.
#
# Usage:
#   ./run-tests.sh          # Build and run tests
#   ./run-tests.sh --help   # Show this help
#
##############################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
TEST_FILE="test-all-consolidated-tools.js"
BUILD_DIR="build"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
  cat << EOF
Usage: ./run-tests.sh [OPTIONS]

OPTIONS:
  --help              Show this help message
  --no-build          Skip build step, run tests only
  --verbose           Show detailed output
  --clean             Clean build directory before building
  --list-tests        List all test groups
  --check-env         Check environment setup only

ENVIRONMENT VARIABLES:
  CLICKUP_API_KEY     Required: ClickUp API key
  TEST_LIST_ID        Optional: Test list ID for write operations
  NODE_ENV            Optional: Node environment (default: development)

EXAMPLES:
  # Standard usage (build and run tests)
  ./run-tests.sh

  # Run tests without rebuilding
  ./run-tests.sh --no-build

  # Check environment setup
  ./run-tests.sh --check-env

  # Clean rebuild and test
  ./run-tests.sh --clean

EOF
}

list_tests() {
  echo "Test Groups to be run:"
  echo "  1. Workspace Tools (read-only)"
  echo "  2. Task Tools (7 tests)"
  echo "  3. Container Tools (4 tests)"
  echo "  4. Member Tools (3 tests)"
  echo "  5. Tag Tools (4 tests)"
  echo "  6. Document Tools (5 tests)"
  echo "  7. Backward Compatibility (4 tests)"
  echo ""
  echo "Total: 28+ tests"
}

check_environment() {
  print_header "Checking Environment Setup"

  # Check Node.js
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
  else
    print_error "Node.js not found. Please install Node.js 18+"
    return 1
  fi

  # Check npm
  if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
  else
    print_error "npm not found. Please install npm"
    return 1
  fi

  # Check .env file
  if [ -f "$PROJECT_DIR/.env" ]; then
    print_success ".env file exists"

    # Check API key
    if grep -q "CLICKUP_API_KEY=" "$PROJECT_DIR/.env"; then
      API_KEY=$(grep "CLICKUP_API_KEY=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
      if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_api_key_here" ]; then
        print_warning "CLICKUP_API_KEY not configured or placeholder value"
      else
        print_success "CLICKUP_API_KEY configured"
      fi
    else
      print_warning "CLICKUP_API_KEY not found in .env"
    fi

    # Check TEST_LIST_ID
    if grep -q "TEST_LIST_ID=" "$PROJECT_DIR/.env"; then
      TEST_LIST=$(grep "TEST_LIST_ID=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
      if [ -z "$TEST_LIST" ]; then
        print_warning "TEST_LIST_ID empty (tests will run in limited mode)"
      else
        print_success "TEST_LIST_ID configured"
      fi
    else
      print_warning "TEST_LIST_ID not found in .env (optional)"
    fi
  else
    print_error ".env file not found"
    print_info "Copy .env.example to .env and configure your API key"
    return 1
  fi

  # Check test file
  if [ -f "$PROJECT_DIR/$TEST_FILE" ]; then
    print_success "Test file exists: $TEST_FILE"
  else
    print_error "Test file not found: $TEST_FILE"
    return 1
  fi

  print_success "Environment check completed"
  return 0
}

build_project() {
  print_header "Building Project"

  if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "package.json not found in $PROJECT_DIR"
    return 1
  fi

  print_info "Installing dependencies..."
  npm install --silent || {
    print_error "Failed to install dependencies"
    return 1
  }
  print_success "Dependencies installed"

  print_info "Building TypeScript..."
  npm run build || {
    print_error "Build failed"
    return 1
  }
  print_success "Build completed successfully"
  return 0
}

run_tests() {
  print_header "Running Test Suite"

  if [ ! -f "$PROJECT_DIR/$TEST_FILE" ]; then
    print_error "Test file not found: $TEST_FILE"
    return 1
  fi

  print_info "Starting tests..."
  echo ""

  # Run the test
  node "$PROJECT_DIR/$TEST_FILE"
  TEST_EXIT_CODE=$?

  echo ""
  return $TEST_EXIT_CODE
}

##############################################################################
# Main Script
##############################################################################

# Parse arguments
SKIP_BUILD=false
CLEAN_BUILD=false
VERBOSE=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --help)
      show_help
      exit 0
      ;;
    --no-build)
      SKIP_BUILD=true
      shift
      ;;
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --list-tests)
      list_tests
      exit 0
      ;;
    --check-env)
      CHECK_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Main execution
print_header "ClickUp MCP Test Suite Runner"

# Check environment
if ! check_environment; then
  print_error "Environment check failed"
  exit 1
fi

# If check-only mode, exit here
if [ "$CHECK_ONLY" = true ]; then
  print_success "Environment ready for testing"
  exit 0
fi

# Clean if requested
if [ "$CLEAN_BUILD" = true ]; then
  print_info "Cleaning build directory..."
  rm -rf "$PROJECT_DIR/$BUILD_DIR"
  print_success "Build directory cleaned"
fi

# Build if not skipped
if [ "$SKIP_BUILD" = false ]; then
  if ! build_project; then
    print_error "Failed to build project"
    exit 1
  fi
else
  print_info "Skipping build (--no-build flag set)"
  if [ ! -d "$PROJECT_DIR/$BUILD_DIR" ]; then
    print_error "Build directory not found. Run without --no-build first"
    exit 1
  fi
fi

# Run tests
if run_tests; then
  print_header "Tests Completed Successfully"
  print_success "All tests passed!"
  exit 0
else
  TEST_EXIT_CODE=$?
  print_header "Tests Completed with Failures"
  print_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
  exit $TEST_EXIT_CODE
fi
