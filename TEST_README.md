# Complete Test Suite for ClickUp MCP Consolidated Tools

Comprehensive testing framework for all consolidated ClickUp MCP tools with automatic cleanup, safety mechanisms, and detailed reporting.

## Getting Started

Choose your starting point based on your needs:

### I Just Want to Run Tests (5 minutes)

1. **Quick Setup**
   ```bash
   # Copy the example configuration
   cp .env.example .env

   # Edit .env and add your ClickUp API key
   # CLICKUP_API_KEY=pk_your_key_here
   ```

2. **Run Tests**
   ```bash
   # On Linux/macOS
   chmod +x run-tests.sh
   ./run-tests.sh

   # On Windows
   run-tests.bat
   ```

3. **Review Results**
   - Color-coded pass/fail indicators
   - Summary at the end shows pass rate
   - Exit code 0 = all passed, 1 = failures

For more: See **QUICK_TEST_START.md**

### I Want to Understand the Details (15 minutes)

Read in this order:

1. **TEST_GUIDE.md** - Complete user guide with setup, configuration, and troubleshooting
2. **TEST_ARCHITECTURE.md** - Technical deep dive into how tests work
3. **test-all-consolidated-tools.js** - The actual test code (well-commented)

### I Want to Integrate with CI/CD (20 minutes)

1. Read **TEST_GUIDE.md** - CI/CD Integration section
2. See examples for GitHub Actions, GitLab CI, etc.
3. Configure your secrets (API key, test list ID)
4. Run in your pipeline

## What Gets Tested

### 28+ Tests Across 7 Tool Groups

| Tool Group | Tests | Operations |
|-----------|-------|-----------|
| Workspace | 1 | Get hierarchy (read-only) |
| Tasks | 7 | Create, search, update, comment, time tracking, delete |
| Containers | 4 | Create, get, update, delete lists/folders |
| Members | 3 | List, search, resolve assignees |
| Tags | 4 | List, create, update, delete |
| Documents | 5 | Create, update, delete documents and pages |
| Backward Compatibility | 4 | Verify tool consolidation |

### Safety Features

✅ **Isolated Test List**: All writes to `MCP_AUTOMATED_TESTS` list only
✅ **No Production Data**: Read-only for workspace and member data
✅ **Automatic Cleanup**: Deletes all created items after tests
✅ **Error Safe**: Continues testing even if individual tests fail
✅ **Graceful Degradation**: Skips tests if prerequisites missing

## File Structure

### Main Test File
```
test-all-consolidated-tools.js (900+ lines)
├── Test utilities and helpers
├── 7 test suites (one per tool group)
├── Cleanup functions
└── Final reporting
```

### Configuration
```
.env.example          - Configuration template with all options
.env                  - Your actual configuration (git-ignored)
```

### Documentation
```
TEST_README.md              - This file (start here)
TEST_GUIDE.md               - Full user guide (setup, config, troubleshooting)
QUICK_TEST_START.md         - 2-minute quick start
TEST_ARCHITECTURE.md        - Technical documentation and patterns
TEST_SUITE_SUMMARY.md       - Overview of all components
```

### Helpers
```
run-tests.sh                - Shell script for Linux/macOS
run-tests.bat               - Batch script for Windows
```

## Quick Reference

### Setup (One Time)

```bash
# 1. Copy configuration template
cp .env.example .env

# 2. Edit .env - Add your ClickUp API key
CLICKUP_API_KEY=pk_your_api_key_here

# 3. (Recommended) Create test list in ClickUp and add its ID
TEST_LIST_ID=your_test_list_id_here
```

See `.env.example` for all available options and instructions.

### Running Tests

```bash
# Linux/macOS
chmod +x run-tests.sh && ./run-tests.sh

# Windows
run-tests.bat

# Or direct invocation (after build)
npm run build
node test-all-consolidated-tools.js
```

### Helper Scripts

```bash
# Check environment setup without running tests
./run-tests.sh --check-env    # Linux/macOS
run-tests.bat --check-env     # Windows

# Run tests without rebuilding
./run-tests.sh --no-build     # Linux/macOS
run-tests.bat --no-build      # Windows

# Clean rebuild
./run-tests.sh --clean        # Linux/macOS
run-tests.bat --clean         # Windows

# List all test groups
./run-tests.sh --list-tests   # Linux/macOS
run-tests.bat --list-tests    # Windows
```

## Understanding Results

### Success Output

```
✨ All tests passed! ✨

Total Tests: 28
Passed: 28
Failed: 0
Pass Rate: 100%
```

Exit code: **0**

### Partial Failure Output

```
⚠ 2 test(s) failed

Workspace:
  1/1 passed (100%)

Tasks:
  6/7 passed (86%)
    - Start time tracking: Timeout error

...

Total Tests: 28
Passed: 26
Failed: 2
Pass Rate: 93%
```

Exit code: **1**

### What to Do on Failure

1. **Check the error message** - Detailed description provided
2. **Read TEST_GUIDE.md** - Troubleshooting section
3. **Verify setup** - Run `run-tests.sh --check-env` (or `.bat`)
4. **Check API permissions** - Ensure key has required scopes
5. **Review ClickUp status** - Check if API is available
6. **Try again** - Sometimes transient failures occur

## Documentation Map

```
START HERE
    ↓
TEST_README.md (this file)
    ↓
Choose your path:
    ├─→ Just Run It
    │   └─→ QUICK_TEST_START.md (2 min)
    │
    ├─→ Understand It
    │   ├─→ TEST_GUIDE.md (10 min)
    │   └─→ TEST_ARCHITECTURE.md (20 min)
    │
    └─→ Integrate It
        ├─→ TEST_GUIDE.md - CI/CD section
        └─→ run-tests.sh / run-tests.bat
```

## Common Questions

### Q: Where do I get my ClickUp API key?

A: Visit https://app.clickup.com/settings/account/apikeys and generate one.

### Q: Will tests modify my production data?

A: No. All write operations target only the `MCP_AUTOMATED_TESTS` test list.

### Q: How long do tests take?

A: Typically 2-5 minutes depending on network and API response times.

### Q: Can tests run in parallel?

A: No. Tests run sequentially to ensure data consistency.

### Q: What if I don't have a test list?

A: Create one named `MCP_AUTOMATED_TESTS` in ClickUp. Tests can run without it (some skipped).

### Q: Do I need Jest, Mocha, or other testing frameworks?

A: No. Tests use direct handler invocation without external testing frameworks.

### Q: Can I add my own tests?

A: Yes! See TEST_ARCHITECTURE.md - "Extending the Framework" section.

### Q: What if tests hang or timeout?

A: Check network connection, verify API key, check ClickUp API status at status.clickup.com

### Q: How do I debug test failures?

A: Review error messages in output, check handler code, add console.log statements.

## Architecture at a Glance

### Test Flow

```
1. Environment Setup
   ├─ Load .env configuration
   ├─ Verify API key
   └─ Get workspace info

2. Run Tests (7 groups)
   ├─ Workspace Tools
   ├─ Member Tools
   ├─ Task Tools
   ├─ Container Tools
   ├─ Tag Tools
   ├─ Document Tools
   └─ Backward Compatibility

3. Cleanup
   ├─ Delete all created tasks
   ├─ Delete all created documents
   └─ Delete all created tags

4. Report Results
   ├─ Per-group summary
   ├─ Total statistics
   └─ Exit with code 0 (pass) or 1 (fail)
```

### Safety Mechanisms

```
Tracking                  Cleanup                   Error Handling
├─ Track created IDs  ├─ Delete in order      ├─ Try-catch per test
├─ Store in state     ├─ 300ms delays         ├─ Continue on error
└─ Monitor progress   └─ Log operations       └─ Report all failures
```

## Performance

| Metric | Value |
|--------|-------|
| Average Duration | 2-5 minutes |
| Total Tests | 28+ |
| API Calls | ~25-30 |
| Rate Limiting | 500ms between tests |
| Network Traffic | Minimal (~100KB) |

## System Requirements

- **Node.js**: 18.0.0 or later
- **npm**: 9.0.0 or later
- **Internet**: Required for ClickUp API access
- **OS**: Any (Linux, macOS, Windows)

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| API key not found | See .env.example or TEST_GUIDE.md Setup |
| Permission denied | Verify API key scope in ClickUp account |
| Tests timeout | Check internet, API status at status.clickup.com |
| No tests run | Set CLICKUP_API_KEY in .env |
| Cleanup fails | Check ClickUp API, may need manual cleanup |
| Tests hang | Restart terminal, check for network issues |

For detailed solutions: **TEST_GUIDE.md - Troubleshooting**

## Integration Examples

### GitHub Actions

```yaml
- name: Run MCP Tests
  run: npm run build && node test-all-consolidated-tools.js
  env:
    CLICKUP_API_KEY: ${{ secrets.CLICKUP_API_KEY }}
    TEST_LIST_ID: ${{ secrets.TEST_LIST_ID }}
```

### GitLab CI

```yaml
test:
  script:
    - npm run build
    - node test-all-consolidated-tools.js
  variables:
    CLICKUP_API_KEY: $CLICKUP_API_KEY
    TEST_LIST_ID: $TEST_LIST_ID
```

See **TEST_GUIDE.md** for more examples.

## Support

### Documentation
- Quick start: **QUICK_TEST_START.md**
- Full guide: **TEST_GUIDE.md**
- Technical: **TEST_ARCHITECTURE.md**
- Overview: **TEST_SUITE_SUMMARY.md**

### Tools
- Linux/macOS: **run-tests.sh**
- Windows: **run-tests.bat**

### Debugging
1. Read error message in test output
2. Check TEST_GUIDE.md - Troubleshooting
3. Review handler implementation
4. Check ClickUp documentation

## Next Steps

### Beginner
1. Read QUICK_TEST_START.md (2 min)
2. Set CLICKUP_API_KEY in .env
3. Run `./run-tests.sh` or `run-tests.bat`

### Intermediate
1. Read TEST_GUIDE.md (10 min)
2. Review test output
3. Create test list for safer operations
4. Check troubleshooting if needed

### Advanced
1. Read TEST_ARCHITECTURE.md (20 min)
2. Review test code
3. Understand handler patterns
4. Add custom tests
5. Integrate with CI/CD

## License

SPDX-License-Identifier: MIT
Copyright © 2025 Talib Kareem <taazkareem@icloud.com>

## Summary

This comprehensive test suite provides:

✅ **28+ tests** for all consolidated tools
✅ **Safe operations** with isolated test environment
✅ **Automatic cleanup** of test data
✅ **Color-coded output** for easy reading
✅ **Complete documentation** at all levels
✅ **Production ready** with error handling
✅ **Easily extensible** patterns
✅ **CI/CD ready** with exit codes

---

## Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env - add CLICKUP_API_KEY

# 2. Run
./run-tests.sh        # Linux/macOS
# or
run-tests.bat         # Windows

# 3. Review results
# Exit code 0 = passed, 1 = failures
```

**For more help, see QUICK_TEST_START.md or TEST_GUIDE.md**
