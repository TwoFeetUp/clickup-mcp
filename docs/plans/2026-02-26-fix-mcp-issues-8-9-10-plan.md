---
title: "Fix MCP Issues 8, 9, 10"
type: fix
status: completed
date: 2026-02-26
origin: .claude/skills/clickup-delivery/references/mcp-issues-2026-02-26.md
---

# Fix MCP Issues 8, 9, 10

## Overview

Three bugs gevonden tijdens het aanmaken van de SharePoint API-koppeling feature onder LHT > Agent Platform > Fase 3. Issue 8 is al gefixt in deze sessie, issues 9 en 10 moeten nog.

| # | Issue | Type | Status | Effort |
|---|-------|------|--------|--------|
| 8 | Time estimate format incorrect (minuten i.p.v. ms) | Bug | **Done** | Klein |
| 9 | Move-actie reset task type naar lijstdefault | Bug | Open | Klein |
| 10 | Parent kan niet via update-actie gezet worden | Missing feature | Open | Klein |

## Issue 8: Time estimate — DONE

**Wat is gefixt:**
- `parseTimeEstimate()` in `src/tools/task/handlers.ts` converteert nu naar milliseconden i.p.v. minuten
- Alle 5 `time_estimate` descriptions updaten met duidelijke notatie ("milliseconds (ClickUp API unit), or human-readable: '2h 30m'")
- Debug `console.log` statements verwijderd

**Verificatie:** `npm run build` succesvol.

---

## Issue 9: Move-actie reset task type

### Probleem

`moveTask` in `src/services/clickup/task/task-core.ts:539` is geimplementeerd als **delete + recreate**. De `extractTaskData()` methode (regel 177) kopieert slechts 6 velden:

```typescript
// task-core.ts:177-186 — HUIDIGE staat
protected extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
  return {
    name: nameOverride || task.name,
    description: task.description || '',
    status: task.status?.status,
    priority: this.extractPriorityValue(task),
    due_date: task.due_date ? Number(task.due_date) : undefined,
    assignees: task.assignees?.map(a => a.id) || []
  };
}
```

**Missende velden:** `custom_item_id`, `tags`, `custom_fields`, `parent`, `start_date`, `time_estimate`, `markdown_description`.

Door het ontbreken van `custom_item_id` wordt het task type gereset naar het default van de doellijst. Features (1003) worden builds (1015), taken worden features, etc.

### Fix

**Bestand:** `src/services/clickup/task/task-core.ts`, methode `extractTaskData` (regel 177)

Minimale fix — voeg `custom_item_id` toe:

```typescript
protected extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
  return {
    name: nameOverride || task.name,
    description: task.description || '',
    status: task.status?.status,
    priority: this.extractPriorityValue(task),
    due_date: task.due_date ? Number(task.due_date) : undefined,
    assignees: task.assignees?.map(a => a.id) || [],
    custom_item_id: task.custom_item_id,  // Preserve task type during move
  };
}
```

**Overweging:** Er zijn meer velden die niet gekopieerd worden (`tags`, `custom_fields`, `start_date`, `time_estimate`). Dit zijn potentiele follow-up fixes, maar `custom_item_id` is veruit het belangrijkst omdat het de hele hierarchy breekt.

---

## Issue 10: Parent kan niet via update gezet worden

### Probleem

`buildUpdateData()` in `src/tools/task/handlers.ts:188` leest `params.parent` niet. Het veld bestaat wel in `UpdateTaskData` (via overerving van `CreateTaskData`), en de ClickUp API accepteert `parent` op `PUT /task/{id}`. Maar de handler skipt het.

Daarnaast zegt de schema description "create action only":

```typescript
// consolidated-tools.ts:81-84
parent: {
  type: "string",
  description: "Parent task ID for creating subtasks (create action only)"
},
```

### Fix

**3 bestanden:**

#### 1. `src/tools/task/handlers.ts` — `buildUpdateData()` (~regel 248)

Voeg parent toe aan de update data mapping:

```typescript
// Na de bestaande time_estimate handling:
if (params.parent !== undefined) {
  updateData.parent = params.parent;
}
```

#### 2. `src/tools/task/consolidated-tools.ts` — schema description (regel 81-84)

```typescript
parent: {
  type: "string",
  description: "Parent task ID. For create: sets parent (creates subtask). For update: reparents the task. Use null to remove parent."
},
```

#### 3. `src/tools/task/consolidated-handlers.ts` — `buildMinimalSuccessResponse` (regel ~147)

Track parent change in updated fields:

```typescript
if (params.parent !== undefined) updatedFields.parent = result.parent;
```

---

## Acceptance Criteria

- [x] **Issue 8:** `"8h"` resulteert in `28800000` (ms) naar ClickUp API — **DONE**
- [x] **Issue 9:** Move van een Feature (1003) naar andere lijst behoudt `custom_item_id: 1003`
- [x] **Issue 10:** `manage_task({ action: "update", taskId: "xxx", parent: "yyy" })` verplaatst task naar nieuwe parent
- [x] **Issue 10:** `manage_task({ action: "update", taskId: "xxx", parent: null })` verwijdert parent
- [x] Build succesvol (`npm run build`)
- [x] Issues-bestand (`mcp-issues.md`) bijwerken met opgeloste status

## Sources

- **Origin:** [.claude/skills/clickup-delivery/references/mcp-issues-2026-02-26.md](.claude/skills/clickup-delivery/references/mcp-issues-2026-02-26.md)
- **Move handler:** `src/services/clickup/task/task-core.ts:539-587`
- **extractTaskData:** `src/services/clickup/task/task-core.ts:177-186`
- **buildUpdateData:** `src/tools/task/handlers.ts:188-270`
- **Tool schema:** `src/tools/task/consolidated-tools.ts:81-84`
- **Post-action pattern precedent:** `task-core.ts:459-503` (updateTask twee-fase voor custom fields)
