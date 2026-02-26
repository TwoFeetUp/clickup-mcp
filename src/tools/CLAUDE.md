# MCP Tools Development

**Technology**: TypeScript, MCP SDK, Zod
**Entry Point**: `index.ts` (exports all tools)
**Parent Context**: This extends [../CLAUDE.md](../CLAUDE.md)

---

## Development Commands

### From Root
```bash
npm run build         # Build all TypeScript
npm run dev           # Watch mode
```

### Testing a Tool
```bash
# Build first
npm run build

# Create test in playground/
# Run with credentials
CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node playground/test-your-tool.js
```

---

## Directory Structure

```
tools/
├── index.ts                    # Exports all tools
├── task/                       # Task-related tools (consolidated)
│   ├── consolidated-tools.ts   # Tool schemas
│   ├── consolidated-handlers.ts # Handler implementations
│   ├── task-type-schema-builder.ts # Dynamic schema for task types
│   └── ...                     # Legacy files (reference only)
├── container-tools.ts          # List/folder tools + handlers
├── container-handlers.ts       # Container handler implementations
├── member-tools.ts             # Member search tools
├── tag-tools.ts                # Tag management tools
├── document-tools.ts           # Document tools (optional)
├── workspace.ts                # Workspace hierarchy tool
└── utils.ts                    # Tool utilities
```

---

## Architecture Patterns

### Tool Schema Pattern
```typescript
// src/tools/xxx-tools.ts
export const myTool = {
  name: "tool_name",
  description: "AI-friendly description explaining WHEN to use this tool",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "create", "update", "delete"],
        description: "REQUIRED: Operation to perform"
      },
      // Flexible identification
      taskId: { type: "string", description: "Task ID (preferred)" },
      taskName: { type: "string", description: "Task name (alternative)" },
      // ... more parameters
    },
    required: ["action"]  // Only require action, allow flexible ID
  }
};
```

### Handler Pattern
```typescript
// src/tools/xxx-handlers.ts
import { clickUpServices } from '../services/shared.js';
import { Logger } from '../logger.js';

const logger = new Logger('MyToolHandler');

export async function handleMyTool(params: any) {
  const { action, ...rest } = params;

  // Validate required parameters
  if (!action) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: "Missing required parameter: action"
      }]
    };
  }

  try {
    // Route to action handler
    switch (action) {
      case "get":
        return await handleGet(rest);
      case "create":
        return await handleCreate(rest);
      // ...
      default:
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Unknown action: ${action}. Valid actions: get, create, update, delete`
          }]
        };
    }
  } catch (error: any) {
    logger.error('Tool execution failed', { action, error: error.message });
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }]
    };
  }
}
```

### Response Pattern
```typescript
// Successful response with context
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      message: "Created 3 tasks successfully",
      tasks: formattedTasks,
      metadata: {
        count: 3,
        listName: "My List"
      }
    }, null, 2)
  }]
};

// Error response with actionable message
return {
  isError: true,
  content: [{
    type: "text",
    text: "Task 'My Task' not found in list 'My List'. Use search_tasks to find available tasks."
  }]
};
```

---

## Tool Registration

Tools are registered in `src/server.ts`:

1. **Import** tool schema and handler
2. **Add to ListToolsRequestSchema** handler array
3. **Add case** to CallToolRequestSchema switch

```typescript
// In server.ts
import { myTool, handleMyTool } from "./tools/my-tools.js";

// In ListToolsRequestSchema handler
tools: [
  // ... existing tools
  myTool,
]

// In CallToolRequestSchema handler
switch (name) {
  // ... existing cases
  case "my_tool":
    return handleMyTool(params);
}
```

---

## Consolidated vs Separate Tools

### When to Consolidate
- Operations on same resource type (create/read/update/delete task)
- Common parameter sets across operations
- User would naturally ask for these together

### When to Keep Separate
- Fundamentally different use cases
- Very different parameter requirements
- Security/permission boundaries

### Example: Task Tools
```typescript
// CONSOLIDATED (current approach)
manage_task     // create, update, delete, move, duplicate
search_tasks    // get single, list tasks, workspace search
task_comments   // get, create comments
task_time_tracking  // get, start, stop, add, delete entries

// NOT CONSOLIDATED
attach_file_to_task  // Kept separate - different enough use case
```

---

## Key Files

### Core Files (understand these first)
- `task/consolidated-tools.ts` - Main task tool schemas
- `task/consolidated-handlers.ts` - Main task handlers
- `container-tools.ts` - List/folder management

### Utilities
- `utils.ts` - Shared tool utilities
- `../utils/resolver-utils.ts` - Entity resolution (task by name)
- `../utils/response-formatter.ts` - Response formatting

### Services Used
- `../services/clickup/task/` - Task API operations
- `../services/clickup/workspace.ts` - Workspace/hierarchy operations
- `../services/shared.ts` - Service singletons

---

## Common Gotchas

- **Import Extensions**: Use `.js` extension in imports (NodeNext modules)
  ```typescript
  // Correct
  import { clickUpServices } from '../services/shared.js';
  // Wrong
  import { clickUpServices } from '../services/shared';
  ```

- **Logger Usage**: Always create scoped logger
  ```typescript
  const logger = new Logger('MyHandler');
  ```

- **Error Handling**: Return error responses, don't throw
  ```typescript
  // Correct
  return { isError: true, content: [{ type: "text", text: "Error message" }] };
  // Avoid (unless re-throwing known errors)
  throw new Error("Error message");
  ```

- **Flexible ID**: Support multiple identification methods
  ```typescript
  // Support taskId OR taskName OR customTaskId
  if (!taskId && !taskName && !customTaskId) {
    return errorResponse("Provide taskId, taskName, or customTaskId");
  }
  ```

---

## Testing Checklist

- [ ] Tool schema validates correctly
- [ ] Handler returns proper response format
- [ ] All actions route correctly
- [ ] Flexible identification works (ID, name, custom ID)
- [ ] Error messages are clear and actionable
- [ ] Performance is acceptable (check API call count)
- [ ] Registered in server.ts
- [ ] Build succeeds
- [ ] Direct test passes
