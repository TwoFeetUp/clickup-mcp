# Operational Workflows — TwoFeetUp Delivery

Compound workflows for specific delivery scenarios. Each flow is a step-by-step
procedure the AI assistant follows, using exact tool names, parameter names,
field IDs, and list IDs.

---

## Key References

| Entity | ID |
|--------|----|
| Building list | `901517909345` |
| Scope builds list | `901521465791` |
| Client Handover list | `901517909344` |
| Maintenance list | `901518191956` |
| All Clients list | `901517909340` |
| Hours cap field | `1a231a8a` |
| Client relationship field | `bf5893a1` |
| RO field | `a8b23d9f` |
| Repos field | `82ddf7ad` |

---

## Flow 1: Hours Cap Monitoring (C5)

**Trigger:** User asks to check hours on a build, or proactively when updating time tracking.

### Steps

1. **Get build task details**
   - `search_tasks` with `taskId`, `detail_level: "detailed"`
   - Extract the hours cap from custom field `1a231a8a`
   - If field is empty or missing: report "Geen hours cap ingesteld op deze build." and stop

2. **Get time entries for the build**
   - `task_time_tracking` with `action: "get_entries"`, `taskId`
   - Sum `duration` across all entries (convert ms to hours)

3. **Get time entries for subtasks (milestones, features)**
   - `search_tasks` to find subtasks of the build (milestones and features)
   - For each subtask: `task_time_tracking` with `action: "get_entries"`, `taskId`
   - Add to total tracked hours

4. **Calculate percentage**
   - `percentage = (total_tracked_hours / hours_cap) * 100`

5. **Report to user**
   - Under 80%: "Binnen budget. [X]h van [Y]h gebruikt ([Z]%)."
   - 80-99%: "[X]h van [Y]h gebruikt ([Z]%). Nadert limiet -- overleg met RO."
   - 100%+: "[X]h van [Y]h gebruikt ([Z]%). Budget overschreden -- direct actie nodig."

6. **If >= 80%: suggest flagging**
   - Suggest adding a comment on the build task to flag the budget status
   - If user confirms: `task_comments` with `action: "create"`, `taskId`, `comment_text` describing the budget status and percentage
   - Tag the RO (from field `a8b23d9f`) in the comment

### Error Handling
- If `search_tasks` returns no task: "Build niet gevonden. Controleer het task ID."
- If hours cap field is not set: "Hours cap niet ingesteld. Kan budget niet berekenen."
- If time tracking returns no entries: report 0h tracked, percentage = 0%

---

## Flow 2: Paused Client (C8)

**Trigger:** User indicates a client is pausing all active work.

### Steps

1. **Resolve the client**
   - Ask user: which client?
   - `search_tasks` in list `901517909340` (All Clients) to find the client task by name
   - If multiple matches: present options and ask user to confirm
   - Note the client task ID for relationship matching

2. **Find all active builds for this client**
   - `search_tasks` with filters on custom field `bf5893a1` (client relationship) matching the client
   - Alternatively: search by client name across the Building list (`901517909345`)
   - Filter to only tasks that are NOT already in status "blocked" or "complete"

3. **For each active build, suspend it**
   - a. Move to Scope builds list:
     `manage_task` with `action: "move"`, `taskId`, `targetListId: "901521465791"`
   - b. Set status to blocked:
     `manage_task` with `action: "update"`, `taskId`, `status: "blocked"`
   - c. Add comment:
     `task_comments` with `action: "create"`, `taskId`, `comment_text: "BLOCKED: Client paused. Alle werk on hold tot nader order."`

4. **Report**
   - "[N] builds verplaatst naar Scope builds en gemarkeerd als BLOCKED."
   - List each build by name and ID

5. **Remind user**
   - "Informeer RO om klant te contacteren over hervatting."
   - If RO is known from field `a8b23d9f`: mention who the RO is

### Error Handling
- If no client found: "Client niet gevonden in All Clients lijst. Controleer de naam."
- If no active builds found: "Geen actieve builds gevonden voor deze client."
- If move fails on a specific build: report which build failed, continue with remaining builds

---

## Flow 3: Client Handover Checklist (C10)

**Trigger:** User indicates a build is ready for handover (all milestones should be complete).

### Steps

1. **Verify all milestones are complete**
   - `search_tasks` for subtasks of the build, filter on milestone task type
   - Check each milestone status is "complete"
   - If any milestone is NOT complete:
     - Warn user: "Niet alle milestones zijn afgerond."
     - List each incomplete milestone with name, status, and ID
     - Ask user if they want to proceed anyway or resolve the open milestones first
     - If user chooses to stop: end flow

2. **Check handover requirements**
   - Documentation: check if the client documentation build page has content
     - Use `list_documents` or `manage_document_page` with `action: "get"` to verify
   - Deliverables: check if Loom/handleiding subtasks exist under the build and are marked done
   - Report any missing items but do not block the flow

3. **Move build to Client Handover list**
   - `manage_task` with `action: "move"`, `taskId`, `targetListId: "901517909344"`

4. **Set status to in progress**
   - `manage_task` with `action: "update"`, `taskId`, `status: "in progress"`

5. **Create checklist comment on the build**
   - `task_comments` with `action: "create"`, `taskId`, `comment_text`:
     ```
     Client Handover Checklist:
     - [ ] Documentatie compleet
     - [ ] Loom/handleiding aanwezig
     - [ ] Client Sign-off email verzonden
     - [ ] Alle deliverables gecontroleerd
     ```

6. **Tag RO for sign-off email**
   - Get RO from custom field `a8b23d9f` on the build
   - `task_comments` with `action: "create"`, `taskId`, `comment_text` mentioning the RO and requesting they send the sign-off email to the client

7. **Report**
   - "Build verplaatst naar Client Handover. Checklist aangemaakt."
   - If any items were flagged in step 2: remind user of missing items

### Error Handling
- If build not found: "Build niet gevonden. Controleer het task ID."
- If move fails: "Kan build niet verplaatsen naar Client Handover. Controleer permissies."
- If document check fails (e.g., document tools disabled): skip doc check, note in report

---

## Flow 4: Maintenance Task Creation (C11)

**Trigger:** User wants to create a maintenance task linked to an original build.

### Steps

1. **Gather information**
   - Ask user: which build? what maintenance is needed?
   - If build is not specified by ID: `search_tasks` by name in Building list (`901517909345`) and Client Handover list (`901517909344`)
   - If multiple matches: present options and ask user to confirm

2. **Get build details**
   - `search_tasks` with `taskId` of the original build, `detail_level: "detailed"`
   - Extract:
     - Client relationship from field `bf5893a1`
     - RO from field `a8b23d9f`
     - Assignee (developer) from the build task

3. **Create maintenance task**
   - `manage_task` with:
     - `action: "create"`
     - `listId: "901518191956"` (Maintenance list)
     - `name: "[Build name] - [Maintenance description]"`
     - `assignees`: same developer as original build
   - Store the new task ID from the response

4. **Set client relationship on maintenance task**
   - `manage_task` with:
     - `action: "update"`
     - `taskId`: new maintenance task ID
     - `custom_fields: [{ id: "bf5893a1", value: [same_client_relationship_value] }]`

5. **Link to original build**
   - `manage_task` with:
     - `action: "add_link"`
     - `taskId`: new maintenance task ID
     - `link_to_task_id`: original build task ID

6. **Add comment on maintenance task**
   - `task_comments` with:
     - `action: "create"`
     - `taskId`: new maintenance task ID
     - `comment_text: "Maintenance task aangemaakt, gelinkt aan build [build name] ([build task ID])."`

7. **Report**
   - "Maintenance task aangemaakt en gelinkt aan originele build."
   - Include: task name, task ID, link to original build, assigned developer

### Error Handling
- If original build not found: "Build niet gevonden. Controleer de naam of het task ID."
- If developer field is empty on build: warn user, create task without assignee, ask who to assign
- If link creation fails: report failure but keep the task, note the link must be added manually
- If client relationship field is empty on build: warn user, skip setting it on maintenance task
