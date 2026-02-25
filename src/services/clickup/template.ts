/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Template Service
 *
 * Provides methods for listing workspace task templates and creating
 * tasks from templates via the ClickUp API.
 */

import { BaseClickUpService } from './base.js';

export class TemplateService extends BaseClickUpService {
  /**
   * List available task templates in the workspace.
   * @param page - Page number for pagination (default: 0)
   * @returns Template list response from ClickUp API
   */
  async listTaskTemplates(page: number = 0): Promise<any> {
    this.logOperation('listTaskTemplates', { page });

    return this.makeRequest(async () => {
      const response = await this.client.get(`/team/${this.teamId}/taskTemplate`, {
        params: { page }
      });
      return response.data;
    });
  }

  /**
   * Create a new task from a template in a specific list.
   * @param listId - Target list ID where the task will be created
   * @param templateId - Template ID to use (format: t-xxx)
   * @param name - Name for the new task
   * @returns Created task response from ClickUp API
   */
  async createTaskFromTemplate(listId: string, templateId: string, name: string): Promise<any> {
    this.logOperation('createTaskFromTemplate', { listId, templateId, name });

    return this.makeRequest(async () => {
      const response = await this.client.post(`/list/${listId}/taskTemplate/${templateId}`, {
        name
      });
      return response.data;
    });
  }
}
