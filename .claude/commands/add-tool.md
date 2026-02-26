# Add New Tool

Guide for adding a new MCP tool to the ClickUp server.

## Before Starting

1. Read `MCP_DESIGN_PRINCIPLES.md` for AI-first design guidelines
2. Check if functionality can be added to an existing consolidated tool
3. Consider: Does this tool follow user intent or API structure?

## Steps

### 1. Design the Tool Schema

Create or update tool schema in `src/tools/`:
- Task-related: `src/tools/task/consolidated-tools.ts`
- Container-related: `src/tools/container-tools.ts`
- New category: Create `src/tools/$ARGUMENTS-tools.ts`

```typescript
export const myNewTool = {
  name: "tool_name",
  description: "AI-friendly description of what this tool does. Include when to use it.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "create", "update", "delete"],
        description: "REQUIRED: Operation to perform"
      },
      // ... other parameters
    },
    required: ["action"]
  }
};
```

### 2. Implement the Handler

Create handler in corresponding file:
```typescript
export async function handleMyNewTool(params: any) {
  const { action, ...rest } = params;

  // Validate required parameters
  if (!action) {
    return { isError: true, content: [{ type: "text", text: "Missing required parameter: action" }] };
  }

  // Route to appropriate action
  switch (action) {
    case "get": return handleGet(rest);
    case "create": return handleCreate(rest);
    default: return { isError: true, content: [{ type: "text", text: `Unknown action: ${action}` }] };
  }
}
```

### 3. Register the Tool

In `src/server.ts`:
1. Import the tool schema and handler
2. Add tool to `ListToolsRequestSchema` handler
3. Add case to `CallToolRequestSchema` switch statement

### 4. Test

```bash
npm run build
# Create test in playground/
CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node playground/test-new-tool.js
```

### 5. Document

Update root `CLAUDE.md` with new tool in "Available MCP Tools" section.

## Checklist

- [ ] Tool follows AI-first design (intent-based, not API-based)
- [ ] Description is clear and helps AI understand when to use it
- [ ] Parameters have helpful descriptions
- [ ] Flexible task identification supported (if task-related)
- [ ] Handler includes proper error handling
- [ ] Tool registered in server.ts
- [ ] Build succeeds
- [ ] Direct test passes
- [ ] CLAUDE.md updated
