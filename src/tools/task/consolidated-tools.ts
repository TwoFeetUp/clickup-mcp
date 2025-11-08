/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Consolidated Task Tools
 *
 * Consolidates 19 task tools into 4 multi-action tools following MCP design principles:
 * - Reduced token overhead through action-based routing
 * - AI-first descriptions focused on intent
 * - Support for natural language dates and flexible task identification
 * - Detail level control and field selection for token efficiency
 */

/**
 * Manage Tasks Tool - consolidates create, update, delete, move, duplicate
 * Single unified interface for task modification operations
 */
export const manageTaskTool = {
  name: "manage_task",
  description: "Modify tasks with action-based routing. Actions: create (new task), update (modify fields), delete (remove), move (to different list), duplicate (copy to another list). Flexible task identification: taskId (preferred), taskName, or customTaskId. Supports all task fields including priority, dates, assignees, custom fields, and tags.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "delete", "move", "duplicate"],
        description: "REQUIRED: Operation to perform on the task"
      },
      // Task Identification (required for update/delete/move/duplicate)
      taskId: {
        type: "string",
        description: "ID of task to modify. Works with both regular and custom task IDs. Not needed for create action."
      },
      taskName: {
        type: "string",
        description: "Name of task to modify. When used, recommend also providing listName for faster lookup."
      },
      customTaskId: {
        type: "string",
        description: "Custom ID of task (e.g., DEV-123). Alternative to taskId."
      },
      listName: {
        type: "string",
        description: "List name - improves lookup speed when using taskName. For create action, listName or listId is required."
      },
      // Create action fields
      name: {
        type: "string",
        description: "REQUIRED for create: Task name. Include emoji + space before name (e.g., '🎯 Build feature')."
      },
      listId: {
        type: "string",
        description: "REQUIRED for create (unless listName provided): List ID where task is created. Use if available from prior response."
      },
      // Update action fields
      description: {
        type: "string",
        description: "Plain text task description"
      },
      markdown_description: {
        type: "string",
        description: "Markdown formatted description (takes precedence over description)"
      },
      status: {
        type: "string",
        description: "Task status (e.g., 'Open', 'In Progress', 'Done')"
      },
      priority: {
        type: "number",
        enum: [1, 2, 3, 4],
        description: "Priority: 1=urgent, 2=high, 3=normal, 4=low. Only set when explicitly requested."
      },
      dueDate: {
        type: "string",
        description: "Due date. Supports Unix timestamps (ms) or natural language: 'tomorrow', 'next friday', '2 weeks from now', 'end of month'"
      },
      startDate: {
        type: "string",
        description: "Start date. Supports Unix timestamps (ms) or natural language: 'today', 'next monday', etc."
      },
      parent: {
        type: "string",
        description: "Parent task ID for creating subtasks (create action only)"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Array of tag names. Tags must exist in the space."
      },
      assignees: {
        type: "array",
        items: {
          oneOf: [
            { type: "number", description: "User ID" },
            { type: "string", description: "Email or username" }
          ]
        },
        description: "Array of assignees: user IDs, emails, or usernames"
      },
      custom_fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Custom field ID" },
            value: { description: "Field value (type depends on field)" }
          },
          required: ["id", "value"]
        },
        description: "Array of custom field values: {id, value}"
      },
      time_estimate: {
        type: "string",
        description: "Time estimate: '2h 30m', '150m', '2.5h', or minutes as number"
      },
      check_required_custom_fields: {
        type: "boolean",
        description: "For create: validate all required custom fields are set before saving"
      },
      // Move/Duplicate action fields
      targetListId: {
        type: "string",
        description: "For move/duplicate: destination list ID. Use if available."
      },
      targetListName: {
        type: "string",
        description: "For move/duplicate: destination list name"
      }
    },
    required: ["action"]
  }
};

/**
 * Search Tasks Tool - consolidates get_task, get_tasks, get_workspace_tasks
 * Unified interface for task retrieval with flexible filtering
 */
export const searchTasksTool = {
  name: "search_tasks",
  description: "Search and retrieve tasks with rich filtering. Works 3 ways: (1) Single task by taskId/taskName/customTaskId, (2) List search by listId/listName, (3) Workspace-wide search by providing ANY filter (assignees, tags, statuses, dates, etc.) - automatically searches across all accessible lists. Returns paginated results with configurable detail level and field selection.",
  inputSchema: {
    type: "object",
    properties: {
      // Single task retrieval
      taskId: {
        type: "string",
        description: "Get single task by ID. Works with both regular and custom task IDs."
      },
      taskName: {
        type: "string",
        description: "Get single task by name. Recommend also providing listName for faster lookup."
      },
      customTaskId: {
        type: "string",
        description: "Get single task by custom ID (e.g., DEV-123)"
      },
      listName: {
        type: "string",
        description: "List name for single task lookup or list-based search"
      },
      // List-based search
      listId: {
        type: "string",
        description: "Get all tasks in a specific list by ID"
      },
      // Workspace-wide search filters (provide ANY filter to search across all lists)
      list_ids: {
        type: "array",
        items: { type: "string" },
        description: "Search tasks across multiple lists"
      },
      folder_ids: {
        type: "array",
        items: { type: "string" },
        description: "Search tasks in specific folders"
      },
      space_ids: {
        type: "array",
        items: { type: "string" },
        description: "Search tasks in specific spaces"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Filter by tag names (all specified tags must match)"
      },
      statuses: {
        type: "array",
        items: { type: "string" },
        description: "Filter by task status (e.g., 'Open', 'In Progress')"
      },
      assignee_ids: {
        type: "array",
        items: { type: "number" },
        description: "Filter by assignee user IDs (numeric IDs only, not emails/usernames)"
      },
      // Date filtering
      date_created_gt: {
        type: "string",
        description: "Tasks created after this date (Unix ms or natural language)"
      },
      date_created_lt: {
        type: "string",
        description: "Tasks created before this date"
      },
      date_updated_gt: {
        type: "string",
        description: "Tasks updated after this date"
      },
      date_updated_lt: {
        type: "string",
        description: "Tasks updated before this date"
      },
      due_date_gt: {
        type: "string",
        description: "Tasks due after this date"
      },
      due_date_lt: {
        type: "string",
        description: "Tasks due before this date"
      },
      // Filtering options
      custom_fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            value: {}
          }
        },
        description: "Filter by custom field values"
      },
      subtasks: {
        type: "boolean",
        description: "Include/exclude subtasks"
      },
      include_closed: {
        type: "boolean",
        description: "Include closed tasks (default: false)"
      },
      archived: {
        type: "boolean",
        description: "Include archived tasks"
      },
      // Pagination and sorting
      offset: {
        type: "number",
        description: "Pagination offset (default: 0)"
      },
      limit: {
        type: "number",
        description: "Results per page (default: 50, max: 100)"
      },
      page: {
        type: "number",
        description: "Page number for results"
      },
      order_by: {
        type: "string",
        description: "Sort field: 'created', 'updated', 'due_date', 'name', 'priority', etc."
      },
      reverse: {
        type: "boolean",
        description: "Reverse sort order"
      },
      // Response formatting
      detail_level: {
        type: "string",
        enum: ["minimal", "standard", "detailed"],
        description: "Response detail: minimal (IDs/names), standard (default), detailed (all fields). Note: 'detailed' automatically downgrades to 'standard' if >10 tasks found to prevent performance issues."
      },
      fields: {
        type: "array",
        items: { type: "string" },
        description: "Specific fields to include in response (overrides detail_level)"
      },
      include_subtasks: {
        type: "boolean",
        description: "For single task: include subtasks in response"
      },
      include_empty_custom_fields: {
        type: "boolean",
        description: "Include custom fields even if they have no value. Useful for discovering available fields to set. Default: false (only show fields with values)"
      }
    }
  }
};

/**
 * Task Comments Tool - consolidates comment operations
 * Unified interface for reading and writing task comments
 */
export const taskCommentsTool = {
  name: "task_comments",
  description: "Manage task comments. Actions: get (retrieve comments), create (add new comment). Flexible task identification: taskId, taskName, or customTaskId. Comments can mention users and notify assignees.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "create"],
        description: "REQUIRED: 'get' to retrieve comments, 'create' to add a comment"
      },
      // Task identification
      taskId: {
        type: "string",
        description: "Task ID. Works with both regular and custom IDs."
      },
      taskName: {
        type: "string",
        description: "Task name. Recommend also providing listName for faster lookup."
      },
      customTaskId: {
        type: "string",
        description: "Custom task ID (e.g., DEV-123)"
      },
      listName: {
        type: "string",
        description: "List name to help locate task when using taskName"
      },
      // Get action parameters
      start: {
        type: "string",
        description: "For get: starting point for comment retrieval (timestamp or ID)"
      },
      startId: {
        type: "string",
        description: "For get: start from specific comment ID"
      },
      // Create action parameters
      commentText: {
        type: "string",
        description: "REQUIRED for create: Comment text. Supports @ mentions for user IDs."
      },
      notifyAll: {
        type: "boolean",
        description: "For create: notify all task assignees (default: false)"
      },
      assignee: {
        type: ["number", "string"],
        description: "For create: assign comment to specific user (ID, email, or username)"
      }
    },
    required: ["action"]
  }
};

/**
 * Task Time Tracking Tool - consolidates all time tracking operations
 * Unified interface for time entry management
 */
export const taskTimeTrackingTool = {
  name: "task_time_tracking",
  description: "Track time on tasks. Actions: get_entries (retrieve), start (begin timer), stop (end timer), add_entry (manual entry), delete_entry (remove entry), get_current (running timer). Flexible task identification: taskId, taskName, or customTaskId. Supports duration in multiple formats and billable/tags metadata.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get_entries", "start", "stop", "add_entry", "delete_entry", "get_current"],
        description: "REQUIRED: Time tracking action to perform"
      },
      // Task identification (required for get_entries, start, add_entry)
      taskId: {
        type: "string",
        description: "Task ID. Works with both regular and custom IDs. Not needed for stop/delete_entry/get_current."
      },
      taskName: {
        type: "string",
        description: "Task name. Recommend also providing listName for faster lookup."
      },
      customTaskId: {
        type: "string",
        description: "Custom task ID (e.g., DEV-123)"
      },
      listName: {
        type: "string",
        description: "List name to help locate task when using taskName"
      },
      // Get entries parameters
      startDate: {
        type: "string",
        description: "Filter entries: start date (Unix ms or natural language: 'yesterday', 'last week')"
      },
      endDate: {
        type: "string",
        description: "Filter entries: end date"
      },
      // Start/add entry parameters
      description: {
        type: "string",
        description: "Time entry description"
      },
      billable: {
        type: "boolean",
        description: "Whether time is billable (default: workspace setting)"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tag names for time entry"
      },
      // Add entry specific parameters
      start: {
        type: "string",
        description: "For add_entry: start time (Unix ms or natural language: '2 hours ago', 'yesterday 9am')"
      },
      duration: {
        type: "string",
        description: "For add_entry: duration in 'Xh Ym' format (e.g., '1h 30m') or minutes (e.g., '90m')"
      },
      // Delete entry parameter
      timeEntryId: {
        type: "string",
        description: "For delete_entry: ID of time entry to delete"
      }
    },
    required: ["action"]
  }
};

/**
 * Attach File Tool - kept as separate, well-designed tool
 * Handles file attachments to tasks
 */
export const attachFileToTaskTool = {
  name: "attach_file_to_task",
  description: "Attach files to tasks. Supports URL attachments (links, images, documents) and file uploads. Use taskId (preferred), taskName, or customTaskId to identify task. Files are attached to task and visible in attachments section.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "Task ID. Works with both regular and custom task IDs."
      },
      taskName: {
        type: "string",
        description: "Task name. When provided, recommend also providing listName."
      },
      customTaskId: {
        type: "string",
        description: "Custom task ID (e.g., DEV-123)"
      },
      listName: {
        type: "string",
        description: "List name to help locate task when using taskName"
      },
      attachmentUrl: {
        type: "string",
        description: "URL of file to attach (image, document, link). Pass as-is without modification."
      }
    },
    required: ["attachmentUrl"]
  }
};

// Export all consolidated tools as array
export const consolidatedTaskTools = [
  manageTaskTool,
  searchTasksTool,
  taskCommentsTool,
  taskTimeTrackingTool,
  attachFileToTaskTool
];
