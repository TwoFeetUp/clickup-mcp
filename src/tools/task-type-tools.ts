/**
 * SPDX-FileCopyrightText: (c) 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * Task Type Tools
 *
 * Tools for discovering and working with ClickUp custom task types.
 */

import { taskTypeService } from '../services/task-type-service.js';
import { Logger } from '../logger.js';

const logger = new Logger('TaskTypeTools');

/**
 * Tool definition for listing available task types
 */
export const listTaskTypesTool = {
  name: "list_task_types",
  description: "List all available custom task types in the ClickUp workspace with their descriptions. Use this to discover what task types you can use when creating or updating tasks (e.g., milestone, Bug/Issue, Feature, etc.).",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: []
  }
};

/**
 * Handler for listing task types
 * @returns Formatted response with all available task types
 */
export async function handleListTaskTypes() {
  logger.info('Listing available task types');

  try {
    if (!taskTypeService.isInitialized()) {
      return {
        content: [{
          type: "text" as const,
          text: "Task type service not initialized. Custom task types are not available."
        }]
      };
    }

    const taskTypes = taskTypeService.getAllTaskTypes();

    if (taskTypes.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "No custom task types found in this workspace. All tasks will be created as normal tasks."
        }]
      };
    }

    // Build formatted output
    let output = `Available Task Types (${taskTypes.length}):\n\n`;

    for (const type of taskTypes) {
      output += `**${type.name}**`;
      if (type.name_plural) {
        output += ` (${type.name_plural})`;
      }
      output += `\n`;
      output += `  ID: ${type.id}\n`;

      if (type.description) {
        output += `  Description: ${type.description}\n`;
      }

      if (type.avatar?.source && type.avatar?.value) {
        output += `  Icon: ${type.avatar.source}:${type.avatar.value}\n`;
      }

      output += `\n`;
    }

    output += `\n**Usage:** When creating or updating tasks, use the \`task_type\` parameter with any of these names (case-insensitive).`;
    output += `\n\n**Examples:**\n`;
    output += `- task_type: "milestone"\n`;
    output += `- task_type: "Bug/Issue"\n`;
    output += `- task_type: "Feature"\n`;

    logger.debug(`Listed ${taskTypes.length} task types`);

    return {
      content: [{
        type: "text" as const,
        text: output
      }]
    };

  } catch (error: any) {
    logger.error('Failed to list task types', { error: error.message });
    return {
      content: [{
        type: "text" as const,
        text: `Error listing task types: ${error.message}`
      }],
      isError: true
    };
  }
}
