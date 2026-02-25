/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
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

// Task type schema builder
import { buildManageTaskToolSchema } from "./tools/task/task-type-schema-builder.js";

// Consolidated tools
import {
  manageTaskTool,
  searchTasksTool,
  taskCommentsTool,
  taskTimeTrackingTool,
  attachFileToTaskTool,
  consolidatedTaskTools
} from "./tools/task/consolidated-tools.js";

// Consolidated handlers
import {
  handleManageTask,
  handleSearchTasks,
  handleTaskComments,
  handleTaskTimeTracking,
  handleAttachFileToTaskConsolidated
} from "./tools/task/consolidated-handlers.js";

import {
  manageContainerTool,
  getContainerTool
} from "./tools/container-tools.js";

import {
  handleManageContainer,
  handleGetContainer
} from "./tools/container-handlers.js";

import {
  findMembersTool,
  handleFindMembers
} from "./tools/member-tools.js";

import {
  operateTagsTool,
  handleOperateTags
} from "./tools/tag-tools.js";

import {
  manageDocumentTool,
  manageDocumentPageTool,
  listDocumentsTool,
  handleManageDocument,
  handleManageDocumentPage,
  handleListDocuments
} from "./tools/document-tools.js";

import {
  applyTemplateTool,
  handleApplyTemplate
} from "./tools/template-tools.js";

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
    instructions: `Manage ClickUp tasks, lists, folders, documents, and team members.

Use when: user asks about tasks, todos, projects, lists, folders,
workspace, documents, team members, assignees, time tracking, comments.

Synonyms: task/todo/ticket, list/board, folder/project, workspace/team.`,
  }
);

const documentModule = () => {
  if (config.documentSupport === 'true') {
    return [
      manageDocumentTool,
      manageDocumentPageTool,
      listDocumentsTool,
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
        // Workspace
        workspaceHierarchyTool,
        // Task tools (5 consolidated tools) - manageTaskTool uses dynamic schema
        buildManageTaskToolSchema(),
        searchTasksTool,
        taskCommentsTool,
        taskTimeTrackingTool,
        attachFileToTaskTool,
        // Container tools (2 consolidated tools)
        manageContainerTool,
        getContainerTool,
        // Member tools (1 consolidated tool)
        findMembersTool,
        // Tag tools (1 consolidated tool)
        operateTagsTool,
        // Template tools (1 consolidated tool)
        applyTemplateTool,
        // Document tools (3 consolidated tools)
        ...documentModule()
      ].filter(tool => isToolEnabled(tool.name))
    };
  });


  // Register CallTool handler with proper logging
  logger.info("Registering tool handlers", {
    toolCount: 10,
    categories: ["workspace", "task", "container", "tag", "template", "member", "document"]
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

        // CONSOLIDATED TASK HANDLERS
        case "manage_task":
          return handleManageTask(params);

        case "search_tasks":
          return handleSearchTasks(params);

        case "task_comments":
          return handleTaskComments(params);

        case "task_time_tracking":
          return handleTaskTimeTracking(params);

        case "attach_file_to_task":
          return handleAttachFileToTaskConsolidated(params);

        // CONSOLIDATED CONTAINER HANDLERS
        case "manage_container":
          return handleManageContainer(params);

        case "get_container":
          return handleGetContainer(params);

        // CONSOLIDATED MEMBER HANDLERS
        case "find_members":
          return sponsorService.createResponse(
            await handleFindMembers(params)
          );

        // CONSOLIDATED TAG HANDLERS
        case "operate_tags":
          return handleOperateTags(params);

        // TEMPLATE HANDLER
        case "apply_template":
          return handleApplyTemplate(params);

        // CONSOLIDATED DOCUMENT HANDLERS
        case "manage_document":
          return handleManageDocument(params);

        case "manage_document_page":
          return handleManageDocumentPage(params);

        case "list_documents":
          return handleListDocuments(params);

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
