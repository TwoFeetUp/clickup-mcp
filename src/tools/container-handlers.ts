/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Container Handlers
 *
 * Handlers for consolidated container (list/folder) management tools.
 * Routes to existing list.ts and folder.ts handlers while providing
 * unified parameter handling, response formatting, and caching.
 */

import { Logger } from '../logger.js';
import { formatResponse, formatError, DetailLevel } from '../utils/response-formatter.js';
import { workspaceCache, cacheService } from '../utils/cache-service.js';
import { sponsorService } from '../utils/sponsor-service.js';
import config from '../config.js';

// Import handlers from existing modules
import {
  handleCreateList,
  handleCreateListInFolder,
  handleGetList,
  handleUpdateList,
  handleDeleteList,
  findListIDByName
} from './list.js';

import {
  handleCreateFolder,
  handleGetFolder,
  handleUpdateFolder,
  handleDeleteFolder
} from './folder.js';

import { clickUpServices } from '../services/shared.js';

const logger = new Logger('ContainerHandlers');

// Cache keys
const CACHE_KEYS = {
  LIST: (id: string) => `container:list:${id}`,
  FOLDER: (id: string) => `container:folder:${id}`,
  LIST_BY_NAME: (name: string) => `container:list:name:${name}`,
  FOLDER_BY_NAME: (name: string) => `container:folder:name:${name}`
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve a container ID from flexible identification options
 */
async function resolveContainerId(
  type: 'list' | 'folder',
  id?: string,
  name?: string,
  spaceId?: string,
  spaceName?: string,
  folderId?: string,
  folderName?: string
): Promise<string> {
  // If ID is provided, use it directly
  if (id) {
    return id;
  }

  if (!name) {
    throw new Error(`Either ID or name must be provided to identify ${type}`);
  }

  const { workspace: workspaceService } = clickUpServices;

  try {
    if (type === 'list') {
      // For lists, try to find by name in hierarchy
      const listResult = await findListIDByName(workspaceService, name);
      if (listResult) {
        return listResult.id;
      }

      // If not found globally, try within specific space
      if (spaceId || spaceName) {
        let targetSpaceId = spaceId;
        if (!targetSpaceId && spaceName) {
          const spaceResult = await workspaceService.findSpaceByName(spaceName);
          if (!spaceResult) {
            throw new Error(`Space "${spaceName}" not found`);
          }
          targetSpaceId = spaceResult.id;
        }

        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, name, 'list');
        if (listInfo) {
          return listInfo.id;
        }
      }

      throw new Error(`List "${name}" not found`);
    } else {
      // For folders, resolve space first if needed
      let targetSpaceId = spaceId;

      if (!targetSpaceId && spaceName) {
        const spaceResult = await workspaceService.findSpaceByName(spaceName);
        if (!spaceResult) {
          throw new Error(`Space "${spaceName}" not found`);
        }
        targetSpaceId = spaceResult.id;
      }

      if (!targetSpaceId) {
        throw new Error("Space ID or name required when identifying folder by name");
      }

      const { folder: folderService } = clickUpServices;
      const folderResult = await folderService.findFolderByName(targetSpaceId, name);

      if (!folderResult) {
        throw new Error(`Folder "${name}" not found in space`);
      }

      return folderResult.id;
    }
  } catch (error: any) {
    logger.error(`Failed to resolve ${type} ID from name`, { name, error: error.message });
    throw error;
  }
}

/**
 * Format container response with detail level and field selection
 */
function formatContainerResponse(
  data: any,
  detailLevel: DetailLevel = 'standard',
  fields?: string[]
) {
  // Define field mappings for lists and folders
  const containerFields = {
    list: {
      minimal: ['id', 'name'],
      standard: ['id', 'name', 'space', 'folder', 'archived', 'url'],
      detailed: ['*'] // All fields
    },
    folder: {
      minimal: ['id', 'name'],
      standard: ['id', 'name', 'space', 'archived'],
      detailed: ['*']
    }
  };

  // Apply formatting
  return formatResponse(data, {
    detailLevel,
    fields,
    includeMetadata: true
  });
}

/**
 * Handler for manage_container tool
 */
export async function handleManageContainer(parameters: any) {
  const {
    type,
    action,
    id,
    name,
    newName,
    spaceId,
    spaceName,
    folderId,
    folderName,
    content,
    dueDate,
    priority,
    assignee,
    status,
    override_statuses,
    detail_level = 'standard',
    fields
  } = parameters;

  logger.info(`Managing container: type=${type}, action=${action}`);

  try {
    // Validate input
    if (!type || !['list', 'folder'].includes(type)) {
      throw new Error("Invalid container type. Must be 'list' or 'folder'");
    }

    if (!action || !['create', 'update', 'delete'].includes(action)) {
      throw new Error("Invalid action. Must be 'create', 'update', or 'delete'");
    }

    // Route to appropriate handler based on type and action
    if (type === 'list') {
      return await handleListContainer(
        action,
        {
          id,
          name,
          newName,
          spaceId,
          spaceName,
          folderId,
          folderName,
          content,
          dueDate,
          priority,
          assignee,
          status
        },
        detail_level,
        fields
      );
    } else {
      return await handleFolderContainer(
        action,
        {
          id,
          name,
          newName,
          spaceId,
          spaceName,
          override_statuses
        },
        detail_level,
        fields
      );
    }
  } catch (error: any) {
    logger.error('Failed to manage container', { error: error.message });
    return sponsorService.createErrorResponse(
      `Failed to manage ${type}: ${error.message}`
    );
  }
}

/**
 * Handle list container operations
 */
async function handleListContainer(
  action: string,
  params: any,
  detailLevel: DetailLevel,
  fields?: string[]
) {
  const { id, name, newName, spaceId, spaceName, folderId, folderName, content, dueDate, priority, assignee, status } = params;

  try {
    switch (action) {
      case 'create': {
        // Determine if creating in space or folder
        if (folderId || folderName) {
          // Create in folder
          const result = await handleCreateListInFolder({
            name,
            folderId,
            folderName,
            spaceId,
            spaceName,
            content,
            status
          });
          return sponsorService.createResponse(result, true);
        } else {
          // Create in space
          const result = await handleCreateList({
            name,
            spaceId,
            spaceName,
            content,
            dueDate,
            priority,
            assignee,
            status
          });
          return sponsorService.createResponse(result, true);
        }
      }

      case 'update': {
        // Resolve list ID
        const listId = await resolveContainerId('list', id, name, spaceId, spaceName, folderId, folderName);

        // Prepare update data
        const updateParams: any = { listId };
        if (newName) updateParams.name = newName;
        if (content) updateParams.content = content;
        if (status) updateParams.status = status;

        const result = await handleUpdateList(updateParams);
        return sponsorService.createResponse(result, true);
      }

      case 'delete': {
        // Resolve list ID
        const listId = await resolveContainerId('list', id, name, spaceId, spaceName, folderId, folderName);

        const result = await handleDeleteList({ listId });
        return sponsorService.createResponse(result, true);
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    logger.error('Failed to handle list container', { action, error: error.message });
    throw error;
  }
}

/**
 * Handle folder container operations
 */
async function handleFolderContainer(
  action: string,
  params: any,
  detailLevel: DetailLevel,
  fields?: string[]
) {
  const { id, name, newName, spaceId, spaceName, override_statuses } = params;

  try {
    switch (action) {
      case 'create': {
        if (!name) {
          throw new Error("Folder name is required for create action");
        }

        const result = await handleCreateFolder({
          name,
          spaceId,
          spaceName,
          override_statuses
        });
        return sponsorService.createResponse(result, true);
      }

      case 'update': {
        // Resolve folder ID
        const folderId = await resolveContainerId('folder', id, name, spaceId, spaceName);

        // Prepare update data
        const updateParams: any = { folderId };
        if (newName) updateParams.name = newName;
        if (override_statuses !== undefined) updateParams.override_statuses = override_statuses;

        const result = await handleUpdateFolder(updateParams);
        return sponsorService.createResponse(result, true);
      }

      case 'delete': {
        // Resolve folder ID
        const folderId = await resolveContainerId('folder', id, name, spaceId, spaceName);

        const result = await handleDeleteFolder({ folderId });
        return sponsorService.createResponse(result, true);
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    logger.error('Failed to handle folder container', { action, error: error.message });
    throw error;
  }
}

/**
 * Handler for get_container tool
 */
export async function handleGetContainer(parameters: any) {
  const {
    type,
    id,
    name,
    spaceId,
    spaceName,
    folderId,
    folderName,
    detail_level = 'standard',
    fields,
    use_cache = true
  } = parameters;

  logger.info(`Retrieving container: type=${type}`);

  try {
    // Validate input
    if (!type || !['list', 'folder'].includes(type)) {
      throw new Error("Invalid container type. Must be 'list' or 'folder'");
    }

    // Check cache first if enabled
    let cacheKey: string | null = null;
    if (use_cache && id) {
      cacheKey = type === 'list' ? CACHE_KEYS.LIST(id) : CACHE_KEYS.FOLDER(id);
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for container', { type, id });
        return sponsorService.createResponse(
          formatContainerResponse(cached, detail_level as DetailLevel, fields).data,
          true
        );
      }
    }

    // Resolve container ID
    const containerId = await resolveContainerId(
      type,
      id,
      name,
      spaceId,
      spaceName,
      folderId,
      folderName
    );

    // Fetch container details
    let result: any;

    if (type === 'list') {
      result = await handleGetList({ listId: containerId });
    } else {
      result = await handleGetFolder({ folderId: containerId });
    }

    // Cache the result
    if (use_cache && cacheKey && result && typeof result === 'object' && result.data) {
      cacheService.set(cacheKey, result.data, CACHE_TTL);
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to retrieve container', { type, error: error.message });
    return sponsorService.createErrorResponse(
      `Failed to retrieve ${type}: ${error.message}`
    );
  }
}

/**
 * Invalidate container cache when containers are modified
 */
export function invalidateContainerCache(type: 'list' | 'folder', id: string) {
  const cacheKey = type === 'list' ? CACHE_KEYS.LIST(id) : CACHE_KEYS.FOLDER(id);
  cacheService.delete(cacheKey);
  logger.debug('Container cache invalidated', { type, id });
}

/**
 * Clear all container caches
 */
export function clearContainerCaches() {
  cacheService.clearPattern(/^container:/);
  logger.info('All container caches cleared');
}
