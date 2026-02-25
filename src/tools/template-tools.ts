/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Template Tools
 *
 * Consolidated tool for listing workspace task templates and creating
 * tasks from templates. Supports flexible identification via template_id
 * or template_name (fuzzy matched), and list_id or list_name.
 */

import { Logger } from '../logger.js';
import { clickUpServices } from '../services/shared.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { findListIDByName } from './list.js';

const logger = new Logger('TemplateTools');

//=============================================================================
// TOOL DEFINITION
//=============================================================================

/**
 * Tool definition for apply_template
 *
 * Actions:
 * - list: Show available task templates in the workspace
 * - create: Create a new task from a template in a target list
 */
export const applyTemplateTool = {
  name: "apply_template",
  description: `List workspace task templates or create tasks from templates. Actions: list (show available templates), create (new task from template). Templates preserve subtasks, descriptions, and structure.`,
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list", "create"],
        description: "Action to perform: 'list' to show available templates, 'create' to make a new task from a template"
      },
      template_id: {
        type: "string",
        description: "Template ID (from list action). Format: t-xxx"
      },
      template_name: {
        type: "string",
        description: "Template name (alternative to template_id, fuzzy matched against available templates)"
      },
      list_id: {
        type: "string",
        description: "Target list ID for create action"
      },
      list_name: {
        type: "string",
        description: "Target list name (alternative to list_id, resolved via workspace hierarchy)"
      },
      name: {
        type: "string",
        description: "Name for the new task (required for create action)"
      },
      page: {
        type: "number",
        description: "Page number for list action (default: 0)"
      }
    },
    required: ["action"]
  }
};

//=============================================================================
// HANDLER
//=============================================================================

/**
 * Main handler for apply_template tool
 * Routes to list or create based on action parameter
 */
export async function handleApplyTemplate(params: any) {
  const { action } = params;

  logger.info(`apply_template called with action: ${action}`);

  try {
    switch (action) {
      case 'list':
        return await handleListTemplates(params);

      case 'create':
        return await handleCreateFromTemplate(params);

      default:
        return sponsorService.createErrorResponse(
          `Unknown action: '${action}'. Valid actions: list, create`
        );
    }
  } catch (error: any) {
    logger.error('Error in handleApplyTemplate', { action, error: error.message });
    return sponsorService.createErrorResponse(
      `Failed to ${action} template: ${error.message}`
    );
  }
}

//=============================================================================
// ACTION HANDLERS
//=============================================================================

/**
 * List available task templates in the workspace
 */
async function handleListTemplates(params: any) {
  const { page = 0 } = params;

  logger.info('Listing task templates', { page });

  try {
    const { template: templateService } = clickUpServices;
    const result = await templateService.listTaskTemplates(page);

    const templates = result.templates || [];

    return sponsorService.createResponse({
      success: true,
      templates: templates.map((t: any) => ({
        id: t.id,
        name: t.name
      })),
      count: templates.length,
      page,
      message: templates.length > 0
        ? `Found ${templates.length} template(s) on page ${page}. Use template_id or template_name with action 'create' to create a task from a template.`
        : `No templates found on page ${page}. Try page 0 or create templates in ClickUp first.`
    });
  } catch (error: any) {
    logger.error('Error listing templates', { error: error.message });
    return sponsorService.createErrorResponse(
      `Failed to list templates: ${error.message}`
    );
  }
}

/**
 * Create a new task from a template
 */
async function handleCreateFromTemplate(params: any) {
  const { template_id, template_name, list_id, list_name, name } = params;

  // Validate required parameter: name
  if (!name) {
    return sponsorService.createErrorResponse(
      "Missing required parameter: 'name'. Provide a name for the new task."
    );
  }

  // Validate template identification
  if (!template_id && !template_name) {
    return sponsorService.createErrorResponse(
      "Provide template_id or template_name. Use apply_template with action 'list' to see available templates."
    );
  }

  // Validate list identification
  if (!list_id && !list_name) {
    return sponsorService.createErrorResponse(
      "Provide list_id or list_name to specify where the task should be created."
    );
  }

  try {
    const { template: templateService, workspace: workspaceService } = clickUpServices;

    // Resolve list ID
    let resolvedListId = list_id;
    if (!resolvedListId && list_name) {
      const listResult = await findListIDByName(workspaceService, list_name);
      if (!listResult) {
        return sponsorService.createErrorResponse(
          `List '${list_name}' not found. Use get_workspace_hierarchy to see available lists.`
        );
      }
      resolvedListId = listResult.id;
      logger.debug(`Resolved list name '${list_name}' to ID: ${resolvedListId}`);
    }

    // Resolve template ID
    let resolvedTemplateId = template_id;
    if (!resolvedTemplateId && template_name) {
      resolvedTemplateId = await resolveTemplateIdByName(templateService, template_name);
      if (!resolvedTemplateId) {
        return sponsorService.createErrorResponse(
          `Template '${template_name}' not found. Use apply_template with action 'list' to see available templates.`
        );
      }
      logger.debug(`Resolved template name '${template_name}' to ID: ${resolvedTemplateId}`);
    }

    // Create task from template
    logger.info('Creating task from template', {
      templateId: resolvedTemplateId,
      listId: resolvedListId,
      taskName: name
    });

    const result = await templateService.createTaskFromTemplate(resolvedListId!, resolvedTemplateId!, name);

    // The API returns the created task directly or within a wrapper
    const task = result;
    const taskId = task?.id;
    const taskUrl = task?.url;

    return sponsorService.createResponse({
      success: true,
      message: `Task '${name}' created successfully from template${template_name ? ` '${template_name}'` : ''}.`,
      task: {
        id: taskId,
        name: task?.name || name,
        url: taskUrl,
        status: task?.status?.status,
        list: {
          id: task?.list?.id || resolvedListId,
          name: task?.list?.name
        }
      }
    });
  } catch (error: any) {
    logger.error('Error creating task from template', { error: error.message });
    return sponsorService.createErrorResponse(
      `Failed to create task from template: ${error.message}`
    );
  }
}

//=============================================================================
// HELPER FUNCTIONS
//=============================================================================

/**
 * Resolve a template ID from a template name using fuzzy matching.
 * Fetches templates page by page (up to a reasonable limit) and finds
 * the best match.
 */
async function resolveTemplateIdByName(
  templateService: any,
  templateName: string
): Promise<string | null> {
  const normalizedSearch = templateName.toLowerCase().trim();
  let page = 0;
  const maxPages = 5; // Safety limit to avoid infinite loops

  while (page < maxPages) {
    const result = await templateService.listTaskTemplates(page);
    const templates = result.templates || [];

    if (templates.length === 0) {
      break; // No more templates
    }

    // Exact match first
    const exactMatch = templates.find(
      (t: any) => t.name.toLowerCase() === normalizedSearch
    );
    if (exactMatch) {
      return exactMatch.id;
    }

    // Fuzzy match: check if template name contains search term or vice versa
    const fuzzyMatch = templates.find(
      (t: any) =>
        t.name.toLowerCase().includes(normalizedSearch) ||
        normalizedSearch.includes(t.name.toLowerCase())
    );
    if (fuzzyMatch) {
      logger.info(`Fuzzy matched template name '${templateName}' to '${fuzzyMatch.name}'`);
      return fuzzyMatch.id;
    }

    page++;
  }

  return null;
}
