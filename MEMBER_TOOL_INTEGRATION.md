# Member Tool Integration Guide

## Overview

This guide shows how to integrate the new consolidated `find_members` tool into the MCP server.

## Step 1: Import the Tool

**File**: `src/server.ts`

```typescript
// Add to imports
import {
    findMembersTool,
    handleFindMembers
} from './tools/member-tools.js';

// Keep old imports for backward compatibility (temporary)
import {
    getWorkspaceMembersTool,
    findMemberByNameTool,
    resolveAssigneesTool,
    handleGetWorkspaceMembers,
    handleFindMemberByName,
    handleResolveAssignees
} from './tools/member.ts';
```

## Step 2: Register Tool

**Location**: Tool definition section in `src/server.ts`

```typescript
// Define tools for the server
const tools: Tool[] = [
    // ... other tools ...

    // NEW: Consolidated member tool
    findMembersTool,

    // TEMPORARY: Old tools for backward compatibility
    // getWorkspaceMembersTool,
    // findMemberByNameTool,
    // resolveAssigneesTool,
];
```

## Step 3: Add Handler Route

**Location**: Tool handler switch statement in `src/server.ts`

```typescript
switch (request.params.name) {
    // ... other handlers ...

    case 'find_members':
        // New consolidated handler
        return await handleFindMembers(request.params.arguments || {});

    // TEMPORARY: Old handlers for backward compatibility
    // case 'get_workspace_members':
    //     return await handleGetWorkspaceMembers();
    // case 'find_member_by_name':
    //     return await handleFindMemberByName(request.params.arguments);
    // case 'resolve_assignees':
    //     return await handleResolveAssignees(request.params.arguments);
}
```

## Step 4: Update Related Handlers

If other tools import member functions, update them to use the new handler:

**Example from `src/tools/task/handlers.ts`:**

OLD:
```typescript
import { handleResolveAssignees } from '../member.js';

// In handler code:
const resolved = await handleResolveAssignees({ assignees: assigneeNames });
```

NEW:
```typescript
import { handleFindMembers } from '../member-tools.js';

// In handler code:
const result = await handleFindMembers({
    assignees: assigneeNames,
    detail_level: 'minimal'
});
const userIds = result.resolutions
    ?.filter(r => r.userId)
    .map(r => r.userId) || [];
```

## Migration Phases

### Phase 1: Parallel Running (Recommended Start)
Keep both old and new tools running simultaneously:

```typescript
// In server.ts tool list
const tools: Tool[] = [
    // New consolidated tool
    findMembersTool,

    // Old tools (for backward compatibility)
    getWorkspaceMembersTool,
    findMemberByNameTool,
    resolveAssigneesTool,
];

// In handler switch
case 'find_members':
    return await handleFindMembers(request.params.arguments || {});

case 'get_workspace_members':
    return await handleGetWorkspaceMembers();
case 'find_member_by_name':
    return await handleFindMemberByName(request.params.arguments);
case 'resolve_assignees':
    return await handleResolveAssignees(request.params.arguments);
```

**Duration**: 1-2 releases while clients migrate

### Phase 2: Primary Tool Promotion
Switch to using new tool as primary:

```typescript
// Mark old tools as deprecated in descriptions
const getWorkspaceMembersTool = {
    name: 'get_workspace_members',
    description: '[DEPRECATED: Use find_members instead] Returns all members...',
    // ...
};
```

**Duration**: 1 release

### Phase 3: Deprecation Period
Keep old tools available but clearly deprecated:

```typescript
// Add deprecation headers to old tools
const findMemberByNameTool = {
    name: 'find_member_by_name',
    description: '[DEPRECATED: Use find_members with query parameter instead] Finds a member...',
    // ...
};
```

**Duration**: 2-3 releases

### Phase 4: Full Migration
Remove old tools completely:

```typescript
// Remove from tools list and handlers
// Remove from imports
// Update any remaining internal usages
```

**When**: After confirming no external usage

## Integration Checklist

### Pre-Integration
- [ ] Review `MEMBER_TOOL_CONSOLIDATION.md` for design overview
- [ ] Review `MEMBER_TOOL_QUICK_REFERENCE.md` for API details
- [ ] Test locally using `playground/member-tool-test.js`
- [ ] Verify imports work correctly

### Integration
- [ ] Add imports to `src/server.ts`
- [ ] Register `findMembersTool` in tools array
- [ ] Add `find_members` case to handler switch
- [ ] Keep old tools running (Phase 1)
- [ ] Update internal handlers using member functions

### Testing
- [ ] Test tool registration: `npx tsc --noEmit`
- [ ] Test through MCP protocol (if applicable)
- [ ] Test all three modes (search, resolve, list)
- [ ] Test caching behavior
- [ ] Run `playground/member-tool-test.js`

### Deployment
- [ ] Deploy with old and new tools running
- [ ] Monitor logs for errors
- [ ] Verify cache hits occurring
- [ ] Update client code to use new tool
- [ ] Document in release notes

### Cleanup (Phase 4)
- [ ] Confirm no external usage of old tools
- [ ] Remove old tool definitions
- [ ] Remove old handler cases
- [ ] Remove old imports
- [ ] Update server documentation

## Common Integration Issues

### Issue: "Cannot find module"
**Solution**: Verify import paths are correct:
```typescript
// Should be:
import { findMembersTool } from './tools/member-tools.js';

// Check file exists:
// src/tools/member-tools.ts
```

### Issue: Type errors with parameters
**Solution**: Pass proper type:
```typescript
// Wrong:
await handleFindMembers({
    assignees: "john@example.com"  // Should be array
})

// Correct:
await handleFindMembers({
    assignees: ["john@example.com"]
})
```

### Issue: Cache not working
**Solution**: Verify workspaceCache is imported and used:
```typescript
// In handler, should see console logs:
// "Using cached workspace members"
// or
// "Fetching workspace members from API"
```

### Issue: Empty results
**Solution**: Verify workspace has members and cache is populated:
```javascript
// Debug: Check what members exist
const result = await handleFindMembers({ detail_level: 'detailed' });
console.log('Total members:', result.count);
console.log('Cache hit:', result.cacheHit);
```

## Performance Monitoring

### Metrics to Track

1. **Cache Hit Rate**
   ```typescript
   // Monitor logs for cache hits
   console.log(`Cache hit: ${result.cacheHit}`);
   ```

2. **Response Times**
   ```typescript
   const start = performance.now();
   const result = await handleFindMembers(params);
   const duration = performance.now() - start;
   console.log(`Duration: ${duration}ms`);
   ```

3. **Token Usage**
   ```typescript
   // Estimate tokens before/after
   const tokens = estimateTokensFromObject(result);
   ```

### Expected Metrics

| Metric | Expected | Good Sign |
|--------|----------|-----------|
| Cache hit rate | 80-90% | High hit rate |
| First call | 200-500ms | Reasonable latency |
| Cached call | <10ms | Fast response |
| Token savings | 50-90% | Significant reduction |

## Backwards Compatibility Testing

Test that old code still works:

```javascript
// Old handler 1: should work
const members = await handleGetWorkspaceMembers();
console.assert(members.success);

// Old handler 2: should work
const member = await handleFindMemberByName({ nameOrEmail: 'john@example.com' });
console.assert(member.member || member.success);

// Old handler 3: should work
const ids = await handleResolveAssignees({ assignees: ['john@example.com'] });
console.assert(ids.userIds || ids.success);
```

## Documentation Updates

After integration, update:

1. **README.md**: Note new consolidated tool
2. **API Docs**: Add find_members documentation
3. **Migration Guide**: Instructions for updating clients
4. **Changelog**: Note consolidation and backward compatibility
5. **Server Documentation**: List available tools

## Example: Server.ts Integration

Here's a complete example of server.ts integration:

```typescript
import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';

// Import new consolidated tool
import {
    findMembersTool,
    handleFindMembers,
    // Backward compatibility
    handleGetWorkspaceMembers,
    handleFindMemberByName,
    handleResolveAssignees
} from './tools/member-tools.js';

// ... other imports ...

async function handleToolCall(toolName: string, toolInput: unknown): Promise<TextContent> {
    try {
        let result;

        switch (toolName) {
            // New primary tool
            case 'find_members':
                result = await handleFindMembers(toolInput as any);
                break;

            // Old tools (backward compatibility)
            case 'get_workspace_members':
                result = await handleGetWorkspaceMembers();
                break;
            case 'find_member_by_name':
                result = await handleFindMemberByName(toolInput as any);
                break;
            case 'resolve_assignees':
                result = await handleResolveAssignees(toolInput as any);
                break;

            // ... other tools ...
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }

        return {
            type: 'text',
            text: JSON.stringify(result, null, 2)
        };
    } catch (error) {
        return {
            type: 'text',
            text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}

// Register tools
const tools: Tool[] = [
    // New consolidated tool
    findMembersTool,

    // Old tools (Phase 1 - parallel running)
    {
        name: 'get_workspace_members',
        description: '[DEPRECATED: Use find_members instead] Returns all members in the workspace',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'find_member_by_name',
        description: '[DEPRECATED: Use find_members with query instead] Finds a member by name/email',
        inputSchema: {
            type: 'object',
            properties: {
                nameOrEmail: { type: 'string' }
            },
            required: ['nameOrEmail']
        }
    },
    {
        name: 'resolve_assignees',
        description: '[DEPRECATED: Use find_members with assignees instead] Resolves assignee names to user IDs',
        inputSchema: {
            type: 'object',
            properties: {
                assignees: { type: 'array', items: { type: 'string' } }
            },
            required: ['assignees']
        }
    },

    // ... other tools ...
];
```

## Rollback Plan

If issues occur:

1. **Immediate Rollback**
   ```typescript
   // Comment out new tool registration
   // const tools: Tool[] = [
   //     // findMembersTool,  // Commented out
   //     getWorkspaceMembersTool,
   //     // ...
   // ];
   ```

2. **Comment out new handler**
   ```typescript
   // case 'find_members':
   //     // return await handleFindMembers(...);
   ```

3. **Keep backward compatibility handlers active**
   ```typescript
   // These continue to work from old src/tools/member.ts
   ```

## Summary

The integration is straightforward:

1. Import the new tool
2. Register it in tools array
3. Add handler case
4. Keep old tools during Phase 1
5. Monitor metrics
6. Gradual migration timeline

Total integration time: ~30 minutes
Complexity: Low (mostly import and registration)
Risk: Very low (backward compatible)
