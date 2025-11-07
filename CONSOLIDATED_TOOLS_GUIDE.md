# Consolidated Task Tools - Quick Reference Guide

## The 4 Consolidated Tools

### 1. manage_task
**Actions:** create | update | delete | move | duplicate

```typescript
// Create task
{
  action: "create",
  name: "🎯 Task name",
  listId: "list-id",
  priority: 1,                    // 1=urgent, 2=high, 3=normal, 4=low
  dueDate: "tomorrow",            // or Unix timestamp in ms
  assignees: ["user@email.com"],
  tags: ["tag1"],
  custom_fields: [{id, value}]
}

// Update task
{
  action: "update",
  taskId: "task-id",              // or taskName + listName, or customTaskId
  status: "In Progress",
  priority: 2,
  dueDate: "next friday"
}

// Delete
{
  action: "delete",
  taskId: "task-id"
}

// Move to another list
{
  action: "move",
  taskId: "task-id",
  targetListId: "new-list-id"     // or targetListName
}

// Duplicate
{
  action: "duplicate",
  taskId: "task-id",
  targetListId: "new-list-id"     // optional, defaults to same list
}
```

---

### 2. search_tasks
**Search modes:** single task | list-based | workspace-wide

```typescript
// Get single task
{
  taskId: "task-id",              // or taskName, or customTaskId
  detail_level: "standard",       // minimal | standard | detailed
  fields: ["id", "name", "status"] // optional, overrides detail_level
}

// Get all tasks in a list
{
  listId: "list-id",              // or listName
  offset: 0,
  limit: 50,
  order_by: "due_date",
  reverse: false,
  detail_level: "minimal"
}

// Search workspace
{
  list_ids: ["list-1", "list-2"],
  tags: ["bug"],                  // all tags must match
  statuses: ["Open"],
  assignees: ["user@email.com"],
  due_date_gt: "today",
  due_date_lt: "next week",
  detail_level: "standard"
}

// Filter options (all optional, any can combine)
{
  folder_ids: ["folder-1"],
  space_ids: ["space-1"],
  date_created_gt: "last month",
  date_updated_lt: "today",
  custom_fields: [{id, value}]
}
```

---

### 3. task_comments
**Actions:** get | create

```typescript
// Get comments
{
  action: "get",
  taskId: "task-id",              // or taskName + listName
  start: "timestamp-or-id"        // optional pagination
}

// Create comment
{
  action: "create",
  taskId: "task-id",
  commentText: "Comment with @mentions",
  notifyAll: true,                // notify all assignees
  assignee: "user@email.com"      // optional: assign to user
}
```

---

### 4. task_time_tracking
**Actions:** get_entries | start | stop | add_entry | delete_entry | get_current

```typescript
// Get time entries
{
  action: "get_entries",
  taskId: "task-id",
  startDate: "last week",         // optional filter
  endDate: "today"
}

// Start timer
{
  action: "start",
  taskId: "task-id",
  description: "Working on feature",
  billable: true,
  tags: ["client-work"]
}

// Stop timer
{
  action: "stop",
  description: "Finished feature",  // optional update
  tags: ["completed"]
}

// Add manual entry
{
  action: "add_entry",
  taskId: "task-id",
  start: "2 hours ago",           // or Unix timestamp
  duration: "1h 30m",             // or "90m" or 5400000 (ms)
  billable: false,
  tags: ["offline-work"]
}

// Delete entry
{
  action: "delete_entry",
  timeEntryId: "entry-id"
}

// Get running timer
{
  action: "get_current"           // no other params needed
}
```

---

### 5. attach_file_to_task
**Simple file attachment**

```typescript
{
  taskId: "task-id",              // or taskName + listName
  attachmentUrl: "https://example.com/file.pdf"
}
```

---

## Key Features

### Task Identification (Flexible)
Use any of these to identify a task:
```
taskId: "abc123def45"              // Preferred: fastest lookup
taskName: "Build feature"          // Slower: searches for match
customTaskId: "DEV-123"            // For custom ID patterns
taskName + listName                // Recommended combination
```

### Date Support (Natural Language)
All date fields accept:
```
"tomorrow"
"next friday"
"yesterday"
"last week"
"2 hours ago"
"start of today"
"end of month"
1730000000000                      // Unix timestamp in ms
```

### Priority Enum
```
1 = Urgent (highest)
2 = High
3 = Normal (default)
4 = Low (lowest)
```

### Detail Levels
- **minimal** - Only essential fields (id, name, status)
- **standard** - Common fields (default, includes assignees, dates, tags)
- **detailed** - All available fields

### Duration Formats
```
"1h 30m"              // 1 hour 30 minutes
"90m"                 // 90 minutes
"1.5h"                // 1.5 hours
5400000               // milliseconds
```

---

## Common Use Cases

### Create and assign task
```json
{
  "tool": "manage_task",
  "params": {
    "action": "create",
    "name": "🐛 Fix login bug",
    "listId": "todo",
    "priority": 1,
    "assignees": ["john@example.com"],
    "tags": ["bug", "urgent"],
    "dueDate": "tomorrow"
  }
}
```

### Find overdue tasks
```json
{
  "tool": "search_tasks",
  "params": {
    "list_ids": ["list-1", "list-2"],
    "statuses": ["Open", "In Progress"],
    "due_date_lt": "today",
    "detail_level": "standard"
  }
}
```

### Update and move task
```json
{
  "tool": "manage_task",
  "params": {
    "action": "move",
    "taskName": "Completed feature",
    "targetListName": "Done"
  }
}
```

### Log time
```json
{
  "tool": "task_time_tracking",
  "params": {
    "action": "add_entry",
    "taskName": "Build API",
    "start": "yesterday 2pm",
    "duration": "3h",
    "billable": true
  }
}
```

### Get all team's tasks
```json
{
  "tool": "search_tasks",
  "params": {
    "folder_ids": ["team-folder"],
    "assignees": ["john@example.com", "jane@example.com"],
    "detail_level": "minimal"
  }
}
```

---

## Parameter Validation

### Required by Action

**manage_task:**
- All actions: `action` (required)
- create: `name` + (`listId` OR `listName`)
- update/delete/move/duplicate: `taskId` OR `taskName` OR `customTaskId`
- move/duplicate: target list required

**search_tasks:**
- Single task: `taskId` OR `taskName` OR `customTaskId`
- List search: `listId` OR `listName`
- Workspace search: at least one of `list_ids`, `folder_ids`, `space_ids`, or filter

**task_comments:**
- All actions: `action` + task identification
- create: `commentText` required

**task_time_tracking:**
- get_entries: task identification required
- start/add_entry: task identification required
- add_entry: `start` + `duration` required
- delete_entry: `timeEntryId` required
- stop/get_current: no extra params

---

## Response Format

### Standard Response
```json
{
  "data": [
    {
      "id": "task-id",
      "name": "Task name",
      "status": "Open",
      "list": { "id": "list-id", "name": "Todo" }
      // ... more fields based on detail_level
    }
  ],
  "metadata": {
    "estimatedTokens": 500,
    "detailLevel": "standard",
    "pagination": {
      "offset": 0,
      "limit": 50,
      "total": 150,
      "hasMore": true
    }
  }
}
```

### Error Response
```json
{
  "error": "Task identification required: provide taskId, taskName, or customTaskId",
  "suggestions": [
    "Use taskId if available from previous response",
    "Provide taskName with listName for better performance",
    "Use customTaskId for custom task ID patterns"
  ]
}
```

---

## Token Efficiency

### Response Control
```json
{
  // Minimal response for lists
  "detail_level": "minimal"  // ~50-100 tokens per task

  // Standard response (default)
  "detail_level": "standard" // ~200-300 tokens per task

  // Full response
  "detail_level": "detailed" // ~500-1000 tokens per task
}
```

### Field Selection
```json
{
  // Only get essential fields
  "fields": ["id", "name", "status", "due_date"]  // ~100 tokens per task
}
```

### Pagination
```json
{
  "offset": 0,
  "limit": 50  // Default pagination to manage large datasets
}
```

---

## Migration from Old Tools

| Old Tool | New Tool | Action |
|----------|----------|--------|
| create_task | manage_task | create |
| update_task | manage_task | update |
| delete_task | manage_task | delete |
| move_task | manage_task | move |
| duplicate_task | manage_task | duplicate |
| get_task | search_tasks | (taskId/taskName) |
| get_tasks | search_tasks | (listId/listName) |
| get_workspace_tasks | search_tasks | (list_ids/filters) |
| get_task_comments | task_comments | get |
| create_task_comment | task_comments | create |
| get_task_time_entries | task_time_tracking | get_entries |
| start_time_tracking | task_time_tracking | start |
| stop_time_tracking | task_time_tracking | stop |
| add_time_entry | task_time_tracking | add_entry |
| delete_time_entry | task_time_tracking | delete_entry |
| get_current_time_entry | task_time_tracking | get_current |
| attach_task_file | attach_file_to_task | (direct call) |

---

## Implementation Files

1. **src/tools/task/consolidated-tools.ts** (466 lines)
   - Tool definitions with InputSchema
   - AI-first descriptions
   - Enum values for priority and actions

2. **src/tools/task/consolidated-handlers.ts** (462 lines)
   - 5 main action handlers
   - Unified router function
   - Exports handler map for registration

---

## See Also

- `CONSOLIDATION_MAPPING.md` - Detailed mapping and design rationale
- `src/utils/response-formatter.ts` - Detail level and field filtering
- `src/tools/task/handlers.ts` - Original handler implementations
- `mcpguide.md` - MCP design principles
