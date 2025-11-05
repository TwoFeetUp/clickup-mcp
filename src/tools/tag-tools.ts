/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Consolidated Tag Management Tool
 *
 * Unified MCP tool for managing tags across ClickUp workspaces.
 * Combines 6 individual tools into one flexible interface with two scopes:
 * - "space": Create, list, update, delete tags in a space
 * - "task": Add/remove tags from individual tasks
 *
 * AI-first design with natural language color support and flexible identification.
 */

import { ErrorCode, ServiceResponse } from '../services/clickup/base.js';
import { clickUpServices } from '../services/shared.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { ClickUpTag } from '../services/clickup/types.js';
import { processColorCommand } from '../utils/color-processor.js';
import { validateTaskIdentification } from './task/utilities.js';
import { workspaceCache } from '../utils/cache-service.js';

// Create logger for tag tools
const logger = new Logger('TagTools');

// Use shared services
const { task: taskService } = clickUpServices;

//=============================================================================
// TOOL DEFINITION
//=============================================================================

/**
 * Consolidated manage_tags tool definition
 *
 * Unified interface for all tag operations with two primary scopes:
 *
 * SPACE SCOPE (tag management in spaces):
 * - action: "list" - Get all tags in a space
 * - action: "create" - Create a new tag in a space
 * - action: "update" - Update an existing tag
 * - action: "delete" - Delete a tag from a space
 *
 * TASK SCOPE (tag assignment to tasks):
 * - action: "add" - Add an existing tag to a task
 * - action: "remove" - Remove a tag from a task
 *
 * Example Usage:
 * - List space tags: scope="space", action="list", spaceId="123"
 * - Create tag: scope="space", action="create", spaceId="123", tagName="bug", colorCommand="red tag"
 * - Add tag to task: scope="task", action="add", taskId="abc123", tagName="bug"
 * - Remove tag from task: scope="task", action="remove", taskId="abc123", tagName="bug"
 */
export const manageTagsTool = {
  name: "manage_tags",
  description: `Unified tag management for ClickUp workspaces.

SPACE SCOPE - Manage tags in a space:
- list: Get all tags in a space
- create: Create a new tag (requires tagName, optional colors)
- update: Update existing tag (requires tagName, at least one property to update)
- delete: Remove tag from space (requires tagName)

TASK SCOPE - Manage tag assignments:
- add: Add existing tag to a task (tag must exist in space)
- remove: Remove tag from a task

FLEXIBLE IDENTIFICATION:
- Spaces: Use spaceId (preferred) or spaceName
- Tasks: Use taskId (preferred), customTaskId (for custom IDs like DEV-1234), or taskName
- When using taskName, optionally provide listName to disambiguate

COLOR SUPPORT:
- Use natural language: "red tag", "dark blue background", "bright green"
- Or specify hex: tagBg="#FF0000", tagFg="#FFFFFF"

DETAIL LEVELS:
- minimal: Only essential fields
- standard: Common fields (default)
- detailed: All available information`,
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["space", "task"],
        description: 'Operation scope: "space" for tag management, "task" for tag assignment'
      },
      action: {
        type: "string",
        enum: ["list", "create", "update", "delete", "add", "remove"],
        description: 'Action to perform. For space: list/create/update/delete. For task: add/remove'
      },
      spaceId: {
        type: "string",
        description: "ID of the space (for space scope operations). Use instead of spaceName if available."
      },
      spaceName: {
        type: "string",
        description: "Name of the space to resolve to ID (for space scope operations)"
      },
      taskId: {
        type: "string",
        description: "ID of the task (for task scope operations). Works with both standard and custom IDs."
      },
      customTaskId: {
        type: "string",
        description: "Custom task ID like 'DEV-1234' (for task scope operations)"
      },
      taskName: {
        type: "string",
        description: "Name of the task to search for (for task scope operations)"
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task (optional, helps disambiguate)"
      },
      tagName: {
        type: "string",
        description: "Name of the tag to manage"
      },
      newTagName: {
        type: "string",
        description: "New name for the tag (for update action)"
      },
      tagBg: {
        type: "string",
        description: "Background color in HEX format (e.g., #FF0000). Defaults to #000000."
      },
      tagFg: {
        type: "string",
        description: "Foreground (text) color in HEX format (e.g., #FFFFFF). Defaults to #FFFFFF."
      },
      colorCommand: {
        type: "string",
        description: "Natural language color command (e.g., 'blue tag', 'dark red'). Overrides tagBg/tagFg."
      },
      detailLevel: {
        type: "string",
        enum: ["minimal", "standard", "detailed"],
        description: "Detail level for response (default: standard)"
      }
    },
    required: ["scope", "action"]
  }
};

//=============================================================================
// UNIFIED HANDLER
//=============================================================================

/**
 * Main handler for manage_tags tool
 * Routes to appropriate function based on scope and action
 */
export async function handleManageTags(params: any) {
  try {
    logger.debug('handleManageTags called', { scope: params.scope, action: params.action });

    const { scope, action } = params;

    // Validate scope and action
    if (!scope || !action) {
      return sponsorService.createErrorResponse(
        new Error('Both scope and action are required'),
        params
      );
    }

    let result: any;

    // Route to appropriate handler based on scope
    if (scope === 'space') {
      result = await handleSpaceTagOperation(params);
    } else if (scope === 'task') {
      result = await handleTaskTagOperation(params);
    } else {
      return sponsorService.createErrorResponse(
        new Error(`Invalid scope: ${scope}. Must be 'space' or 'task'`),
        params
      );
    }

    // Handle error responses
    if (result && !result.success && result.error) {
      const error = new Error(result.error.message || 'Tag operation failed');
      (error as any).code = result.error.code;
      (error as any).data = result.error.details;
      return sponsorService.createErrorResponse(error, params);
    }

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error('Error in handleManageTags', { error: error.message });
    return sponsorService.createErrorResponse(error, params);
  }
}

//=============================================================================
// SPACE TAG OPERATIONS
//=============================================================================

/**
 * Handle space-scoped tag operations
 */
async function handleSpaceTagOperation(params: any): Promise<any> {
  const { action, spaceId, spaceName, tagName, newTagName, tagBg, tagFg, colorCommand, detailLevel } = params;

  // Resolve space ID
  const resolvedSpaceId = await resolveSpaceId(spaceId, spaceName);
  if (!resolvedSpaceId) {
    return {
      success: false,
      error: { message: 'Either spaceId or spaceName is required for space operations' }
    };
  }

  switch (action) {
    case 'list':
      return handleListSpaceTags(resolvedSpaceId, detailLevel);

    case 'create':
      if (!tagName) {
        return {
          success: false,
          error: { message: 'tagName is required for create action' }
        };
      }
      return handleCreateSpaceTag(resolvedSpaceId, tagName, tagBg, tagFg, colorCommand);

    case 'update':
      if (!tagName) {
        return {
          success: false,
          error: { message: 'tagName is required for update action' }
        };
      }
      return handleUpdateSpaceTag(resolvedSpaceId, tagName, newTagName, tagBg, tagFg, colorCommand);

    case 'delete':
      if (!tagName) {
        return {
          success: false,
          error: { message: 'tagName is required for delete action' }
        };
      }
      return handleDeleteSpaceTag(resolvedSpaceId, tagName);

    default:
      return {
        success: false,
        error: { message: `Invalid action for space scope: ${action}` }
      };
  }
}

/**
 * List all tags in a space with caching
 */
async function handleListSpaceTags(spaceId: string, detailLevel: string = 'standard'): Promise<any> {
  try {
    logger.info('Listing tags for space', { spaceId });

    // Try to get from cache first
    const cached = workspaceCache.getTags(spaceId);
    let tags: ClickUpTag[] | null = null;

    if (cached) {
      logger.debug('Using cached space tags', { spaceId });
      tags = cached;
    } else {
      // Fetch from API
      const response = await clickUpServices.tag.getSpaceTags(spaceId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || { message: 'Failed to get space tags' }
        };
      }

      tags = response.data || [];

      // Cache the tags (15-min TTL)
      if (tags) {
        workspaceCache.setTags(spaceId, tags);
      }
    }

    return {
      success: true,
      data: {
        tags: tags || [],
        count: (tags || []).length,
        spaceId
      }
    };
  } catch (error) {
    logger.error('Error listing space tags', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to list space tags',
        code: error.code,
        details: error.data
      }
    };
  }
}

/**
 * Create a new tag in a space
 */
async function handleCreateSpaceTag(
  spaceId: string,
  tagName: string,
  tagBg?: string,
  tagFg?: string,
  colorCommand?: string
): Promise<any> {
  try {
    // Process color command if provided
    let finalBg = tagBg || '#000000';
    let finalFg = tagFg || '#ffffff';

    if (colorCommand) {
      const colors = processColorCommand(colorCommand);
      if (colors) {
        finalBg = colors.background;
        finalFg = colors.foreground;
        logger.info(`Processed color command: "${colorCommand}"`, { bg: finalBg, fg: finalFg });
      } else {
        logger.warn(`Could not process color command: "${colorCommand}"`);
      }
    }

    logger.info('Creating tag in space', { spaceId, tagName, finalBg, finalFg });

    const response = await clickUpServices.tag.createSpaceTag(spaceId, {
      tag_name: tagName,
      tag_bg: finalBg,
      tag_fg: finalFg
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || { message: 'Failed to create space tag' }
      };
    }

    // Invalidate cache
    workspaceCache.invalidateTags(spaceId);

    return {
      success: true,
      data: {
        tag: response.data,
        message: `Tag "${tagName}" created successfully`
      }
    };
  } catch (error) {
    logger.error('Error creating space tag', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to create space tag',
        code: error.code,
        details: error.data
      }
    };
  }
}

/**
 * Update an existing tag in a space
 */
async function handleUpdateSpaceTag(
  spaceId: string,
  tagName: string,
  newTagName?: string,
  tagBg?: string,
  tagFg?: string,
  colorCommand?: string
): Promise<any> {
  try {
    // Process color command if provided
    let finalBg = tagBg;
    let finalFg = tagFg;

    if (colorCommand) {
      const colors = processColorCommand(colorCommand);
      if (colors) {
        finalBg = colors.background;
        finalFg = colors.foreground;
        logger.info(`Processed color command: "${colorCommand}"`, { bg: finalBg, fg: finalFg });
      } else {
        logger.warn(`Could not process color command: "${colorCommand}"`);
      }
    }

    // Ensure at least one property to update
    if (!newTagName && !finalBg && !finalFg) {
      return {
        success: false,
        error: {
          message: 'At least one property (newTagName, tagBg, tagFg, or colorCommand) must be provided'
        }
      };
    }

    logger.info('Updating tag in space', { spaceId, tagName, newTagName, finalBg, finalFg });

    // Build update data
    const updateData: any = {};
    if (newTagName) updateData.tag_name = newTagName;
    if (finalBg) updateData.tag_bg = finalBg;
    if (finalFg) updateData.tag_fg = finalFg;

    const response = await clickUpServices.tag.updateSpaceTag(spaceId, tagName, updateData);

    if (!response.success) {
      return {
        success: false,
        error: response.error || { message: 'Failed to update space tag' }
      };
    }

    // Invalidate cache
    workspaceCache.invalidateTags(spaceId);

    return {
      success: true,
      data: {
        tag: response.data,
        message: `Tag "${tagName}" updated successfully`
      }
    };
  } catch (error) {
    logger.error('Error updating space tag', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to update space tag',
        code: error.code,
        details: error.data
      }
    };
  }
}

/**
 * Delete a tag from a space
 */
async function handleDeleteSpaceTag(spaceId: string, tagName: string): Promise<any> {
  try {
    logger.info('Deleting tag from space', { spaceId, tagName });

    const response = await clickUpServices.tag.deleteSpaceTag(spaceId, tagName);

    if (!response.success) {
      return {
        success: false,
        error: response.error || { message: 'Failed to delete space tag' }
      };
    }

    // Invalidate cache
    workspaceCache.invalidateTags(spaceId);

    return {
      success: true,
      data: {
        message: `Tag "${tagName}" deleted successfully`
      }
    };
  } catch (error) {
    logger.error('Error deleting space tag', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete space tag',
        code: error.code,
        details: error.data
      }
    };
  }
}

//=============================================================================
// TASK TAG OPERATIONS
//=============================================================================

/**
 * Handle task-scoped tag operations
 */
async function handleTaskTagOperation(params: any): Promise<any> {
  const { action, taskId, customTaskId, taskName, listName, tagName } = params;

  // Validate required parameters
  if (!tagName) {
    return {
      success: false,
      error: { message: 'tagName is required for task operations' }
    };
  }

  // Resolve task ID
  const taskIdResult = await resolveTaskId({ taskId, customTaskId, taskName, listName });
  if (!taskIdResult.success) {
    return {
      success: false,
      error: taskIdResult.error
    };
  }

  const resolvedTaskId = taskIdResult.taskId!;

  switch (action) {
    case 'add':
      return handleAddTagToTask(resolvedTaskId, tagName);

    case 'remove':
      return handleRemoveTagFromTask(resolvedTaskId, tagName);

    default:
      return {
        success: false,
        error: { message: `Invalid action for task scope: ${action}` }
      };
  }
}

/**
 * Add a tag to a task
 */
async function handleAddTagToTask(taskId: string, tagName: string): Promise<any> {
  try {
    logger.info('Adding tag to task', { taskId, tagName });

    const response = await clickUpServices.tag.addTagToTask(taskId, tagName);

    if (!response.success) {
      // Provide more specific error messages
      if (response.error?.code === 'TAG_NOT_FOUND') {
        return {
          success: false,
          error: {
            message: `Tag "${tagName}" does not exist in the space. Create it first using action="create" with scope="space".`,
            code: 'TAG_NOT_FOUND'
          }
        };
      }

      return {
        success: false,
        error: response.error || { message: 'Failed to add tag to task' }
      };
    }

    return {
      success: true,
      data: {
        message: `Tag "${tagName}" added to task successfully`,
        taskId
      }
    };
  } catch (error) {
    logger.error('Error adding tag to task', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to add tag to task',
        code: error.code,
        details: error.data
      }
    };
  }
}

/**
 * Remove a tag from a task
 */
async function handleRemoveTagFromTask(taskId: string, tagName: string): Promise<any> {
  try {
    logger.info('Removing tag from task', { taskId, tagName });

    const response = await clickUpServices.tag.removeTagFromTask(taskId, tagName);

    if (!response.success) {
      return {
        success: false,
        error: response.error || { message: 'Failed to remove tag from task' }
      };
    }

    return {
      success: true,
      data: {
        message: `Tag "${tagName}" removed from task successfully`,
        taskId
      }
    };
  } catch (error) {
    logger.error('Error removing tag from task', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to remove tag from task',
        code: error.code,
        details: error.data
      }
    };
  }
}

//=============================================================================
// HELPER FUNCTIONS
//=============================================================================

/**
 * Resolve space ID from either direct ID or name
 */
async function resolveSpaceId(spaceId?: string, spaceName?: string): Promise<string | null> {
  if (spaceId) {
    return spaceId;
  }

  if (!spaceName) {
    return null;
  }

  try {
    logger.debug(`Resolving space name: ${spaceName}`);

    const spaces = await clickUpServices.workspace.getSpaces();
    const space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());

    if (!space) {
      logger.error(`Space not found: ${spaceName}`);
      return null;
    }

    return space.id;
  } catch (error) {
    logger.error('Error resolving space ID', error);
    return null;
  }
}

/**
 * Resolve task ID from various identification methods
 */
async function resolveTaskId(params: {
  taskId?: string;
  customTaskId?: string;
  taskName?: string;
  listName?: string;
}): Promise<{ success: boolean; taskId?: string; error?: any }> {
  const { taskId, customTaskId, taskName, listName } = params;

  try {
    // Validate task identification
    const validationResult = validateTaskIdentification(params, { useGlobalLookup: true });

    if (!validationResult.isValid) {
      return {
        success: false,
        error: { message: validationResult.errorMessage }
      };
    }

    // Try to find the task
    const result = await taskService.findTasks({
      taskId,
      customTaskId,
      taskName,
      listName,
      allowMultipleMatches: false,
      useSmartDisambiguation: true,
      includeFullDetails: false
    });

    if (!result || Array.isArray(result)) {
      return {
        success: false,
        error: { message: 'Task not found with the provided identification' }
      };
    }

    return { success: true, taskId: result.id };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message || 'Failed to resolve task ID',
        code: error.code,
        details: error.data
      }
    };
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

/**
 * Tool definition and handler mapping
 */
export const tagToolDefinition = { definition: manageTagsTool, handler: handleManageTags };

/**
 * Array for easy tool registration (for backward compatibility)
 */
export const tagTools = [tagToolDefinition];
