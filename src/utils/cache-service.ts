/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Cache Service
 *
 * Provides caching for frequently accessed data to reduce API calls
 * Implements TTL-based expiration and cache invalidation
 */

import { Logger } from '../logger.js';

const logger = new Logger('CacheService');

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;

  /** Optional key prefix for namespacing */
  prefix?: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Generic cache service with TTL support
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  constructor(private defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    logger.info('CacheService initialized', { defaultTTL });

    // Periodically clean up expired entries
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      logger.debug('Cache expired', { key });
      return null;
    }

    this.hits++;
    logger.debug('Cache hit', { key });
    return entry.data as T;
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiryTime = ttl || this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      data: value,
      expiresAt: now + expiryTime,
      createdAt: now
    });

    logger.debug('Cache set', { key, ttl: expiryTime });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache deleted', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared');
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    logger.info('Cache cleared by pattern', { pattern: pattern.toString(), count });
    return count;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup', { removed });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Get or set a value (fetch if not cached)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * Workspace-specific cache with predefined TTLs
 */
export class WorkspaceCache {
  private cache: CacheService;

  // Cache TTLs (in milliseconds)
  private static readonly TTLs = {
    HIERARCHY: 5 * 60 * 1000,      // 5 minutes
    MEMBERS: 10 * 60 * 1000,       // 10 minutes
    TAGS: 15 * 60 * 1000,          // 15 minutes
    STATUSES: 30 * 60 * 1000,      // 30 minutes
    CUSTOM_FIELDS: 30 * 60 * 1000  // 30 minutes
  };

  constructor() {
    this.cache = new CacheService(WorkspaceCache.TTLs.HIERARCHY);
    logger.info('WorkspaceCache initialized');
  }

  /**
   * Get workspace hierarchy
   */
  getHierarchy(teamId: string): any | null {
    return this.cache.get(`hierarchy:${teamId}`);
  }

  /**
   * Set workspace hierarchy
   */
  setHierarchy(teamId: string, data: any): void {
    this.cache.set(`hierarchy:${teamId}`, data, WorkspaceCache.TTLs.HIERARCHY);
  }

  /**
   * Get workspace members
   */
  getMembers(teamId: string): any[] | null {
    return this.cache.get(`members:${teamId}`);
  }

  /**
   * Set workspace members
   */
  setMembers(teamId: string, members: any[]): void {
    this.cache.set(`members:${teamId}`, members, WorkspaceCache.TTLs.MEMBERS);
  }

  /**
   * Get space tags
   */
  getTags(spaceId: string): any[] | null {
    return this.cache.get(`tags:${spaceId}`);
  }

  /**
   * Set space tags
   */
  setTags(spaceId: string, tags: any[]): void {
    this.cache.set(`tags:${spaceId}`, tags, WorkspaceCache.TTLs.TAGS);
  }

  /**
   * Get custom fields for a list
   */
  getCustomFields(listId: string): any[] | null {
    return this.cache.get(`custom_fields:${listId}`);
  }

  /**
   * Set custom fields for a list
   */
  setCustomFields(listId: string, fields: any[]): void {
    this.cache.set(`custom_fields:${listId}`, fields, WorkspaceCache.TTLs.CUSTOM_FIELDS);
  }

  /**
   * Invalidate all caches for a workspace
   */
  invalidateWorkspace(teamId: string): void {
    this.cache.clearPattern(`^(hierarchy|members|tags|custom_fields):${teamId}`);
    logger.info('Workspace cache invalidated', { teamId });
  }

  /**
   * Invalidate member cache when members change
   */
  invalidateMembers(teamId: string): void {
    this.cache.delete(`members:${teamId}`);
    logger.info('Members cache invalidated', { teamId });
  }

  /**
   * Invalidate tags cache when tags change
   */
  invalidateTags(spaceId: string): void {
    this.cache.delete(`tags:${spaceId}`);
    logger.info('Tags cache invalidated', { spaceId });
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// Export singleton instances
export const cacheService = new CacheService();
export const workspaceCache = new WorkspaceCache();
