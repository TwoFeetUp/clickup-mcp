/**
 * SPDX-FileCopyrightText: (c) 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Custom Fields Module
 *
 * Handles custom fields operations for ClickUp tasks, including:
 * - Setting custom field values with automatic format transformation
 * - Retrieving custom field values
 * - Verifying updates were persisted
 *
 * IMPORTANT: Different custom field types require different value formats:
 * - Simple types (drop_down, text, number): raw value
 * - Relationship types (tasks, users, list_relationship): { add: [...], rem: [] }
 *
 * REFACTORED: Now uses composition instead of inheritance.
 * Only depends on TaskServiceCore for getTask() and base functionality.
 */

import { TaskServiceCore } from './task-core.js';
import { ErrorCode } from '../base.js';
import { transformCustomFieldValue, isRelationshipFieldType } from '../types.js';
import { workspaceCache } from '../../../utils/cache-service.js';
import { Logger } from '../../../logger.js';

const logger = new Logger('TaskServiceCustomFields');

/**
 * Interface for custom field value
 */
export interface CustomFieldValue {
  id: string;
  value: any;
}

/**
 * Result of setting a custom field value
 */
export interface SetCustomFieldResult {
  success: boolean;
  verified: boolean;
  fieldId: string;
  fieldType?: string;
  error?: string;
}

/**
 * Custom field metadata from the API
 */
interface CustomFieldMeta {
  id: string;
  name: string;
  type: string;
}

/**
 * Custom fields functionality for the TaskService
 *
 * This service handles all custom field operations for ClickUp tasks.
 * It uses composition to access core functionality instead of inheritance.
 */
export class TaskServiceCustomFields {
  // Cache field types by field ID for quick lookup
  private fieldTypeCache: Map<string, string> = new Map();

  constructor(private core: TaskServiceCore) {}

  /**
   * Get custom field metadata for a list (with caching)
   *
   * @param listId The list ID to get custom fields for
   * @returns Array of custom field metadata
   */
  async getAccessibleCustomFields(listId: string): Promise<CustomFieldMeta[]> {
    // Check workspace cache first
    const cached = workspaceCache.getCustomFields(listId);
    if (cached) {
      logger.debug('Custom fields cache hit', { listId });
      // Update local type cache
      for (const field of cached) {
        this.fieldTypeCache.set(field.id, field.type);
      }
      return cached as CustomFieldMeta[];
    }

    logger.debug('Custom fields cache miss, fetching from API', { listId });

    try {
      const response = await (this.core as any).makeRequest(async () => {
        return await (this.core as any).client.get(`/list/${listId}/field`);
      });

      const fields: CustomFieldMeta[] = response.data.fields || [];

      // Cache the fields
      workspaceCache.setCustomFields(listId, fields);

      // Update local type cache
      for (const field of fields) {
        this.fieldTypeCache.set(field.id, field.type);
      }

      return fields;
    } catch (error) {
      logger.warn('Failed to get custom fields for list', { listId, error });
      return [];
    }
  }

  /**
   * Get the field type for a custom field ID
   * Uses cached data when available, falls back to task lookup
   *
   * @param fieldId The custom field ID
   * @param taskId Optional task ID to help find the list for field lookup
   * @returns The field type or 'unknown'
   */
  async getFieldType(fieldId: string, taskId?: string): Promise<string> {
    // Check local cache first
    if (this.fieldTypeCache.has(fieldId)) {
      return this.fieldTypeCache.get(fieldId)!;
    }

    // If we have a task ID, we can get the list and then the field metadata
    if (taskId) {
      try {
        const task = await this.core.getTask(taskId);
        const listId = task.list?.id;

        if (listId) {
          await this.getAccessibleCustomFields(listId);

          // Check cache again after fetching
          if (this.fieldTypeCache.has(fieldId)) {
            return this.fieldTypeCache.get(fieldId)!;
          }
        }

        // Also check if the field is in the task's custom_fields array
        if (task.custom_fields && Array.isArray(task.custom_fields)) {
          const taskField = task.custom_fields.find((f: any) => f.id === fieldId);
          if (taskField?.type) {
            this.fieldTypeCache.set(fieldId, taskField.type);
            return taskField.type;
          }
        }
      } catch (error) {
        logger.warn('Failed to get field type via task lookup', { fieldId, taskId, error });
      }
    }

    return 'unknown';
  }

  /**
   * Set a single custom field value on a task
   * Automatically transforms values for relationship field types
   * Verifies the update was persisted
   *
   * @param taskId ID of the task
   * @param fieldId ID of the custom field
   * @param value Value to set for the custom field
   * @param options Optional settings (skipVerification, knownFieldType)
   * @returns Result with success status and verification info
   */
  async setCustomFieldValue(
    taskId: string,
    fieldId: string,
    value: any,
    options?: { skipVerification?: boolean; knownFieldType?: string }
  ): Promise<SetCustomFieldResult> {
    (this.core as any).logOperation('setCustomFieldValue', { taskId, fieldId, value });

    try {
      // Get field type for transformation
      const fieldType = options?.knownFieldType ?? await this.getFieldType(fieldId, taskId);

      // Transform value based on field type
      const transformedValue = transformCustomFieldValue(value, fieldType);

      const wasTransformed = transformedValue !== value;
      if (wasTransformed) {
        logger.info('Transformed custom field value', {
          fieldId,
          fieldType,
          original: value,
          transformed: transformedValue
        });
      }

      const payload = { value: transformedValue };

      await (this.core as any).makeRequest(async () => {
        return await (this.core as any).client.post(
          `/task/${taskId}/field/${fieldId}`,
          payload
        );
      });

      // Verify the update if not skipped
      if (!options?.skipVerification) {
        const task = await this.core.getTask(taskId);
        const updatedField = task.custom_fields?.find?.((f: any) => f.id === fieldId);

        // Check if the field has a value now
        const hasValue = updatedField?.value !== undefined && updatedField?.value !== null;

        if (!hasValue && isRelationshipFieldType(fieldType)) {
          // For relationship fields, empty value means the update failed
          logger.warn('Custom field update verification failed - field is empty after update', {
            taskId,
            fieldId,
            fieldType,
            sentValue: transformedValue
          });

          return {
            success: false,
            verified: true,
            fieldId,
            fieldType,
            error: `Field "${fieldId}" (type: ${fieldType}) was not updated. The value may be in the wrong format or the referenced items may not exist.`
          };
        }

        return {
          success: true,
          verified: true,
          fieldId,
          fieldType
        };
      }

      return {
        success: true,
        verified: false,
        fieldId,
        fieldType
      };
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to set custom field "${fieldId}" value`);
    }
  }

  /**
   * Set a single custom field value on a task (legacy method for backwards compatibility)
   * Returns boolean for backwards compatibility with existing callers
   *
   * @deprecated Use setCustomFieldValue with result checking instead
   */
  async setCustomFieldValueSimple(taskId: string, fieldId: string, value: any): Promise<boolean> {
    const result = await this.setCustomFieldValue(taskId, fieldId, value, { skipVerification: true });
    return result.success;
  }

  /**
   * Set multiple custom field values on a task
   * Returns detailed results including which fields succeeded/failed
   *
   * @param taskId ID of the task
   * @param customFields Array of custom field ID and value pairs
   * @param options Optional settings (skipVerification)
   * @returns Array of results for each field
   */
  async setCustomFieldValues(
    taskId: string,
    customFields: CustomFieldValue[],
    options?: { skipVerification?: boolean }
  ): Promise<SetCustomFieldResult[]> {
    (this.core as any).logOperation('setCustomFieldValues', { taskId, customFields });

    const results: SetCustomFieldResult[] = [];

    try {
      // Execute each update sequentially
      for (const field of customFields) {
        const result = await this.setCustomFieldValue(taskId, field.id, field.value, {
          skipVerification: options?.skipVerification
        });
        results.push(result);
      }

      // Log summary
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        logger.warn('Some custom field updates failed', {
          taskId,
          total: results.length,
          failed: failed.length,
          failedFields: failed.map(f => ({ id: f.fieldId, type: f.fieldType, error: f.error }))
        });
      }

      return results;
    } catch (error) {
      throw (this.core as any).handleError(error, 'Failed to set custom field values');
    }
  }

  /**
   * Set multiple custom field values (legacy method for backwards compatibility)
   * Returns boolean for backwards compatibility with existing callers
   *
   * @deprecated Use setCustomFieldValues with result checking instead
   */
  async setCustomFieldValuesSimple(taskId: string, customFields: CustomFieldValue[]): Promise<boolean> {
    const results = await this.setCustomFieldValues(taskId, customFields, { skipVerification: true });
    return results.every(r => r.success);
  }

  /**
   * Get all custom field values for a task
   *
   * @param taskId ID of the task
   * @returns Record mapping field IDs to their values
   */
  async getCustomFieldValues(taskId: string): Promise<Record<string, any>> {
    (this.core as any).logOperation('getCustomFieldValues', { taskId });

    try {
      // We need to fetch the full task to get its custom fields
      const task = await this.core.getTask(taskId);
      return task.custom_fields || {};
    } catch (error) {
      throw (this.core as any).handleError(error, 'Failed to get custom field values');
    }
  }

  /**
   * Get a specific custom field value for a task
   * 
   * @param taskId ID of the task
   * @param fieldId ID of the custom field
   * @returns The value of the custom field
   * @throws ClickUpServiceError if the field doesn't exist
   */
  async getCustomFieldValue(taskId: string, fieldId: string): Promise<any> {
    (this.core as any).logOperation('getCustomFieldValue', { taskId, fieldId });

    try {
      const customFields = await this.getCustomFieldValues(taskId);

      if (fieldId in customFields) {
        return customFields[fieldId];
      } else {
        throw (this.core as any).handleError(
          new Error(`Custom field "${fieldId}" not found on task`),
          `Custom field "${fieldId}" not found on task`
        );
      }
    } catch (error) {
      throw (this.core as any).handleError(error, `Failed to get custom field "${fieldId}" value`);
    }
  }
} 