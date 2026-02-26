# Lijst Gids — TwoFeetUp Delivery
**Updated:** 26 feb 2026

## All Clients (ID: 901517909340)

**Doel:** Eén task per klant. Single source of truth voor klantinfo.

**Statussen:** POTENTIAL → ACTIVE → MAINTENANCE / PAUSED / OFFBOARDED

**Regels:**
- Klant aanmaken kan al in scoping fase (POTENTIAL)
- Linked Doc koppelen via ClickUp's native "Link to Page" functie (niet via MCP)
- Scoping requests relatie: automatisch via intake flow, niet handmatig instellen
- Bij PAUSED: alle builds verplaatsen naar Scope builds + BLOCKED zetten

---

## Scoping requests (901517934677)

**Doel:** Automation intake from external forms or lead qualification.
**Do NOT manually create tasks here.** Items arrive via automation.
**What happens here:** intake → triage → if viable, PM creates a Scope build.

---

## Scope builds (lijst)

**Doel:** Builds die nog niet actief in development zijn.

**Wanneer een build hier staat:**
- In scoping fase (na deal maar vóór start development)
- Klant is PAUSED

**Statussen:** Vrij, maar BLOCKED voor gepauzeerde builds

**Regels:**
- Builds hier tellen NIET mee in capaciteitsplanning
- Bij PAUSED: verplichte comment "client paused" op de build

**Transition naar Building:** alleen verplaatsen als: deal getekend + start/einddatum bekend + scope helder + 1 dev toegewezen.

---

## Building (ID: 901517909345)

**Doel:** Actieve development. Features reizen hier door het board.

**Statussen:** BACKLOG → PLANNED → IN PROGRESS → INTERNAL REVIEW → CLIENT REVIEW → COMPLETE + BLOCKED

**Regels:**
- Feature naar PLANNED = assignee verplicht
- BLOCKED = altijd comment met reden
- Terug uit CLIENT REVIEW = altijd comment met feedback samenvatting
- Milestone-niveau voor CLIENT REVIEW (niet hele build tegelijk)
- PM = gatekeeper voor CLIENT REVIEW
- Na check-in = comment bij relevante features/builds
- Geen time estimate op build-niveau zetten
- Alle verplichte build-velden moeten ingesteld zijn — zie `field-requirements.md`

---

## Client Handover (ID: 901517909344)

**Doel:** Oplevering aan klant na afronding alle milestones.

**Statussen:** BACKLOG → IN PROGRESS → IN REVIEW → COMPLETE

**Regels:**
- Build verplaatsen naar deze lijst als alle milestones COMPLETE
- IN PROGRESS: documentatie + Loom/manual voorbereiden
- IN REVIEW: formeel akkoord-mailtje naar klant (wording + termijn nog niet geformaliseerd)
- ✅ Client Sign-off checkbox is gate voor status COMPLETE
- COMPLETE pas mogelijk als: status → COMPLETE + checkbox aangevinkt + taak in Handover lijst
- Na COMPLETE: Leonie reviewt → Moneybird → factuur → Salesforce update

---

## Maintenance (ID: 901518191956)

**Doel:** Post-oplevering onderhoud en bugfixes.

**Regels:**
- Tickets aanmaken na handover
- Gelinkt aan origineel build via relaties (voor rapportage)
- Nooit een maintenance ticket aanmaken zonder link naar originele build

---

## Blueprint Library

**Doel:** Template builds voor herbruikbare componenten en standaard build types.
**Status:** momenteel leeg — wordt gevuld met herbruikbare templates.

---

## Workshops

**Uitgesloten van deze skill.** Andere workflow, apart beheerd.
