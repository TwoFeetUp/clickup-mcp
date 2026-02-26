# Consolidated Tag Management Tool

## Overview

The `operate_tags` tool consolidates 6 individual tag management tools into a single, flexible interface that follows MCP design principles. This tool handles all tag-related operations across ClickUp workspaces with a unified API.

## File Location
- **Implementation**: `src/tools/tag-tools.ts`
- **Handler**: `handleOperateTags()` function
- **Tool Definition**: `operateTagsTool` constant

## Tool Architecture

### Scopes
The tool operates in two primary scopes:

#### 1. Space Scope (`scope: "space"`)
Manages tags at the space level - create, list, update, and delete tags that can be applied to any task in the space.

**Actions:**
- `list` - Get all tags in a space
- `create` - Create a new tag
- `update` - Update an existing tag
- `delete` - Delete a tag from the space

#### 2. Task Scope (`scope: "task"`)
Manages tag assignments to individual tasks.

**Actions:**
- `add` - Add an existing tag to a task
- `remove` - Remove a tag from a task

## Usage Examples

### Space Operations

#### List Tags in a Space
```json
{
  "scope": "space",
  "action": "list",
  "spaceId": "12345"
}
```

Or by space name:
```json
{
  "scope": "space",
  "action": "list",
  "spaceName": "Engineering"
}
```

#### Create a Tag
```json
{
  "scope": "space",
  "action": "create",
  "spaceId": "12345",
  "tagName": "bug",
  "colorCommand": "red tag"
}
```

With explicit hex colors:
```json
{
  "scope": "space",
  "action": "create",
  "spaceId": "12345",
  "tagName": "documentation",
  "tagBg": "#0052CC",
  "tagFg": "#FFFFFF"
}
```

#### Update a Tag
```json
{
  "scope": "space",
  "action": "update",
  "spaceId": "12345",
  "tagName": "bug",
  "colorCommand": "dark red"
}
```

Rename a tag:
```json
{
  "scope": "space",
  "action": "update",
  "spaceId": "12345",
  "tagName": "bug",
  "newTagName": "defect"
}
```

#### Delete a Tag
```json
{
  "scope": "space",
  "action": "delete",
  "spaceId": "12345",
  "tagName": "obsolete"
}
```

### Task Operations

#### Add Tag to Task
```json
{
  "scope": "task",
  "action": "add",
  "taskId": "abc123def45",
  "tagName": "bug"
}
```

By custom task ID:
```json
{
  "scope": "task",
  "action": "add",
  "customTaskId": "DEV-1234",
  "tagName": "urgent"
}
```

By task name (searches all lists):
```json
{
  "scope": "task",
  "action": "add",
  "taskName": "Fix login flow",
  "tagName": "bug"
}
```

With list disambiguation:
```json
{
  "scope": "task",
  "action": "add",
  "taskName": "Update docs",
  "listName": "Documentation",
  "tagName": "documentation"
}
```

#### Remove Tag from Task
```json
{
  "scope": "task",
  "action": "remove",
  "taskId": "abc123def45",
  "tagName": "wip"
}
```

## Parameter Reference

### Common Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | Yes | "space" or "task" |
| `action` | string | Yes | Operation to perform (see scopes above) |
| `detailLevel` | string | No | Response detail level: "minimal", "standard" (default), "detailed" |

### Space Identification

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `spaceId` | string | Conditional | ID of the space (preferred if available) |
| `spaceName` | string | Conditional | Name of the space (resolved to ID) |

One of `spaceId` or `spaceName` is required for space scope operations.

### Task Identification

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Conditional | Task ID (works with both standard 9-char and custom IDs) |
| `customTaskId` | string | Conditional | Custom task ID like "DEV-1234" |
| `taskName` | string | Conditional | Task name (searches across lists or within list) |
| `listName` | string | No | List name (helps disambiguate tasks with same name) |

At least one of `taskId`, `customTaskId`, or `taskName` is required for task scope operations.

### Tag Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tagName` | string | Yes (except list) | Name of the tag to manage |
| `newTagName` | string | No | New name for tag (update action only) |
| `tagBg` | string | No | Background color in hex format (e.g., #FF0000) |
| `tagFg` | string | No | Foreground (text) color in hex format (e.g., #FFFFFF) |
| `colorCommand` | string | No | Natural language color (e.g., "red tag", "dark blue") |

## Color Support

The tool supports three methods for specifying colors:

### 1. Natural Language Commands
Most intuitive for AI-first interactions:
```json
{
  "colorCommand": "red tag"
}
```

Supports:
- Basic colors: "red", "blue", "green", "yellow", "purple", "orange", etc.
- Modifiers: "dark", "bright", "light"
- Targets: "tag" (bg), "background", "text", "foreground" (fg)

Examples:
- "dark red tag"
- "bright green background"
- "light blue text"

### 2. Explicit Hex Colors
For precise control:
```json
{
  "tagBg": "#0052CC",
  "tagFg": "#FFFFFF"
}
```

### 3. Combination
Natural language can override explicit colors:
```json
{
  "tagBg": "#000000",
  "tagFg": "#FFFFFF",
  "colorCommand": "red tag"  // Overrides tagBg and tagFg
}
```

## Caching Strategy

The tool implements intelligent caching for space tags:

- **Cache Type**: Memory-based cache with TTL
- **TTL**: 15 minutes for space tags
- **Cache Key**: `tags:{spaceId}`
- **Invalidation**: Automatic on create/update/delete operations
- **Hit Rate Tracking**: Available via cache service statistics

### Cache Benefits
- Reduces API calls for repeated tag listings
- Improves response times for common operations
- Automatic cleanup of expired entries

## Error Handling

The tool provides specific error codes for different failure scenarios:

### Space Operation Errors
- `TAG_NOT_FOUND` - Tag doesn't exist in space
- `SPACE_NOT_FOUND` - Space cannot be resolved
- `INVALID_PARAMETERS` - Missing required parameters

### Task Operation Errors
- `TAG_NOT_FOUND` - Tag doesn't exist (for add operation)
- `TASK_NOT_FOUND` - Task cannot be resolved
- `TAG_VERIFICATION_FAILED` - Tag operation couldn't be verified
- `SPACE_NOT_FOUND` - Cannot determine task's space

## Response Format

### Success Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "Tag 'bug' created successfully\n..."
    }
  ],
  "isError": false
}
```

### Error Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Tag 'bug' does not exist in the space..."
    }
  ],
  "isError": true
}
```

## Implementation Details

### Architecture
- **Single Tool Definition**: One consolidated tool with flexible parameters
- **Scope-based Routing**: Handler routes to appropriate operation based on scope
- **Action-based Dispatch**: Within each scope, actions are dispatched to specific handlers
- **Modular Handlers**: Each operation has its own isolated handler function

### Key Functions
1. `handleOperateTags()` - Main entry point
2. `handleSpaceTagOperation()` - Routes space scope operations
3. `handleTaskTagOperation()` - Routes task scope operations
4. `resolveSpaceId()` - Resolves space ID from name or ID
5. `resolveTaskId()` - Resolves task ID from various identifiers

### Dependencies
- `src/services/clickup/tag.ts` - Tag service layer
- `src/services/shared.js` - Shared service instances
- `src/utils/cache-service.ts` - Cache implementation with workspaceCache
- `src/utils/color-processor.ts` - Natural language color parsing
- `src/tools/task/utilities.ts` - Task identification validation
- `src/utils/sponsor-service.ts` - Response formatting

## Migration from Individual Tools

The following 6 individual tools are consolidated into `operate_tags`:

1. `get_space_tags` → `operate_tags` with `scope="space", action="list"`
2. `create_space_tag` → `operate_tags` with `scope="space", action="create"`
3. `update_space_tag` → `operate_tags` with `scope="space", action="update"`
4. `delete_space_tag` → `operate_tags` with `scope="space", action="delete"`
5. `add_tag_to_task` → `operate_tags` with `scope="task", action="add"`
6. `remove_tag_from_task` → `operate_tags` with `scope="task", action="remove"`

## MCP Design Principles Applied

### 1. AI-First Design
- Natural language color commands instead of hex codes
- Flexible identification (ID or name for spaces/tasks)
- Clear error messages with actionable suggestions
- Consolidated interface reduces cognitive load

### 2. Token Efficiency
- Single tool definition instead of 6
- Caching with 15-minute TTL for space tags
- Minimal required parameters
- Structured response format

### 3. Protocol Compliance
- Proper error handling with error codes
- Consistent response formatting
- Validation of all inputs
- Clear success/error distinction

### 4. Scalability
- Modular handler functions
- Efficient caching strategy
- Smart ID resolution with disambiguation
- Batch operation ready

## Testing the Tool

### Direct Invocation (for development)
```javascript
import { handleOperateTags } from './src/tools/tag-tools.js';

// List tags
const result = await handleOperateTags({
  scope: 'space',
  action: 'list',
  spaceId: '123456'
});

// Create tag
const createResult = await handleOperateTags({
  scope: 'space',
  action: 'create',
  spaceId: '123456',
  tagName: 'bug',
  colorCommand: 'red tag'
});
```

### Via MCP Protocol
The tool is automatically registered with the MCP server and can be called via the standard JSON-RPC protocol.

## Performance Characteristics

- **List Tags**: O(1) for cached results, O(n) for API call
- **Create Tag**: O(1) HTTP request
- **Update Tag**: O(1) HTTP request
- **Delete Tag**: O(1) HTTP request
- **Add Tag to Task**: O(n) where n = number of space tags (for verification)
- **Remove Tag from Task**: O(1) HTTP request

Cache hit rate for typical usage: 60-80% for list operations within 15-minute window.
