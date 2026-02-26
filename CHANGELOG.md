# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2025-11-17

### Removed
- **list_task_types tool**: Removed redundant introspection tool following AI-first design principles
  - Task types are already visible in dynamic dropdown of `manage_task` tool
  - Reduces tool count and decision complexity for AI
  - Aligns with MCP tool consolidation best practices

### Improved
- **Assignee resolution error handling**: Now throws clear, actionable errors when email/username cannot be resolved
  - Error message specifies which assignees failed to resolve
  - Suggests using numeric user IDs or `find_members` tool
  - Prevents silent failures where assignees weren't assigned

### Technical Details
- Removed: `src/tools/task-type-tools.ts`
- Updated: `src/server.ts` (removed tool registration)
- Updated: `src/tools/task/handlers.ts` (improved error handling in `resolveAssignees()`)

## [1.5.0] - 2025-11-14

### Added
- **Custom Task Types support**: Create tasks with custom types using friendly names
  - New `task_type` parameter in `manage_task` tool (e.g., `task_type: "milestone"`)
  - Support for all ClickUp custom item types: milestone, form_response, meeting_note, Request, Bug/Issue, Feature, Improvement, New Tool/Product, Research, General Idea, Person
  - Dynamic dropdown in tool schema showing all available task types for the workspace
  - Automatic name-to-ID mapping via `TaskTypeService`
  - New `list_task_types` introspection tool to view all available custom task types
- **TaskTypeService**: Singleton service for managing custom task type mappings
  - Fetches custom task types from ClickUp API on initialization
  - Provides name-to-ID conversion (e.g., "milestone" -> 1)
  - Caches task types for performance
- **Dynamic schema generation**: Tool schemas now include enum values populated from API data
  - Task type dropdown automatically shows all available types
  - Better user experience with autocomplete and validation

### Technical Details
- New files:
  - `src/services/task-type-service.ts`: Task type management service
  - `src/tools/task/task-type-schema-builder.ts`: Dynamic schema builder
  - `src/tools/task-type-tools.ts`: Introspection tools
- Updated files:
  - `src/index.ts`: Initialize TaskTypeService on startup
  - `src/server.ts`: Initialize TaskTypeService for SSE server
  - `src/tools/task/handlers.ts`: Handle task_type parameter in task creation
  - `src/services/clickup/types.ts`: Add ClickUpCustomItem type

## [1.4.0] - 2025-11-12

### Added
- **Automatic cache invalidation**: All modification operations (create/update/delete) now automatically invalidate caches
  - List operations: create_list, create_list_in_folder, update_list, delete_list
  - Task operations: create_task, update_task, move_task, delete_task
  - Bulk operations: create_bulk_tasks, update_bulk_tasks, move_bulk_tasks, delete_bulk_tasks
- **Background cache refresh**: After modifications, the cache is automatically refreshed in the background without blocking the response
  - Users get immediate responses (no waiting)
  - Cache is pre-warmed for the next request
  - Ensures data is always up-to-date
- **Enhanced get_workspace_hierarchy tool**:
  - Now clears ALL caches before fetching (workspace, members, tags, custom fields, containers, task context)
  - Updated tool description to indicate cache reset behavior
  - Useful after making changes or when not picking up expected results
- **New cache utility functions**:
  - `invalidateWorkspaceCaches()`: Clear all workspace-related caches
  - `refreshWorkspaceCachesInBackground()`: Non-blocking cache refresh
  - `clearTaskContextCache()`: Clear task lookup cache

### Changed
- get_workspace_hierarchy tool description is now more concise and mentions cache reset behavior

### Performance
- Improved user experience with non-blocking cache updates
- Reduced stale data issues by invalidating caches after every modification
- Faster subsequent requests due to background cache pre-warming

## [1.3.3] - 2025-11-12

### Fixed
- Renamed manage_tags tool to operate_tags to avoid confusion

## [1.3.2] - 2025-11-12

### Fixed
- Excluded server.log from npm package to prevent EPERM errors

## [1.3.1] - Earlier

### Changed
- Various bug fixes and improvements

---

[1.5.1]: https://github.com/twofeetup/clickup-mcp/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/twofeetup/clickup-mcp/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/twofeetup/clickup-mcp/compare/v1.3.3...v1.4.0
[1.3.3]: https://github.com/twofeetup/clickup-mcp/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/twofeetup/clickup-mcp/releases/tag/v1.3.2
