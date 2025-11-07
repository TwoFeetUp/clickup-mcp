# Test Suite Architecture and Design

Technical documentation for the `test-all-consolidated-tools.js` test framework.

## Overview

The test suite implements a comprehensive testing framework for all consolidated ClickUp MCP tools using **direct tool invocation** instead of the MCP protocol layer.

### Why Direct Invocation?

Direct invocation means:
- Calling handler functions directly from Node.js
- Bypassing JSON-RPC serialization/deserialization
- Accessing raw tool output for precise validation
- Faster iteration and debugging

Flow comparison:

```
Traditional MCP:
Client → JSON-RPC → Server → Handler → JSON-RPC → Response

Direct Testing:
Test Script → Handler Function → Raw Result
```

## Architecture

### Module Structure

```
test-all-consolidated-tools.js
├── Configuration
│   ├── Colors and styling
│   ├── Test state management
│   └── Results tracking
├── Utility Functions
│   ├── Logging (colored output)
│   ├── Test recording
│   └── Delay/async helpers
├── Setup Functions
│   ├── setupTestList()
│   └── getWorkspaceInfo()
├── Test Suites (7 groups)
│   ├── testWorkspaceTools()
│   ├── testTaskTools()
│   ├── testContainerTools()
│   ├── testMemberTools()
│   ├── testTagTools()
│   ├── testDocumentTools()
│   └── testBackwardCompatibility()
├── Cleanup and Reporting
│   ├── cleanupTestData()
│   └── printFinalReport()
└── Main Runner
    └── runAllTests()
```

## Test State Management

### State Object

```javascript
const testState = {
  testListId: null,              // Target list for write operations
  testListName: 'MCP_AUTOMATED_TESTS',
  testSpaceId: null,             // Workspace space ID
  createdItems: {
    tasks: [],                   // Track created task IDs
    documents: [],               // Track created document IDs
    tags: []                      // Track created tag names
  }
};
```

### Results Tracking

```javascript
const results = {
  groups: {
    'GroupName': {
      passed: 0,
      failed: 0,
      tests: [
        {
          name: 'Test name',
          passed: true/false,
          error: 'Optional error message'
        }
      ]
    }
  },
  totalTests: 0,
  totalPassed: 0,
  totalFailed: 0
};
```

## Handler Imports

The test suite imports handlers directly:

```javascript
// Task handlers
import {
  handleManageTask,
  handleSearchTasks,
  handleTaskComments,
  handleTaskTimeTracking,
  handleAttachFileToTaskConsolidated
} from './src/tools/task/consolidated-handlers.js';

// Container handlers
import {
  handleManageContainer,
  handleGetContainer
} from './src/tools/container-handlers.js';

// Other handlers
import { handleFindMembers } from './src/tools/member-tools.js';
import { handleManageTags } from './src/tools/tag-tools.js';
import { handleManageDocument, ... } from './src/tools/document-tools.js';
import { handleGetWorkspaceHierarchy } from './src/tools/workspace.js';
```

These are ES module imports, so the test file must be run with Node.js ES module support.

## Test Structure Pattern

Each test suite follows a consistent pattern:

```javascript
async function testToolGroup() {
  logSection('Tool Group Name');
  const groupName = 'ToolGroup';

  try {
    // Test 1: Basic operation
    try {
      const result = await handleSomething(params);
      const passed = result && result.expectedField;
      logTest('Test description', passed);
      recordTest(groupName, 'Test description', passed);
    } catch (error) {
      logTest('Test description', false, error.message);
      recordTest(groupName, 'Test description', false, error.message);
    }

    await delay(500); // API rate limiting

    // Test 2: Complex operation
    // ... similar pattern

  } catch (error) {
    log(`Tests failed: ${error.message}`, 'red');
  }

  logTestGroup(groupName, results.groups[groupName].passed, results.groups[groupName].failed);
}
```

### Key Elements

1. **logSection()** - Print section header
2. **try/catch** - Wraps entire suite for fatal error handling
3. **Inner try/catch** - Catches individual test errors
4. **delay(500)** - Respects API rate limits
5. **logTest()** - Print test result
6. **recordTest()** - Track result in results object
7. **logTestGroup()** - Print group summary

## Safety Mechanisms

### 1. Isolated Test Environment

```javascript
// All writes target this list only
const testListId = process.env.TEST_LIST_ID;

// Never touches existing data
const operations = ['create', 'update', 'delete'];
// Only on test list items
```

### 2. Item Tracking

```javascript
// Create
const result = await handleManageTask({ ... });
testState.createdItems.tasks.push(result.id);

// Cleanup
for (const taskId of testState.createdItems.tasks) {
  await handleManageTask({ action: 'delete', taskId });
}
```

### 3. Error Handling

```javascript
// Individual test errors don't stop suite
try {
  const result = await operation();
  recordTest(group, 'Test', true);
} catch (error) {
  recordTest(group, 'Test', false, error.message);
}

// Suite continues even if one test fails
await testTaskTools();      // Continue even if fails
await testContainerTools(); // Still runs
```

### 4. Graceful Degradation

```javascript
// Skip tests if prerequisites missing
if (!testState.testListId) {
  log('Skipping task tests - TEST_LIST_ID not configured', 'yellow');
  return;
}

// Continue with other tests
await testContainerTools(); // Still runs
```

## Test Parameters

### Task Operations

```javascript
// Create
{
  action: 'create',
  listId: testState.testListId,
  title: 'MCP Test Task - ' + Date.now(),
  description: 'Test task from automated suite',
  priority: 2
}

// Update
{
  action: 'update',
  taskId: createdTaskId,
  title: 'Updated - ' + Date.now()
}

// Delete
{
  action: 'delete',
  taskId: createdTaskId
}
```

### Container Operations

```javascript
// Create list
{
  type: 'list',
  action: 'create',
  spaceId: testState.testSpaceId,
  name: 'MCP Test List - ' + Date.now()
}

// Get container
{
  type: 'list',
  id: createdListId
}
```

### Tag Operations

```javascript
// Create
{
  scope: 'space',
  action: 'create',
  spaceId: testState.testSpaceId,
  tagName: 'mcp-test-' + Date.now(),
  tagBg: '#FF6B6B'
}

// Delete
{
  scope: 'space',
  action: 'delete',
  spaceId: testState.testSpaceId,
  tagName: createdTagName
}
```

## Output Formatting

### Color Codes

```javascript
const colors = {
  reset: '\x1b[0m',    // Reset all formatting
  green: '\x1b[32m',   // Success
  red: '\x1b[31m',     // Error
  yellow: '\x1b[33m',  // Warning
  blue: '\x1b[34m',    // Heading
  cyan: '\x1b[36m',    // Section title
  gray: '\x1b[90m'     // Metadata
};
```

### Log Functions

| Function | Usage | Color |
|----------|-------|-------|
| `log(msg, 'cyan')` | Section headers | Cyan |
| `logTest(name, passed)` | Individual test result | Green/Red |
| `logTestGroup(name, p, f)` | Group summary | Green/Yellow/Red |
| `logSection(title)` | Suite header | Cyan |

### Example Output

```
╔════════════════════════════════════════════════════════════════╗
║           ClickUp MCP Consolidated Tools Test Suite            ║
╚════════════════════════════════════════════════════════════════╝

======================================================================
Testing: Task Tools                                                  ← Section (cyan)
======================================================================
  ✅ Create task                                                    ← Passed test (green)
  ✅ Search tasks in list
  ✅ Update task
  ✅ Create task comment
  ✅ Get task comments
  ✅ Get task time entries
  ❌ Start time tracking - Timeout error                           ← Failed test (red)
  Results: 6/7 passed (86%)                                         ← Summary (yellow)
```

## Test Execution Flow

```
1. runAllTests()
   │
   ├─→ setupTestList()        # Configure test environment
   │
   ├─→ getWorkspaceInfo()     # Get workspace space ID
   │
   ├─→ testWorkspaceTools()   # Read-only tests
   │
   ├─→ testMemberTools()      # Member lookup tests
   │
   ├─→ testTaskTools()        # Task CRUD tests
   │   ├─→ Create task
   │   ├─→ Search tasks
   │   ├─→ Update task
   │   ├─→ Create comment
   │   ├─→ Get comments
   │   ├─→ Get time entries
   │   └─→ Delete task
   │
   ├─→ testContainerTools()   # List/folder tests
   │   ├─→ Create list
   │   ├─→ Get list
   │   ├─→ Update list
   │   └─→ Delete list
   │
   ├─→ testTagTools()         # Tag management tests
   │
   ├─→ testDocumentTools()    # Document CRUD tests
   │
   ├─→ testBackwardCompatibility() # Compatibility checks
   │
   ├─→ cleanupTestData()      # Delete all created items
   │
   └─→ printFinalReport()     # Summary and exit
```

## Data Cleanup Strategy

### Cleanup Order

1. **Tasks first** - Clean up in reverse creation order
2. **Documents second** - Clean up in reverse creation order
3. **Tags last** - Clean up in reverse creation order

### Error Handling

```javascript
for (const taskId of testState.createdItems.tasks) {
  try {
    await handleManageTask({ action: 'delete', taskId });
    log(`Deleted test task: ${taskId}`, 'gray');
  } catch (error) {
    // Log warning but continue cleanup
    log(`Failed to delete task: ${error.message}`, 'yellow');
  }
  await delay(300); // Space out requests
}
```

### Cleanup Verification

- Uses timestamps (`Date.now()`) for unique names
- Tracks all created items in `testState.createdItems`
- Verifies deletion by removing from array
- Logs each cleanup operation for debugging

## Environment Setup

### Required Variables

```bash
CLICKUP_API_KEY=pk_xxx...  # ClickUp API authentication key
TEST_LIST_ID=xyz...         # (Optional) Test list ID for write operations
```

### Auto-Detection

```javascript
const testListId = process.env.TEST_LIST_ID;
if (testListId) {
  testState.testListId = testListId;
  log(`Using configured test list: ${testListId}`, 'green');
} else {
  log('WARNING: TEST_LIST_ID not configured', 'yellow');
}
```

## Error Categories

### Setup Errors

- Missing API key
- Invalid API key
- No workspace/space available
- Test list not found

### Test Errors

- Connection failures
- Permission denied
- Invalid parameters
- Timeout errors
- Missing required fields

### Cleanup Errors

- Item already deleted
- Permission denied
- Concurrent modification
- Network timeout

## Performance Characteristics

### Timing

- Total runtime: 2-5 minutes (depends on API response times)
- Per-test overhead: ~0.5 seconds (rate limiting delay)
- Network calls: ~25-30 requests (depends on test count)

### Rate Limiting

```javascript
// 500ms delay between operations
await delay(500);

// 300ms delay during cleanup
await delay(300);
```

### API Call Count

| Operation | API Calls |
|-----------|-----------|
| Get workspace | 1 |
| List members | 1 |
| Create task | 1 |
| Search tasks | 1 |
| Update task | 1 |
| Create comment | 1 |
| Get comments | 1 |
| Delete task | 1 |
| **Per-test total** | ~8-10 |
| **Full suite** | ~25-30 |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |
| 2 | Fatal error (uncaught exception) |

## Extending the Framework

### Adding a New Test Suite

```javascript
async function testNewTools() {
  logSection('New Tools');
  const groupName = 'NewTools';

  try {
    // Test logic following the pattern above

  } catch (error) {
    log(`New tools tests failed: ${error.message}`, 'red');
  }

  logTestGroup(groupName, results.groups[groupName].passed, results.groups[groupName].failed);
}

// Add to runAllTests()
await testNewTools();
```

### Adding a New Test

```javascript
// Within a test suite
try {
  const result = await handleNewOperation(params);
  const passed = result && result.expectedField;
  logTest('New operation test', passed);
  recordTest(groupName, 'New operation test', passed);
} catch (error) {
  logTest('New operation test', false, error.message);
  recordTest(groupName, 'New operation test', false, error.message);
}
```

## Debugging

### Enable Verbose Logging

Add to test functions:

```javascript
const result = await handleSomething(params);
console.log('DEBUG:', JSON.stringify(result, null, 2)); // Raw output
logTest('Description', passed);
```

### Check Handler Directly

```javascript
// Test handler in isolation
import { handleManageTask } from './src/tools/task/consolidated-handlers.js';

const result = await handleManageTask({
  action: 'create',
  listId: 'test_list_id',
  title: 'Test'
});

console.log('Result:', result);
```

### Inspect Test State

```javascript
// At any point in tests
console.log('Test State:', testState);
console.log('Results:', results);
```

## Dependencies

The test suite uses:

1. **dotenv** - Environment variable loading
2. **Handler modules** - Direct imports of tool handlers
3. **ES Modules** - Native Node.js import/export

No additional testing frameworks (Jest, Mocha, etc.) are required.

## Best Practices

1. **Run after builds**: Always run `npm run build` first
2. **Test in isolation**: Run tests without other processes
3. **Check logs**: Review detailed error messages
4. **Monitor API**: Check ClickUp status during failures
5. **Use timestamps**: Unique test data helps debugging
6. **Keep records**: Log test runs for regression detection
7. **Extend carefully**: Follow existing patterns for new tests
8. **Document changes**: Update this file when modifying framework

## License

SPDX-License-Identifier: MIT
Copyright © 2025 Talib Kareem <taazkareem@icloud.com>
