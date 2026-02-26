# ClickUp Services Development

**Technology**: TypeScript, Axios, Custom Rate Limiting
**Entry Point**: `clickup/index.ts` (exports all services)
**Parent Context**: This extends [../../CLAUDE.md](../../CLAUDE.md)

---

## Development Commands

### From Root
```bash
npm run build         # Build all TypeScript
npm run dev           # Watch mode
```

### Direct Service Testing
```bash
npm run build
CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node -e "
import { createClickUpServices } from './build/services/clickup/index.js';
const services = createClickUpServices('pk_xxx', 'xxx');
const result = await services.workspace.getWorkspaceHierarchy();
console.log(JSON.stringify(result, null, 2));
"
```

---

## Directory Structure

```
services/
├── shared.ts                   # Service singletons
├── task-type-service.ts        # Custom task type handling
└── clickup/                    # ClickUp API services
    ├── index.ts                # Service factory
    ├── base.ts                 # Base service class (rate limiting)
    ├── types.ts                # TypeScript type definitions
    ├── workspace.ts            # Workspace/hierarchy operations
    ├── folder.ts               # Folder operations
    ├── list.ts                 # List operations
    ├── tag.ts                  # Tag operations
    ├── document.ts             # Document operations
    ├── bulk.ts                 # Bulk operations
    ├── time.ts                 # Time tracking
    └── task/                   # Task services
        ├── index.ts            # Task service factory
        ├── task-service.ts     # Main task service
        ├── task-core.ts        # Core task operations
        ├── task-search.ts      # Task search/filtering
        ├── task-comments.ts    # Comment operations
        ├── task-attachments.ts # Attachment operations
        ├── task-custom-fields.ts # Custom field handling
        └── task-tags.ts        # Task tag operations
```

---

## Architecture Patterns

### Base Service Class
All services extend `BaseClickUpService` from `base.ts`:

```typescript
// src/services/clickup/my-service.ts
import { BaseClickUpService, ClickUpServiceError, ErrorCode } from './base.js';

export class MyService extends BaseClickUpService {
  constructor(apiKey: string, teamId: string) {
    super(apiKey, teamId);
    // this.client is now available (Axios instance)
    // this.logger is now available (Logger instance)
    // this.teamId is now available
  }

  async myMethod(): Promise<any> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/my-endpoint');
      return response.data;
    });
  }
}
```

### Rate Limiting
Rate limiting is handled automatically by `BaseClickUpService`:

```typescript
// Always wrap API calls in makeRequest()
async getTask(taskId: string) {
  return this.makeRequest(async () => {
    const response = await this.client.get(`/task/${taskId}`);
    return response.data;
  });
}
```

Features:
- 600ms default spacing between requests
- Automatic backoff when approaching limits
- Request queuing during rate limit recovery
- Rate limit header monitoring

### Error Handling
Use `ClickUpServiceError` for typed errors:

```typescript
import { ClickUpServiceError, ErrorCode } from './base.js';

// Throw typed errors
throw new ClickUpServiceError(
  'Task not found',
  ErrorCode.NOT_FOUND,
  { taskId }
);

// Available error codes:
// RATE_LIMIT, NOT_FOUND, UNAUTHORIZED, VALIDATION,
// SERVER_ERROR, NETWORK_ERROR, WORKSPACE_ERROR,
// INVALID_PARAMETER, UNKNOWN
```

### Service Response Pattern
```typescript
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  }
}
```

---

## Key Files

### Core Files (understand these first)
- **`base.ts`** - Base service class with rate limiting, error handling
- **`workspace.ts`** - Workspace hierarchy (cached)
- **`task/task-service.ts`** - Main task operations

### Type Definitions
- **`types.ts`** - Shared TypeScript interfaces for ClickUp entities

### Service Singletons
- **`shared.ts`** - Pre-instantiated service singletons
  ```typescript
  import { clickUpServices } from './services/shared.js';
  const { workspace, task, folder, list, tag, time, document } = clickUpServices;
  ```

---

## Caching

Workspace hierarchy is cached in `../utils/cache-service.ts`:

```typescript
// Automatic cache usage in workspace service
const hierarchy = await workspace.getWorkspaceHierarchy();

// Force cache refresh
const fresh = await workspace.getWorkspaceHierarchy(true);

// Cache TTLs (from cache-service.ts)
// HIERARCHY: 5 minutes
// MEMBERS: 10 minutes
// TAGS: 15 minutes
// CUSTOM_FIELDS: 30 minutes
```

### Cache Invalidation
Call after modifications that affect hierarchy:

```typescript
import { invalidateWorkspaceCaches, refreshWorkspaceCachesInBackground } from '../utils/cache-service.js';

// After creating/updating/deleting tasks, lists, folders
invalidateWorkspaceCaches();

// Optional: Pre-warm cache in background
refreshWorkspaceCachesInBackground(workspaceService);
```

---

## API Endpoints Reference

### ClickUp API Base URL
```
https://api.clickup.com/api/v2
```

### Common Endpoints
| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get Team | GET | `/team` |
| Get Spaces | GET | `/team/{team_id}/space` |
| Get Space | GET | `/space/{space_id}` |
| Get Folders | GET | `/space/{space_id}/folder` |
| Get Lists | GET | `/folder/{folder_id}/list` |
| Get Folderless Lists | GET | `/space/{space_id}/list` |
| Get Task | GET | `/task/{task_id}` |
| Create Task | POST | `/list/{list_id}/task` |
| Update Task | PUT | `/task/{task_id}` |
| Delete Task | DELETE | `/task/{task_id}` |
| Search Tasks | GET | `/team/{team_id}/task` |

### Custom Task ID
When using custom task IDs (e.g., DEV-123):
```typescript
// Add query parameter
const response = await this.client.get(`/task/${customTaskId}`, {
  params: { custom_task_ids: true, team_id: this.teamId }
});
```

---

## Common Gotchas

- **Import Extensions**: Use `.js` extension (NodeNext modules)
  ```typescript
  import { BaseClickUpService } from './base.js';  // Correct
  ```

- **Rate Limiting**: Always use `makeRequest()` wrapper
  ```typescript
  // Correct
  return this.makeRequest(async () => {
    return await this.client.get('/endpoint');
  });

  // Wrong - bypasses rate limiting
  return await this.client.get('/endpoint');
  ```

- **Custom Task IDs**: Require special handling
  ```typescript
  // When ID looks like "DEV-123" vs "abc123xyz"
  const isCustomId = /^[A-Z]+-\d+$/.test(taskId);
  if (isCustomId) {
    params.custom_task_ids = true;
    params.team_id = this.teamId;
  }
  ```

- **Timestamps**: ClickUp uses milliseconds
  ```typescript
  // Correct
  const timestamp = Date.now();  // 1699999999999

  // Wrong (seconds - multiply by 1000)
  const wrongTimestamp = Math.floor(Date.now() / 1000);
  ```

- **Team ID**: Required for many operations
  ```typescript
  // Available as this.teamId in services
  // Or from config.clickupTeamId
  ```

---

## Adding a New Service

1. **Create service file** extending `BaseClickUpService`:
```typescript
// src/services/clickup/my-service.ts
import { BaseClickUpService } from './base.js';

export class MyService extends BaseClickUpService {
  async myMethod() {
    return this.makeRequest(async () => {
      const response = await this.client.get('/endpoint');
      return response.data;
    });
  }
}
```

2. **Export from index**:
```typescript
// src/services/clickup/index.ts
export { MyService } from './my-service.js';

// In createClickUpServices function
export function createClickUpServices(apiKey: string, teamId: string) {
  return {
    // ... existing services
    myService: new MyService(apiKey, teamId),
  };
}
```

3. **Add singleton to shared.ts**:
```typescript
// src/services/shared.ts
import { createClickUpServices } from './clickup/index.js';

export const clickUpServices = createClickUpServices(
  config.clickupApiKey,
  config.clickupTeamId
);
```

---

## Testing Checklist

- [ ] Service extends `BaseClickUpService`
- [ ] All API calls wrapped in `makeRequest()`
- [ ] Proper error handling with `ClickUpServiceError`
- [ ] Logging with scoped logger
- [ ] Cache invalidation after modifications
- [ ] Custom task ID handling if applicable
- [ ] Exported from `clickup/index.ts`
- [ ] Build succeeds
- [ ] Direct test passes
