/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * Response Formatter Utilities
 *
 * Provides normalization, field selection, and detail level control for MCP responses
 * Following MCP design principles for token efficiency and AI-first design
 */

import { Logger } from '../logger.js';
import { estimateTokensFromObject } from './token-utils.js';

const logger = new Logger('ResponseFormatter');

/**
 * Detail level for responses
 * - minimal: Only essential fields (IDs, names, status)
 * - standard: Common fields needed for most operations (default)
 * - detailed: All available fields including metadata
 */
export type DetailLevel = 'minimal' | 'standard' | 'detailed';

/**
 * Options for formatting responses
 */
export interface FormatOptions {
  /** Detail level for response */
  detailLevel?: DetailLevel;

  /** Specific fields to include (overrides detail level) */
  fields?: string[];

  /** Maximum tokens for response (triggers pagination/truncation) */
  maxTokens?: number;

  /** Include token usage metadata */
  includeMetadata?: boolean;

  /** Include custom fields even if they have no value (default: false) */
  includeEmptyCustomFields?: boolean;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Formatted response with optional metadata
 */
export interface FormattedResponse<T = any> {
  data: T;
  metadata?: {
    estimatedTokens?: number;
    detailLevel?: DetailLevel;
    fieldsIncluded?: string[];
    pagination?: PaginationInfo;
    truncated?: boolean;
    note?: string; // Additional context about the response
  };
}

/**
 * Field definitions for detail levels
 */
const FIELD_DEFINITIONS = {
  task: {
    minimal: ['id', 'name', 'status', 'list'],
    standard: ['id', 'name', 'status', 'list', 'assignees', 'due_date', 'priority', 'tags', 'custom_fields'],
    detailed: ['*'] // All fields
  },
  list: {
    minimal: ['id', 'name', 'folder'],
    standard: ['id', 'name', 'folder', 'space', 'task_count', 'archived'],
    detailed: ['*']
  },
  folder: {
    minimal: ['id', 'name', 'space'],
    standard: ['id', 'name', 'space', 'lists', 'archived'],
    detailed: ['*']
  },
  member: {
    minimal: ['id', 'username', 'email'],
    standard: ['id', 'username', 'email', 'role', 'date_joined'],
    detailed: ['*']
  },
  document: {
    minimal: ['id', 'name', 'type'],
    standard: ['id', 'name', 'type', 'parent', 'date_created', 'date_updated'],
    detailed: ['*']
  }
};

/**
 * Remove null, undefined, empty arrays, and empty objects from data
 * Only applies at minimal and standard detail levels to save tokens
 */
export function removeEmptyFields<T extends Record<string, any>>(
  obj: T,
  recursive: boolean = true
): Partial<T> {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip null and undefined
    if (value === null || value === undefined) continue;

    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) continue;

    // Skip empty objects (but not Date objects, etc.)
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.constructor === Object &&
      Object.keys(value).length === 0
    ) continue;

    // Recursively clean nested objects if requested
    if (recursive && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      const cleanedNested = removeEmptyFields(value, true);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (recursive && Array.isArray(value)) {
      // Clean array elements
      const cleanedArray = value
        .map(item => typeof item === 'object' && item.constructor === Object ? removeEmptyFields(item, true) : item)
        .filter(item => item !== null && item !== undefined);
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Simplify nested objects to reduce token usage
 * - status: object → string
 * - assignees: full objects → usernames array
 * - list/folder/space: full objects → name string
 * - custom_fields: smart filtering based on includeEmptyFields flag
 */
export function simplifyNestedObjects(
  obj: any,
  detailLevel: DetailLevel,
  includeEmptyFields: boolean = false
): any {
  if (!obj || typeof obj !== 'object') return obj;

  const simplified: any = { ...obj };

  // Smart custom_fields handling:
  // - includeEmptyFields=false (default): only show fields with values
  // - includeEmptyFields=true: show all fields, indicate which have values
  if (Array.isArray(simplified.custom_fields)) {
    if (includeEmptyFields) {
      // Show ALL fields (empty + populated)
      simplified.custom_fields = simplified.custom_fields.map((field: any) => {
        const hasValue = field.value !== undefined && field.value !== null && field.value !== '';
        const base = {
          id: field.id,
          name: field.name,
          type: field.type
        };
        return hasValue ? { ...base, value: field.value } : base;
      });
    } else {
      // Default: only show fields with values (token-efficient)
      const fieldsWithValues = simplified.custom_fields.filter((field: any) =>
        field.value !== undefined && field.value !== null && field.value !== ''
      );

      if (fieldsWithValues.length === 0) {
        // No values - remove entirely to save tokens
        delete simplified.custom_fields;
      } else if (detailLevel === 'minimal' || detailLevel === 'standard') {
        // Simplify to just essential data: {id, name, value}
        simplified.custom_fields = fieldsWithValues.map((field: any) => ({
          id: field.id,
          name: field.name,
          value: field.value
        }));
      } else {
        // Detailed level: simplify but keep type info, remove type_config bloat
        simplified.custom_fields = fieldsWithValues.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          value: field.value
        }));
      }
    }
  }

  // Remove sharing object - it's workspace-level config, identical across all tasks
  if (simplified.sharing) {
    delete simplified.sharing;
  }

  // Only simplify user objects at minimal/standard levels
  if (detailLevel === 'minimal' || detailLevel === 'standard') {
    // Simplify status: {status: "open", ...} → "open"
    if (simplified.status && typeof simplified.status === 'object') {
      simplified.status = simplified.status.status || simplified.status;
    }

    // Simplify assignees: [{id, username, email, ...}] → ["username"]
    if (Array.isArray(simplified.assignees)) {
      simplified.assignees = simplified.assignees.map((a: any) => {
        if (typeof a === 'object' && a.username) {
          return a.username;
        }
        return a;
      });
    }

    // Simplify list/folder/space: {id, name, ...} → "name"
    if (simplified.list && typeof simplified.list === 'object') {
      simplified.list = simplified.list.name || simplified.list;
    }
    if (simplified.folder && typeof simplified.folder === 'object') {
      simplified.folder = simplified.folder.name || simplified.folder;
    }
    if (simplified.space && typeof simplified.space === 'object') {
      simplified.space = simplified.space.name || simplified.space;
    }

    // Simplify creator/watchers - keep only username
    if (simplified.creator && typeof simplified.creator === 'object') {
      simplified.creator = simplified.creator.username || simplified.creator;
    }
    if (Array.isArray(simplified.watchers)) {
      simplified.watchers = simplified.watchers.map((w: any) =>
        typeof w === 'object' && w.username ? w.username : w
      );
    }
  }

  return simplified;
}

/**
 * Get fields to include based on detail level and entity type
 */
function getFieldsForDetailLevel(
  entityType: keyof typeof FIELD_DEFINITIONS,
  detailLevel: DetailLevel
): string[] | null {
  const fields = FIELD_DEFINITIONS[entityType]?.[detailLevel];
  if (!fields) return null;
  return fields[0] === '*' ? null : fields; // null means all fields
}

/**
 * Filter object to include only specified fields
 */
function filterFields<T extends Record<string, any>>(
  obj: T,
  fields: string[] | null
): Partial<T> {
  if (!fields || fields[0] === '*') {
    return obj; // Include all fields
  }

  const filtered: any = {};
  const fieldSet = new Set(fields);

  for (const key of Object.keys(obj)) {
    if (fieldSet.has(key)) {
      filtered[key] = obj[key];
    }
  }

  return filtered;
}

/**
 * Normalize an array of objects by extracting common values
 * Reduces token usage by 60-90% for repetitive data
 *
 * Example:
 * Input: [{ name: "Task 1", status: "open", list: { id: "123", name: "Todo" } }, ...]
 * Output: {
 *   common: { list: { id: "123", name: "Todo" } },
 *   items: [{ name: "Task 1", status: "open" }, ...]
 * }
 */
export function normalizeArray<T extends Record<string, any>>(
  items: T[],
  options: { threshold?: number } = {}
): { common: Record<string, any>; items: Partial<T>[] } {
  if (items.length === 0) {
    return { common: {}, items: [] };
  }

  const threshold = options.threshold || 0.8; // 80% of items must share value
  const commonFields: Record<string, any> = {};
  const normalizedItems: Partial<T>[] = [];

  // Find common fields (present in >= threshold % of items with same value)
  const firstItem = items[0];
  for (const key of Object.keys(firstItem)) {
    const value = firstItem[key];

    // Skip if value is null/undefined
    if (value === null || value === undefined) continue;

    // Count how many items have the same value
    const matchCount = items.filter(item =>
      JSON.stringify(item[key]) === JSON.stringify(value)
    ).length;

    const matchRatio = matchCount / items.length;

    // If this field has the same value in >= threshold % of items, extract it
    if (matchRatio >= threshold) {
      commonFields[key] = value;
    }
  }

  // Remove common fields from items
  for (const item of items) {
    const normalized: any = {};
    for (const key of Object.keys(item)) {
      if (!(key in commonFields)) {
        normalized[key] = item[key];
      }
    }
    normalizedItems.push(normalized);
  }

  return { common: commonFields, items: normalizedItems };
}

/**
 * Format response with detail level and field selection
 */
export function formatResponse<T>(
  data: T,
  options: FormatOptions = {}
): FormattedResponse<T> {
  const {
    detailLevel = 'standard',
    fields,
    maxTokens,
    includeMetadata = false,
    includeEmptyCustomFields = false
  } = options;

  let processedData = data;

  // Apply field filtering for arrays
  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0];

    // Determine entity type from first item
    let entityType: keyof typeof FIELD_DEFINITIONS | null = null;
    if (firstItem && typeof firstItem === 'object') {
      if ('list' in firstItem || 'custom_fields' in firstItem) {
        entityType = 'task';
      } else if ('task_count' in firstItem) {
        entityType = 'list';
      } else if ('lists' in firstItem && 'space' in firstItem) {
        entityType = 'folder';
      } else if ('username' in firstItem) {
        entityType = 'member';
      } else if ('pages' in firstItem || 'parent' in firstItem) {
        entityType = 'document';
      }
    }

    // Get fields to include
    const fieldsToInclude = fields ||
      (entityType ? getFieldsForDetailLevel(entityType, detailLevel) : null);

    // Process each item: filter fields, simplify objects, remove empty fields
    processedData = data.map(item => {
      let processed = item;

      // Apply field filtering
      if (fieldsToInclude) {
        processed = filterFields(processed, fieldsToInclude);
      }

      // Simplify nested objects (at minimal/standard levels)
      processed = simplifyNestedObjects(processed, detailLevel, includeEmptyCustomFields);

      // Remove null/empty fields (at minimal/standard levels only)
      if (detailLevel === 'minimal' || detailLevel === 'standard') {
        processed = removeEmptyFields(processed);
      }

      return processed;
    }) as T;
  } else if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Apply processing for single object
    let processed: any = data;

    if (fields) {
      processed = filterFields(processed, fields);
    }

    // Simplify nested objects
    processed = simplifyNestedObjects(processed, detailLevel, includeEmptyCustomFields);

    // Remove null/empty fields (at minimal/standard levels only)
    if (detailLevel === 'minimal' || detailLevel === 'standard') {
      processed = removeEmptyFields(processed);
    }

    processedData = processed as T;
  }

  const response: FormattedResponse<T> = {
    data: processedData
  };

  // Add metadata if requested
  if (includeMetadata) {
    const estimatedTokens = estimateTokensFromObject(processedData);
    response.metadata = {
      estimatedTokens,
      detailLevel,
      fieldsIncluded: fields
    };

    // Check if response exceeds token limit
    if (maxTokens && estimatedTokens > maxTokens) {
      response.metadata.truncated = true;
      logger.warn('Response exceeds token limit', {
        estimated: estimatedTokens,
        limit: maxTokens
      });
    }
  }

  return response;
}

/**
 * Format response with normalization for arrays
 * Reduces token usage by extracting common values
 */
export function formatNormalizedResponse<T extends Record<string, any>>(
  data: T[],
  options: FormatOptions = {}
): FormattedResponse<{ common: Record<string, any>; items: Partial<T>[] }> {
  const {
    detailLevel = 'standard',
    fields,
    includeMetadata = false
  } = options;

  // Apply field filtering first if specified
  let processedData = data;
  if (fields) {
    processedData = data.map(item => filterFields(item, fields)) as T[];
  }

  // Normalize the array
  const normalized = normalizeArray(processedData);

  const response: FormattedResponse<typeof normalized> = {
    data: normalized
  };

  // Add metadata if requested
  if (includeMetadata) {
    const estimatedTokens = estimateTokensFromObject(normalized);
    response.metadata = {
      estimatedTokens,
      detailLevel,
      fieldsIncluded: fields
    };
  }

  return response;
}

/**
 * Apply pagination to an array with metadata
 */
export function paginate<T>(
  items: T[],
  offset: number = 0,
  limit: number = 50
): { items: T[]; pagination: PaginationInfo } {
  const total = items.length;
  const paginatedItems = items.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    items: paginatedItems,
    pagination: {
      offset,
      limit,
      total,
      hasMore
    }
  };
}

/**
 * Format a summary message for AI consumption
 * Creates human-readable summaries that AI can use directly in responses
 */
export function formatSummary(
  operation: string,
  result: any,
  details?: string
): string {
  const parts: string[] = [operation];

  if (typeof result === 'object' && result !== null) {
    if ('total' in result) {
      parts.push(`(${result.total} items)`);
    } else if (Array.isArray(result)) {
      parts.push(`(${result.length} items)`);
    }
  }

  if (details) {
    parts.push('-', details);
  }

  return parts.join(' ');
}

/**
 * Create an error response with suggestions
 * Provides actionable guidance for AI to recover from errors
 */
export function formatError(
  error: Error | string,
  suggestions?: string[]
): { error: string; suggestions?: string[] } {
  const errorMessage = typeof error === 'string' ? error : error.message;

  const response: { error: string; suggestions?: string[] } = {
    error: errorMessage
  };

  if (suggestions && suggestions.length > 0) {
    response.suggestions = suggestions;
  }

  return response;
}

/**
 * Estimate if operation should use normalized format
 * Based on array size and estimated savings
 */
export function shouldNormalize(items: any[]): boolean {
  // Only normalize if we have multiple items
  if (items.length < 3) return false;

  // Check if items have common fields
  if (items.length > 0) {
    const firstItem = items[0];
    if (typeof firstItem !== 'object') return false;

    // Count repeated values
    const keys = Object.keys(firstItem);
    let commonFieldCount = 0;

    for (const key of keys) {
      const value = firstItem[key];
      const matchCount = items.filter(item =>
        JSON.stringify(item[key]) === JSON.stringify(value)
      ).length;

      if (matchCount >= items.length * 0.8) {
        commonFieldCount++;
      }
    }

    // If more than 30% of fields are common, normalize
    return commonFieldCount / keys.length >= 0.3;
  }

  return false;
}
