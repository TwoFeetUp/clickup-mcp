# MCP Issues — Sessie 26 februari 2026

Gevonden tijdens het aanmaken van de SharePoint API-koppeling feature onder LHT > Agent Platform > Fase 3.

---

## 8. Time estimate format incorrect — OPGELOST

- **Gevonden**: `manage_task` met `time_estimate: "8h"` resulteerde in waarde `480` in ClickUp
- **Fix**: `parseTimeEstimate()` converteert nu naar milliseconden. Descriptions verduidelijkt op 5 plekken.
- **Bestanden**: `src/tools/task/handlers.ts`, `consolidated-tools.ts`, `single-operations.ts`, `task-type-schema-builder.ts`

## 9. Move-actie reset task type naar lijstdefault — OPGELOST

- **Gevonden**: Feature (custom_item_id: 1003) verplaatst naar andere lijst werd een Build (1015)
- **Fix**: `custom_item_id: task.custom_item_id` toegevoegd aan `extractTaskData()` in `task-core.ts`
- **Bestanden**: `src/services/clickup/task/task-core.ts`

## 10. Parent kan niet via update-actie gezet worden — OPGELOST

- **Gevonden**: `manage_task({ action: "update", parent: "xxx" })` gaf fout
- **Fix**: `parent` mapping in `buildUpdateData()`, schema description updated, response tracking toegevoegd
- **Bestanden**: `src/tools/task/handlers.ts`, `consolidated-tools.ts`, `consolidated-handlers.ts`
