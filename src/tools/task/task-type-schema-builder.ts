/**
 * SPDX-FileCopyrightText: (c) 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * Task Type Schema Builder
 *
 * This module provides helper functions to build tool schemas with dynamic
 * task type enums based on the types loaded from ClickUp API.
 */

import { taskTypeService } from '../../services/task-type-service.js';

/**
 * Get the task_type property schema with dynamic enum values
 * @returns Property schema for task_type field
 */
export function getTaskTypeProperty() {
  const availableTypes = taskTypeService.getAvailableTypes();

  // If no types loaded yet or service not initialized, return without enum
  if (!taskTypeService.isInitialized() || availableTypes.length === 0) {
    return {
      type: "string" as const,
      description: "Task type (e.g., 'milestone', 'Bug/Issue', 'Feature'). Leave empty for normal task."
    };
  }

  // Return schema with dynamic enum
  return {
    type: "string" as const,
    enum: availableTypes,
    description: `Task type. Available: ${availableTypes.join(', ')}. Leave empty for normal task.`
  };
}

/**
 * Build the complete manageTask tool schema with dynamic task types
 * @returns Tool schema object
 */
export function buildManageTaskToolSchema() {
  return {
    name: "manage_task",
    description: "Modify tasks with action-based routing. Actions: create (new task), update (modify fields), delete (remove), move (to different list), duplicate (copy to another list). Flexible task identification: taskId (preferred), taskName, or customTaskId. Supports all task fields including priority, dates, assignees, custom fields, tags, and task types.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string" as const,
          enum: ["create", "update", "delete", "move", "duplicate"],
          description: "REQUIRED: Operation to perform on the task"
        },
        // Task Identification (required for update/delete/move/duplicate)
        taskId: {
          type: "string" as const,
          description: "ID of task to modify. Works with both regular and custom task IDs. Not needed for create action."
        },
        taskName: {
          type: "string" as const,
          description: "Name of task to modify. When used, recommend also providing listName for faster lookup."
        },
        customTaskId: {
          type: "string" as const,
          description: "Custom ID of task (e.g., DEV-123). Alternative to taskId."
        },
        listName: {
          type: "string" as const,
          description: "List name - improves lookup speed when using taskName. For create action, listName or listId is required."
        },
        // Create action fields
        name: {
          type: "string" as const,
          description: "REQUIRED for create: Task name. Include emoji + space before name (e.g., '🎯 Build feature')."
        },
        listId: {
          type: "string" as const,
          description: "REQUIRED for create (unless listName provided): List ID where task is created. Use if available from prior response."
        },
        // Task type field (dynamic)
        task_type: getTaskTypeProperty(),
        // Update action fields
        description: {
          type: "string" as const,
          description: "Plain text task description"
        },
        markdown_description: {
          type: "string" as const,
          description: "Markdown formatted description (takes precedence over description)"
        },
        status: {
          type: "string" as const,
          description: "Task status (e.g., 'Open', 'In Progress', 'Done')"
        },
        priority: {
          type: "number" as const,
          enum: [1, 2, 3, 4],
          description: "Priority: 1=urgent, 2=high, 3=normal, 4=low. Only set when explicitly requested."
        },
        dueDate: {
          type: "string" as const,
          description: "Due date. Supports Unix timestamps (ms) or natural language: 'tomorrow', 'next friday', '2 weeks from now', 'end of month'"
        },
        startDate: {
          type: "string" as const,
          description: "Start date. Supports Unix timestamps (ms) or natural language: 'today', 'next monday', etc."
        },
        parent: {
          type: "string" as const,
          description: "Parent task ID for creating subtasks (create action only)"
        },
        tags: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Array of tag names. Tags must exist in the space."
        },
        assignees: {
          type: "array" as const,
          items: {
            oneOf: [
              { type: "number" as const, description: "User ID" },
              { type: "string" as const, description: "Email or username" }
            ]
          },
          description: "Array of assignees: user IDs, emails, or usernames"
        },
        custom_fields: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              id: { type: "string" as const, description: "Custom field ID" },
              value: { description: "Field value (type depends on field)" }
            },
            required: ["id", "value"]
          },
          description: "Array of custom field values: {id, value}"
        },
        time_estimate: {
          type: "string" as const,
          description: "Time estimate: '2h 30m', '150m', '2.5h', or minutes as number"
        },
        check_required_custom_fields: {
          type: "boolean" as const,
          description: "For create: validate all required custom fields are set before saving"
        },
        // Move/Duplicate action fields
        targetListId: {
          type: "string" as const,
          description: "For move/duplicate: destination list ID. Use if available."
        },
        targetListName: {
          type: "string" as const,
          description: "For move/duplicate: destination list name"
        }
      },
      required: ["action"]
    }
  };
}

/**
 * Build tool schema for single create task operation
 * @returns Tool schema object
 */
export function buildCreateTaskToolSchema() {
  return {
    name: "create_task",
    description: "Create a new task in a ClickUp list with optional fields: description, assignees, priority, due date, start date, tags, custom fields, and task type. Supports natural language for dates (e.g., 'tomorrow', 'next friday'). Returns task details including ID and URL.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string" as const,
          description: "REQUIRED: Task name. Include emoji + space before name (e.g., '🎯 Build feature')."
        },
        listId: {
          type: "string" as const,
          description: "List ID where task is created. If not provided, must provide listName."
        },
        listName: {
          type: "string" as const,
          description: "List name. Used if listId not provided. Recommend using listId when available."
        },
        task_type: getTaskTypeProperty(),
        description: {
          type: "string" as const,
          description: "Plain text task description"
        },
        markdown_description: {
          type: "string" as const,
          description: "Markdown formatted description (takes precedence over description)"
        },
        status: {
          type: "string" as const,
          description: "Task status (e.g., 'Open', 'In Progress'). Must match list's available statuses."
        },
        priority: {
          type: "number" as const,
          enum: [1, 2, 3, 4],
          description: "Priority: 1=urgent, 2=high, 3=normal, 4=low. Only set when explicitly requested."
        },
        dueDate: {
          type: "string" as const,
          description: "Due date. Supports Unix timestamps (ms) or natural language: 'tomorrow', 'next friday', '2 weeks from now', 'end of month'"
        },
        startDate: {
          type: "string" as const,
          description: "Start date. Supports Unix timestamps (ms) or natural language: 'today', 'next monday', etc."
        },
        parent: {
          type: "string" as const,
          description: "Parent task ID for creating subtasks"
        },
        tags: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Array of tag names. Tags must exist in the space."
        },
        assignees: {
          type: "array" as const,
          items: {
            oneOf: [
              { type: "number" as const, description: "User ID" },
              { type: "string" as const, description: "Email or username" }
            ]
          },
          description: "Array of assignees: user IDs, emails, or usernames"
        },
        custom_fields: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              id: { type: "string" as const, description: "Custom field ID" },
              value: { description: "Field value (type depends on field)" }
            },
            required: ["id", "value"]
          },
          description: "Array of custom field values: {id, value}"
        },
        time_estimate: {
          type: "string" as const,
          description: "Time estimate: '2h 30m', '150m', '2.5h', or minutes as number"
        },
        check_required_custom_fields: {
          type: "boolean" as const,
          description: "Validate all required custom fields are set before saving"
        }
      },
      required: ["name"]
    }
  };
}

/**
 * Build tool schema for single update task operation
 * @returns Tool schema object
 */
export function buildUpdateTaskToolSchema() {
  return {
    name: "update_task",
    description: "Update an existing task's fields. Flexible task identification: taskId (preferred), taskName (requires listName), or customTaskId. Can update any field including name, description, status, priority, dates, assignees, tags, custom fields, and task type. Returns updated task details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string" as const,
          description: "ID of task to update. Works with both regular and custom task IDs. If not provided, must use taskName or customTaskId."
        },
        taskName: {
          type: "string" as const,
          description: "Name of task to update. Requires listName for efficient lookup."
        },
        customTaskId: {
          type: "string" as const,
          description: "Custom ID of task (e.g., DEV-123). Alternative to taskId."
        },
        listName: {
          type: "string" as const,
          description: "List name - required when using taskName"
        },
        name: {
          type: "string" as const,
          description: "New task name"
        },
        task_type: getTaskTypeProperty(),
        description: {
          type: "string" as const,
          description: "Plain text task description"
        },
        markdown_description: {
          type: "string" as const,
          description: "Markdown formatted description"
        },
        status: {
          type: "string" as const,
          description: "Task status (e.g., 'Done', 'In Progress')"
        },
        priority: {
          type: "number" as const,
          enum: [1, 2, 3, 4],
          description: "Priority: 1=urgent, 2=high, 3=normal, 4=low"
        },
        dueDate: {
          type: "string" as const,
          description: "Due date. Supports Unix timestamps (ms) or natural language"
        },
        startDate: {
          type: "string" as const,
          description: "Start date. Supports Unix timestamps (ms) or natural language"
        },
        tags: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Array of tag names"
        },
        assignees: {
          type: "array" as const,
          items: {
            oneOf: [
              { type: "number" as const, description: "User ID" },
              { type: "string" as const, description: "Email or username" }
            ]
          },
          description: "Array of assignees"
        },
        custom_fields: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              id: { type: "string" as const },
              value: {}
            },
            required: ["id", "value"]
          },
          description: "Array of custom field values"
        },
        time_estimate: {
          type: "string" as const,
          description: "Time estimate: '2h 30m', '150m', '2.5h', or minutes"
        }
      }
    }
  };
}
