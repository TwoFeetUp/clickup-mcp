# Task Tools Consolidation Mapping

## Overview

This document maps the original 19 task tools to 4 consolidated tools following MCP design principles.

**Files Created:**
- `src/tools/task/consolidated-tools.ts` (466 lines) - Tool definitions
- `src/tools/task/consolidated-handlers.ts` (462 lines) - Action-based handlers

## Consolidation Strategy

### Design Principles Applied

1. **Action-Based Routing** - Single tool with `action` enum parameter for related operations
2. **Token Efficiency** - Reduced overhead through consolidated definitions and normalization
3. **AI-First Descriptions** - Concise, intent-based descriptions focused on what the tool does
4. **Flexible Task Identification** - Support multiple identification methods (ID, name, custom ID)
5. **Detail Level Control** - Configurable response verbosity for token management
6. **Natural Language Dates** - Support for both Unix timestamps and natural language (e.g., "tomorrow", "next friday")

---

## Tool Consolidations

### 1. manage_task (replaces 5 tools)

**Consolidated from:**
- `create_task` → action: "create"
- `update_task` → action: "update"
- `delete_task` → action: "delete"
- `move_task` → action: "move"
- `duplicate_task` → action: "duplicate"

**Description:** Modify tasks with action-based routing. Single unified interface for task creation, modification, deletion, and movement.

**Key Features:**
- Flexible task identification: `taskId`, `taskName`, `customTaskId`
- Supports all task fields: status, priority, dates, assignees, custom fields, tags
- Natural language dates: "tomorrow", "next friday", "2 weeks from now"
- Priority as enum: 1=urgent, 2=high, 3=normal, 4=low
- Time estimates: "2h 30m", "150m", "2.5h"
- Custom field support with type-safe values

**Handler Routing:**
```typescript
switch (action) {
  case 'create':    → createTaskHandler()
  case 'update':    → updateTaskHandler()
  case 'delete':    → deleteTaskHandler()
  case 'move':      → moveTaskHandler()
  case 'duplicate': → duplicateTaskHandler()
}
```

**Example Usage:**
```json
{
  "action": "create",
  "name": "🎯 Implement authentication",
  "listId": "list-123",
  "priority": 1,
  "dueDate": "next friday",
  "assignees": ["john@example.com", 12345],
  "tags": ["backend", "security"]
}
```

---

### 2. search_tasks (replaces 3 tools)

**Consolidated from:**
- `get_task` → taskId/taskName lookup
- `get_tasks` → list-based search
- `get_workspace_tasks` → workspace-wide search with filters

**Description:** Search and retrieve tasks with rich filtering. Single query interface for single task, list-based, or workspace-wide searches.

**Key Features:**
- **Single task:** taskId, taskName, customTaskId
- **List search:** listId or listName
- **Workspace search:** list_ids, folder_ids, space_ids + filters
- **Rich filters:** tags, statuses, assignees, date ranges, custom fields
- **Pagination:** offset/limit with hasMore indicator
- **Response formatting:** detail_level (minimal/standard/detailed) + custom field selection
- **Date filtering:** Natural language support for all date fields

**Handler Routing:**
```typescript
if (taskId || taskName || customTaskId)
  → getTaskHandler()
else if (listId || listName)
  → getTasksHandler()
else if (list_ids || folder_ids || space_ids || filters)
  → getWorkspaceTasksHandler()
```

**Supported Filters:**
- Status: `statuses: ["Open", "In Progress"]`
- Tags: `tags: ["backend", "api"]`
- Assignees: `assignees: ["user@example.com", 12345]`
- Dates: `due_date_gt`, `due_date_lt`, `date_created_gt`, `date_updated_gt`
- Custom fields: `custom_fields: [{id: "field-id", value: "value"}]`

**Example Usage:**
```json
{
  "list_ids": ["list-1", "list-2"],
  "tags": ["bug"],
  "statuses": ["Open"],
  "due_date_lt": "tomorrow",
  "detail_level": "standard",
  "offset": 0,
  "limit": 50
}
```

---

### 3. task_comments (replaces 2 tools)

**Consolidated from:**
- `get_task_comments` → action: "get"
- `create_task_comment` → action: "create"

**Description:** Manage task comments with unified interface for retrieval and creation.

**Key Features:**
- Flexible task identification: taskId, taskName, customTaskId
- Get comments with optional start position
- Create comments with @ mentions and notify options
- Assignee and notification management

**Handler Routing:**
```typescript
switch (action) {
  case 'get':    → getTaskCommentsHandler()
  case 'create': → createTaskCommentHandler()
}
```

**Example Usage:**
```json
{
  "action": "create",
  "taskId": "task-123",
  "commentText": "Fixed in @john's PR #456",
  "notifyAll": true
}
```

---

### 4. task_time_tracking (replaces 5 tools)

**Consolidated from:**
- `get_task_time_entries` → action: "get_entries"
- `start_time_tracking` → action: "start"
- `stop_time_tracking` → action: "stop"
- `add_time_entry` → action: "add_entry"
- `delete_time_entry` → action: "delete_entry"
- `get_current_time_entry` → action: "get_current"

**Description:** Track time on tasks with unified interface for all time entry operations.

**Key Features:**
- Flexible task identification (not needed for stop/delete/get_current)
- Start/stop timer with optional description and tags
- Add manual entries with start time + duration
- Filter entries by date range (natural language support)
- Billable flag for time tracking
- Tag-based organization

**Handler Routing:**
```typescript
switch (action) {
  case 'get_entries': → handleGetTaskTimeEntries()
  case 'start':       → handleStartTimeTracking()
  case 'stop':        → handleStopTimeTracking()
  case 'add_entry':   → handleAddTimeEntry()
  case 'delete_entry':→ handleDeleteTimeEntry()
  case 'get_current': → handleGetCurrentTimeEntry()
}
```

**Duration Formats:** "1h 30m", "90m", "1.5h"

**Example Usage:**
```json
{
  "action": "add_entry",
  "taskId": "task-123",
  "start": "2 hours ago",
  "duration": "1h 30m",
  "billable": true,
  "tags": ["client-work"]
}
```

---

### 5. attach_file_to_task (kept as separate tool)

**Kept separate because:** File attachment is a distinct operation with clear, simple API

**Description:** Attach files to tasks. Supports URL attachments (links, images, documents).

**Features:**
- Flexible task identification: taskId, taskName, customTaskId
- URL attachment with validation
- Direct pass-through of attachment URLs

**Example Usage:**
```json
{
  "taskId": "task-123",
  "attachmentUrl": "https://example.com/document.pdf"
}
```

---

## Migration Guide

### For API Consumers

Old approach (19 separate tools):
```json
{
  "tool": "create_task",
  "params": { "name": "Task 1", "listId": "list-123" }
}
{
  "tool": "update_task",
  "params": { "taskId": "task-123", "status": "In Progress" }
}
{
  "tool": "delete_task",
  "params": { "taskId": "task-123" }
}
```

New approach (unified manage_task):
```json
{
  "tool": "manage_task",
  "params": {
    "action": "create",
    "name": "Task 1",
    "listId": "list-123"
  }
}
{
  "tool": "manage_task",
  "params": {
    "action": "update",
    "taskId": "task-123",
    "status": "In Progress"
  }
}
{
  "tool": "manage_task",
  "params": {
    "action": "delete",
    "taskId": "task-123"
  }
}
```

### Token Efficiency Benefits

1. **Reduced Context** - 4 tools instead of 19 means 75% fewer tool definitions to load
2. **Normalized Responses** - Common structure across related operations
3. **Detail Level Control** - Return only needed fields to reduce token usage
4. **Pagination** - Built-in offset/limit for large result sets

**Estimated Token Savings:**
- Tool definitions: ~15,000 tokens → ~3,000 tokens (80% reduction)
- Per operation: 5-10% average due to normalized structure

---

## Handler Implementation Details

### consolidated-handlers.ts Structure

```
handleManageTask()
├─ createTaskHandler()
├─ updateTaskHandler()
├─ deleteTaskHandler()
├─ moveTaskHandler()
└─ duplicateTaskHandler()

handleSearchTasks()
├─ getTaskHandler() [single task]
├─ getTasksHandler() [list]
└─ getWorkspaceTasksHandler() [workspace]

handleTaskComments()
├─ getTaskCommentsHandler()
└─ createTaskCommentHandler()

handleTaskTimeTracking()
├─ handleGetTaskTimeEntries()
├─ handleStartTimeTracking()
├─ handleStopTimeTracking()
├─ handleAddTimeEntry()
├─ handleDeleteTimeEntry()
└─ handleGetCurrentTimeEntry()

handleAttachFileToTask()
└─ taskService.attachFile()
```

### Response Formatting

All handlers use `formatResponse()` with:
- `detailLevel`: minimal | standard | detailed
- `fields`: custom field selection
- `includeMetadata`: token count and pagination info
- `paginate()`: offset/limit with hasMore indicator

---

## Integration Checklist

- [ ] Add consolidated tools to `src/tools/task/index.ts`
- [ ] Import handlers in main tool registration
- [ ] Update server.ts to register consolidated tools
- [ ] Remove old individual tool definitions (optional migration)
- [ ] Add tests for action routing
- [ ] Test date parsing with natural language
- [ ] Verify pagination with large datasets
- [ ] Validate error messages for missing parameters

---

## Breaking Changes

**None** - The existing handlers are unchanged. This is an additive consolidation layer that can coexist with original tools.

**Migration Path:**
1. Deploy consolidated tools alongside existing tools
2. Update AI client to prefer consolidated tools (lower in tool list)
3. Gradually deprecate original tools after validation
4. Remove original tools in next major version

---

## Future Enhancements

1. **Batch Operations** - Single call for multiple actions
2. **Conditional Routing** - Action based on field presence
3. **Template Support** - Task templates as action type
4. **Webhook Integration** - Subscribe to task changes
5. **Custom Workflows** - Action sequences with conditions

---

## Files Reference

**File 1: consolidated-tools.ts**
- 466 lines
- 5 tool definitions: manageTaskTool, searchTasksTool, taskCommentsTool, taskTimeTrackingTool, attachFileToTaskTool
- Uses enum values for priority and action parameters
- AI-first descriptions without implementation details

**File 2: consolidated-handlers.ts**
- 462 lines
- 5 main handlers with action routing
- 1 unified router: handleConsolidatedTaskTool()
- Exports: consolidatedTaskHandlers object
- Leverages existing handlers via smart routing

**Total Implementation:** 928 lines of production code
