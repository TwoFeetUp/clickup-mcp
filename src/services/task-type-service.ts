/**
 * SPDX-FileCopyrightText: (c) 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * Task Type Service
 *
 * This service manages ClickUp custom task types (also known as custom items).
 * It fetches available task types at startup and provides mapping between
 * friendly names (e.g., "milestone", "Bug/Issue") and numeric IDs used by the API.
 *
 * Key Features:
 * - Fetches task types once at startup
 * - Provides name-to-ID mapping with case-insensitive matching
 * - Normalizes names for flexible matching (Bug/Issue -> bug_issue)
 * - Returns available types for dynamic tool schema generation
 * - Caches results to avoid repeated API calls
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../logger.js';
import { ClickUpCustomItem } from './clickup/types.js';

/**
 * Response from GET /team/{team_id}/custom_item endpoint
 */
interface CustomItemsResponse {
  custom_items: ClickUpCustomItem[];
}

/**
 * Task Type Service Class
 * Singleton service for managing custom task type mappings
 */
class TaskTypeService {
  private taskTypes: ClickUpCustomItem[] = [];
  private nameToIdMap: Map<string, number> = new Map();
  private idToNameMap: Map<number, string> = new Map();
  private initialized: boolean = false;
  private logger: Logger;
  private api: AxiosInstance;

  constructor() {
    this.logger = new Logger('TaskTypeService');
  }

  /**
   * Initialize the service by fetching task types from ClickUp API
   * @param teamId - The ClickUp team/workspace ID
   * @param apiKey - The ClickUp API key
   */
  async initialize(teamId: string, apiKey: string): Promise<void> {
    if (this.initialized) {
      this.logger.info('Task type service already initialized, skipping');
      return;
    }

    this.logger.info('Initializing task type service...', { teamId });

    // Create axios instance for API calls
    this.api = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    try {
      // Fetch custom task types from ClickUp API
      const response = await this.api.get<CustomItemsResponse>(`/team/${teamId}/custom_item`);
      this.taskTypes = response.data.custom_items || [];

      // Build name-to-ID and ID-to-name mappings
      this.buildMappings();

      this.initialized = true;
      this.logger.info(`Successfully loaded ${this.taskTypes.length} task types`, {
        types: this.taskTypes.map(t => t.name)
      });

    } catch (error: any) {
      // If custom task types endpoint fails, continue with empty mappings
      // This allows the server to work even if custom types aren't available
      this.logger.warn('Failed to load custom task types, continuing with defaults', {
        error: error.message,
        status: error.response?.status
      });
      this.initialized = true; // Mark as initialized even if it failed
    }
  }

  /**
   * Build name-to-ID and ID-to-name mappings
   * Creates multiple entries for flexible matching:
   * - Original name (e.g., "Bug/Issue")
   * - Lowercase name (e.g., "bug/issue")
   * - Normalized name (e.g., "bug_issue", "bugissue")
   */
  private buildMappings(): void {
    this.nameToIdMap.clear();
    this.idToNameMap.clear();

    for (const type of this.taskTypes) {
      // Store ID to original name mapping
      this.idToNameMap.set(type.id, type.name);

      // Store original name
      this.nameToIdMap.set(type.name, type.id);

      // Store lowercase version
      const lowerName = type.name.toLowerCase();
      this.nameToIdMap.set(lowerName, type.id);

      // Store normalized version (replace non-alphanumeric with underscore)
      const normalizedName = type.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      this.nameToIdMap.set(normalizedName, type.id);

      // Store version without special chars at all
      const compactName = type.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      this.nameToIdMap.set(compactName, type.id);
    }

    this.logger.debug('Built task type mappings', {
      totalTypes: this.taskTypes.length,
      totalMappings: this.nameToIdMap.size
    });
  }

  /**
   * Get the numeric ID for a given task type name
   * @param name - The task type name (case-insensitive)
   * @returns The numeric ID, or undefined if not found
   *
   * @example
   * getIdFromName("milestone") // returns 1
   * getIdFromName("Bug/Issue") // returns 1002
   * getIdFromName("bug_issue") // returns 1002 (normalized)
   * getIdFromName("bugissue") // returns 1002 (compact)
   */
  getIdFromName(name: string): number | undefined {
    if (!name) return undefined;

    // Try exact match first
    const id = this.nameToIdMap.get(name);
    if (id !== undefined) return id;

    // Try lowercase match
    const lowerId = this.nameToIdMap.get(name.toLowerCase());
    if (lowerId !== undefined) return lowerId;

    // Try normalized match
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const normalizedId = this.nameToIdMap.get(normalized);
    if (normalizedId !== undefined) return normalizedId;

    // Try compact match
    const compact = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.nameToIdMap.get(compact);
  }

  /**
   * Get the original name for a given task type ID
   * @param id - The numeric task type ID
   * @returns The original name, or undefined if not found
   *
   * @example
   * getNameFromId(1) // returns "milestone"
   * getNameFromId(1002) // returns "Bug/Issue"
   */
  getNameFromId(id: number): string | undefined {
    return this.idToNameMap.get(id);
  }

  /**
   * Get all available task type names
   * @returns Array of task type names
   *
   * @example
   * getAvailableTypes() // ["milestone", "form_response", "Bug/Issue", ...]
   */
  getAvailableTypes(): string[] {
    return this.taskTypes.map(t => t.name);
  }

  /**
   * Get all task types with full details
   * @returns Array of ClickUpCustomItem objects
   */
  getAllTaskTypes(): ClickUpCustomItem[] {
    return [...this.taskTypes]; // Return copy to prevent mutations
  }

  /**
   * Get a task type by ID with full details
   * @param id - The numeric task type ID
   * @returns The ClickUpCustomItem object, or undefined if not found
   */
  getTaskTypeById(id: number): ClickUpCustomItem | undefined {
    return this.taskTypes.find(t => t.id === id);
  }

  /**
   * Get a task type by name with full details
   * @param name - The task type name (case-insensitive)
   * @returns The ClickUpCustomItem object, or undefined if not found
   */
  getTaskTypeByName(name: string): ClickUpCustomItem | undefined {
    const id = this.getIdFromName(name);
    if (id === undefined) return undefined;
    return this.getTaskTypeById(id);
  }

  /**
   * Check if the service has been initialized
   * @returns true if initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get count of available task types
   * @returns Number of task types
   */
  getTypeCount(): number {
    return this.taskTypes.length;
  }

  /**
   * Find the closest matching task type name (for error suggestions)
   * @param input - The input string to match
   * @returns The closest matching task type name, or undefined
   */
  findClosestMatch(input: string): string | undefined {
    if (!input || this.taskTypes.length === 0) return undefined;

    const lowerInput = input.toLowerCase();
    const matches: Array<{ name: string; score: number }> = [];

    for (const type of this.taskTypes) {
      const lowerName = type.name.toLowerCase();

      // Exact match
      if (lowerName === lowerInput) {
        return type.name;
      }

      // Calculate similarity score
      let score = 0;

      // Starts with
      if (lowerName.startsWith(lowerInput)) score += 5;

      // Contains
      if (lowerName.includes(lowerInput)) score += 3;

      // Levenshtein-like simple similarity
      const commonChars = lowerInput.split('').filter(c => lowerName.includes(c)).length;
      score += commonChars;

      if (score > 0) {
        matches.push({ name: type.name, score });
      }
    }

    // Return best match if any
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      return matches[0].name;
    }

    return undefined;
  }

  /**
   * Reset the service (useful for testing)
   */
  reset(): void {
    this.taskTypes = [];
    this.nameToIdMap.clear();
    this.idToNameMap.clear();
    this.initialized = false;
    this.logger.info('Task type service reset');
  }
}

// Export singleton instance
export const taskTypeService = new TaskTypeService();
