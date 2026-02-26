# Gap Analyse: Delivery Skill vs. MCP Capabilities

Laatste update: 24 feb 2026
Bron: cross-referentie van SKILL.md, mcp-limitations.md, automations.md, decisions-log.md, huidige MCP server source code, ClickUp API v2 documentatie, en live API-tests (`playground/test-gap-*.js`)

---

## Leeswijzer

| Categorie | Betekenis |
|-----------|-----------|
| **A. Harde API-beperkingen** | ClickUp biedt geen API-endpoint — niet op te lossen in de MCP server |
| **B. MCP-uitbreidingen** | ClickUp API ondersteunt het WEL, maar de MCP server heeft er (nog) geen tool voor |
| **C. Ontbrekende workflow-intelligentie** | MCP tools bestaan, maar compound logica / validatie / orkestratie mist |
| **D. Ontbrekende externe integraties** | Skill verwijst naar systemen buiten ClickUp |
| **E. Open beslissingen** | Workflow-keuzes die nog niet genomen zijn |

---

## A. Harde API-beperkingen

Dingen waarvoor de ClickUp API **geen endpoint biedt**. Niet op te lossen zonder dat ClickUp hun API uitbreidt.

### A1. Doc Relationship
- **Wat**: Native ClickUp feature om een Doc te koppelen aan een task
- **API status**: Niet beschikbaar — Doc Relationships verschijnen niet in de API
- **Impact**: Client doc niet koppelbaar aan build of client task via MCP
- **Workaround**: Handmatig koppelen in ClickUp, of Make.com flow

### A2. Automations configureren
- **Wat**: ClickUp automations uitlezen, aanmaken, of wijzigen
- **API status**: Geen endpoints
- **Impact**: Alle 15+ geplande automations (zie `automations.md`) moeten handmatig of via Make.com
- **Workaround**: ClickUp UI of Make.com scenarios

### A3. Views aanmaken of beheren
- **Wat**: Board views, list views, calendar views etc.
- **API status**: Geen endpoints
- **Impact**: Views moeten handmatig ingericht worden per lijst
- **Workaround**: Handmatig in ClickUp

### A4. Notificatie-instellingen aanpassen
- **Wat**: Wie krijgt notificaties bij welke events
- **API status**: Geen endpoints
- **Impact**: Notification routing (PM bij INTERNAL REVIEW, Dev bij feedback) niet via MCP
- **Workaround**: Handmatig instellen, of via ClickUp automations

### A5. Custom fields aanmaken of hernoemen
- **Wat**: Nieuwe custom fields toevoegen op een lijst, of bestaande hernoemen
- **API status**: Geen endpoints voor CRUD van field definities
- **Impact**: Structuurwijzigingen vereisen altijd handmatig werk
- **Workaround**: Handmatig via ClickUp Settings > Fields

### A6. Template management
- **Wat**: Templates aanmaken, wijzigen, of verwijderen
- **API status**: Templates kunnen wel **gelezen** en **toegepast** worden (zie B3), maar niet aangemaakt/gewijzigd
- **Impact**: Template-onderhoud blijft handmatig in ClickUp UI

---

## B. MCP-uitbreidingen nodig

De ClickUp API **ondersteunt dit WEL**, maar de MCP server heeft er nog geen (volledige) tool voor. Dit zijn de snelste wins.

### B1. Task types (`custom_item_id`) — BEVESTIGD WERKEND via API
- **Wat**: Builds (1015), Clients (1010), Features (1003), Milestones (1) hebben elk een task type
- **API test**: `POST /list/{id}/task` met `custom_item_id` werkt. `GET /task/{id}` toont `custom_item_id` correct. 19 types beschikbaar via `GET /team/{id}/custom_item`.
- **MCP status**: Code WERKT al (`task_type` parameter in handler + `taskTypeService`), maar **schema mist het veld**
  - `consolidated-tools.ts` toont `task_type` niet in de tool schema
  - `task-type-schema-builder.ts` bouwt een dynamisch schema, wordt gebruikt in `server.ts` via `buildManageTaskToolSchema()`
  - Mogelijk correct bij runtime maar niet zichtbaar in statische definitie
- **Impact**: AI/gebruikers weten niet dat `task_type` beschikbaar is als parameter
- **Fix**: Verifieer of het dynamische schema correct wordt geserveerd; zo niet, `task_type` toevoegen aan `consolidated-tools.ts`
- **Tests**: `playground/test-gap-task-types.js` (API), `playground/test-create-milestone.js` (MCP)

### B2. List relationships schrijven — BEVESTIGD WERKEND via API
- **Wat**: Velden zoals "All Clients" (`bf5893a1`) en "Repos" (`82ddf7ad`) op builds
- **API test**: `POST /task/{id}/field/{field_id}` met `{ "value": { "add": ["task_id"], "rem": [] } }` werkt. Bestaande test `playground/test-relationship-custom-fields.js` bevestigt correct + verkeerd format.
- **MCP status**: `manage_task` ondersteunt `custom_fields` met key/value. De MCP code heeft al `transformCustomFieldValue()` helpers die arrays naar `add`/`rem` format converteren voor `tasks`/`list_relationship`/`users` type velden.
- **Impact**: Elke build mist 2 verplichte koppelingen bij aanmaken via MCP
- **Nog te testen**: Of het volledige pad via `manage_task` (niet direct API) correct werkt end-to-end
- **Prioriteit**: Hoog — deblokkeert C9 (build aanmaken) en C11 (maintenance linking)

### B3. Templates toepassen — ✅ GEIMPLEMENTEERD (24 feb 2026)
- **Wat**: Task aanmaken op basis van een template
- **MCP tool**: `apply_template` met acties `list` en `create`
- **Features**: Template zoeken op naam (fuzzy match) of ID, task aanmaken vanuit template in een lijst
- **Beperking**: Create-from-template accepteert alleen `name`; overige velden daarna via `manage_task`
- **Bestanden**: `src/tools/template-tools.ts`, `src/services/clickup/template.ts`
- **Test**: `playground/test-gap-templates.js`

### B4. Statussen per lijst ophalen — ✅ GEIMPLEMENTEERD (24 feb 2026)
- **Wat**: Beschikbare statussen voor een specifieke lijst
- **MCP tool**: `get_container` met `include_statuses: true` (of `detail_level: "detailed"`)
- **Alle 4 delivery-lijsten** hebben `override_statuses: true` met eigen statuses
- **Bestanden**: `src/tools/container-tools.ts`, `src/tools/container-handlers.ts`
- **Test**: `playground/test-gap-list-statuses.js`

### B5. Task dependencies — ✅ GEIMPLEMENTEERD (24 feb 2026)
- **Wat**: Dependency-relaties tussen taken (waiting on / blocking)
- **MCP tool**: `manage_task` met acties `add_dependency` en `remove_dependency`
- **Parameter**: `depends_on_task_id`
- **Impact**: Invoicing flow gebruikt dependencies (sign-off checkbox heft dependency op Payables taken)
- **Bestanden**: `src/services/clickup/task/task-core.ts`, `src/tools/task/consolidated-tools.ts`, `src/tools/task/consolidated-handlers.ts`
- **Test**: `playground/test-gap-dependencies-links.js`

### B6. Task links — ✅ GEIMPLEMENTEERD (24 feb 2026)
- **Wat**: Simpele bidirectionele links tussen taken (niet-hiërarchisch)
- **MCP tool**: `manage_task` met acties `add_link` en `remove_link`
- **Parameter**: `link_to_task_id`
- **Impact**: Maintenance tasks linken aan originele build
- **Bestanden**: `src/services/clickup/task/task-core.ts`, `src/tools/task/consolidated-tools.ts`, `src/tools/task/consolidated-handlers.ts`
- **Test**: `playground/test-gap-dependencies-links.js`

---

## C. Ontbrekende workflow-intelligentie

MCP tools bestaan (of komen via B), maar de skill beschrijft **compound gedrag** dat orchestratie, validatie, of multi-step logica vereist.

### C1. Milestone template — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-milestone-flows.md` → Flow 1
- **Wat**: Milestone aanmaken met 4 standaard subtasks, automatisch assignees toewijzen
- **Gedekt**: Build context ophalen, milestone + subtasks aanmaken, assignee routing

### C2. Status cascade checks — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-status-rules.md` → Post-change cascades
- **Wat**: Upward cascades (feature → milestone → build), completion suggestions, downward checks
- **Gedekt**: IN PROGRESS cascade (auto), COMPLETE cascade (ask confirmation), BUILD → CLIENT REVIEW

### C3. BLOCKED validatie — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-status-rules.md` → Pre-change checklist, regel 1
- **Wat**: BLOCKED vereist mandatory comment met reden + escalatie-assessment
- **Gedekt**: Reden afdwingen, comment + status samen, escalatielogica

### C4. Assignee gate bij PLANNED — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-status-rules.md` → Pre-change checklist, regel 2
- **Wat**: Feature mag niet naar PLANNED zonder assignee
- **Gedekt**: Check, blokkeer, vraag om assignee, dan pas status wijzigen

### C5. Hours cap monitoring — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-operational.md` → Flow 1
- **Wat**: Budget monitoring met threshold-alerts (80%, 100%)
- **Gedekt**: Time entries ophalen, cap vergelijken, drempel-rapportage, comment suggestie

### C6. Feasibility check (planningsvalidatie) — OPEN
- **Wat**: Som van feature estimates per milestone, getoetst aan deadlines en build start/end dates
- **Impact**: Overboeking wordt niet gedetecteerd
- **Status**: Geen workflow geschreven — vereist aggregatie van time estimates over subtasks
- **Mogelijke aanpak**: Read-only query bij milestone planning, kan als uitbreiding op workflow-build-creation

### C7. CLIENT REVIEW compound flow — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-milestone-flows.md` → Flow 2
- **Wat**: Milestone → CLIENT REVIEW met build cascade, subtask check, RO tagging
- **Gedekt**: Feature completeness check, status cascade, feedback subtask, comment met @mention

### C8. Paused client flow — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-operational.md` → Flow 2
- **Wat**: Alle builds voor client pauzeren: move + block + comment
- **Gedekt**: Client resolve, batch find builds, per-build move/block/comment

### C9. Build aanmaken — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-build-creation.md` (12 stappen)
- **Wat**: End-to-end build creation met alle velden, milestones, subtasks
- **Gedekt**: Client resolve, member resolve, build + custom fields, relationships, milestones, subtasks, doc handoff, skipped fields report

### C10. Handover checklist — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-operational.md` → Flow 3
- **Wat**: Handover met milestone check, doc check, checklist comment, RO tagging
- **Gedekt**: Milestone completeness, move to Client Handover, checklist, sign-off email herinnering

### C11. Maintenance task linking — ✅ WORKFLOW GESCHREVEN (24 feb 2026)
- **Workflow**: `references/workflow-operational.md` → Flow 4
- **Wat**: Maintenance task aanmaken gelinkt aan originele build
- **Gedekt**: Build resolve, task create, client relationship, task link (B6), context comment

### C12. Client doc pre-fill bij build aanmaken — GEBLOKKEERD
- **Wat**: Scope en Requirements secties vullen vanuit Salesforce opportunity en Fireflies transcript
- **Impact**: Client doc blijft leeg bij build aanmaken
- **Geblokkeerd door**: D1 (Salesforce) en D2 (Fireflies integratie)
- **Deels gedekt**: workflow-build-creation.md bevat stap voor doc page aanmaken, maar zonder pre-fill data

---

## D. Ontbrekende externe integraties

De skill verwijst naar systemen buiten ClickUp die niet bereikbaar zijn vanuit de MCP.

### D1. Salesforce
- **Gebruik**: Opportunity ophalen bij build aanmaken, Account link bij client, CRM sync bij sign-off
- **Impact**: Scope pre-fill onmogelijk, Salesforce links handmatig opzoeken
- **Status**: Geen integratie — apart MCP of Make.com flow nodig

### D2. Fireflies
- **Gebruik**: Transcript ophalen voor scope/requirements pre-fill in client doc
- **Impact**: Client doc blijft leeg bij build aanmaken
- **Status**: Fireflies MCP bestaat als aparte tool, maar niet geintegreerd in delivery flow

### D3. Make.com
- **Gebruik**: Automations uitvoeren, Doc Relationship linking, status cascade triggers
- **Impact**: Automations handmatig instellen
- **Status**: Aparte tool, niet aanroepbaar vanuit ClickUp MCP

### D4. Email / externe notificaties
- **Gebruik**: Sign-off email naar client, 80% hours alert, formele delivery communicatie
- **Impact**: Alleen ClickUp comments mogelijk, geen email
- **Status**: Buiten scope van ClickUp MCP

### D5. Moneybird
- **Gebruik**: Facturatie na Client Sign-off
- **Impact**: Facturatieflow volledig handmatig
- **Status**: Leonie reviewt handmatig

---

## E. Open beslissingen

Onbepaalde workflow-keuzes die implementatie blokkeren.

### E1. Feedback buffer standaard
- **Vraag**: Hoeveel dagen standaard voor client review + feedback verwerking per milestone?
- **Blokkeert**: C6 (feasibility check)
- **Wie beslist**: Thomas / PM

### E2. Sign-off email tekst en termijn
- **Vraag**: Exacte tekst, stilzwijgend akkoord termijn (X dagen), wie stuurt het
- **Blokkeert**: Handover flow automatisering
- **Wie beslist**: Thomas / RO

### E3. Salesforce flow voor nieuwe scope
- **Vraag**: Hoe gaat scope-uitbreiding vanuit lopende build naar nieuwe Salesforce opportunity?
- **Blokkeert**: Escalatie-pad voor scope changes
- **Wie beslist**: Thomas / Sales

### E4. Reporting metrics
- **Vraag**: Welke metrics? Throughput, spent vs estimate, maintenance ratio?
- **Blokkeert**: Dashboard/rapportage ontwikkeling
- **Wie beslist**: Thomas

### E5. RO of Developer als client contact
- **Vraag**: Varieert per build/client. Hoe implementeer je dit als veld?
- **Blokkeert**: Notificatie-routing
- **Wie beslist**: Thomas / team

### E6. Subtask completion → parent auto-update
- **Vraag**: Moet ClickUp parent feature status automatisch updaten als alle subtasks DONE zijn?
- **Blokkeert**: C2 (status cascade) implementatie
- **Wie beslist**: Testen in ClickUp nodig

### E7. Payables & Invoices field ID
- **Wat**: List relationship field ID voor facturatielijst op All Clients is nog niet gemapt
- **Blokkeert**: Automatische facturatie-trigger bij sign-off
- **Actie**: Field ID ophalen uit ClickUp

---

## Prioritering

### Tier 1: Resterende quick wins

| # | Gap | Status | Type | Geschatte effort | Deblokkeert |
|---|-----|--------|------|-----------------|-------------|
| 1 | B1. Task types schema fix | OPEN | Schema check | Klein (3-4 regels) | Correcte builds, clients, milestones |
| 2 | B2. List relationships schrijven | OPEN (e2e test nodig) | End-to-end MCP test | Middel | C9 (build flow), C11 (maintenance) |
| 3 | B3. Templates toepassen | ✅ DONE | Nieuwe tool | — | C1 (milestone template) |
| 4 | B4. Statussen per lijst | ✅ DONE | Response uitbreiding | — | C4 (assignee gate), statusvalidatie |
| 5 | B5. Task dependencies | ✅ DONE | Nieuwe actie | — | Invoicing flow |
| 6 | B6. Task links | ✅ DONE | Nieuwe actie | — | C11 (maintenance linking) |

### Tier 2: Skill-logica — compound flows ✅ DONE (24 feb 2026)

| # | Gap | Status | Workflow bestand |
|---|-----|--------|-----------------|
| 7 | C9. Build aanmaken flow | ✅ DONE | `workflow-build-creation.md` |
| 8 | C1. Milestone template flow | ✅ DONE | `workflow-milestone-flows.md` |
| 9 | C7. CLIENT REVIEW flow | ✅ DONE | `workflow-milestone-flows.md` |
| 10 | C2. Status cascade | ✅ DONE | `workflow-status-rules.md` |
| 11 | C3. BLOCKED validatie | ✅ DONE | `workflow-status-rules.md` |
| 12 | C4. Assignee gate | ✅ DONE | `workflow-status-rules.md` |
| 13 | C5. Hours cap monitoring | ✅ DONE | `workflow-operational.md` |
| 14 | C8. Paused client | ✅ DONE | `workflow-operational.md` |
| 15 | C10. Handover checklist | ✅ DONE | `workflow-operational.md` |
| 16 | C11. Maintenance linking | ✅ DONE | `workflow-operational.md` |

### Tier 4: Externe integraties en open beslissingen

| # | Gap | Type | Geschatte effort | Blokkeert |
|---|-----|------|-----------------|-----------|
| 13 | D1. Salesforce | Integratie | Groot | C12 (doc pre-fill) |
| 14 | D2. Fireflies | Integratie | Middel | C12 (doc pre-fill) |
| 15 | E1-E7 | Beslissingen | N/A | Diverse |

### Onoplosbaar (harde beperkingen)

| # | Gap | Workaround |
|---|-----|------------|
| A1 | Doc Relationship | Handmatig koppelen |
| A2 | Automations | ClickUp UI of Make.com |
| A3 | Views | Handmatig |
| A4 | Notificaties | ClickUp automations |
| A5 | Custom field CRUD | Handmatig |
| A6 | Template management | ClickUp UI |

---

## Impact op `mcp-limitations.md`

Na deze analyse moeten de volgende items uit `mcp-limitations.md` worden **geherclassificeerd**:

| Item in mcp-limitations.md | Was | Is nu |
|---------------------------|-----|-------|
| Templates toepassen | "Niet mogelijk" | **WEL mogelijk** — API heeft `GET /taskTemplate` + `POST /list/{id}/taskTemplate/{id}` |
| List relationships instellen | "Niet mogelijk" | **Waarschijnlijk WEL mogelijk** — Custom Fields type `tasks` via `POST /task/{id}/field/{id}` met `add`/`rem` |
| Status flows per lijst opvragen | "Niet mogelijk" | **WEL mogelijk** — `GET /list/{id}` bevat `statuses[]` array |
| Doc Relationship instellen | "Niet mogelijk" | Bevestigd: **inderdaad niet mogelijk** via API |
| Custom fields aanmaken | "Niet mogelijk" | Bevestigd: **inderdaad niet mogelijk** |
| Automations uitlezen/instellen | "Niet mogelijk" | Bevestigd: **inderdaad niet mogelijk** |
| Views aanmaken/beheren | "Niet mogelijk" | Bevestigd: **inderdaad niet mogelijk** |
| Notificatie-instellingen | "Niet mogelijk" | Bevestigd: **inderdaad niet mogelijk** |

---

## Volgende stappen

### Geimplementeerd op 24 feb 2026
- ~~B3 template tool~~ → `apply_template` (list + create acties)
- ~~B4 statussen~~ → `get_container` met `include_statuses`
- ~~B5 dependencies~~ → `manage_task` met `add_dependency`/`remove_dependency`
- ~~B6 task links~~ → `manage_task` met `add_link`/`remove_link`
- ~~mcp-limitations.md updaten~~ → herclassificatie afgerond

### Geverifieerd op 24 feb 2026
- ~~B1 schema check~~ → `task_type` wordt correct geserveerd via `buildManageTaskToolSchema()` (bevestigd via fastmcp)
- ~~B2 end-to-end test~~ → `transformCustomFieldValue()` converteert arrays automatisch naar `add`/`rem` format
- ~~Tier 2 skill-logica~~ → 10 van 12 C-items als workflow instructies geschreven

### Nog open
1. **C6 Feasibility check**: Planningsvalidatie — vereist aggregatie van time estimates over subtasks
2. **C12 Client doc pre-fill**: Geblokkeerd door D1 (Salesforce) en D2 (Fireflies)
3. **E1-E7 agenderen**: Open beslissingen bij Thomas voor volgende planning meeting
4. **D1-D5 externe integraties**: Salesforce, Fireflies, Make.com, Email, Moneybird
