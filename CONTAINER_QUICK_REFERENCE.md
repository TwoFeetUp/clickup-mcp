# Container Tools Quick Reference

## One-Minute Overview

Two unified tools replace nine separate ones:

| Old Tools | New Tool | Pattern |
|-----------|----------|---------|
| create_list, create_list_in_folder, create_folder | manage_container | `type: "list"/"folder", action: "create"` |
| update_list, update_folder | manage_container | `type: "list"/"folder", action: "update"` |
| delete_list, delete_folder | manage_container | `type: "list"/"folder", action: "delete"` |
| get_list, get_folder | get_container | `type: "list"/"folder"` |

## Tool 1: manage_container

**Operations**: Create, Update, Delete lists and folders

### Create a List in a Space
```json
{
  "tool": "manage_container",
  "params": {
    "type": "list",
    "action": "create",
    "name": "Sprint Tasks",
    "spaceId": "space-123",
    "content": "Q1 sprint planning",
    "status": "open"
  }
}
```

### Create a List in a Folder
```json
{
  "tool": "manage_container",
  "params": {
    "type": "list",
    "action": "create",
    "name": "Sprint Tasks",
    "folderId": "folder-456"
  }
}
```

### Update a Container
```json
{
  "tool": "manage_container",
  "params": {
    "type": "list",
    "action": "update",
    "id": "list-123",
    "newName": "Q1 Sprint",
    "status": "in_progress"
  }
}
```

### Delete a Container
```json
{
  "tool": "manage_container",
  "params": {
    "type": "folder",
    "action": "delete",
    "id": "folder-789"
  }
}
```

## Tool 2: get_container

**Operations**: Retrieve list or folder details with optional caching

### Get by ID (Fastest)
```json
{
  "tool": "get_container",
  "params": {
    "type": "list",
    "id": "list-123"
  }
}
```

### Get by Name (with context)
```json
{
  "tool": "get_container",
  "params": {
    "type": "folder",
    "name": "Q1 Planning",
    "spaceName": "Engineering"
  }
}
```

### Get with Custom Detail Level
```json
{
  "tool": "get_container",
  "params": {
    "type": "list",
    "id": "list-123",
    "detail_level": "minimal"
  }
}
```

### Get Specific Fields Only
```json
{
  "tool": "get_container",
  "params": {
    "type": "list",
    "id": "list-123",
    "fields": ["id", "name", "archived", "url"]
  }
}
```

## Detail Levels

### minimal (~50 tokens)
```json
{
  "id": "123",
  "name": "My List"
}
```

### standard (~200 tokens, default)
```json
{
  "id": "123",
  "name": "My List",
  "space": { "id": "789", "name": "Engineering" },
  "archived": false,
  "url": "https://app.clickup.com/..."
}
```

### detailed (~500+ tokens)
Full object with all fields including metadata, timestamps, etc.

## Parameter Guide

### Required (varies by operation)
- `type`: Always required ("list" or "folder")
- `action`: Required for manage_container ("create", "update", "delete")
- Either `id` or `name`: Required for get_container and for update/delete

### Identification
- `id`: Container ID (preferred, fastest)
- `name`: Container name (fallback)
- `spaceId`/`spaceName`: Context for name lookup
- `folderId`/`folderName`: Context for lists in folders

### List-Specific (create/update)
- `name` or `newName`: List name
- `content`: Description
- `dueDate`: Unix timestamp
- `priority`: 1-4
- `assignee`: User ID
- `status`: List status

### Folder-Specific (create/update)
- `name` or `newName`: Folder name
- `override_statuses`: Boolean

### Response Control
- `detail_level`: "minimal" | "standard" | "detailed"
- `fields`: ["field1", "field2", ...]
- `use_cache`: Boolean (get_container only)

## Common Patterns

### Pattern: Create → Update → Delete
```javascript
// Create
const created = await handleManageContainer({
  type: 'list',
  action: 'create',
  name: 'My Tasks',
  spaceId: 'space-123'
});

// Update
await handleManageContainer({
  type: 'list',
  action: 'update',
  id: created.data.id,
  newName: 'Q1 Tasks'
});

// Delete
await handleManageContainer({
  type: 'list',
  action: 'delete',
  id: created.data.id
});
```

### Pattern: Lookup by Name
```javascript
// When you have a name but not an ID
const result = await handleGetContainer({
  type: 'list',
  name: 'My Tasks',
  spaceName: 'Engineering'
});
```

### Pattern: Optimize Response Size
```javascript
// Minimal response (just id and name)
await handleGetContainer({
  type: 'list',
  id: 'list-123',
  detail_level: 'minimal'
});

// Specific fields only
await handleGetContainer({
  type: 'list',
  id: 'list-123',
  fields: ['id', 'name', 'task_count']
});
```

### Pattern: Bypass Cache
```javascript
// Force fresh data from API
await handleGetContainer({
  type: 'list',
  id: 'list-123',
  use_cache: false
});
```

## Error Handling

All errors include suggestions:

```json
{
  "error": "List 'Tasks' not found",
  "suggestions": [
    "Check that the list name is correct",
    "Use list ID instead of name",
    "Verify the space contains the list"
  ]
}
```

## Migration Cheatsheet

### List Operations
```javascript
// OLD: handleCreateList()
// NEW: handleManageContainer({type:'list', action:'create'})

// OLD: handleCreateListInFolder()
// NEW: handleManageContainer({type:'list', action:'create', folderId:...})

// OLD: handleGetList()
// NEW: handleGetContainer({type:'list'})

// OLD: handleUpdateList()
// NEW: handleManageContainer({type:'list', action:'update'})

// OLD: handleDeleteList()
// NEW: handleManageContainer({type:'list', action:'delete'})
```

### Folder Operations
```javascript
// OLD: handleCreateFolder()
// NEW: handleManageContainer({type:'folder', action:'create'})

// OLD: handleGetFolder()
// NEW: handleGetContainer({type:'folder'})

// OLD: handleUpdateFolder()
// NEW: handleManageContainer({type:'folder', action:'update'})

// OLD: handleDeleteFolder()
// NEW: handleManageContainer({type:'folder', action:'delete'})
```

## Performance Tips

1. **Use IDs when available** - Fast direct lookup
2. **Use minimal detail_level** - Reduces response size
3. **Use fields parameter** - Get only what you need
4. **Enable caching** - Default is true, skip with `use_cache: false`
5. **Batch operations** - Reduce API calls

## Token Usage Estimates

| Operation | Detail Level | Tokens |
|-----------|--------------|--------|
| Tool definition | - | 750 |
| get_container | minimal | 50 |
| get_container | standard | 200 |
| get_container | detailed | 500+ |
| manage_container | standard response | 300 |

## File Locations

- **Tool Definitions**: `src/tools/container-tools.ts`
- **Handlers**: `src/tools/container-handlers.ts`
- **Full Documentation**: `CONTAINER_CONSOLIDATION.md`
- **Implementation Summary**: `CONTAINER_TOOLS_SUMMARY.md`

## Key Benefits

✓ Fewer tools to learn (2 vs 9)
✓ Smaller token footprint (70% reduction in definitions)
✓ More efficient responses (60-90% smaller with detail levels)
✓ Flexible identification (IDs or names)
✓ Built-in caching
✓ Progressive disclosure
✓ Better for AI agents
