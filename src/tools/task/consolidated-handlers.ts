/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Consolidated Task Handlers
 *
 * Implements action-based routing for consolidated task tools.
 * Routes to existing handlers where possible, leveraging established patterns.
 */

import { Logger } from '../../logger.js';
import {
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  moveTaskHandler,
  duplicateTaskHandler,
  getTaskHandler,
  getTasksHandler,
  getTaskCommentsHandler,
  createTaskCommentHandler,
  getWorkspaceTasksHandler,
  getTaskId
} from './handlers.js';
import {
  handleGetTaskTimeEntries,
  handleStartTimeTracking,
  handleStopTimeTracking,
  handleAddTimeEntry,
  handleDeleteTimeEntry,
  handleGetCurrentTimeEntry
} from './time-tracking.js';
import { handleAttachTaskFile } from './attachments.js';
import { formatResponse, paginate, normalizeArray } from '../../utils/response-formatter.js';
import { TaskService } from '../../services/clickup/task/task-service.js';
import { clickUpServices } from '../../services/shared.js';
import { sponsorService } from '../../utils/sponsor-service.js';

const logger = new Logger('ConsolidatedHandlers');
const { task: taskService } = clickUpServices;

//=============================================================================
// DATE CONVERSION HELPER
//=============================================================================

/**
 * Convert date string to Unix timestamp in milliseconds
 * Accepts: ISO dates, human-readable dates, or timestamps
 */
function convertToTimestamp(dateInput: string | number): string {
  // Already a timestamp
  if (typeof dateInput === 'number' || /^\d+$/.test(dateInput)) {
    const timestamp = typeof dateInput === 'string' ? parseInt(dateInput) : dateInput;
    // If it's in seconds, convert to milliseconds
    return timestamp < 10000000000 ? (timestamp * 1000).toString() : timestamp.toString();
  }

  // Parse date string
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    logger.warn(`Invalid date format: ${dateInput}, returning as-is`);
    return dateInput.toString();
  }

  return date.getTime().toString();
}

//=============================================================================
// MANAGE TASK HANDLER - consolidates create/update/delete/move/duplicate
//=============================================================================

/**
 * Build minimal success response for manage_task operations
 * Reduces token usage by returning only essential fields for successful operations
 * Full error details are preserved (handled by error catch)
 */
function buildMinimalSuccessResponse(action: string, result: any, params?: any): any {
  switch (action) {
    case 'create':
      // AI needs: ID for chaining, name for confirmation, URL for sharing, status for context
      return {
        success: true,
        id: result.id,
        name: result.name,
        url: result.url,
        status: result.status?.status || result.status,
        custom_id: result.custom_id || undefined
      };

    case 'update':
      // AI needs: ID, name, and what fields were changed
      const updatedFields: any = {};
      if (params.name !== undefined) updatedFields.name = result.name;
      if (params.description !== undefined || params.markdown_description !== undefined) updatedFields.description = true;
      if (params.status !== undefined) updatedFields.status = result.status?.status || result.status;
      if (params.priority !== undefined) updatedFields.priority = result.priority;
      if (params.dueDate !== undefined) updatedFields.due_date = result.due_date;
      if (params.startDate !== undefined) updatedFields.start_date = result.start_date;
      if (params.assignees !== undefined) updatedFields.assignees = result.assignees?.length || 0;
      if (params.tags !== undefined) updatedFields.tags = result.tags?.length || 0;

      return {
        success: true,
        id: result.id,
        name: result.name,
        updated_fields: updatedFields
      };

    case 'delete':
      // AI needs: confirmation message
      return {
        success: true,
        message: `Task deleted successfully`
      };

    case 'move':
      // AI needs: ID, name, source and destination list info
      return {
        success: true,
        id: result.id,
        name: result.name,
        to_list: {
          id: result.list?.id || result.list,
          name: result.list?.name
        }
      };

    case 'duplicate':
      // AI needs: both IDs (original and duplicate), name, URL for the new task
      return {
        success: true,
        duplicate_id: result.id,
        duplicate_name: result.name,
        duplicate_url: result.url,
        custom_id: result.custom_id || undefined
      };

    default:
      // Fallback: return result as-is
      return result;
  }
}

/**
 * Handler for manage_task tool
 * Routes to specific handlers based on action parameter
 */
export async function handleManageTask(params: any) {
  const { action } = params;

  logger.info(`Handling manage_task action: ${action}`, { action });

  try {
    switch (action) {
      case 'create':
        const createResult = await createTaskHandler(params);
        const minimalCreate = buildMinimalSuccessResponse('create', createResult, params);
        return sponsorService.createResponse(minimalCreate);

      case 'update':
        // Update requires task identification
        if (!params.taskId && !params.taskName && !params.customTaskId) {
          throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
        }
        const updateResult = await updateTaskHandler(taskService, params);
        const minimalUpdate = buildMinimalSuccessResponse('update', updateResult, params);
        return sponsorService.createResponse(minimalUpdate);

      case 'delete':
        // Delete requires task identification
        if (!params.taskId && !params.taskName && !params.customTaskId) {
          throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
        }
        const deleteResult = await deleteTaskHandler(params);
        const minimalDelete = buildMinimalSuccessResponse('delete', deleteResult, params);
        return sponsorService.createResponse(minimalDelete);

      case 'move':
        // Move requires task identification and target list
        if (!params.taskId && !params.taskName && !params.customTaskId) {
          throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
        }
        if (!params.targetListId && !params.targetListName && !params.listId && !params.listName) {
          throw new Error('Target list required: provide targetListId, targetListName, listId, or listName');
        }
        // Map targetListId/targetListName to the parameter names expected by moveTaskHandler
        const moveParams = {
          ...params,
          listId: params.targetListId || params.listId,
          listName: params.targetListName || params.listName
        };
        const moveResult = await moveTaskHandler(moveParams);
        const minimalMove = buildMinimalSuccessResponse('move', moveResult, params);
        return sponsorService.createResponse(minimalMove);

      case 'duplicate':
        // Duplicate requires task identification
        if (!params.taskId && !params.taskName && !params.customTaskId) {
          throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
        }
        // Map targetListId/targetListName to the parameter names expected by duplicateTaskHandler
        const dupParams = {
          ...params,
          listId: params.targetListId || params.listId,
          listName: params.targetListName || params.listName
        };
        const dupResult = await duplicateTaskHandler(dupParams);
        const minimalDuplicate = buildMinimalSuccessResponse('duplicate', dupResult, params);
        return sponsorService.createResponse(minimalDuplicate);

      default:
        throw new Error(`Invalid action: ${action}. Must be one of: create, update, delete, move, duplicate`);
    }
  } catch (error) {
    logger.error(`Error handling manage_task action: ${action}`, { error: (error as Error).message });
    return sponsorService.createErrorResponse(error as Error);
  }
}

//=============================================================================
// SEARCH TASKS HANDLER - consolidates get_task/get_tasks/get_workspace_tasks
//=============================================================================

/**
 * Handler for search_tasks tool
 * Routes to single task, list, or workspace search based on parameters
 */
export async function handleSearchTasks(params: any) {
  const {
    taskId,
    taskName,
    customTaskId,
    listId,
    listName,
    list_ids,
    folder_ids,
    space_ids,
    detail_level = 'standard',
    fields,
    offset = 0,
    limit = 50,
    include_subtasks,
    include_empty_custom_fields = false
  } = params;

  logger.info('Handling search_tasks', { taskId, taskName, listId, listName });

  try {
    // Single task retrieval takes priority
    if (taskId || taskName || customTaskId) {
      const task = await getTaskHandler({
        taskId,
        taskName,
        customTaskId,
        listName,
        subtasks: include_subtasks
      });

      const formattedTask = formatResponse(task, {
        detailLevel: detail_level,
        fields,
        includeMetadata: true,
        includeEmptyCustomFields: include_empty_custom_fields
      });
      return sponsorService.createResponse(formattedTask);
    }

    // List-based search
    if (listId || listName) {
      const tasks = await getTasksHandler({
        listId,
        listName,
        ...params
      });

      // Apply pagination
      const tasksArray = Array.isArray(tasks) ? tasks : (tasks && typeof tasks === 'object' && 'tasks' in tasks) ? (tasks as any).tasks || [] : [];
      const { items, pagination } = paginate(
        tasksArray,
        offset,
        limit
      );

      // Auto-downgrade detail_level if too many results
      let effectiveDetailLevel = detail_level;
      if (detail_level === 'detailed' && items.length > 10) {
        effectiveDetailLevel = 'standard';
        logger.info(`Auto-downgraded detail_level from 'detailed' to 'standard' (${items.length} tasks found, limit is 10)`);
      }

      // Format response with pagination
      const response = formatResponse(items, {
        detailLevel: effectiveDetailLevel,
        fields,
        includeMetadata: true,
        includeEmptyCustomFields: include_empty_custom_fields
      });

      if (response.metadata) {
        response.metadata.pagination = pagination;
        if (effectiveDetailLevel !== detail_level) {
          response.metadata.note = `Detail level auto-downgraded from 'detailed' to 'standard' due to ${items.length} tasks (limit: 10). Use standard or minimal for large result sets.`;
        }
      }

      return sponsorService.createResponse(response);
    }

    // Workspace-wide search requires at least one filter
    // Support both assignee_ids (new) and assignees (legacy) for backward compatibility
    const assigneeIds = params.assignee_ids || params.assignees;

    if (list_ids || folder_ids || space_ids || params.tags || params.statuses || assigneeIds ||
        params.date_created_gt || params.date_created_lt || params.date_updated_gt || params.date_updated_lt ||
        params.due_date_gt || params.due_date_lt) {

      // Map assignee_ids to assignees for the handler
      const searchParams = { ...params };
      if (assigneeIds) {
        searchParams.assignees = assigneeIds;
      }

      // Auto-convert date strings to timestamps
      if (searchParams.date_created_gt) searchParams.date_created_gt = convertToTimestamp(searchParams.date_created_gt);
      if (searchParams.date_created_lt) searchParams.date_created_lt = convertToTimestamp(searchParams.date_created_lt);
      if (searchParams.date_updated_gt) searchParams.date_updated_gt = convertToTimestamp(searchParams.date_updated_gt);
      if (searchParams.date_updated_lt) searchParams.date_updated_lt = convertToTimestamp(searchParams.date_updated_lt);
      if (searchParams.due_date_gt) searchParams.due_date_gt = convertToTimestamp(searchParams.due_date_gt);
      if (searchParams.due_date_lt) searchParams.due_date_lt = convertToTimestamp(searchParams.due_date_lt);

      const workspaceTasks = await getWorkspaceTasksHandler(taskService, searchParams);

      // Extract tasks array from response
      const tasks = Array.isArray(workspaceTasks) ? workspaceTasks :
                   workspaceTasks.tasks || workspaceTasks.summaries || [];

      // Apply pagination
      const { items, pagination } = paginate(tasks, offset, limit);

      // Auto-downgrade detail_level if too many results
      let effectiveDetailLevel = detail_level;
      if (detail_level === 'detailed' && items.length > 10) {
        effectiveDetailLevel = 'standard';
        logger.info(`Auto-downgraded detail_level from 'detailed' to 'standard' (${items.length} tasks found, limit is 10)`);
      }

      // Format response
      const response = formatResponse(items, {
        detailLevel: effectiveDetailLevel,
        fields,
        includeMetadata: true,
        includeEmptyCustomFields: include_empty_custom_fields
      });

      if (response.metadata) {
        response.metadata.pagination = pagination;
        if (effectiveDetailLevel !== detail_level) {
          response.metadata.note = `Detail level auto-downgraded from 'detailed' to 'standard' due to ${items.length} tasks (limit: 10). Use standard or minimal for large result sets.`;
        }
      }

      return sponsorService.createResponse(response);
    }

    // Default behavior: if no parameters provided, search workspace with default filters
    // This follows MCP design principle: tools should "just work" with sensible defaults
    logger.info('No specific search parameters provided, defaulting to workspace-wide search');

    const workspaceTasks = await getWorkspaceTasksHandler(taskService, {
      ...params,
      detail_level: detail_level || 'standard'
    });

    // Extract tasks array from response
    const tasks = Array.isArray(workspaceTasks) ? workspaceTasks :
                 workspaceTasks.tasks || workspaceTasks.summaries || [];

    // Apply pagination
    const { items, pagination } = paginate(tasks, offset, limit);

    // Auto-downgrade detail_level if too many results
    let effectiveDetailLevel = detail_level;
    if (detail_level === 'detailed' && items.length > 10) {
      effectiveDetailLevel = 'standard';
      logger.info(`Auto-downgraded detail_level from 'detailed' to 'standard' (${items.length} tasks found, limit is 10)`);
    }

    // Format response
    const response = formatResponse(items, {
      detailLevel: effectiveDetailLevel,
      fields,
      includeMetadata: true,
      includeEmptyCustomFields: include_empty_custom_fields
    });

    if (response.metadata) {
      response.metadata.pagination = pagination;
      let note = 'Showing recent tasks from workspace. Add filters (assignees, tags, statuses, etc.) to narrow results.';
      if (effectiveDetailLevel !== detail_level) {
        note += ` Detail level auto-downgraded from 'detailed' to 'standard' due to ${items.length} tasks (limit: 10).`;
      }
      response.metadata.note = note;
    }

    return sponsorService.createResponse(response);
  } catch (error) {
    logger.error('Error handling search_tasks', { error: (error as Error).message });
    return sponsorService.createErrorResponse(error as Error);
  }
}

//=============================================================================
// TASK COMMENTS HANDLER - consolidates comment operations
//=============================================================================

/**
 * Handler for task_comments tool
 * Routes to get or create comment based on action
 */
export async function handleTaskComments(params: any) {
  const { action, taskId, taskName, customTaskId, listName } = params;

  logger.info(`Handling task_comments action: ${action}`, { action });

  try {
    // Validate task identification
    if (!taskId && !taskName && !customTaskId) {
      throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
    }

    switch (action) {
      case 'get':
        // Get comments for task
        const getResult = await getTaskCommentsHandler({
          taskId,
          taskName,
          customTaskId,
          listName,
          start: params.start,
          startId: params.startId
        });
        return sponsorService.createResponse(getResult);

      case 'create':
        // Create new comment
        if (!params.commentText) {
          throw new Error('Comment text is required for create action');
        }
        const createResult = await createTaskCommentHandler({
          taskId,
          taskName,
          customTaskId,
          listName,
          commentText: params.commentText,
          notifyAll: params.notifyAll,
          assignee: params.assignee
        });
        return sponsorService.createResponse(createResult);

      default:
        throw new Error(`Invalid action: ${action}. Must be one of: get, create`);
    }
  } catch (error) {
    logger.error(`Error handling task_comments action: ${action}`, { error: (error as Error).message });
    return sponsorService.createErrorResponse(error as Error);
  }
}

//=============================================================================
// TASK TIME TRACKING HANDLER - consolidates all time tracking operations
//=============================================================================

/**
 * Handler for task_time_tracking tool
 * Routes to specific time tracking handlers based on action
 */
export async function handleTaskTimeTracking(params: any) {
  const { action, taskId, taskName, customTaskId, listName } = params;

  logger.info(`Handling task_time_tracking action: ${action}`, { action });

  try {
    switch (action) {
      case 'get_entries':
        // Get time entries for task
        if (!taskId && !taskName && !customTaskId) {
          throw new Error('Task identification required for get_entries action');
        }
        const entriesResult = await handleGetTaskTimeEntries({
          taskId,
          taskName,
          customTaskId,
          listName,
          startDate: params.startDate,
          endDate: params.endDate
        });
        return sponsorService.createResponse(entriesResult);

      case 'start':
        // Start time tracking on task
        if (!taskId && !taskName && !customTaskId) {
          throw new Error('Task identification required for start action');
        }
        const startResult = await handleStartTimeTracking({
          taskId,
          taskName,
          customTaskId,
          listName,
          description: params.description,
          billable: params.billable,
          tags: params.tags
        });
        return sponsorService.createResponse(startResult);

      case 'stop':
        // Stop currently running timer
        const stopResult = await handleStopTimeTracking({
          description: params.description,
          tags: params.tags
        });
        return sponsorService.createResponse(stopResult);

      case 'add_entry':
        // Add manual time entry
        if (!taskId && !taskName && !customTaskId) {
          throw new Error('Task identification required for add_entry action');
        }
        if (!params.start) {
          throw new Error('Start time is required for add_entry action');
        }
        if (!params.duration) {
          throw new Error('Duration is required for add_entry action');
        }
        const addResult = await handleAddTimeEntry({
          taskId,
          taskName,
          customTaskId,
          listName,
          start: params.start,
          duration: params.duration,
          description: params.description,
          billable: params.billable,
          tags: params.tags
        });
        return sponsorService.createResponse(addResult);

      case 'delete_entry':
        // Delete time entry
        if (!params.timeEntryId) {
          throw new Error('Time entry ID is required for delete_entry action');
        }
        const deleteResult = await handleDeleteTimeEntry({
          timeEntryId: params.timeEntryId
        });
        return sponsorService.createResponse(deleteResult);

      case 'get_current':
        // Get currently running timer
        const currentResult = await handleGetCurrentTimeEntry();
        return sponsorService.createResponse(currentResult);

      default:
        throw new Error(`Invalid action: ${action}. Must be one of: get_entries, start, stop, add_entry, delete_entry, get_current`);
    }
  } catch (error) {
    logger.error(`Error handling task_time_tracking action: ${action}`, { error: (error as Error).message });
    return sponsorService.createErrorResponse(error as Error);
  }
}

//=============================================================================
// ATTACH FILE HANDLER - routes to existing attachments implementation
//=============================================================================

/**
 * Handler for attach_file_to_task tool
 * Routes to existing file attachment handler from attachments.ts
 */
export async function handleAttachFileToTaskConsolidated(params: any) {
  const { taskId, taskName, customTaskId, listName, attachmentUrl } = params;

  logger.info('Handling attach_file_to_task', { taskId, taskName });

  try {
    // Validate task identification
    if (!taskId && !taskName && !customTaskId) {
      throw new Error('Task identification required: provide taskId, taskName, or customTaskId');
    }

    // Validate attachment URL
    if (!attachmentUrl) {
      throw new Error('Attachment URL is required');
    }

    // Route to existing attachment handler with consolidated parameters
    const attachResult = await handleAttachTaskFile({
      taskId,
      taskName,
      customTaskId,
      listName,
      attachment_url: attachmentUrl  // Note: handleAttachTaskFile uses attachment_url
    });
    return sponsorService.createResponse(attachResult);
  } catch (error) {
    logger.error('Error handling attach_file_to_task', { error: (error as Error).message });
    return sponsorService.createErrorResponse(error as Error);
  }
}

//=============================================================================
// UNIFIED HANDLER ROUTER
//=============================================================================

/**
 * Route tool calls to appropriate consolidated handlers
 * Dispatcher for all consolidated task tools
 */
export async function handleConsolidatedTaskTool(toolName: string, params: any) {
  logger.info(`Routing consolidated task tool: ${toolName}`);

  try {
    switch (toolName) {
      case 'manage_task':
        return await handleManageTask(params);

      case 'search_tasks':
        return await handleSearchTasks(params);

      case 'task_comments':
        return await handleTaskComments(params);

      case 'task_time_tracking':
        return await handleTaskTimeTracking(params);

      case 'attach_file_to_task':
        return await handleAttachFileToTaskConsolidated(params);

      default:
        throw new Error(`Unknown consolidated task tool: ${toolName}`);
    }
  } catch (error) {
    logger.error(`Error routing consolidated task tool: ${toolName}`, { error: (error as Error).message });
    throw error;
  }
}

//=============================================================================
// HANDLER EXPORTS
//=============================================================================

export const consolidatedTaskHandlers = {
  manage_task: handleManageTask,
  search_tasks: handleSearchTasks,
  task_comments: handleTaskComments,
  task_time_tracking: handleTaskTimeTracking,
  attach_file_to_task: handleAttachFileToTaskConsolidated
};
