# MCP Issues — Gevonden tijdens gebruik

Laatste update: 26 feb 2026

---

## ✅ Opgelost

### 1. Task name search is te strikt — OPGELOST (25 feb 2026)
- **Probleem**: `search_tasks` met `taskName` vindt "E-Mail Automation" niet als je "email automation" zoekt
- **Fix**: Punctuatie-normalisatie toegevoegd aan `isNameMatch()` in `resolver-utils.ts`
- **Hoe**: Nieuwe matching tier (score 65) die hyphens, dots, underscores stript vóór vergelijking. "E-Mail Automation" → "email automation" matcht nu. Ook punctuatie-genormaliseerde substring matching (score 55/45) voor partiele matches.
- **Bestanden**: `src/utils/resolver-utils.ts`

### 2. Geen workspace-brede fuzzy zoek — OPGELOST (25 feb 2026)
- **Probleem**: Om een task te vinden moest je het exacte ID, de exacte naam, of de lijst kennen
- **Fix**: Opgelost door issue 1 — de `isNameMatch()` functie wordt al gebruikt in `findTasks()` voor global workspace search. Nu die functie punctuatie-normalisatie doet, werkt workspace-brede fuzzy search automatisch.

### 3. Subtask-structuur niet zichtbaar in list search — OPGELOST (25 feb 2026)
- **Probleem**: `search_tasks` met `listId` toonde alleen top-level taken
- **Fix**: `include_subtasks` en `include_closed` parameters doorgeven in `buildTaskFilters()` in `handlers.ts`
- **Hoe**: De parameters bestonden al in het schema en in `buildTaskFilterParams()`, maar `buildTaskFilters()` gaf ze niet door. Twee regels toegevoegd.
- **Bestanden**: `src/tools/task/handlers.ts`

### 5. Custom field filtering werkt niet op relationship velden — OPGELOST (25 feb 2026)
- **Probleem**: ClickUp API filtert niet op `list_relationship` type velden — retourneert gewoon alle taken
- **Fix**: Client-side post-filtering toegevoegd in `consolidated-handlers.ts`
- **Hoe**: `filterByRelationshipCustomFields()` functie checkt na API response of taken de gevraagde relationship waarde bevatten. Werkt voor `list_relationship`, `tasks` en `users` type velden. Andere veldtypes worden door de API gefilterd (pass-through).
- **Bestanden**: `src/tools/task/consolidated-handlers.ts`

### 8. Time estimate format incorrect — OPGELOST (26 feb 2026)
- **Probleem**: `manage_task` met `time_estimate: "8h"` stuurde `480` (minuten) naar de API die milliseconden verwacht
- **Fix**: `parseTimeEstimate()` in `handlers.ts` converteert nu naar milliseconden. "8h" → `28800000`
- **Hoe**: Uur × 60 × 60 × 1000, minuten × 60 × 1000. Descriptions op 5 plekken verduidelijkt met "(ClickUp API unit: milliseconds)". Debug console.logs verwijderd.
- **Bestanden**: `src/tools/task/handlers.ts`, `src/tools/task/consolidated-tools.ts`, `src/tools/task/single-operations.ts`, `src/tools/task/task-type-schema-builder.ts`

### 9. Move-actie reset task type naar lijstdefault — OPGELOST (26 feb 2026)
- **Probleem**: Feature (custom_item_id: 1003) verplaatst naar andere lijst werd een Build (1015) — moveTask is delete+recreate en `extractTaskData()` kopieerde `custom_item_id` niet
- **Fix**: `custom_item_id: task.custom_item_id` toegevoegd aan `extractTaskData()` return object
- **Bestanden**: `src/services/clickup/task/task-core.ts`

### 10. Parent kan niet via update-actie gezet worden — OPGELOST (26 feb 2026)
- **Probleem**: `manage_task({ action: "update", parent: "xxx" })` gaf fout — `buildUpdateData()` las `parent` niet
- **Fix**: (1) `parent` mapping in `buildUpdateData()`, (2) schema description updated van "create only" naar "create + update", (3) `parent` in `buildMinimalSuccessResponse` updatedFields
- **Bestanden**: `src/tools/task/handlers.ts`, `src/tools/task/consolidated-tools.ts`, `src/tools/task/consolidated-handlers.ts`

---

## Open

### 4. Task type mismatch
- **Gevonden**: "E-Mail Automation" heeft `custom_item_id: 1003` (Feature), maar is een top-level task zonder parent
- **Verwacht**: Als het een build is, zou het type 1015 (Build) moeten zijn; als het een feature is, hoort het een parent build te hebben
- **Impact**: Skill workflows die op task type filteren missen deze taken
- **Actie**: Data opschonen — correct type instellen of parent build aanmaken
- **Type**: Data fix | **Prioriteit**: Laag | **Effort**: Klein

### 6. Twee taken met bijna dezelfde naam, verschillende clients
- **Probleem**: "E-Mail Automation" (Olympisch Stadion) vs "Email automation" (LHT) — bijna identiek
- **Impact**: Sub-agent koos de verkeerde, features aangemaakt onder verkeerde client
- **Root cause**: Zonder client context is het onmogelijk de juiste te kiezen op naam alleen
- **Les**: Bij ambigue task namen altijd client context meegeven (task ID of client naam)
- **Mitigatie**: De `/manage-task` command in product-management plugin dwingt nu client-first resolution af
- **Type**: Workflow | **Status**: Gemitigeerd door skill/command

### 7. Build staat in "Client Review" lijst maar LHT client link bevat build ID
- **Gevonden**: Build "Email automation" (86c62vkxh) zit in "Client Review" lijst, niet in "Building"
- **Impact**: Zoeken in Building lijst mist deze build
- **Les**: Builds verhuizen tussen lijsten — altijd via client link of task ID zoeken, niet via lijst
- **Mitigatie**: De `/manage-task` command zoekt via client → builds relationship, niet via lijst
- **Type**: Workflow | **Status**: Gemitigeerd door skill/command
