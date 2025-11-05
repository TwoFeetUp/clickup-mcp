/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * MCP Server for ClickUp integration
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClickUpServices } from "./services/clickup/index.js";
import config from "./config.js";
import { workspaceHierarchyTool, handleGetWorkspaceHierarchy } from "./tools/workspace.js";

// Consolidated tools
import {
  manageTaskTool,
  searchTasksTool,
  taskCommentsTool,
  taskTimeTrackingTool,
  attachFileToTaskTool,
  consolidatedTaskTools
} from "./tools/task/consolidated-tools.js";

import {
  manageContainerTool,
  getContainerTool
} from "./tools/container-tools.js";

import {
  findMembersTool,
  handleFindMembers
} from "./tools/member-tools.js";

import {
  manageTagsTool,
  handleManageTags
} from "./tools/tag-tools.js";

// Old task tool imports for backward compatibility
import {
  createTaskTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  getTaskTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool,
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool,
  attachTaskFileTool,
  getWorkspaceTasksTool,
  getTaskTimeEntriesTool,
  startTimeTrackingTool,
  stopTimeTrackingTool,
  addTimeEntryTool,
  deleteTimeEntryTool,
  getCurrentTimeEntryTool,
  handleCreateTask,
  handleUpdateTask,
  handleMoveTask,
  handleDuplicateTask,
  handleGetTasks,
  handleDeleteTask,
  handleGetTaskComments,
  handleCreateTaskComment,
  handleCreateBulkTasks,
  handleUpdateBulkTasks,
  handleMoveBulkTasks,
  handleDeleteBulkTasks,
  handleGetTask,
  handleAttachTaskFile,
  handleGetWorkspaceTasks,
  handleGetTaskTimeEntries,
  handleStartTimeTracking,
  handleStopTimeTracking,
  handleAddTimeEntry,
  handleDeleteTimeEntry,
  handleGetCurrentTimeEntry
} from "./tools/task/index.js";

// Old container tool imports for backward compatibility
import {
  createListTool, handleCreateList,
  createListInFolderTool, handleCreateListInFolder,
  getListTool, handleGetList,
  updateListTool, handleUpdateList,
  deleteListTool, handleDeleteList
} from "./tools/list.js";
import {
  createFolderTool, handleCreateFolder,
  getFolderTool, handleGetFolder,
  updateFolderTool, handleUpdateFolder,
  deleteFolderTool, handleDeleteFolder
} from "./tools/folder.js";

// Old tag tool imports for backward compatibility
import {
  getSpaceTagsTool, handleGetSpaceTags,
  addTagToTaskTool, handleAddTagToTask,
  removeTagFromTaskTool, handleRemoveTagFromTask
} from "./tools/tag.js";

// Document tools (not yet consolidated)
import {
  createDocumentTool, handleCreateDocument,
  getDocumentTool, handleGetDocument,
  listDocumentsTool, handleListDocuments,
  listDocumentPagesTool, handleListDocumentPages,
  getDocumentPagesTool, handleGetDocumentPages,
  createDocumentPageTool, handleCreateDocumentPage,
  updateDocumentPageTool, handleUpdateDocumentPage
} from "./tools/documents.js";

// Old member tool imports for backward compatibility
import {
  getWorkspaceMembersTool, handleGetWorkspaceMembers,
  findMemberByNameTool, handleFindMemberByName,
  resolveAssigneesTool, handleResolveAssignees
} from "./tools/member.js";

import { Logger } from "./logger.js";
import { clickUpServices } from "./services/shared.js";
import { sponsorService } from "./utils/sponsor-service.js";

// Create a logger instance for server
const logger = new Logger('Server');

// Use existing services from shared module instead of creating new ones
const { workspace } = clickUpServices;

/**
 * Determines if a tool should be enabled based on ENABLED_TOOLS and DISABLED_TOOLS configuration.
 *
 * Logic:
 * 1. If ENABLED_TOOLS is specified, only tools in that list are enabled (ENABLED_TOOLS takes precedence)
 * 2. If ENABLED_TOOLS is not specified but DISABLED_TOOLS is, all tools except those in DISABLED_TOOLS are enabled
 * 3. If neither is specified, all tools are enabled
 *
 * @param toolName - The name of the tool to check
 * @returns true if the tool should be enabled, false otherwise
 */
const isToolEnabled = (toolName: string): boolean => {
  // If ENABLED_TOOLS is specified, it takes precedence
  if (config.enabledTools.length > 0) {
    return config.enabledTools.includes(toolName);
  }

  // If only DISABLED_TOOLS is specified, enable all tools except those disabled
  if (config.disabledTools.length > 0) {
    return !config.disabledTools.includes(toolName);
  }

  // If neither is specified, enable all tools
  return true;
};

export const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "0.8.5",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

const documentModule = () => {
  if (config.documentSupport === 'true') {
    return [
      createDocumentTool,
      getDocumentTool,
      listDocumentsTool,
      listDocumentPagesTool,
      getDocumentPagesTool,
      createDocumentPageTool,
      updateDocumentPageTool,
    ]
  } else {
    return []
  }
}

/**
 * Configure the server routes and handlers
 */
export function configureServer() {
  logger.info("Registering server request handlers");

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Received ListTools request");
    return {
      tools: [
        workspaceHierarchyTool,
        // Consolidated task tools (new)
        manageTaskTool,
        searchTasksTool,
        taskCommentsTool,
        taskTimeTrackingTool,
        attachFileToTaskTool,
        // Consolidated container tools (new)
        manageContainerTool,
        getContainerTool,
        // Consolidated member tools (new)
        findMembersTool,
        // Consolidated tag tools (new)
        manageTagsTool,
        // Document tools (not yet consolidated)
        ...documentModule(),
        // Old tools for backward compatibility (commented out - remove after transition)
        // createTaskTool,
        // getTaskTool,
        // updateTaskTool,
        // moveTaskTool,
        // duplicateTaskTool,
        // deleteTaskTool,
        // getTaskCommentsTool,
        // createTaskCommentTool,
        // attachTaskFileTool,
        // createBulkTasksTool,
        // updateBulkTasksTool,
        // moveBulkTasksTool,
        // deleteBulkTasksTool,
        // getWorkspaceTasksTool,
        // getTaskTimeEntriesTool,
        // startTimeTrackingTool,
        // stopTimeTrackingTool,
        // addTimeEntryTool,
        // deleteTimeEntryTool,
        // getCurrentTimeEntryTool,
        // createListTool,
        // createListInFolderTool,
        // getListTool,
        // updateListTool,
        // deleteListTool,
        // createFolderTool,
        // getFolderTool,
        // updateFolderTool,
        // deleteFolderTool,
        // getSpaceTagsTool,
        // addTagToTaskTool,
        // removeTagFromTaskTool,
        // getWorkspaceMembersTool,
        // findMemberByNameTool,
        // resolveAssigneesTool
      ].filter(tool => isToolEnabled(tool.name))
    };
  });


  // Register CallTool handler with proper logging
  logger.info("Registering tool handlers", {
    toolCount: 9,
    categories: ["workspace", "task", "container", "tag", "member", "document"]
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: params } = req.params;

    // Improved logging with more context
    logger.info(`Received CallTool request for tool: ${name}`, {
      params
    });

    // Check if the tool is enabled
    if (!isToolEnabled(name)) {
      const reason = config.enabledTools.length > 0
        ? `Tool '${name}' is not in the enabled tools list.`
        : `Tool '${name}' is disabled.`;
      logger.warn(`Tool execution blocked: ${reason}`);
      throw {
        code: -32601,
        message: reason
      };
    }

    try {
      // Handle tool calls by routing to the appropriate handler
      switch (name) {
        // Workspace tools
        case "get_workspace_hierarchy":
          return handleGetWorkspaceHierarchy();

        // Consolidated task tools (use existing handlers with action routing)
        case "manage_task":
        case "create_task":
        case "update_task":
        case "move_task":
        case "duplicate_task":
          return handleCreateTask(params);

        case "search_tasks":
        case "get_task":
        case "get_workspace_tasks":
          return handleGetTasks(params);

        case "delete_task":
          return handleDeleteTask(params);

        case "task_comments":
        case "get_task_comments":
        case "create_task_comment":
          return handleGetTaskComments(params);

        case "task_time_tracking":
        case "get_task_time_entries":
        case "start_time_tracking":
        case "stop_time_tracking":
        case "add_time_entry":
        case "delete_time_entry":
        case "get_current_time_entry":
          return handleGetTaskTimeEntries(params);

        case "attach_file_to_task":
          return handleAttachTaskFile(params);

        case "create_bulk_tasks":
          return handleCreateBulkTasks(params);
        case "update_bulk_tasks":
          return handleUpdateBulkTasks(params);
        case "move_bulk_tasks":
          return handleMoveBulkTasks(params);
        case "delete_bulk_tasks":
          return handleDeleteBulkTasks(params);

        // Consolidated container tools (use existing handlers with action routing)
        case "manage_container":
        case "create_list":
        case "create_list_in_folder":
        case "create_folder":
        case "update_list":
        case "update_folder":
        case "delete_list":
        case "delete_folder":
          return handleCreateList(params);

        case "get_container":
        case "get_list":
        case "get_folder":
          return handleGetList(params);

        // Consolidated member tools (use existing handlers)
        case "find_members":
          return sponsorService.createResponse(
            await handleFindMembers(params),
            true
          );

        case "get_workspace_members":
        case "find_member_by_name":
        case "resolve_assignees":
          return handleGetWorkspaceMembers();

        // Consolidated tag tools (use existing handlers)
        case "manage_tags":
        case "get_space_tags":
        case "add_tag_to_task":
        case "remove_tag_from_task":
          return handleGetSpaceTags(params);

        // Document tools (not yet consolidated)
        case "create_document":
          return handleCreateDocument(params);
        case "get_document":
          return handleGetDocument(params);
        case "list_documents":
          return handleListDocuments(params);
        case "list_document_pages":
          return handleListDocumentPages(params);
        case "get_document_pages":
          return handleGetDocumentPages(params);
        case "create_document_page":
          return handleCreateDocumentPage(params);
        case "update_document_page":
          return handleUpdateDocumentPage(params);

        default:
          logger.error(`Unknown tool requested: ${name}`);
          const error = new Error(`Unknown tool: ${name}`);
          error.name = "UnknownToolError";
          throw error;
      }
    } catch (err) {
      logger.error(`Error executing tool: ${name}`, err);

      // Transform error to a more descriptive JSON-RPC error
      if (err.name === "UnknownToolError") {
        throw {
          code: -32601,
          message: `Method not found: ${name}`
        };
      } else if (err.name === "ValidationError") {
        throw {
          code: -32602,
          message: `Invalid params for tool ${name}: ${err.message}`
        };
      } else {
        // Generic server error
        throw {
          code: -32000,
          message: `Error executing tool ${name}: ${err.message}`
        };
      }
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.info("Received ListPrompts request");
    return { prompts: [] };
  });

  server.setRequestHandler(GetPromptRequestSchema, async () => {
    logger.error("Received GetPrompt request, but prompts are not supported");
    throw new Error("Prompt not found");
  });

  return server;
}

/**
 * Export the clickup service for use in tool handlers
 */
export { workspace };
