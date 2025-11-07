# Tag Tools Quick Reference

## Tool Name
**`manage_tags`** - Unified tag management for ClickUp spaces and tasks

## Two Scopes: Space + Task

### SPACE SCOPE (tag CRUD operations)
```
scope: "space"
├─ action: "list"   → Get all tags in a space
├─ action: "create" → Create new tag
├─ action: "update" → Update existing tag
└─ action: "delete" → Delete tag from space
```

### TASK SCOPE (tag assignment)
```
scope: "task"
├─ action: "add"    → Add tag to task
└─ action: "remove" → Remove tag from task
```

## Quick Examples

### List Tags
```json
{
  "scope": "space",
  "action": "list",
  "spaceId": "12345"
}
```

### Create Tag (with color)
```json
{
  "scope": "space",
  "action": "create",
  "spaceId": "12345",
  "tagName": "bug",
  "colorCommand": "red tag"
}
```

### Update Tag
```json
{
  "scope": "space",
  "action": "update",
  "spaceId": "12345",
  "tagName": "bug",
  "colorCommand": "dark red"
}
```

### Delete Tag
```json
{
  "scope": "space",
  "action": "delete",
  "spaceId": "12345",
  "tagName": "obsolete"
}
```

### Add Tag to Task
```json
{
  "scope": "task",
  "action": "add",
  "taskId": "abc123def45",
  "tagName": "bug"
}
```

### Remove Tag from Task
```json
{
  "scope": "task",
  "action": "remove",
  "taskId": "abc123def45",
  "tagName": "wip"
}
```

## Parameter Cheat Sheet

### Space Identification (required for space scope)
- `spaceId: "123456"` (preferred)
- `spaceName: "Engineering"` (will resolve to ID)

### Task Identification (required for task scope)
- `taskId: "abc123def45"` (standard ID - preferred)
- `customTaskId: "DEV-1234"` (custom ID)
- `taskName: "Fix login"` (searches all lists)
- `taskName: "Fix login", listName: "Backend"` (with disambiguation)

### Tag Information
- `tagName: "bug"` (required except for list)
- `newTagName: "defect"` (for update only)

### Colors (optional, use one method)
**Method 1: Natural Language**
```json
"colorCommand": "red tag"
"colorCommand": "dark blue"
"colorCommand": "bright green background"
```

**Method 2: Hex Colors**
```json
"tagBg": "#FF0000",
"tagFg": "#FFFFFF"
```

**Method 3: Both (natural overrides hex)**
```json
"tagBg": "#000000",
"tagFg": "#FFFFFF",
"colorCommand": "red tag"
```

### Other
- `detailLevel: "minimal" | "standard" | "detailed"` (response detail)

## Implementation Location

**File**: `src/tools/tag-tools.ts`

**Exports**:
- `manageTagsTool` - Tool definition
- `handleManageTags()` - Handler function
- `tagToolDefinition` - Definition + handler tuple
- `tagTools` - Array for registration

## Key Features

✓ **Unified Interface**: 1 tool replacing 6
✓ **Smart Caching**: 15-min TTL for space tags
✓ **Natural Colors**: AI-friendly color commands
✓ **Flexible IDs**: Space by ID or name, task by ID/name/custom
✓ **Error Codes**: Specific codes for different failures
✓ **Validation**: Input validation on all parameters
✓ **Performance**: O(1) operations with caching

## Error Codes

- `TAG_NOT_FOUND` - Tag doesn't exist
- `SPACE_NOT_FOUND` - Space not found
- `TASK_NOT_FOUND` - Task not found
- `TAG_VERIFICATION_FAILED` - Operation failed verification

## Integration Checklist

- [ ] Import `tagToolDefinition` or `tagTools` in server.ts
- [ ] Register tool in tool definitions list
- [ ] Test space operations (list/create/update/delete)
- [ ] Test task operations (add/remove)
- [ ] Test color commands
- [ ] Test ID resolution
- [ ] Verify cache invalidation
- [ ] Update client docs

## Common Patterns

### Create a tag and add to task
```typescript
// 1. Create tag
await handleManageTags({
  scope: 'space',
  action: 'create',
  spaceId: '12345',
  tagName: 'urgent',
  colorCommand: 'red tag'
});

// 2. Add to task
await handleManageTags({
  scope: 'task',
  action: 'add',
  taskId: 'abc123def45',
  tagName: 'urgent'
});
```

### Batch add tag to multiple tasks
```typescript
const taskIds = ['id1', 'id2', 'id3'];
for (const taskId of taskIds) {
  await handleManageTags({
    scope: 'task',
    action: 'add',
    taskId,
    tagName: 'reviewed'
  });
}
```

### List tags and show in response
```typescript
const result = await handleManageTags({
  scope: 'space',
  action: 'list',
  spaceId: '12345'
});

// result.data.tags = array of tag objects
// result.data.count = number of tags
```

## Color Command Examples

✓ "red tag"
✓ "blue tag"
✓ "dark green"
✓ "bright orange"
✓ "light purple background"
✓ "dark blue text"
✓ "green foreground"

## Migration from Old Tools

| Old | New |
|-----|-----|
| `get_space_tags` | `manage_tags` with `scope="space", action="list"` |
| `create_space_tag` | `manage_tags` with `scope="space", action="create"` |
| `update_space_tag` | `manage_tags` with `scope="space", action="update"` |
| `delete_space_tag` | `manage_tags` with `scope="space", action="delete"` |
| `add_tag_to_task` | `manage_tags` with `scope="task", action="add"` |
| `remove_tag_from_task` | `manage_tags` with `scope="task", action="remove"` |

## Documentation Files

- **Implementation**: `src/tools/tag-tools.ts`
- **User Guide**: `src/tools/TAG_TOOLS_GUIDE.md`
- **Detailed Doc**: `TAG_TOOLS_IMPLEMENTATION.md`
- **Quick Ref**: `QUICK_REFERENCE_TAG_TOOLS.md` (this file)

---

**File**: `src/tools/tag-tools.ts`
**Lines**: ~700
**Complexity**: Medium
**Status**: Complete and ready for integration
