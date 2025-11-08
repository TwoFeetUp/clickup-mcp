/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd van Beuningen
 * SPDX-License-Identifier: MIT
 *
 * Response Service Module
 *
 * Simplified response formatting for MCP protocol
 */

import { Logger } from '../logger.js';

const logger = new Logger('ResponseService');

/**
 * ResponseService - Creates MCP-compliant responses
 */
export class ResponseService {
  /**
   * Creates a standard MCP response
   */
  public createResponse(data: any): { content: { type: string; text: string }[] } {
    const content: { type: string; text: string }[] = [];

    // Special handling for workspace hierarchy which contains a preformatted tree
    if (data && typeof data === 'object' && 'hierarchy' in data && typeof data.hierarchy === 'string') {
      content.push({
        type: "text",
        text: data.hierarchy
      });
    } else if (typeof data === 'string') {
      // If it's already a string, use it directly
      content.push({
        type: "text",
        text: data
      });
    } else {
      // Otherwise, stringify the JSON object
      content.push({
        type: "text",
        text: JSON.stringify(data, null, 2)
      });
    }

    return { content };
  }

  /**
   * Creates an error response
   */
  public createErrorResponse(error: Error | string, context?: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      error: typeof error === 'string' ? error : error.message,
      ...context
    });
  }

  /**
   * Creates a bulk operation response
   */
  public createBulkResponse(result: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      success: true,
      total: result.totals.total,
      successful: result.totals.success,
      failed: result.totals.failure,
      failures: result.failed.map((failure: any) => ({
        id: failure.item?.id || failure.item,
        error: failure.error.message
      }))
    });
  }
}

// Export a singleton instance (keeping name for compatibility with imports)
export const sponsorService = new ResponseService();
