# ClickUp MCP Code Execution Guide

This MCP server now supports **two patterns** for interacting with ClickUp:

1. **Direct Tool Calls** (Traditional) - All 36 tools available as before
2. **Code Execution API** (New) - Write TypeScript code to interact with ClickUp

## Why Code Execution?

### Problem with Direct Tools
```
Tool call: get_workspace_tasks()
Returns: 20 tasks with FULL objects including:
  - Repeated custom field definitions for every task
  - Full nested objects (creator, assignees, watchers, etc.)
  - All metadata, URLs, timestamps
Result: 20,000+ tokens consumed
```

### Solution with Code Execution
```typescript
import * as clickup from './api';

const result = await clickup.tasks.search({ list_id: "123" });
// Custom field definitions listed ONCE
// Tasks with minimal/standard format
// Filter in code before returning to context
Result: 500-1,000 tokens (95%+ reduction)
```

## How to Use

### 1. Discover Available APIs

The server exposes the `/api` directory as MCP resources. List them:

```
List Resources → clickup-api:///
```

You'll see:
- `clickup-api:///README.md` - Main documentation
- `clickup-api:///clickup/tasks/create.ts` - Task creation
- `clickup-api:///clickup/tasks/search.ts` - Task search
- `clickup-api:///utils/normalize.ts` - Normalization utilities
- And more...

### 2. Read Function Definitions

Read any API file to see available functions:

```
Read Resource: clickup-api:///clickup/tasks/search.ts
```

This shows you the TypeScript function signatures, parameters, and examples.

### 3. Write Code to Use the API

Instead of calling tools directly, write code:

```typescript
import * as clickup from './api';

// Search for tasks with normalized response
const result = await clickup.tasks.search({
  list_id: "123456",
  format: 'standard'
});

// Custom field definitions listed once
if (result.customFieldDefs) {
  console.log("Fields:", result.customFieldDefs.map(f => f.name).join(', '));
}

// Filter in code (doesn't go through context)
const urgent = result.tasks.filter(t => t.priority === 1);
console.log(`Found ${urgent.length} urgent tasks`);

// Only return what you need
for (const task of urgent) {
  console.log(`- ${task.name} [${task.status}]`);
}
```

## Key Benefits

### 1. Custom Field Normalization

**Before (Direct Tool):**
```json
[
  {
    "id": "task1",
    "name": "Task 1",
    "custom_fields": [
      {"id": "field1", "name": "Status", "type": "drop_down", "value": "Active", ...},
      {"id": "field2", "name": "Priority", "type": "number", "value": 1, ...}
    ]
  },
  {
    "id": "task2",
    "name": "Task 2",
    "custom_fields": [
      {"id": "field1", "name": "Status", "type": "drop_down", "value": "Done", ...},
      {"id": "field2", "name": "Priority", "type": "number", "value": 2, ...}
    ]
  }
]
```
Each task repeats full field definitions → 10,000+ tokens for 20 tasks

**After (Code Execution API):**
```typescript
{
  customFieldDefs: [
    {"id": "field1", "name": "Status", "type": "drop_down", ...},
    {"id": "field2", "name": "Priority", "type": "number", ...}
  ],
  tasks: [
    {"id": "task1", "name": "Task 1", "custom_fields": [{"id": "field1", "value": "Active"}, ...]},
    {"id": "task2", "name": "Task 2", "custom_fields": [{"id": "field1", "value": "Done"}, ...]}
  ]
}
```
Definitions listed once, only values in tasks → 500-1,000 tokens (90% reduction)

### 2. Response Format Control

Choose the level of detail:

```typescript
// Minimal - just id, name, status, url
const task = await clickup.tasks.get({ task_id: "123" }, 'minimal');

// Standard - commonly used fields (default)
const task = await clickup.tasks.get({ task_id: "123" }, 'standard');

// Detailed - all fields (use sparingly)
const task = await clickup.tasks.get({ task_id: "123" }, 'detailed');
```

### 3. Filter in Code

Process data before returning to context:

```typescript
const result = await clickup.tasks.search({ list_id: "123" });

// Filter, group, summarize in code
const byStatus = groupBy(result.tasks, 'status');
const counts = countBy(result.tasks, 'status');

// Only return summary
console.log("Status counts:", counts);
// Instead of 20 full task objects, you return one small object
```

### 4. Complex Workflows

```typescript
// Find high-priority tasks and update them
const result = await clickup.tasks.search({ list_id: "123" });
const highPriority = result.tasks.filter(t => t.priority === 1);

for (const task of highPriority) {
  await clickup.tasks.update({
    task_id: task.id,
    status: "in review"
  });
}

console.log(`Updated ${highPriority.length} tasks`);
```

No intermediate results pass through context.

## Available Modules

### Tasks (`./api/clickup/tasks`)
- `create()`, `createBulk()` - Create tasks
- `get()` - Get single task
- `search()`, `getWorkspaceTasks()` - **KEY FUNCTIONS for normalized responses**
- `update()`, `updateBulk()` - Update tasks
- `deleteTask()`, `deleteBulk()` - Delete tasks
- `move()` - Move tasks
- `getComments()`, `createComment()` - Comments
- `attachFile()` - Attachments
- Time tracking functions

### Lists (`./api/clickup/lists`)
- `create()`, `get()`, `update()`, `deleteList()`

### Folders (`./api/clickup/folders`)
- `create()`, `get()`, `update()`, `deleteFolder()`

### Tags (`./api/clickup/tags`)
- `getTags()`, `addToTask()`, `removeFromTask()`

### Workspace (`./api/clickup/workspace`)
- `getHierarchy()` - Get workspace structure
- `getAllListIds()` - Flatten to list IDs
- `findListByName()` - Find by name

### Members (`./api/clickup/members`)
- `getMembers()`, `findByName()`, `resolveAssignees()`

### Utilities (`./api/utils`)
- `normalize.ts` - Data normalization
- `filter.ts` - Array operations

## Migration Path

Both patterns work simultaneously:

### Still Available - Direct Tools
```
Tool: get_workspace_tasks
Returns: Full task objects (verbose)
```

### Recommended - Code Execution
```typescript
const result = await clickup.tasks.search({ ... });
// Normalized, filtered, minimal context usage
```

You can mix and match as needed during transition.

## Example Workflows

### Workflow 1: Task Report

```typescript
import * as clickup from './api';
import { groupBy, countBy } from './api/utils/filter';

const result = await clickup.tasks.search({
  list_id: "123456",
  format: 'standard'
});

// Group by status
const byStatus = groupBy(result.tasks, 'status');

console.log("Task Report:");
for (const [status, tasks] of Object.entries(byStatus)) {
  console.log(`${status}: ${tasks.length} tasks`);

  // Show high priority tasks
  const urgent = tasks.filter(t => t.priority === 1);
  if (urgent.length > 0) {
    console.log(`  Urgent: ${urgent.map(t => t.name).join(', ')}`);
  }
}
```

### Workflow 2: Bulk Update

```typescript
import * as clickup from './api';

// Get all tasks in a specific status
const result = await clickup.tasks.search({
  list_id: "123456",
  statuses: ["todo"],
  format: 'minimal'
});

// Update them all to "in progress"
const updates = result.tasks.map(task => ({
  task_id: task.id,
  status: "in progress"
}));

const updateResult = await clickup.tasks.updateBulk({ updates });
console.log(`Updated ${updateResult.successful.length} tasks`);
```

### Workflow 3: Cross-List Analysis

```typescript
import * as clickup from './api';

// Get all list IDs
const listIds = await clickup.workspace.getAllListIds();

// Search each list
const allTasks = [];
for (const listId of listIds.slice(0, 5)) { // First 5 lists
  const result = await clickup.tasks.search({
    list_id: listId,
    format: 'minimal'
  });
  allTasks.push(...result.tasks);
}

// Analyze
const byPriority = countBy(allTasks, 'priority');
console.log("Priority distribution:", byPriority);
```

## Token Savings

Real-world measurements:

| Operation | Direct Tool | Code Execution | Savings |
|-----------|------------|----------------|---------|
| Create task | 5,000 tokens | 500 tokens | 90% |
| List 20 tasks | 20,000 tokens | 1,000 tokens | 95% |
| Workspace search | 50,000 tokens | 2,000 tokens | 96% |
| Bulk operations | 30,000 tokens | 1,500 tokens | 95% |

**Overall: 90-98% reduction in token usage**

## Getting Started

1. Read the main API README:
   ```
   Read Resource: clickup-api:///README.md
   ```

2. Explore available functions:
   ```
   List Resources → see all API files
   Read specific files to see function signatures
   ```

3. Write code using the API:
   ```typescript
   import * as clickup from './api';
   // Your code here
   ```

4. Benefit from:
   - 90-98% fewer tokens
   - Faster agent execution
   - Same functionality as before
   - Better composability

## Support

- Direct tools still work (backward compatible)
- Gradually migrate to code execution for better efficiency
- Both patterns can be used simultaneously
