/**
 * SPDX-FileCopyrightText: © 2025 Sjoerd Tiemensma
 * SPDX-License-Identifier: MIT
 *
 * Task time tracking tools
 * 
 * This module provides tools for time tracking operations on ClickUp tasks:
 * - Get time entries for a task
 * - Start time tracking on a task
 * - Stop time tracking
 * - Add a manual time entry
 * - Delete a time entry
 */

import { timeTrackingService } from "../../services/shared.js";
import { getTaskId } from "./utilities.js";
import { Logger } from "../../logger.js";
import { ErrorCode } from "../../services/clickup/base.js";
import { formatDueDate, parseDueDate } from "../../utils/date-utils.js";
import { sponsorService } from "../../utils/sponsor-service.js";

// Logger instance
const logger = new Logger('TimeTrackingTools');

/**
 * Tool definition for getting time entries
 */
export const getTaskTimeEntriesTool = {
  name: "get_task_time_entries",
  description: "Gets all time entries for a task with filtering options. Use taskId (preferred) or taskName + optional listName. Returns all tracked time with user info, descriptions, tags, start/end times, and durations.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to get time entries for. Works with both regular task IDs and custom IDs."
      },
      taskName: {
        type: "string",
        description: "Name of the task to get time entries for. When using this parameter, it's recommended to also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task. Helps find the right task when using taskName."
      },
      startDate: {
        type: "string",
        description: "Optional start date filter. Supports Unix timestamps (in milliseconds) and natural language expressions like 'yesterday', 'last week', etc."
      },
      endDate: {
        type: "string",
        description: "Optional end date filter. Supports Unix timestamps (in milliseconds) and natural language expressions."
      }
    }
  }
};

/**
 * Tool definition for starting time tracking
 */
export const startTimeTrackingTool = {
  name: "start_time_tracking",
  description: "Starts time tracking on a task. Use taskId (preferred) or taskName + optional listName. Optional fields: description, billable status, and tags. Only one timer can be running at a time.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to start tracking time on. Works with both regular task IDs and custom IDs."
      },
      taskName: {
        type: "string",
        description: "Name of the task to start tracking time on. When using this parameter, it's recommended to also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task. Helps find the right task when using taskName."
      },
      description: {
        type: "string",
        description: "Optional description for the time entry."
      },
      billable: {
        type: "boolean",
        description: "Whether this time is billable. Default is workspace setting."
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional array of tag names to assign to the time entry."
      }
    }
  }
};

/**
 * Tool definition for stopping time tracking
 */
export const stopTimeTrackingTool = {
  name: "stop_time_tracking",
  description: "Stops the currently running time tracker. Optional fields: description and tags. Returns the completed time entry details.",
  inputSchema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Optional description to update or add to the time entry."
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional array of tag names to assign to the time entry."
      }
    }
  }
};

/**
 * Tool definition for adding a manual time entry
 */
export const addTimeEntryTool = {
  name: "add_time_entry",
  description: "Adds a manual time entry to a task. Use taskId (preferred) or taskName + optional listName. Required: start time, duration. Optional: description, billable, tags.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to add time entry to. Works with both regular task IDs and custom IDs."
      },
      taskName: {
        type: "string",
        description: "Name of the task to add time entry to. When using this parameter, it's recommended to also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task. Helps find the right task when using taskName."
      },
      start: {
        type: "string",
        description: "Start time for the entry. Supports Unix timestamps (in milliseconds) and natural language expressions like '2 hours ago', 'yesterday 9am', etc."
      },
      duration: {
        type: "string",
        description: "Duration of the time entry. Supports '4h', '1h 30m', '90m', '2.5h', '4 hr', '14400000ms', and numeric values (small=minutes, large=milliseconds)."
      },
      description: {
        type: "string",
        description: "Optional description for the time entry."
      },
      billable: {
        type: "boolean",
        description: "Whether this time is billable. Default is workspace setting."
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional array of tag names to assign to the time entry."
      }
    },
    required: ["start", "duration"]
  }
};

/**
 * Tool definition for deleting a time entry
 */
export const deleteTimeEntryTool = {
  name: "delete_time_entry",
  description: "Deletes a time entry. Required: time entry ID.",
  inputSchema: {
    type: "object",
    properties: {
      timeEntryId: {
        type: "string",
        description: "ID of the time entry to delete."
      }
    },
    required: ["timeEntryId"]
  }
};

/**
 * Tool definition for getting current time entry
 */
export const getCurrentTimeEntryTool = {
  name: "get_current_time_entry",
  description: "Gets the currently running time entry, if any. No parameters needed.",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

/**
 * Handle get task time entries tool
 */
export async function handleGetTaskTimeEntries(params: any) {
  logger.info("Handling request to get task time entries", params);

  try {
    // Resolve task ID
    const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
    if (!taskId) {
      return sponsorService.createErrorResponse("Task not found. Please provide a valid taskId or taskName + listName combination.");
    }

    // Parse date filters
    let startDate: number | undefined;
    let endDate: number | undefined;

    if (params.startDate) {
      startDate = parseDueDate(params.startDate);
    }

    if (params.endDate) {
      endDate = parseDueDate(params.endDate);
    }

    // Get time entries
    const result = await timeTrackingService.getTimeEntries(taskId, startDate, endDate);

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to get time entries");
    }

    const rawTimeEntries = result.data || [];
    const timeEntries = normalizeTimeEntries(rawTimeEntries);

    // Format the response
    return sponsorService.createResponse({
      success: true,
      count: timeEntries.length,
      time_entries: timeEntries.map(entry => ({
        id: entry.id,
        description: entry.description || "",
        start: entry.start,
        end: entry.end,
        duration: formatDuration(entry.duration || 0),
        duration_ms: entry.duration || 0,
        billable: entry.billable || false,
        tags: entry.tags || [],
        user: entry.user ? {
          id: entry.user.id,
          username: entry.user.username
        } : null,
        task: entry.task ? {
          id: entry.task.id,
          name: entry.task.name,
          status: entry.task.status?.status || "Unknown"
        } : null
      }))
    });
  } catch (error) {
    logger.error("Error getting task time entries", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Parse loose timestamp/duration values into milliseconds.
 * Accepts numbers, numeric strings, and returns null for invalid values.
 */
function toMilliseconds(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric);
}

function normalizeTags(tags: any): string[] {
  if (!tags) return [];
  if (!Array.isArray(tags)) return [];
  return tags
    .map(tag => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object') return tag.name || tag.tag || null;
      return null;
    })
    .filter((tag): tag is string => Boolean(tag));
}

/**
 * Normalize ClickUp time entry responses.
 * Handles both:
 * - flat entries (id/start/end/duration)
 * - grouped entries (user/time/intervals[])
 */
function normalizeTimeEntries(rawEntries: any[]): any[] {
  if (!Array.isArray(rawEntries)) return [];

  const normalized: any[] = [];

  for (const entry of rawEntries) {
    // Newer/grouped response shape: { user, time, intervals: [...] }
    if (Array.isArray(entry?.intervals) && entry.intervals.length > 0) {
      for (const interval of entry.intervals) {
        const startMs = toMilliseconds(interval?.start);
        const endMs = toMilliseconds(interval?.end);

        let durationMs =
          toMilliseconds(interval?.duration) ??
          toMilliseconds(interval?.time) ??
          toMilliseconds(entry?.duration) ??
          toMilliseconds(entry?.time);

        if ((durationMs === null || durationMs <= 0) && startMs !== null && endMs !== null) {
          durationMs = Math.max(0, endMs - startMs);
        } else if ((durationMs === null || durationMs <= 0) && startMs !== null && endMs === null) {
          durationMs = Math.max(0, Date.now() - startMs);
        }

        normalized.push({
          id: interval?.id || `${entry?.user?.id || 'user'}-${startMs || Date.now()}`,
          description: interval?.description || entry?.description || "",
          start: startMs !== null ? new Date(startMs).toISOString() : null,
          end: endMs !== null ? new Date(endMs).toISOString() : null,
          duration: durationMs || 0,
          billable: Boolean(interval?.billable ?? entry?.billable),
          tags: normalizeTags(interval?.tags ?? entry?.tags),
          user: entry?.user || null,
          task: entry?.task || null
        });
      }
      continue;
    }

    // Flat response shape: { id, start, end, duration, ... }
    const startMs = toMilliseconds(entry?.start);
    const endMs = toMilliseconds(entry?.end);
    let durationMs =
      toMilliseconds(entry?.duration) ??
      toMilliseconds(entry?.time);

    if ((durationMs === null || durationMs <= 0) && startMs !== null && endMs !== null) {
      durationMs = Math.max(0, endMs - startMs);
    } else if ((durationMs === null || durationMs <= 0) && startMs !== null && endMs === null) {
      durationMs = Math.max(0, Date.now() - startMs);
    }

    normalized.push({
      ...entry,
      id: entry?.id || `${entry?.user?.id || 'user'}-${startMs || Date.now()}`,
      start: startMs !== null ? new Date(startMs).toISOString() : (entry?.start || null),
      end: endMs !== null ? new Date(endMs).toISOString() : (entry?.end || null),
      duration: durationMs || 0,
      tags: normalizeTags(entry?.tags)
    });
  }

  return normalized;
}

/**
 * Handle start time tracking tool
 */
export async function handleStartTimeTracking(params: any) {
  logger.info("Handling request to start time tracking", params);

  try {
    // Resolve task ID
    const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
    if (!taskId) {
      return sponsorService.createErrorResponse("Task not found. Please provide a valid taskId or taskName + listName combination.");
    }

    // Check for currently running timer
    const currentTimerResult = await timeTrackingService.getCurrentTimeEntry();
    if (currentTimerResult.success && currentTimerResult.data) {
      return sponsorService.createErrorResponse("A timer is already running. Please stop the current timer before starting a new one.", {
        timer: {
          id: currentTimerResult.data.id,
          task: {
            id: currentTimerResult.data.task.id,
            name: currentTimerResult.data.task.name
          },
          start: currentTimerResult.data.start,
          description: currentTimerResult.data.description
        }
      });
    }

    // Prepare request data
    const requestData = {
      tid: taskId,
      description: params.description,
      billable: params.billable,
      tags: params.tags
    };

    // Start time tracking
    const result = await timeTrackingService.startTimeTracking(requestData);

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to start time tracking");
    }

    const timeEntry = result.data;
    if (!timeEntry) {
      return sponsorService.createErrorResponse("No time entry data returned from API");
    }

    // Format the response
    return sponsorService.createResponse({
      success: true,
      message: "Time tracking started successfully",
      time_entry: {
        id: timeEntry.id,
        description: timeEntry.description,
        start: timeEntry.start,
        end: timeEntry.end,
        task: {
          id: timeEntry.task.id,
          name: timeEntry.task.name
        },
        billable: timeEntry.billable,
        tags: timeEntry.tags
      }
    });
  } catch (error) {
    logger.error("Error starting time tracking", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Handle stop time tracking tool
 */
export async function handleStopTimeTracking(params: any) {
  logger.info("Handling request to stop time tracking", params);

  try {
    // Check for currently running timer
    const currentTimerResult = await timeTrackingService.getCurrentTimeEntry();
    if (currentTimerResult.success && !currentTimerResult.data) {
      return sponsorService.createErrorResponse("No timer is currently running. Start a timer before trying to stop it.");
    }

    // Prepare request data
    const requestData = {
      description: params.description,
      tags: params.tags
    };

    // Stop time tracking
    const result = await timeTrackingService.stopTimeTracking(requestData);

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to stop time tracking");
    }

    const timeEntry = result.data;
    if (!timeEntry) {
      return sponsorService.createErrorResponse("No time entry data returned from API");
    }

    // Format the response
    return sponsorService.createResponse({
      success: true,
      message: "Time tracking stopped successfully",
      time_entry: {
        id: timeEntry.id,
        description: timeEntry.description,
        start: timeEntry.start,
        end: timeEntry.end,
        duration: formatDuration(timeEntry.duration),
        duration_ms: timeEntry.duration,
        task: {
          id: timeEntry.task.id,
          name: timeEntry.task.name
        },
        billable: timeEntry.billable,
        tags: timeEntry.tags
      }
    });
  } catch (error) {
    logger.error("Error stopping time tracking", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Handle add time entry tool
 */
export async function handleAddTimeEntry(params: any) {
  logger.info("Handling request to add time entry", params);

  try {
    // Resolve task ID
    const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
    if (!taskId) {
      return sponsorService.createErrorResponse("Task not found. Please provide a valid taskId or taskName + listName combination.");
    }

    // Parse start time
    const startTime = parseDueDate(params.start);
    if (!startTime) {
      return sponsorService.createErrorResponse("Invalid start time format. Use a Unix timestamp (in milliseconds) or a natural language date string.");
    }

    // Parse duration
    const durationMs = parseDuration(params.duration);
    if (durationMs === 0) {
      return sponsorService.createErrorResponse("Invalid duration format. Use examples like '4h', '1h 30m', '90m', '2.5h', '14400000ms', or numeric values.");
    }

    // Prepare request data
    const requestData = {
      tid: taskId,
      start: startTime,
      duration: durationMs,
      description: params.description,
      billable: params.billable,
      tags: params.tags
    };

    // Add time entry
    const result = await timeTrackingService.addTimeEntry(requestData);

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to add time entry");
    }

    const timeEntry = result.data;
    if (!timeEntry) {
      return sponsorService.createErrorResponse("No time entry data returned from API");
    }

    // Format the response
    return sponsorService.createResponse({
      success: true,
      message: "Time entry added successfully",
      time_entry: {
        id: timeEntry.id,
        description: timeEntry.description,
        start: timeEntry.start,
        end: timeEntry.end,
        duration: formatDuration(timeEntry.duration),
        duration_ms: timeEntry.duration,
        task: {
          id: timeEntry.task.id,
          name: timeEntry.task.name
        },
        billable: timeEntry.billable,
        tags: timeEntry.tags
      }
    });
  } catch (error) {
    logger.error("Error adding time entry", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Handle delete time entry tool
 */
export async function handleDeleteTimeEntry(params: any) {
  logger.info("Handling request to delete time entry", params);

  try {
    const { timeEntryId } = params;

    if (!timeEntryId) {
      return sponsorService.createErrorResponse("Time entry ID is required.");
    }

    // Delete time entry
    const result = await timeTrackingService.deleteTimeEntry(timeEntryId);

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to delete time entry");
    }

    // Format the response
    return sponsorService.createResponse({
      success: true,
      message: "Time entry deleted successfully."
    });
  } catch (error) {
    logger.error("Error deleting time entry", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Handle get current time entry tool
 */
export async function handleGetCurrentTimeEntry(params?: any) {
  logger.info("Handling request to get current time entry");

  try {
    // Get current time entry
    const result = await timeTrackingService.getCurrentTimeEntry();

    if (!result.success) {
      return sponsorService.createErrorResponse(result.error?.message || "Failed to get current time entry");
    }

    const timeEntry = result.data;

    // If no timer is running
    if (!timeEntry) {
      return sponsorService.createResponse({
        success: true,
        timer_running: false,
        message: "No timer is currently running."
      });
    }

    // Format the response
    const elapsedTime = calculateElapsedTime(timeEntry.start);

    return sponsorService.createResponse({
      success: true,
      timer_running: true,
      time_entry: {
        id: timeEntry.id,
        description: timeEntry.description,
        start: timeEntry.start,
        elapsed: formatDuration(elapsedTime),
        elapsed_ms: elapsedTime,
        task: {
          id: timeEntry.task.id,
          name: timeEntry.task.name
        },
        billable: timeEntry.billable,
        tags: timeEntry.tags
      }
    });
  } catch (error) {
    logger.error("Error getting current time entry", error);
    return sponsorService.createErrorResponse((error as Error).message || "An unknown error occurred");
  }
}

/**
 * Calculate elapsed time in milliseconds from a start time string to now
 */
function calculateElapsedTime(startTimeString: string): number {
  const startTime = new Date(startTimeString).getTime();
  const now = Date.now();
  return Math.max(0, now - startTime);
}

/**
 * Format duration in milliseconds to a human-readable string
 */
function formatDuration(durationMs: number): string {
  if (!durationMs) return "0m";
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(durationInput: string | number): number {
  if (durationInput === undefined || durationInput === null) return 0;

  // Numeric input: small values = minutes, large values = milliseconds
  // (prevents accidental interpretation of ms payloads as minutes)
  if (typeof durationInput === 'number') {
    if (!Number.isFinite(durationInput) || durationInput <= 0) return 0;
    if (durationInput >= 60000) return Math.round(durationInput); // assume ms
    return Math.round(durationInput * 60 * 1000);
  }

  const cleanDuration = String(durationInput).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanDuration) return 0;

  // Compact forms like "1h30m" -> "1h 30m"
  const normalized = cleanDuration.replace(/(\d)([a-z])/g, '$1 $2');

  // Numeric string: small values = minutes, large values = milliseconds
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const value = parseFloat(normalized);
    if (!(value > 0)) return 0;
    if (value >= 60000) return Math.round(value); // assume ms
    return Math.round(value * 60 * 1000);
  }

  // Parse tokens like "4h", "4 hr", "4hours", "30m", "2.5h", "14400000ms"
  const tokenPattern = /(\d+(?:[.,]\d+)?)\s*(ms|msec|msecs|millisecond|milliseconds|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/g;
  let totalMs = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(normalized)) !== null) {
    const rawValue = match[1].replace(',', '.');
    const value = parseFloat(rawValue);
    if (!Number.isFinite(value) || value <= 0) continue;

    const unit = match[2];
    if (unit.startsWith('h')) {
      totalMs += value * 60 * 60 * 1000;
    } else if (unit === 'ms' || unit.startsWith('msec') || unit.startsWith('millisecond')) {
      totalMs += value;
    } else {
      totalMs += value * 60 * 1000;
    }
  }

  if (totalMs <= 0) return 0;

  // Reject strings with unknown trailing content (e.g. "4h xyz")
  const stripped = normalized.replace(tokenPattern, '').replace(/\s+/g, '').trim();
  if (stripped.length > 0) return 0;

  return Math.round(totalMs);
}

// Export all time tracking tools
export const timeTrackingTools = [
  getTaskTimeEntriesTool,
  startTimeTrackingTool,
  stopTimeTrackingTool,
  addTimeEntryTool,
  deleteTimeEntryTool,
  getCurrentTimeEntryTool
];

// Export all time tracking handlers
export const timeTrackingHandlers = {
  get_task_time_entries: handleGetTaskTimeEntries,
  start_time_tracking: handleStartTimeTracking,
  stop_time_tracking: handleStopTimeTracking,
  add_time_entry: handleAddTimeEntry,
  delete_time_entry: handleDeleteTimeEntry,
  get_current_time_entry: handleGetCurrentTimeEntry
};
