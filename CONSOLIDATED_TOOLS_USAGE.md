# Consolidated Tools Usage Guide

## Quick Reference

### Task Tools

#### manage_task
Action-based task management with flexible identification.

**Actions**: create, update, delete, move, duplicate

```json
{
  "action": "create",
  "name": "🎯 Implement feature X",
  "listId": "123",
  "priority": 2,
  "assignees": ["user@example.com"]
}
```

```json
{
  "action": "update",
  "taskId": "abc123",
  "status": "In Progress",
  "priority": 1
}
```

```json
{
  "action": "move",
  "taskId": "abc123",
  "targetListId": "456"
}
```

---

#### search_tasks
Unified search interface with rich filtering.

**Single task**:
```json
{
  "taskId": "abc123"
}
```

**By name**:
```json
{
  "taskName": "Implement feature",
  "listName": "Development"
}
```

**Workspace search**:
```json
{
  "space_ids": ["space1"],
  "statuses": ["Open", "In Progress"],
  "tags": ["urgent"],
  "order_by": "due_date",
  "limit": 25
}
```

---

#### task_comments
Read and write task comments.

**Get comments**:
```json
{
  "action": "get",
  "taskId": "abc123"
}
```

**Create comment**:
```json
{
  "action": "create",
  "taskId": "abc123",
  "commentText": "This is my comment",
  "notifyAll": true
}
```

---

#### task_time_tracking
Complete time tracking operations.

**Get entries**:
```json
{
  "action": "get_entries",
  "taskId": "abc123",
  "startDate": "2024-01-01"
}
```

**Start timer**:
```json
{
  "action": "start",
  "taskId": "abc123"
}
```

**Add manual entry**:
```json
{
  "action": "add_entry",
  "taskId": "abc123",
  "duration": "2h 30m",
  "description": "Development work",
  "start": "2 hours ago"
}
```

---

#### attach_file_to_task
Attach files to tasks.

```json
{
  "taskId": "abc123",
  "attachmentUrl": "https://example.com/file.pdf"
}
```

---

### Container Tools

#### manage_container
Manage lists and folders with unified interface.

**Type field**: "list" or "folder"
**Action field**: "create", "update", or "delete"

**Create list**:
```json
{
  "type": "list",
  "action": "create",
  "name": "Sprint Tasks",
  "spaceId": "space1"
}
```

**Create folder**:
```json
{
  "type": "folder",
  "action": "create",
  "name": "Q4 Projects",
  "spaceId": "space1"
}
```

**Update**:
```json
{
  "type": "list",
  "action": "update",
  "id": "list123",
  "newName": "Updated List Name"
}
```

**Delete**:
```json
{
  "type": "folder",
  "action": "delete",
  "id": "folder456"
}
```

---

#### get_container
Retrieve container details.

**Type field**: "list" or "folder"

**Get list**:
```json
{
  "type": "list",
  "id": "list123"
}
```

**Get folder by name**:
```json
{
  "type": "folder",
  "name": "Q4 Projects",
  "spaceName": "Operations"
}
```

---

### Member Tools

#### find_members
Search, resolve, and list workspace members.

**Search by name**:
```json
{
  "query": "John"
}
```

**Search by email**:
```json
{
  "query": "john@example.com"
}
```

**Batch resolve**:
```json
{
  "assignees": ["john@example.com", "Jane Smith", "user123"]
}
```

**List all** (no parameters):
```json
{}
```

---

### Tag Tools

#### manage_tags
Manage tags and tag assignments.

**Scope field**: "space" or "task"
**Action field**: depends on scope

**List space tags**:
```json
{
  "scope": "space",
  "action": "list",
  "spaceId": "space1"
}
```

**Create tag**:
```json
{
  "scope": "space",
  "action": "create",
  "spaceId": "space1",
  "tagName": "urgent",
  "colorCommand": "red tag"
}
```

**Update tag**:
```json
{
  "scope": "space",
  "action": "update",
  "spaceId": "space1",
  "tagName": "urgent",
  "newTagName": "critical",
  "tagBg": "#FF0000"
}
```

**Add tag to task**:
```json
{
  "scope": "task",
  "action": "add",
  "taskId": "abc123",
  "tagName": "urgent"
}
```

**Remove tag from task**:
```json
{
  "scope": "task",
  "action": "remove",
  "taskId": "abc123",
  "tagName": "urgent"
}
```

---

## Old Tool Names (Still Supported)

### Task Tools
- Use `create_task` instead of `manage_task` with action="create"
- Use `get_task` instead of `search_tasks` with taskId
- Use `update_task` instead of `manage_task` with action="update"
- Use `delete_task` instead of `manage_task` with action="delete"
- Use `move_task` instead of `manage_task` with action="move"
- Use `duplicate_task` instead of `manage_task` with action="duplicate"
- Use `get_task_comments` instead of `task_comments` with action="get"
- Use `create_task_comment` instead of `task_comments` with action="create"
- Use `get_task_time_entries` instead of `task_time_tracking` with action="get_entries"
- Use `start_time_tracking` instead of `task_time_tracking` with action="start"
- Use `stop_time_tracking` instead of `task_time_tracking` with action="stop"
- Use `add_time_entry` instead of `task_time_tracking` with action="add_entry"
- Use `delete_time_entry` instead of `task_time_tracking` with action="delete_entry"
- Use `get_current_time_entry` instead of `task_time_tracking` with action="get_current"

### Container Tools
- Use `create_list` instead of `manage_container` with type="list", action="create"
- Use `get_list` instead of `get_container` with type="list"
- Use `update_list` instead of `manage_container` with type="list", action="update"
- Use `delete_list` instead of `manage_container` with type="list", action="delete"
- Use `create_folder` instead of `manage_container` with type="folder", action="create"
- Use `get_folder` instead of `get_container` with type="folder"
- Use `update_folder` instead of `manage_container` with type="folder", action="update"
- Use `delete_folder` instead of `manage_container` with type="folder", action="delete"

### Member Tools
- Use `get_workspace_members` instead of `find_members` with no parameters
- Use `find_member_by_name` instead of `find_members` with query
- Use `resolve_assignees` instead of `find_members` with assignees

### Tag Tools
- Use `get_space_tags` instead of `manage_tags` with scope="space", action="list"
- Use `add_tag_to_task` instead of `manage_tags` with scope="task", action="add"
- Use `remove_tag_from_task` instead of `manage_tags` with scope="task", action="remove"

---

## Common Workflows

### Create and Assign a Task

**Step 1: Create task**
```json
{
  "name": "🎯 Review PR #123",
  "listId": "development-tasks",
  "priority": 2,
  "dueDate": "tomorrow"
}
```

**Step 2: Assign users**
```json
{
  "action": "update",
  "taskId": "returned-from-step-1",
  "assignees": ["developer@example.com", "reviewer@example.com"]
}
```

**Step 3: Add tags**
```json
{
  "scope": "task",
  "action": "add",
  "taskId": "returned-from-step-1",
  "tagName": "review"
}
```

---

### Search and Update Tasks

**Step 1: Search**
```json
{
  "space_ids": ["engineering"],
  "statuses": ["Open"],
  "tags": ["bug"],
  "limit": 10
}
```

**Step 2: Update from results**
```json
{
  "action": "update",
  "taskId": "task-from-results",
  "status": "In Progress",
  "priority": 1
}
```

**Step 3: Start time tracking**
```json
{
  "action": "start",
  "taskId": "task-from-results"
}
```

---

### Move and Track Tasks

**Step 1: Search tasks in one list**
```json
{
  "listId": "backlog"
}
```

**Step 2: Move to another list**
```json
{
  "action": "move",
  "taskId": "task-id",
  "targetListId": "in-progress"
}
```

**Step 3: Log time on the task**
```json
{
  "action": "add_entry",
  "taskId": "task-id",
  "duration": "1h 30m",
  "description": "Implementation"
}
```

---

## Response Detail Levels

Many tools support `detail_level` parameter to control response size:

### minimal
Returns only essential fields (id, name, etc.)
- Use for: Quick lookups, listing
- Token savings: ~70%

```json
{
  "detail_level": "minimal"
}
```

### standard (default)
Returns common fields with metadata
- Use for: General operations
- Token savings: ~30%

```json
{
  "detail_level": "standard"
}
```

### detailed
Returns all available fields
- Use for: Full task details
- Token savings: None

```json
{
  "detail_level": "detailed"
}
```

---

## Flexible Identification

Most tools accept multiple ways to identify entities:

### By ID (Preferred - Fastest)
```json
{
  "taskId": "abc123",
  "listId": "list456",
  "spaceId": "space789"
}
```

### By Name (User-Friendly)
```json
{
  "taskName": "Review PR",
  "listName": "Backlog",
  "spaceName": "Engineering"
}
```

### By Custom ID
```json
{
  "customTaskId": "DEV-123"
}
```

### With Context
```json
{
  "taskName": "My Task",
  "listName": "Development",
  "spaceName": "Engineering"
}
```

---

## Error Handling

### Common Errors

**Tool not found**:
```json
{
  "error": "Unknown tool: invalid_tool_name"
}
```

**Invalid parameters**:
```json
{
  "error": "Both taskId and action are required"
}
```

**Resource not found**:
```json
{
  "error": "Task not found with ID abc123"
}
```

**Invalid action**:
```json
{
  "error": "Invalid action for task scope: invalid_action"
}
```

---

## Performance Tips

1. **Use IDs when available** - Faster than name-based lookups
2. **Provide context** - Include listName with taskName for faster resolution
3. **Minimize detail level** - Use "minimal" when you don't need all fields
4. **Batch operations** - Use bulk tools when available
5. **Filter results** - Use search filters to reduce response size

---

## Migration Guide

### From Old Tools to New Tools

**Old approach** (3 separate API calls):
```
create_task → handleCreateTask
update_task → handleUpdateTask
delete_task → handleDeleteTask
```

**New approach** (1 flexible API):
```
manage_task {
  action: "create" → handleCreateTask
  action: "update" → handleUpdateTask
  action: "delete" → handleDeleteTask
}
```

Both work identically, but new approach is:
- Simpler for AI models to understand
- Requires fewer tool definitions
- Reduces token overhead
- Easier to discover related operations

---

## FAQ

**Q: Will old tool names stop working?**
A: No. Both old and new names will continue to work during and after transition.

**Q: Do I have to migrate to new tools?**
A: No. Old tools continue to work indefinitely.

**Q: Which should I use for new integrations?**
A: Use new consolidated tools - they're simpler and more efficient.

**Q: Can I mix old and new tool names?**
A: Yes. Both work in the same request.

**Q: How do I identify which action to use?**
A: Check the tool documentation. Each action is clearly specified in the inputSchema.

**Q: What if a parameter is optional in old tool but required in new tool?**
A: New tools were designed to be more consistent. Check documentation for specific parameters.

**Q: Are responses the same?**
A: Yes. Same handlers, same response format.

**Q: How do consolidated tools improve performance?**
A: Fewer tool definitions = faster tool discovery, less token overhead, cleaner schemas.
