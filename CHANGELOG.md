# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.4.0]: https://github.com/twofeetup/clickup-mcp/compare/v1.3.3...v1.4.0
[1.3.3]: https://github.com/twofeetup/clickup-mcp/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/twofeetup/clickup-mcp/releases/tag/v1.3.2
