/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Consolidated Container Tools
 *
 * This module defines unified tools for managing both lists and folders,
 * consolidating 9 separate tools into 2 unified tools following MCP design principles.
 * Supports flexible identification (ID or name), detail levels, and field selection.
 */

/**
 * Tool definition for managing containers (lists and folders)
 * Consolidates: create_list, create_list_in_folder, create_folder,
 * update_list, update_folder, delete_list, delete_folder
 */
export const manageContainerTool = {
  name: "manage_container",
  description: `Unified tool for creating, updating, or deleting ClickUp lists and folders. Consolidates list and folder CRUD operations. Specify type (list/folder) and action (create/update/delete). Use IDs when available (preferred) or names. Detail levels: minimal (id/name), standard (with metadata), detailed (all fields).`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["list", "folder"],
        description: "Container type: 'list' or 'folder'"
      },
      action: {
        type: "string",
        enum: ["create", "update", "delete"],
        description: "Action to perform on the container"
      },
      // Identification fields (flexible - use ID or name)
      id: {
        type: "string",
        description: "Container ID (preferred for update/delete). Use this instead of name if available."
      },
      name: {
        type: "string",
        description: "Container name. Use when ID not available. For lists/folders in spaces/folders, may require additional context."
      },
      // Context fields for name-based identification
      spaceId: {
        type: "string",
        description: "Space ID (required when using name to identify a list or folder, or when creating in a space)"
      },
      spaceName: {
        type: "string",
        description: "Space name (alternative to spaceId when identifying containers by name)"
      },
      folderId: {
        type: "string",
        description: "Parent folder ID (required when creating list in folder, or identifying list within specific folder)"
      },
      folderName: {
        type: "string",
        description: "Parent folder name (alternative to folderId when creating list in folder)"
      },
      // Container properties for create/update
      newName: {
        type: "string",
        description: "New name for the container (update action)"
      },
      content: {
        type: "string",
        description: "Description or content (lists only, create/update)"
      },
      dueDate: {
        type: "string",
        description: "Due date as Unix timestamp in milliseconds (lists only, create)"
      },
      priority: {
        type: "number",
        description: "Priority level: 1 (urgent), 2 (high), 3 (normal), 4 (low) (lists only, create)"
      },
      assignee: {
        type: "number",
        description: "User ID to assign to (lists only, create)"
      },
      status: {
        type: "string",
        description: "Status (lists only, create/update)"
      },
      override_statuses: {
        type: "boolean",
        description: "Override space statuses with folder-specific statuses (folders only, create/update)"
      },
      // Response control
      detail_level: {
        type: "string",
        enum: ["minimal", "standard", "detailed"],
        description: "Response detail level. minimal: id/name only, standard: includes metadata, detailed: all fields"
      },
      fields: {
        type: "array",
        items: { type: "string" },
        description: "Specific fields to include in response (overrides detail_level)"
      }
    },
    required: ["type", "action"]
  }
};

/**
 * Tool definition for retrieving container details
 * Consolidates: get_list, get_folder
 */
export const getContainerTool = {
  name: "get_container",
  description: `Unified tool for retrieving list or folder details. Consolidates get_list and get_folder. Use ID (preferred) or name. Supports flexible field selection and detail levels for response optimization.`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["list", "folder"],
        description: "Container type: 'list' or 'folder'"
      },
      // Identification fields
      id: {
        type: "string",
        description: "Container ID (preferred). Use this instead of name if available for more reliable lookup."
      },
      name: {
        type: "string",
        description: "Container name. Use when ID not available. May require space/folder context to disambiguate."
      },
      // Context for name-based lookup
      spaceId: {
        type: "string",
        description: "Space ID (required when using name to identify a list or folder in a specific space)"
      },
      spaceName: {
        type: "string",
        description: "Space name (alternative to spaceId for context when using name)"
      },
      folderId: {
        type: "string",
        description: "Parent folder ID (optional, narrows search to lists within specific folder)"
      },
      folderName: {
        type: "string",
        description: "Parent folder name (optional, alternative to folderId for context)"
      },
      // Response control
      detail_level: {
        type: "string",
        enum: ["minimal", "standard", "detailed"],
        description: "Response detail level: minimal (id/name), standard (default, with common fields), detailed (all fields)"
      },
      fields: {
        type: "array",
        items: { type: "string" },
        description: "Specific fields to include in response. Overrides detail_level if provided."
      },
      use_cache: {
        type: "boolean",
        description: "Use cached container details if available (default: true)"
      },
      include_custom_fields: {
        type: "boolean",
        description: "For lists: include custom field definitions with available options (dropdown choices, relationship targets, etc.). Use this to discover what values can be set on tasks. Default: false"
      },
      include_statuses: {
        type: "boolean",
        description: "For lists: include available task statuses with names and colors. Use to discover valid status values before updating tasks. Default: false"
      }
    },
    required: ["type"]
  }
};
