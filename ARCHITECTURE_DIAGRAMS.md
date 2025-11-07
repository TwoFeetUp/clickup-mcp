# Container Tools - Architecture Diagrams

## System Architecture Overview

```
Client (MCP Agent)
        │
        ▼ JSON-RPC Request
┌──────────────────────────────┐
│      MCP Server              │
│  manage_container            │
│  get_container               │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│  Container Handlers Layer    │
│  • Parameter validation      │
│  • ID/name resolution        │
│  • Routing logic             │
│  • Response formatting       │
│  • Cache management          │
└──────────────────────────────┘
        │
     ┌──┴───┐
     ▼      ▼
┌────────┐ ┌────────┐
│list.ts │ │folder  │
│(reused)│ │.ts     │
└────────┘ └────────┘
     │         │
     └────┬────┘
          ▼
┌──────────────────────────────┐
│  ClickUp Services Layer      │
│  • ListService               │
│  • FolderService             │
│  • WorkspaceService          │
└──────────────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│   ClickUp REST API           │
│  https://api.clickup.com     │
└──────────────────────────────┘
```

## Tool Operations Flow

```
manage_container Request:
{
  "type": "list|folder",
  "action": "create|update|delete",
  "id": "optional",
  "name": "optional",
  ...params
}
  │
  ▼
Parameter Validation
  ├─ Check type (list/folder)
  ├─ Check action (create/update/delete)
  └─ Check required fields
  │
  ▼
Type & Action Routing
  ├─ type=list
  │  ├─ action=create → list/space or list/folder
  │  ├─ action=update → handleUpdateList
  │  └─ action=delete → handleDeleteList
  │
  └─ type=folder
     ├─ action=create → handleCreateFolder
     ├─ action=update → handleUpdateFolder
     └─ action=delete → handleDeleteFolder
  │
  ▼
ID Resolution (if needed)
  ├─ Global hierarchy search
  ├─ Space-scoped search
  └─ Folder-scoped search
  │
  ▼
Execute Operation
  │
  ▼
Format Response & Invalidate Cache
```

## Caching Architecture

```
Cache Entry Structure:
{
  "container:list:123": {
    data: { id, name, space, folder, ... },
    expiresAt: Date.now() + 5*60*1000,
    createdAt: Date.now()
  }
}

get_container with use_cache=true:
  1. Check if ID in cache
  2. Cache hit? → Return (fast path, ~10ms)
  3. Cache miss? → Fetch from API
  4. Store in cache (5-min TTL)
  5. Return response

manage_container (create/update/delete):
  1. Execute operation
  2. Invalidate cache entry (if applicable)
  3. Return fresh response

Cleanup:
  - Run every 60 seconds
  - Remove expired entries (>5 minutes old)
```

## Response Detail Levels

```
Detail Level Options:

minimal: ~50 tokens
{
  "id": "123",
  "name": "My List"
}

standard: ~200 tokens (default)
{
  "id": "123",
  "name": "My List",
  "space": { "id": "789", "name": "Engineering" },
  "folder": { "id": "456", "name": "Sprint" },
  "archived": false,
  "url": "https://app.clickup.com/..."
}

detailed: ~500+ tokens
{
  ... all available fields ...
  includes timestamps, creators, metadata, etc.
}
```

## Consolidation Mapping

```
Before: 9 Tools
├─ create_list
├─ create_list_in_folder
├─ get_list
├─ update_list
├─ delete_list
├─ create_folder
├─ get_folder
├─ update_folder
└─ delete_folder

After: 2 Tools
├─ manage_container
│  ├─ type: "list" | "folder"
│  ├─ action: "create" | "update" | "delete"
│  └─ flexible params
│
└─ get_container
   ├─ type: "list" | "folder"
   ├─ flexible identification
   └─ response control
```

## Integration Points

```
container-handlers uses:

1. list.ts (existing)
   ├─ handleCreateList()
   ├─ handleCreateListInFolder()
   ├─ handleGetList()
   ├─ handleUpdateList()
   ├─ handleDeleteList()
   └─ findListIDByName()

2. folder.ts (existing)
   ├─ handleCreateFolder()
   ├─ handleGetFolder()
   ├─ handleUpdateFolder()
   └─ handleDeleteFolder()

3. response-formatter.ts (existing)
   └─ formatResponse()

4. cache-service.ts (existing)
   └─ cacheService

5. sponsor-service.js (existing)
   ├─ createResponse()
   └─ createErrorResponse()

6. clickUpServices (shared)
   ├─ workspaceService
   ├─ listService
   └─ folderService
```

## Performance Characteristics

```
Operation Times:
├─ Cache hit:        ~10ms
├─ API call:         ~300-500ms
├─ Name lookup:      ~100-200ms
├─ Response format:  ~5-10ms
└─ Overall:          ~300-500ms

Token Usage:
├─ Tool definitions: -70% (9 → 2)
├─ minimal detail:   ~50 tokens
├─ standard detail:  ~200 tokens
├─ detailed detail:  ~500+ tokens
└─ Potential saving: 65%+
```

## Error Handling

```
handleManageContainer / handleGetContainer

Validation Errors:
├─ Invalid type → "Invalid container type"
├─ Invalid action → "Invalid action"
└─ Missing required → "Required parameter missing"

Resolution Errors:
├─ Not found → "Container not found"
├─ Ambiguous → "Multiple containers match"
└─ Permission → "Permission denied"

API Errors:
├─ Network error
├─ API error
└─ Service error

All errors include suggestions for recovery
```

---

For complete implementation details, see the code files:
- src/tools/container-tools.ts (163 lines)
- src/tools/container-handlers.ts (459 lines)
