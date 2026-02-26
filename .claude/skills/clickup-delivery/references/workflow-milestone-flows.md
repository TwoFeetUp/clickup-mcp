# Workflow: Milestone Flows

Compound workflow instructions for milestone-related operations. Each flow describes a multi-step sequence using MCP tools. Follow these steps exactly — do not skip validation or error handling.

References: `SKILL.md` (hierarchy, status flow, testing), `field-requirements.md` (field IDs), `mcp-limitations.md` (what works/doesn't).

---

## Constants

```
BUILDING_LIST_ID    = 901517909345
MILESTONE_TYPE      = custom_item_id 1  (task_type: "milestone")
FEATURE_TYPE        = custom_item_id 1003
RO_FIELD_ID         = a8b23d9f          (Relationship Owner — users type)
CLIENT_FIELD_ID     = bf5893a1          (All Clients — list_relationship type)
CLIENT_DROPDOWN_ID  = 26f11895          (Client dropdown — drop_down type)
```

---

## Flow C1: Create Milestone with Standard Subtasks

**Trigger:** User asks to add a milestone to a build (by build name or ID).

### Step 1 — Identify the build

Use `search_tasks` to find the build task.

- If user gave a task ID: `search_tasks` with `task_id`
- If user gave a name: `search_tasks` with query matching the build name, filtered to list `901517909345`

**Error:** If no build found, tell the user and stop. Ask for clarification (exact name, or task ID).

### Step 2 — Extract build context

From the build task data, extract:

| Data point | Where to find | Used for |
|------------|--------------|----------|
| Build task ID | `task.id` | Parent for milestone |
| Build list ID | `task.list.id` | List for milestone (same list as build) |
| Client name | Custom field `bf5893a1` (All Clients relationship) — read the linked task name. If not available, check custom field `26f11895` (Client dropdown value). | "Feedback ophalen bij [client]" subtask name |
| Relationship Owner | Custom field `a8b23d9f` — extract user ID(s) | Assignee for REVIEW and Feedback subtasks |
| Developer assignee | `task.assignees[0]` | Assignee for TEST subtasks |

**Error handling:**
- **Client name not found:** Ask user for the client name. Do not guess.
- **RO not found:** Warn user: "Relationship Owner is niet ingesteld op de build. Wie moet de REVIEW en Feedback subtasks krijgen?" Continue if user provides a name (use `find_members` to resolve). If user says skip, create subtasks without assignee and add a comment on the milestone noting RO is missing.
- **Developer not found:** Warn user: "Geen developer toegewezen aan de build. Wie moet de TEST subtasks krijgen?" Same resolution via `find_members` or skip with warning comment.

### Step 3 — Create the milestone

Use `manage_task`:
```
action: "create"
listId: [build's list ID]
name: [user-provided milestone name]
parent: [build task ID]
task_type: "milestone"
```

If the user provided a deadline (end date), include it:
```
due_date: [parsed date]
```

**Important:** Milestones require an end date (deadline). If the user did not provide one, ask: "Wat is de deadline voor deze milestone?" Do not create without asking, but do not block if the user explicitly says "later".

Store the returned `milestone_task_id` for the next step.

### Step 4 — Create 4 standard subtasks

Create each subtask under the milestone using `manage_task` with `action: "create"` and `parent: [milestone_task_id]`. Use the same `listId` as the milestone.

**Subtask 1: TEST: Integratie + edge cases**
```
name: "TEST: Integratie + edge cases"
parent: [milestone_task_id]
listId: [build's list ID]
assignees: [developer user ID]    ← from step 2, omit if not available
```

**Subtask 2: TEST: Roleplay client use case**
```
name: "TEST: Roleplay client use case"
parent: [milestone_task_id]
listId: [build's list ID]
assignees: [developer user ID]    ← from step 2, omit if not available
```

**Subtask 3: REVIEW: Klantaansluiting**
```
name: "REVIEW: Klantaansluiting"
parent: [milestone_task_id]
listId: [build's list ID]
assignees: [RO user ID]           ← from step 2, omit if not available
```

**Subtask 4: Feedback ophalen bij [client name]**
```
name: "Feedback ophalen bij [client name]"
parent: [milestone_task_id]
listId: [build's list ID]
assignees: [RO user ID]           ← from step 2, omit if not available
```

Replace `[client name]` with the actual client name from step 2.

### Step 5 — Report

Summarize what was created:

```
Milestone aangemaakt: [milestone name] (ID: [id])
  Parent build: [build name]
  Subtasks:
    - TEST: Integratie + edge cases → [developer name / niet toegewezen]
    - TEST: Roleplay client use case → [developer name / niet toegewezen]
    - REVIEW: Klantaansluiting → [RO name / niet toegewezen]
    - Feedback ophalen bij [client] → [RO name / niet toegewezen]
```

If any assignees were missing, add a note: "Let op: [field] is niet ingesteld op de build. Stel dit in en wijs de subtasks handmatig toe."

---

## Flow C7: Milestone to CLIENT REVIEW

**Trigger:** User says a milestone is ready for client review, or asks to move a milestone to CLIENT REVIEW.

### Step 1 — Identify the milestone

Use `search_tasks` to find the milestone task (by ID or name).

**Error:** If not found, ask for clarification and stop.

### Step 2 — Verify all features are COMPLETE

Use `search_tasks` to find all subtasks/children of the milestone. Filter for items with `custom_item_id: 1003` (Feature type) or look at all direct children that are features (not the standard TEST/REVIEW/Feedback subtasks).

Check status of each feature:
- If ALL features have status `complete` (case-insensitive): proceed to step 3.
- If ANY feature is NOT complete: warn the user and list the incomplete features.

```
Niet alle features zijn COMPLETE. De volgende features staan nog open:
  - [feature name] — status: [status]
  - [feature name] — status: [status]

Wil je toch doorgaan met CLIENT REVIEW?
```

Only proceed if user explicitly confirms. Otherwise stop.

### Step 3 — Move milestone to CLIENT REVIEW

Use `manage_task`:
```
action: "update"
task_id: [milestone task ID]
status: "client review"
```

### Step 4 — Move parent build to CLIENT REVIEW

Extract the parent build task ID from the milestone data (`task.parent`). If not directly available, use `search_tasks` with the milestone's parent ID.

Use `manage_task`:
```
action: "update"
task_id: [build task ID]
status: "client review"
```

### Step 5 — Check for "Feedback ophalen" subtask

Use `search_tasks` to find subtasks of the milestone. Look for a task whose name starts with "Feedback ophalen bij".

**If found:** Note it exists — no action needed.

**If NOT found:**
1. Extract client name from the build (custom field `bf5893a1` or `26f11895` — same as C1 step 2).
2. Extract RO user ID from the build (custom field `a8b23d9f`).
3. Create the subtask:
```
action: "create"
name: "Feedback ophalen bij [client name]"
parent: [milestone task ID]
listId: [build's list ID]
assignees: [RO user ID]
```

**If client name or RO not available:** Create with best-effort name ("Feedback ophalen bij klant") and warn user to update.

### Step 6 — Add comment tagging RO

Extract the RO user ID from the build (field `a8b23d9f`). If available, use it in the @mention.

Use `task_comments`:
```
action: "create"
task_id: [milestone task ID]
comment_text: "Milestone [milestone name] is klaar voor client review. @[RO user ID] graag feedback ophalen bij [client name]."
```

Note: ClickUp @mentions in comments use the format `@user_id`. Include the actual user ID in the comment text for the mention to work. If RO is not set, omit the @mention and add a note: "(Relationship Owner is niet ingesteld — tag handmatig de juiste persoon.)"

### Step 7 — Report

```
Milestone [name] → CLIENT REVIEW
Build [build name] → CLIENT REVIEW
Feedback subtask: [aangemaakt / bestond al]
Comment geplaatst op milestone [met @mention RO / zonder @mention — RO niet ingesteld]
```

---

## Flow C3: Milestone Feedback Received (back to IN PROGRESS)

**Trigger:** User reports that client gave feedback on a milestone, or asks to move a milestone back from CLIENT REVIEW.

### Step 1 — Identify the milestone

Use `search_tasks` to find the milestone (by ID or name).

Verify the milestone is currently in status `client review`. If not, warn the user:
```
Milestone [name] staat niet op CLIENT REVIEW (huidige status: [status]). Wil je toch doorgaan?
```

### Step 2 — Move milestone back to IN PROGRESS

Use `manage_task`:
```
action: "update"
task_id: [milestone task ID]
status: "in progress"
```

### Step 3 — Move parent build back to IN PROGRESS

Extract the parent build task ID from the milestone.

Use `manage_task`:
```
action: "update"
task_id: [build task ID]
status: "in progress"
```

### Step 4 — Add feedback summary comment

Ask the user for the feedback summary if not already provided. This comment is mandatory per workflow rules.

Use `task_comments`:
```
action: "create"
task_id: [milestone task ID]
comment_text: "Feedback ontvangen van klant:\n\n[feedback summary provided by user]"
```

### Step 5 — Process individual feedback items

Ask the user to list each feedback item. For each item, determine the type:

#### Type A: Tweak (small fix within existing feature)

1. Ask user which feature the tweak belongs to (or determine from context).
2. Create a task under that feature:
```
action: "create"
name: [tweak description]
parent: [feature task ID]
listId: [build's list ID]
```
3. If the feature was on COMPLETE, move it back to IN PROGRESS:
```
action: "update"
task_id: [feature task ID]
status: "in progress"
```

#### Type B: Extension (new scope)

**Do NOT create tasks automatically.** This requires RO approval.

1. Warn the user:
```
Dit is een scope-uitbreiding. Volgens de workflow moet dit via de Relationship Owner.
Acties:
  - RO beoordelen: past het in scope/budget? Extra uren nodig? Aparte opdracht?
  - Documenteer in het client doc onder "Feedback & Changes > Scope Changes"
  - Pas na goedkeuring een nieuwe feature aanmaken onder de volgende milestone.

Wil je dat ik de RO tag op de build met dit verzoek?
```
2. If user confirms tagging RO:
```
action: "create" (task_comments)
task_id: [build task ID]
comment_text: "@[RO user ID] Scope-uitbreiding gevraagd door klant: [description]. Graag beoordelen: past binnen huidige build of aparte opdracht?"
```

#### When user doesn't specify type

If the user provides feedback items without classifying them, ask:
```
Is dit een kleine fix binnen een bestaande feature (tweak), of nieuwe scope (uitbreiding)?
```

### Step 6 — Report

```
Milestone [name] → IN PROGRESS (was: CLIENT REVIEW)
Build [build name] → IN PROGRESS
Feedback comment geplaatst op milestone.

Aangemaakt (tweaks):
  - [task name] onder feature [feature name]
  - [task name] onder feature [feature name]

[Features teruggezet naar IN PROGRESS: [feature names]]

Scope-uitbreidingen (handmatige actie vereist):
  - [description] → RO getagd op build [/ nog niet getagd]

Let op: scope-uitbreidingen worden NIET als feature aangemaakt zonder goedkeuring van de Relationship Owner.
```

---

## Common Error Handling

These apply across all flows:

### MCP tool call fails
- If a `manage_task` call fails: report the error, do NOT retry silently. Tell the user what failed and what the intended action was. Ask if they want to retry or handle manually.
- If a `search_tasks` call returns empty results: verify the search parameters and try an alternative (e.g. search by ID instead of name, or broaden the query).

### Missing field data on build
Fields that should be set on the build but may be missing:

| Field | ID | Fallback |
|-------|-----|----------|
| Relationship Owner | `a8b23d9f` | Ask user who the RO is. Use `find_members` to resolve name to user ID. |
| All Clients | `bf5893a1` | Ask user for client name. |
| Client dropdown | `26f11895` | Secondary source for client name if `bf5893a1` is empty. |
| Developer (assignee) | `task.assignees` | Ask user who the developer is. Use `find_members` to resolve. |

### Task type identification
When searching for features vs. standard subtasks under a milestone:
- Features have `custom_item_id: 1003`
- Milestones have `custom_item_id: 1`
- Standard subtasks (TEST, REVIEW, Feedback) are regular tasks (no custom_item_id or custom_item_id: 0/null)
- Use task name prefixes ("TEST:", "REVIEW:", "Feedback ophalen") as a secondary identification method if custom_item_id is not available in search results.

### Resolving people by name
When the user provides a person's name instead of a user ID:
1. Use `find_members` to search for the name.
2. If exactly 1 match: use that user ID.
3. If multiple matches: list them and ask user to pick.
4. If no match: warn user and skip assignment. Add a note to create with assignee missing.
