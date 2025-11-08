/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd van Beuningen
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Consolidated Member Tool
 *
 * Unified member lookup and resolution tool combining three existing operations:
 * - find_members: Search for members by name, email, or username
 * - resolve_assignees: Batch convert member names/emails to user IDs
 * - get_workspace_members: List all workspace members
 *
 * AI-first design optimizes for:
 * - Single flexible endpoint for all member queries
 * - Intelligent response formatting based on detail level
 * - Efficient caching with 10-minute TTL for workspace members
 * - Reduced token usage through field filtering and normalization
 */

import { workspaceService } from '../services/shared.js';
import { workspaceCache } from '../utils/cache-service.js';
import { formatResponse, normalizeArray, shouldNormalize, type DetailLevel } from '../utils/response-formatter.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { Logger } from '../logger.js';

const logger = new Logger('MemberTool');

/**
 * Consolidated member tool definition combining:
 * - Member search by query
 * - Batch assignee resolution
 * - Full member list retrieval
 *
 * This single tool replaces three separate tools while improving flexibility
 */
export const findMembersTool = {
    name: 'find_members',
    description: 'Unified member management tool for workspace members. Find members by name/email, resolve assignees to user IDs, or list all members. Returns members matching the query, resolved user IDs, or the complete member list depending on parameters provided. Uses intelligent caching for efficiency.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Optional search query to find members by name, email, or username. If not provided with assignees, returns all members.'
            },
            assignees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of member names or emails to resolve to ClickUp user IDs. Returns only the resolved user IDs for each input.'
            },
            detail_level: {
                type: 'string',
                enum: ['minimal', 'standard', 'detailed'],
                description: 'Response detail level. minimal: id, username, email only. standard (default): adds role and date_joined. detailed: all fields. Reduces token usage for AI consumption.'
            }
        },
        required: [],
        additionalProperties: false
    }
};

/**
 * Options for the find_members handler
 */
interface FindMembersOptions {
    query?: string;
    assignees?: string[];
    detail_level?: DetailLevel;
}

/**
 * Member resolution result
 */
interface MemberResolutionResult {
    input: string;
    userId: string | null;
    member?: any;
    error?: string;
}

/**
 * Response for find_members handler
 */
interface FindMembersResponse {
    type: 'search' | 'resolve' | 'list';
    members?: any[];
    resolutions?: MemberResolutionResult[];
    summary: string;
    count: number;
    cacheHit?: boolean;
}

/**
 * Get workspace members with intelligent caching
 * Uses 10-minute TTL from workspaceCache
 */
async function getWorkspaceMembersWithCache(): Promise<any[]> {
    const teamId = 'workspace'; // Default workspace identifier

    // Try to get from cache first
    const cached = workspaceCache.getMembers(teamId);
    if (cached) {
        logger.debug('Using cached workspace members', { count: cached.length });
        return cached;
    }

    // Fetch from API
    logger.debug('Fetching workspace members from API');
    const members = await workspaceService.getWorkspaceMembers();

    // Cache for 10 minutes
    workspaceCache.setMembers(teamId, members);
    logger.debug('Cached workspace members', { count: members.length });

    return members;
}

/**
 * Find member by matching against name, email, or username
 * Case-insensitive matching
 */
function findMemberByQuery(members: any[], query: string): any | null {
    const lowerQuery = query.toLowerCase();

    return members.find((member: any) =>
        member.email?.toLowerCase() === lowerQuery ||
        member.username?.toLowerCase() === lowerQuery ||
        member.name?.toLowerCase() === lowerQuery ||
        member.email?.toLowerCase().includes(lowerQuery) ||
        member.name?.toLowerCase().includes(lowerQuery)
    ) || null;
}

/**
 * Find all members matching a query
 * Supports partial matches for flexibility
 */
function findMembersByQuery(members: any[], query: string): any[] {
    const lowerQuery = query.toLowerCase();

    return members.filter((member: any) =>
        member.email?.toLowerCase().includes(lowerQuery) ||
        member.username?.toLowerCase().includes(lowerQuery) ||
        member.name?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Handler for the consolidated find_members tool
 *
 * Modes of operation:
 * 1. Query provided: Search for matching members
 * 2. Assignees provided: Resolve to user IDs
 * 3. Neither: Return all members with optional filtering
 */
export async function handleFindMembers(parameters: FindMembersOptions = {}): Promise<FindMembersResponse> {
    const { query, assignees, detail_level = 'standard' } = parameters;

    try {
        // Get workspace members with caching
        const members = await getWorkspaceMembersWithCache();

        // Mode 1: Resolve assignees to user IDs (batch operation)
        if (assignees && Array.isArray(assignees) && assignees.length > 0) {
            logger.debug('Resolving assignees', { count: assignees.length });

            const resolutions: MemberResolutionResult[] = assignees.map((input: string) => {
                const found = findMemberByQuery(members, input);

                if (found) {
                    return {
                        input,
                        userId: found.id,
                        member: formatMember(found, detail_level)
                    };
                } else {
                    return {
                        input,
                        userId: null,
                        error: `Member not found: ${input}`
                    };
                }
            });

            const resolvedCount = resolutions.filter(r => r.userId).length;
            logger.info('Assignees resolved', {
                input: assignees.length,
                resolved: resolvedCount,
                failed: assignees.length - resolvedCount
            });

            return {
                type: 'resolve',
                resolutions,
                summary: `Resolved ${resolvedCount}/${assignees.length} assignees to user IDs`,
                count: resolvedCount,
                cacheHit: true
            };
        }

        // Mode 2: Search for specific member(s) by query
        if (query && typeof query === 'string' && query.trim()) {
            logger.debug('Searching for members', { query });

            // Try exact match first
            const exactMatch = findMemberByQuery(members, query);

            // If exact match found, return just that member
            if (exactMatch) {
                const result = [formatMember(exactMatch, detail_level)];
                logger.info('Member found by query', { query });

                return {
                    type: 'search',
                    members: result,
                    summary: `Found member: ${exactMatch.name || exactMatch.email}`,
                    count: 1,
                    cacheHit: true
                };
            }

            // Otherwise return all partial matches
            const matches = findMembersByQuery(members, query);
            if (matches.length > 0) {
                const formatted = matches.map(m => formatMember(m, detail_level));
                logger.info('Members found by query', { query, count: matches.length });

                return {
                    type: 'search',
                    members: formatted,
                    summary: `Found ${matches.length} member(s) matching "${query}"`,
                    count: matches.length,
                    cacheHit: true
                };
            }

            logger.debug('No members found by query', { query });
            return {
                type: 'search',
                members: [],
                summary: `No members found matching "${query}"`,
                count: 0,
                cacheHit: true
            };
        }

        // Mode 3: Return all workspace members with optimization
        logger.debug('Returning all workspace members', { count: members.length });

        // Format each member with detail level filtering
        const formatted = members.map(m => formatMember(m, detail_level));

        // Normalize if beneficial for token efficiency
        const shouldUseNormalized = shouldNormalize(formatted);

        let response: any;
        if (shouldUseNormalized) {
            const normalized = normalizeArray(formatted);
            logger.debug('Using normalized response', {
                commonFields: Object.keys(normalized.common).length,
                itemCount: normalized.items.length
            });
            response = normalized;
        } else {
            response = formatted;
        }

        return {
            type: 'list',
            members: Array.isArray(response) ? response : response.items,
            summary: `Retrieved ${members.length} workspace members`,
            count: members.length,
            cacheHit: true
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to process member request', { error: errorMessage });

        return {
            type: 'list',
            members: [],
            summary: `Error: Failed to process member request - ${errorMessage}`,
            count: 0
        };
    }
}

/**
 * Format a member object based on detail level
 * Implements field filtering for token efficiency
 */
function formatMember(member: any, detailLevel: DetailLevel): any {
    // Define fields for each detail level
    const fieldSets = {
        minimal: ['id', 'username', 'email'],
        standard: ['id', 'username', 'email', 'role', 'date_joined', 'name'],
        detailed: null // null means include all fields
    };

    const fieldsToInclude = fieldSets[detailLevel];

    if (fieldsToInclude === null) {
        // Return all fields for detailed level
        return member;
    }

    // Filter to only include specified fields
    const filtered: any = {};
    for (const field of fieldsToInclude) {
        if (field in member) {
            filtered[field] = member[field];
        }
    }

    return filtered;
}

/**
 * Backward compatibility: Export individual handlers for existing code
 * These wrap the consolidated handler for compatibility
 */

/**
 * Handler for get_workspace_members (backward compatibility)
 */
export async function handleGetWorkspaceMembers(): Promise<any> {
    try {
        const result = await handleFindMembers({ detail_level: 'standard' });

        return {
            members: result.members || [],
            success: true
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            error: `Failed to get workspace members: ${errorMessage}`,
            success: false
        };
    }
}

/**
 * Handler for find_member_by_name (backward compatibility)
 */
export async function handleFindMemberByName(parameters: any): Promise<any> {
    const { nameOrEmail } = parameters;

    if (!nameOrEmail) {
        return {
            error: 'nameOrEmail is required',
            success: false
        };
    }

    try {
        const result = await handleFindMembers({
            query: nameOrEmail,
            detail_level: 'standard'
        });

        return {
            member: result.members && result.members.length > 0 ? result.members[0] : null,
            success: true
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            error: `Failed to find member: ${errorMessage}`,
            success: false
        };
    }
}

/**
 * Handler for resolve_assignees (backward compatibility)
 */
export async function handleResolveAssignees(parameters: any): Promise<any> {
    const { assignees } = parameters;

    if (!Array.isArray(assignees)) {
        return {
            error: 'assignees must be an array',
            success: false
        };
    }

    try {
        const result = await handleFindMembers({
            assignees,
            detail_level: 'minimal'
        });

        // Extract user IDs from resolutions
        const userIds = result.resolutions
            ?.map((r: MemberResolutionResult) => r.userId)
            .filter((id: string | null) => id !== null) || [];

        return {
            userIds,
            success: true
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            error: `Failed to resolve assignees: ${errorMessage}`,
            success: false
        };
    }
}
