@echo off
REM ============================================================================
REM ClickUp MCP Test Suite Runner Script (Windows)
REM
REM This script simplifies running the complete test suite with proper setup
REM and error handling.
REM
REM Usage:
REM   run-tests.bat          - Build and run tests
REM   run-tests.bat --help   - Show this help
REM ============================================================================

setlocal enabledelayedexpansion

REM Configuration
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR:~0,-1%
set TEST_FILE=test-all-consolidated-tools.js
set BUILD_DIR=build
set SKIP_BUILD=false
set CLEAN_BUILD=false
set CHECK_ONLY=false

REM ============================================================================
REM Helper Functions
REM ============================================================================

:print_header
  echo.
  echo ========================================================================
  echo %~1
  echo ========================================================================
  echo.
  exit /b 0

:print_success
  echo [+] %~1
  exit /b 0

:print_error
  echo [-] %~1
  exit /b 0

:print_warning
  echo [!] %~1
  exit /b 0

:print_info
  echo [i] %~1
  exit /b 0

:show_help
  echo Usage: run-tests.bat [OPTIONS]
  echo.
  echo OPTIONS:
  echo   --help              Show this help message
  echo   --no-build          Skip build step, run tests only
  echo   --clean             Clean build directory before building
  echo   --list-tests        List all test groups
  echo   --check-env         Check environment setup only
  echo.
  echo ENVIRONMENT VARIABLES:
  echo   CLICKUP_API_KEY     Required: ClickUp API key
  echo   TEST_LIST_ID        Optional: Test list ID for write operations
  echo   NODE_ENV            Optional: Node environment
  echo.
  echo EXAMPLES:
  echo   run-tests.bat                  (build and run tests)
  echo   run-tests.bat --no-build       (run tests only)
  echo   run-tests.bat --check-env      (check setup only)
  echo.
  exit /b 0

:list_tests
  echo Test Groups to be run:
  echo   1. Workspace Tools (read-only)
  echo   2. Task Tools (7 tests)
  echo   3. Container Tools (4 tests)
  echo   4. Member Tools (3 tests)
  echo   5. Tag Tools (4 tests)
  echo   6. Document Tools (5 tests)
  echo   7. Backward Compatibility (4 tests)
  echo.
  echo Total: 28+ tests
  exit /b 0

:check_environment
  title ClickUp MCP - Environment Check
  echo.
  echo ========================================================================
  echo Checking Environment Setup
  echo ========================================================================
  echo.

  REM Check Node.js
  where node >nul 2>nul
  if errorlevel 1 (
    echo [-] Node.js not found. Please install Node.js 18+
    exit /b 1
  ) else (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo [+] Node.js installed: !NODE_VERSION!
  )

  REM Check npm
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [-] npm not found. Please install npm
    exit /b 1
  ) else (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    echo [+] npm installed: !NPM_VERSION!
  )

  REM Check .env file
  if exist "%PROJECT_DIR%\.env" (
    echo [+] .env file exists

    REM Check API key
    findstr /i "CLICKUP_API_KEY=" "%PROJECT_DIR%\.env" >nul 2>nul
    if errorlevel 1 (
      echo [!] CLICKUP_API_KEY not found in .env
    ) else (
      for /f "tokens=2 delims==" %%i in ('findstr /i "CLICKUP_API_KEY=" "%PROJECT_DIR%\.env"') do set API_KEY=%%i
      if "!API_KEY!"=="" (
        echo [!] CLICKUP_API_KEY empty
      ) else (
        echo [+] CLICKUP_API_KEY configured
      )
    )

    REM Check TEST_LIST_ID
    findstr /i "TEST_LIST_ID=" "%PROJECT_DIR%\.env" >nul 2>nul
    if errorlevel 1 (
      echo [!] TEST_LIST_ID not found (optional)
    ) else (
      for /f "tokens=2 delims==" %%i in ('findstr /i "TEST_LIST_ID=" "%PROJECT_DIR%\.env"') do set TEST_LIST=%%i
      if "!TEST_LIST!"=="" (
        echo [!] TEST_LIST_ID empty
      ) else (
        echo [+] TEST_LIST_ID configured
      )
    )
  ) else (
    echo [-] .env file not found
    echo [i] Copy .env.example to .env and configure your API key
    exit /b 1
  )

  REM Check test file
  if exist "%PROJECT_DIR%\%TEST_FILE%" (
    echo [+] Test file exists: %TEST_FILE%
  ) else (
    echo [-] Test file not found: %TEST_FILE%
    exit /b 1
  )

  echo.
  echo [+] Environment check completed
  echo.
  exit /b 0

:build_project
  call :print_header "Building Project"

  if not exist "%PROJECT_DIR%\package.json" (
    echo [-] package.json not found in %PROJECT_DIR%
    exit /b 1
  )

  echo [i] Installing dependencies...
  call npm install --silent
  if errorlevel 1 (
    echo [-] Failed to install dependencies
    exit /b 1
  )
  echo [+] Dependencies installed

  echo [i] Building TypeScript...
  call npm run build
  if errorlevel 1 (
    echo [-] Build failed
    exit /b 1
  )
  echo [+] Build completed successfully
  exit /b 0

:run_tests
  call :print_header "Running Test Suite"

  if not exist "%PROJECT_DIR%\%TEST_FILE%" (
    echo [-] Test file not found: %TEST_FILE%
    exit /b 1
  )

  echo [i] Starting tests...
  echo.

  title ClickUp MCP - Running Tests
  call node "%PROJECT_DIR%\%TEST_FILE%"
  set TEST_EXIT_CODE=!errorlevel!

  echo.
  exit /b !TEST_EXIT_CODE!

REM ============================================================================
REM Main Script
REM ============================================================================

REM Parse arguments
for %%a in (%*) do (
  if "%%a"=="--help" (
    call :show_help
    exit /b 0
  )
  if "%%a"=="--no-build" set SKIP_BUILD=true
  if "%%a"=="--clean" set CLEAN_BUILD=true
  if "%%a"=="--list-tests" (
    call :list_tests
    exit /b 0
  )
  if "%%a"=="--check-env" set CHECK_ONLY=true
)

REM Main execution
call :print_header "ClickUp MCP Test Suite Runner"

REM Check environment
call :check_environment
if errorlevel 1 (
  echo [-] Environment check failed
  exit /b 1
)

REM If check-only mode, exit here
if "%CHECK_ONLY%"=="true" (
  echo [+] Environment ready for testing
  exit /b 0
)

REM Clean if requested
if "%CLEAN_BUILD%"=="true" (
  echo [i] Cleaning build directory...
  if exist "%PROJECT_DIR%\%BUILD_DIR%" (
    rmdir /s /q "%PROJECT_DIR%\%BUILD_DIR%"
  )
  echo [+] Build directory cleaned
)

REM Build if not skipped
if "%SKIP_BUILD%"=="false" (
  call :build_project
  if errorlevel 1 (
    echo [-] Failed to build project
    exit /b 1
  )
) else (
  echo [i] Skipping build (--no-build flag set)
  if not exist "%PROJECT_DIR%\%BUILD_DIR%" (
    echo [-] Build directory not found. Run without --no-build first
    exit /b 1
  )
)

REM Run tests
call :run_tests
if errorlevel 0 (
  if errorlevel 1 (
    call :print_header "Tests Completed with Failures"
    echo [-] Some tests failed
    exit /b 1
  ) else (
    call :print_header "Tests Completed Successfully"
    echo [+] All tests passed
    exit /b 0
  )
)

exit /b 0
