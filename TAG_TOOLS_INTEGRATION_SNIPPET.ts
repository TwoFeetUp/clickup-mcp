/**
 * Integration Snippet for manage_tags Tool
 *
 * Add this to src/server.ts to register the consolidated tag management tool
 */

// ============================================================================
// OPTION 1: Import Individual Components (Recommended)
// ============================================================================

import { manageTagsTool, handleManageTags } from './tools/tag-tools.js';

// In your tool registration function or initialization:
const toolDefinitions = [
  // ... other tools ...

  {
    name: manageTagsTool.name,
    description: manageTagsTool.description,
    inputSchema: manageTagsTool.inputSchema,
    handler: handleManageTags
  }
];

// ============================================================================
// OPTION 2: Import Tool Definition with Handler (Cleaner)
// ============================================================================

import { tagToolDefinition } from './tools/tag-tools.js';

const toolDefinitions = [
  // ... other tools ...
  tagToolDefinition
];

// ============================================================================
// OPTION 3: Import as Array (Most Flexible)
// ============================================================================

import { tagTools } from './tools/tag-tools.js';

const toolDefinitions = [
  // ... other tools ...
  ...tagTools
];

// ============================================================================
// TYPICAL SERVER.TS STRUCTURE
// ============================================================================

/**
 * Example of how this would look in a typical MCP server setup
 */

// At the top of src/server.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import the consolidated tag tools
import { tagToolDefinition } from './tools/tag-tools.js';

// ... other imports ...

// Define your MCP server
const server = new Server({
  name: 'clickup-mcp',
  version: '1.0.0'
});

// Initialize tool list
const toolDefinitions = [
  // Existing tools
  taskToolDefinition,
  listToolDefinition,

  // NEW: Consolidated tag management tool
  tagToolDefinition
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions.map(t => ({
    name: t.definition.name,
    description: t.definition.description,
    inputSchema: t.definition.inputSchema
  }))
}));

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolDefinitions.find(t => t.definition.name === request.params.name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool not found: ${request.params.name}` }],
      isError: true
    };
  }

  try {
    return await tool.handler(request.params.arguments);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// ============================================================================
// TESTING THE INTEGRATION
// ============================================================================

/**
 * Quick test to verify the tool is working
 */

// Test function
async function testManageTagsTool() {
  const { handleManageTags } = await import('./tools/tag-tools.js');

  // Test 1: List tags
  console.log('Test 1: List space tags');
  const listResult = await handleManageTags({
    scope: 'space',
    action: 'list',
    spaceId: 'YOUR_SPACE_ID'
  });
  console.log('Result:', listResult);

  // Test 2: Create tag
  console.log('\nTest 2: Create tag');
  const createResult = await handleManageTags({
    scope: 'space',
    action: 'create',
    spaceId: 'YOUR_SPACE_ID',
    tagName: 'test-tag',
    colorCommand: 'blue tag'
  });
  console.log('Result:', createResult);

  // Test 3: Add tag to task
  console.log('\nTest 3: Add tag to task');
  const addResult = await handleManageTags({
    scope: 'task',
    action: 'add',
    taskId: 'YOUR_TASK_ID',
    tagName: 'test-tag'
  });
  console.log('Result:', addResult);
}

// Run tests
// testManageTagsTool().catch(console.error);

// ============================================================================
// BACKWARD COMPATIBILITY (OPTIONAL)
// ============================================================================

/**
 * If you need to maintain backward compatibility with old individual tools,
 * you can create wrapper functions that call manage_tags internally
 */

import { handleManageTags } from './tools/tag-tools.js';

// Wrapper for get_space_tags
export async function handleGetSpaceTags(params: any) {
  return handleManageTags({
    scope: 'space',
    action: 'list',
    ...params
  });
}

// Wrapper for create_space_tag
export async function handleCreateSpaceTag(params: any) {
  return handleManageTags({
    scope: 'space',
    action: 'create',
    ...params
  });
}

// Wrapper for update_space_tag
export async function handleUpdateSpaceTag(params: any) {
  return handleManageTags({
    scope: 'space',
    action: 'update',
    ...params
  });
}

// Wrapper for delete_space_tag
export async function handleDeleteSpaceTag(params: any) {
  return handleManageTags({
    scope: 'space',
    action: 'delete',
    ...params
  });
}

// Wrapper for add_tag_to_task
export async function handleAddTagToTask(params: any) {
  return handleManageTags({
    scope: 'task',
    action: 'add',
    ...params
  });
}

// Wrapper for remove_tag_from_task
export async function handleRemoveTagFromTask(params: any) {
  return handleManageTags({
    scope: 'task',
    action: 'remove',
    ...params
  });
}

// Then register both old and new tools:
const toolDefinitions = [
  // Old tools (for backward compatibility)
  {
    name: 'get_space_tags',
    description: 'DEPRECATED: Use manage_tags with scope=space, action=list',
    inputSchema: { /* old schema */ },
    handler: handleGetSpaceTags
  },
  // ... more old tools ...

  // New consolidated tool
  tagToolDefinition
];

// ============================================================================
// QUICK CHECKLIST
// ============================================================================

/**
 * Integration Checklist:
 *
 * [ ] Import tagToolDefinition or equivalent from ./tools/tag-tools.js
 * [ ] Add to toolDefinitions array
 * [ ] Update ListToolsRequestSchema handler to include new tool
 * [ ] Update CallToolRequestSchema handler to dispatch to handler
 * [ ] Test tool with sample parameters
 * [ ] Verify cache is working (check WorkspaceCache)
 * [ ] Test error scenarios
 * [ ] Update API documentation
 * [ ] Plan deprecation of old tools (optional)
 * [ ] Deploy and monitor
 */

// ============================================================================
// SAMPLE TOOL INVOCATIONS FOR TESTING
// ============================================================================

/**
 * Test Cases to Verify Integration
 */

const testCases = [
  // Space operations
  {
    name: 'List space tags',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'space',
          action: 'list',
          spaceId: 'your_space_id'
        }
      }
    }
  },
  {
    name: 'Create tag with color',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'space',
          action: 'create',
          spaceId: 'your_space_id',
          tagName: 'feature',
          colorCommand: 'green tag'
        }
      }
    }
  },
  {
    name: 'Update tag',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'space',
          action: 'update',
          spaceId: 'your_space_id',
          tagName: 'feature',
          newTagName: 'enhancement',
          colorCommand: 'bright green'
        }
      }
    }
  },
  {
    name: 'Delete tag',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'space',
          action: 'delete',
          spaceId: 'your_space_id',
          tagName: 'deprecated'
        }
      }
    }
  },
  // Task operations
  {
    name: 'Add tag to task',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'task',
          action: 'add',
          taskId: 'your_task_id',
          tagName: 'in-progress'
        }
      }
    }
  },
  {
    name: 'Remove tag from task',
    request: {
      params: {
        name: 'manage_tags',
        arguments: {
          scope: 'task',
          action: 'remove',
          taskId: 'your_task_id',
          tagName: 'review'
        }
      }
    }
  }
];

// ============================================================================
// NOTES FOR DEPLOYMENT
// ============================================================================

/**
 * DEPLOYMENT NOTES:
 *
 * 1. TOOL CONSOLIDATION
 *    - Replaces 6 individual tools with 1 unified tool
 *    - Backward compatibility wrappers available if needed
 *    - Can be gradual migration or immediate replacement
 *
 * 2. CACHING
 *    - Space tags are cached for 15 minutes
 *    - Cache is automatically invalidated on create/update/delete
 *    - No configuration needed, works automatically
 *
 * 3. PERFORMANCE
 *    - Expected cache hit rate: 60-80% for list operations
 *    - All other operations: ~500ms (1 API call)
 *    - With cache hits: ~50ms
 *
 * 4. MONITORING
 *    - Watch for TAG_NOT_FOUND errors (tag doesn't exist)
 *    - Monitor SPACE_NOT_FOUND (invalid space ID/name)
 *    - Check cache statistics via WorkspaceCache.getStats()
 *
 * 5. DOCUMENTATION
 *    - Update client docs to reference manage_tags
 *    - Provide migration guide for old tool users
 *    - Include example payloads for common operations
 *
 * 6. TESTING
 *    - Test all scope/action combinations
 *    - Verify cache invalidation works
 *    - Test error scenarios
 *    - Load test with concurrent requests
 */

export {};
