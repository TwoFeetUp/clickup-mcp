# MCP Mogelijkheden & Beperkingen
**Updated:** 26 feb 2026

## ✅ Werkt via MCP

### Opgelost op 25 feb 2026
- Fuzzy zoeken (bijv. "email automation" vindt ook "E-Mail Automation")
- Subtasks zichtbaar bij list search
- Custom field filtering op relationship velden (client-side post-filter)
- Workspace-breed zoeken zonder exacte naam

### Al eerder beschikbaar (24 feb 2026)
- Templates toepassen (zoeken + aanmaken vanuit template)
- Statussen per lijst ophalen
- Task dependencies (waiting on / blocking)
- Task links (bidirectioneel)
- Task types (Build, Feature, Client, Milestone)
- List relationship velden schrijven (bijv. "All Clients" koppeling)

### Standaard altijd beschikbaar
- Tasks aanmaken, updaten, verwijderen
- Custom field waarden lezen en schrijven
- Comments plaatsen
- Status wijzigen
- Time tracking
- Docs en pagina's aanmaken en bewerken
- Workspace hiërarchie opvragen

---

## ❌ Echte harde beperkingen (ClickUp API biedt dit niet)

| Wat | Alternatief |
|-----|-------------|
| Doc Relationship instellen op een task | Handmatig koppelen in UI |
| Automations uitlezen of instellen | ClickUp UI of n8n/Make |
| Views aanmaken of beheren | Handmatig in UI |
| Notificatie-instellingen aanpassen | Handmatig in UI |
| Custom fields aanmaken of hernoemen | Handmatig via Settings |
| Templates aanmaken of wijzigen | Alleen lezen + toepassen kan |

---

## 🔧 API beschikbaar, MCP-uitbreiding nodig

### List relationships schrijven — BEVESTIGD WERKEND, MCP END-TO-END TEST NODIG
- **API**: `POST /task/{id}/field/{field_id}` met `{ "value": { "add": ["task_id"], "rem": [] } }`
- **Velden**: "All Clients" (`bf5893a1`), "Repos" (`82ddf7ad`)
- **MCP status**: `manage_task` stuurt custom fields, `transformCustomFieldValue()` converteert arrays naar `add`/`rem` format — moet nog end-to-end via MCP getest worden
- **Test**: `playground/test-relationship-custom-fields.js`

### Task types (`custom_item_id`) — BEVESTIGD WERKEND, SCHEMA CHECK NODIG
- **API**: `POST /list/{id}/task` accepteert `custom_item_id`; 19 types beschikbaar
- **Belangrijke types**: milestone (1), Client (1010), Build (1015), Feature (1003)
- **MCP status**: Code werkt via `task_type` + `taskTypeService` + `buildManageTaskToolSchema()`. Schema-exposure bij runtime moet geverifieerd worden.
- **Test**: `playground/test-gap-task-types.js`

---

## ✅ Wel mogelijk via MCP (bestaande tools)

- Tasks aanmaken, updaten, verwijderen (`manage_task`)
- Task types instellen bij aanmaken (`task_type` parameter — werkt in code)
- Custom field values instellen met field ID (`manage_task`)
- Taken doorzoeken en ophalen (`search_tasks`)
- Time tracking entries toevoegen (`task_time_tracking`)
- Comments plaatsen (`task_comments`)
- Assignees instellen (`manage_task`)
- Status wijzigen (`manage_task`)
- Lijsten/folders beheren (`manage_container`, `get_container`)
- Statussen per lijst ophalen (`get_container` met `include_statuses`)
- Members zoeken (`find_members`)
- Tags beheren (`operate_tags`)
- Templates toepassen (`apply_template`)
- Task dependencies instellen (`manage_task` met `add_dependency`/`remove_dependency`)
- Task links instellen (`manage_task` met `add_link`/`remove_link`)
- Documenten beheren (`manage_document`, `manage_document_page`, `list_documents`)
- List relationship velden uitlezen (soms inconsistent zichtbaar in task data)

---

## 📌 Werkwijze

- Custom field IDs zijn vereist, niet namen — zie `field-requirements.md`
- Reads eerst testen, dan writes uitvoeren
- Task types gebruiken bij aanmaken: `task_type: "Build"` of `task_type: "milestone"`
- Voor list relationships: test of `manage_task` custom_fields het `add`/`rem` format correct doorstuurt
- Doc Relationship: altijd handmatig koppelen (enige echte harde beperking bij build aanmaken)

---

## 📊 Verificatietests

Alle tests staan in `playground/` en kunnen herhaald worden:

```bash
# Credentials
export CLICKUP_API_KEY=pk_xxx
export CLICKUP_TEAM_ID=xxx

# Run tests
node playground/test-gap-list-statuses.js      # B4: statussen
node playground/test-gap-templates.js           # B3: templates
node playground/test-gap-dependencies-links.js  # B5/B6: dependencies + links
node playground/test-gap-task-types.js          # B1: task types
node playground/test-relationship-custom-fields.js  # B2: list relationships
```
