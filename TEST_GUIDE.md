# ClickUp MCP Consolidated Tools Test Suite

Complete test suite for all consolidated ClickUp MCP tools with safe operations and comprehensive reporting.

## Overview

The `test-all-consolidated-tools.js` file provides a comprehensive testing framework that:

- Tests all consolidated tools with clear, organized sections
- Uses **safe test data** (creates items in dedicated test list, no production data affected)
- Provides detailed output with color-coded results
- Includes success/failure counts per group
- Automatically cleans up test data after completion
- Tests backward compatibility with old tool names
- Includes error handling and detailed logging

## Prerequisites

1. **Node.js** (v18.0.0 or later)
2. **ClickUp API Key** configured in `.env`
3. **Test List** created in ClickUp named `MCP_AUTOMATED_TESTS`
4. **TEST_LIST_ID** environment variable set (optional but recommended)

## Setup

### 1. Environment Configuration

Create or update your `.env` file:

```bash
CLICKUP_API_KEY=your_clickup_api_key_here
TEST_LIST_ID=your_test_list_id_here
```

### 2. Create Test List

In ClickUp:
1. Create a new list named `MCP_AUTOMATED_TESTS` in your preferred space
2. Copy the list ID from the URL or API response
3. Add it to your `.env` as `TEST_LIST_ID`

### 3. Build the Project

Before running tests, ensure the project is built:

```bash
npm run build
```

## Running Tests

### Basic Usage

```bash
node test-all-consolidated-tools.js
```

### Expected Output

The test suite produces color-coded output with clear sections for each tool group:

```
╔════════════════════════════════════════════════════════════════╗
║           ClickUp MCP Consolidated Tools Test Suite            ║
╚════════════════════════════════════════════════════════════════╝

======================================================================
Testing: Workspace Tools (Read-Only)
======================================================================
  ✅ Get workspace hierarchy
  Results: 1/1 passed (100%)

======================================================================
Testing: Task Tools
======================================================================
  ✅ Create task
  ✅ Search tasks in list
  ✅ Update task
  ✅ Create task comment
  ✅ Get task comments
  ✅ Get task time entries
  ✅ Delete task
  Results: 7/7 passed (100%)

... [more tool groups] ...

======================================================================
FINAL TEST REPORT
======================================================================

Workspace:
  1/1 passed (100%)

Tasks:
  7/7 passed (100%)

... [all groups] ...

======================================================================
Total Tests: 25
Passed: 23
Failed: 2
Pass Rate: 92%
======================================================================

✨ All tests passed! ✨
```

## Test Coverage

The test suite covers the following tool groups:

### 1. **Workspace Tools** (Read-Only)
- `get_workspace_hierarchy` - Retrieves workspace structure

### 2. **Task Tools**
- `manage_task` - Create, update, delete tasks
- `search_tasks` - Search and retrieve tasks
- `task_comments` - Create and list task comments
- `task_time_tracking` - Get time tracking entries

### 3. **Container Tools**
- `manage_container` - Create, update, delete lists/folders
- `get_container` - Retrieve list/folder details

### 4. **Member Tools**
- `find_members` - Find members, resolve assignees, list members

### 5. **Tag Tools**
- `manage_tags` - List, create, update, delete tags (space scope)
- Task tag operations (add/remove tags from tasks)

### 6. **Document Tools**
- `manage_document` - Create, update, delete documents
- `manage_document_page` - Create, update, list document pages
- `list_documents` - List documents in a space

### 7. **Backward Compatibility**
- Verifies consolidated tools exist and are accessible
- Ensures new consolidated interface works correctly

## Safety Features

### Data Protection

1. **Isolated Test List**: All write operations target a dedicated `MCP_AUTOMATED_TESTS` list
2. **No Production Data**: Read-only operations on workspace and member data
3. **Automatic Cleanup**: All created items are deleted after tests complete
4. **Error Handling**: Tests catch and log errors without affecting other tests

### Cleanup Verification

The test suite maintains a `testState.createdItems` object that tracks:
- Created task IDs
- Created document IDs
- Created tag names

After all tests complete, these items are automatically deleted with error handling.

## Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLICKUP_API_KEY` | ClickUp API authentication key | Yes | - |
| `TEST_LIST_ID` | ID of test list for safe operations | No | From .env or manual setup |

### Test Parameters

Modify test list and space IDs in the test file:

```javascript
const testState = {
  testListId: null,
  testListName: 'MCP_AUTOMATED_TESTS',
  testSpaceId: null,
  // ...
};
```

## Interpreting Results

### Color Coding

- **Green**: Tests passed
- **Yellow**: Tests passed with warnings or some failures
- **Red**: Tests failed

### Pass Rate Calculation

```
Pass Rate = (Passed Tests / Total Tests) × 100
```

### Failed Test Details

Failed tests are listed in the final report with error messages:

```
Tasks:
  7/10 passed (70%)
    - Create task: Connection timeout
    - Update task: Invalid task ID
```

## Troubleshooting

### "TEST_LIST_ID not configured"

**Problem**: Tests skip when TEST_LIST_ID is not set

**Solution**:
1. Create a test list in ClickUp
2. Get its ID from the URL or API
3. Add to `.env`: `TEST_LIST_ID=your_id_here`

### "Workspace space not available"

**Problem**: Container and tag tests are skipped

**Solution**:
1. Ensure you have at least one space in your workspace
2. Verify API key has workspace access
3. Check network connectivity

### Tests timeout

**Problem**: Tests hang or timeout

**Solution**:
1. Check network connectivity
2. Verify API key is valid and has required permissions
3. Check ClickUp API status at [status.clickup.com](https://status.clickup.com)
4. Increase timeout values in test file if needed

### "Permission denied" errors

**Problem**: Tests fail with permission errors

**Solution**:
1. Verify API key has required scopes:
   - Read workspace/spaces
   - Manage tasks (create/update/delete)
   - Manage lists/folders
   - Manage documents
   - Manage tags
2. Check team/space permissions
3. Ensure user role allows these operations

## Extending the Tests

### Adding New Test Cases

1. Create a new test function following the pattern:

```javascript
async function testNewTool() {
  logSection('New Tool');
  const groupName = 'NewTool';

  try {
    // Test logic
    try {
      const result = await handleSomething(params);
      const passed = result && result.id;
      logTest('Test description', passed);
      recordTest(groupName, 'Test description', passed);
    } catch (error) {
      logTest('Test description', false, error.message);
      recordTest(groupName, 'Test description', false, error.message);
    }
  } catch (error) {
    log(`Tests failed: ${error.message}`, 'red');
  }

  logTestGroup(groupName, results.groups[groupName].passed, results.groups[groupName].failed);
}
```

2. Call in `runAllTests()`:

```javascript
await testNewTool();
```

### Customizing Output

Modify color codes in the colors object:

```javascript
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  // Add custom colors
  purple: '\x1b[35m',
};
```

## Performance Considerations

- Tests include `delay(500)` between operations for API rate limiting
- Parallel execution is avoided to ensure data consistency
- Each test group waits for completion before the next
- Cleanup runs sequentially to avoid conflicts

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Run MCP Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: node test-all-consolidated-tools.js
        env:
          CLICKUP_API_KEY: ${{ secrets.CLICKUP_API_KEY }}
          TEST_LIST_ID: ${{ secrets.TEST_LIST_ID }}
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

## Support

For issues or questions:

1. Check test output for specific error messages
2. Review `.env` configuration
3. Verify ClickUp API permissions
4. Check network connectivity
5. Review ClickUp API documentation at [docs.clickup.com](https://docs.clickup.com)

## File Structure

```
project/
├── test-all-consolidated-tools.js    # Main test suite
├── TEST_GUIDE.md                      # This file
├── .env                               # Configuration (with CLICKUP_API_KEY)
├── src/
│   ├── tools/
│   │   ├── task/consolidated-handlers.js
│   │   ├── container-handlers.ts
│   │   ├── member-tools.ts
│   │   ├── tag-tools.ts
│   │   ├── document-tools.ts
│   │   └── workspace.ts
│   └── services/
│       └── clickup/
│           ├── task/
│           └── ...
└── build/                             # Compiled output
    └── ...
```

## Notes

- Tests use direct tool invocation (bypasses MCP protocol layer)
- This allows for rapid iteration and precise debugging
- Protocol-level testing should be done separately with MCP clients
- Test data is created in UTC timestamps for uniqueness
- Cleanup operations have error handling to prevent failures mid-cleanup

## License

SPDX-License-Identifier: MIT

Copyright © 2025 Talib Kareem <taazkareem@icloud.com>
