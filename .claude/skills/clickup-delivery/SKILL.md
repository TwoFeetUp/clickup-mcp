---
name: clickup-delivery
description: TwoFeetUp ClickUp delivery workflow kennisbron. Gebruik deze skill bij vragen over hoe builds, milestones, features en taken aangemaakt of ingericht moeten worden, welke velden verplicht zijn, hoe de workflow werkt (statussen, lijsten, verantwoordelijkheden), en bij het controleren of iets correct is aangemaakt in ClickUp. Ook bruikbaar bij client aanmaken, paused flow, handover, time estimates en scope changes.
---

# ClickUp Delivery Skill — TwoFeetUp
**Version:** 2.0 | **Updated:** 26 feb 2026 | **Space:** TwoFeetUp Delivery

## Doel van deze skill
Beschrijft hoe TwoFeetUp ClickUp gebruikt voor delivery. Gebruik dit als kennisbron bij:
- Aanmaken of controleren van builds, milestones, features
- Vragen over waar iets hoort in de structuur
- Workflow checks (juiste status, juiste velden, juiste lijst)
- Validatie van wat iemand heeft aangemaakt

Voor velddetails → `references/field-requirements.md`
Voor lijstregels → `references/list-guide.md`
Voor beslissingen → `references/decisions-log.md`
Voor geplande automations → `references/automations.md`
Voor MCP beperkingen → `references/mcp-limitations.md`

---

## Space structuur

```
TwoFeetUp Delivery (Space)
├── Clients (Folder)
│   └── All Clients (List) — één task per klant
├── AI & Automation Solutions (Folder)
│   ├── Scope builds (List) — builds in scoping/on hold
│   ├── Building (List) — actieve development
│   ├── Client Handover (List) — oplevering
│   └── Maintenance (List) — post-oplevering onderhoud
├── Workshops (List)
├── Blueprint Library (List)
└── [overige lijsten]
```

---

## Hiërarchie (4 niveaus)

```
Build (= 1 factuur, gekoppeld aan client)
└── Milestone (= oplevermoment aan klant)
    └── Feature (= reist door board, primair werkniveau)
        └── Taak (= subtask, blijft onder feature)
```

**Regels:**
- 1 Build = 1 factuur
- Features zijn de kaartjes op het board — die sleep je door statussen
- Taken zijn subtasks — niet los zichtbaar op board
- Milestones volgen als alle features onder hen DONE zijn
- ~6-9 milestones per build (3 fases × 2-3 iteraties)
- Eerste milestone = kleine MVP voor scope-validatie

---

## Time estimates — belangrijk

Time estimates op features en milestones tellen **automatisch op** naar hogere niveaus in ClickUp. Regels:

- **Estimates horen op feature-niveau**
- Zet **geen** time estimate op een build zelf — ClickUp telt die bij de som op, waardoor de uren cap niet meer klopt
- Als er al estimates op hogere niveaus staan (build of milestone), controleer dan bij het toevoegen van feature-level estimates of de hogere laag **naar beneden bijgesteld** moet worden
  - Is het een verfijning (bestaande estimate opgesplitst)? → hogere laag verlagen
  - Is het een toevoeging (extra werk)? → hogere laag kan staan, maar check of het nog binnen uren cap past
- Uren cap bewaken: totaal van feature estimates vs `🧢 Max hours (u)`. Signalering bij 80%.

---

## Client statussen (All Clients lijst)

| Status | Betekenis |
|--------|-----------|
| **POTENTIAL** | Lead of prospect, nog geen getekende deal |
| **ACTIVE** | Klant heeft één of meer lopende builds |
| **MAINTENANCE** | Geen actieve builds, wel onderhoud of subscriptie-werk |
| **PAUSED** | Klant tijdelijk on hold — zie Paused flow hieronder |
| **OFFBOARDED** | Klant is weg |

### Paused flow
Wanneer een klant PAUSED wordt:
1. Alle actieve builds van deze klant → verplaatsen naar **Scope builds lijst** met status **BLOCKED**
2. Verplichte comment op de build: `"client paused"` + reden
3. Build behoudt alle history, milestones en gelogde uren

Wanneer klant weer actief wordt:
1. Build terug naar **Building lijst**
2. BLOCKED opheffen
3. Status klant → ACTIVE

**Waarom Scope builds en niet gewoon BLOCKED in Building?**
Builds in Scope builds tellen niet mee in de capaciteitsplanning van het team.

---

## Ticket flow (feature niveau)

```
BACKLOG → PLANNED → IN PROGRESS → INTERNAL REVIEW → CLIENT REVIEW → COMPLETE
                                        ↕ BLOCKED (+ verplichte comment)
```

**Regels:**
- Feature naar PLANNED: assignee verplicht
- BLOCKED: altijd comment met reden
- Terug uit CLIENT REVIEW: altijd comment met feedback samenvatting
- Na check-in met klant: comment bij relevante features/builds

---

## Internal Review (milestone niveau)

Alle features DONE → milestone naar INTERNAL REVIEW.

**3 verplichte testvormen:**
1. TEST — Integratie + edge cases (Dev)
2. TEST — Roleplay client use case (Dev)
3. REVIEW — Klantaansluiting (PM)

Als alle drie OK → PM zet milestone naar CLIENT REVIEW.

---

## Client Review (milestone niveau)

- Milestone per milestone naar CLIENT REVIEW, niet de hele build tegelijk
- PM = gatekeeper (kan terugzetten als iets niet klopt)
- PM pakt "Feedback verzamelen" taak op

**Feedback verwerking:**
- Tweak: nieuwe taak onder bestaande feature + milestone terug naar IN PROGRESS + comment
- Uitbreiding: altijd eerst naar PM → scope check → nieuwe feature onder volgende milestone

---

## Van deal naar build

1. Deal gewonnen in Salesforce
2. Scoping sessie (PM + Dev)
3. Scoping rapport
4. Deal getekend → klant aanmaken in All Clients (of al aangemaakt tijdens scoping)
5. Build aanmaken in Building lijst (of Scope builds als nog niet gestart)
6. PM + Dev plannen milestones + features samen
7. Planning haalbaarheidscheck: milestone deadlines + feature estimates + feedback buffer → past het?
8. Build → IN PROGRESS, eerste milestone starten

**Scoping requests:** Optioneel relatie-veld op All Clients. Wordt automatisch ingevuld via de intake flow als er een scoping request voor die klant is. Niet handmatig instellen.

---

## Client Handover flow

1. Alle milestones COMPLETE → build verplaatsen naar Client Handover lijst
2. Documentatie afronden
3. ✅ Client Sign-off checkbox aanvinken
4. Status → COMPLETE (alleen mogelijk met checkbox aangevinkt — dit is de gate)
5. Leonie reviewt handmatig → Moneybird → factuur → Salesforce update

---

## Verantwoordelijkheden

| Rol | Wie | Taken |
|-----|-----|-------|
| PM | Thomas | Builds opzetten, milestones plannen, gate voor CLIENT REVIEW, scope bewaking, client communicatie |
| Developer | Lex, Sjoerd | Features uitwerken, taken aanmaken, testen (3 vormen), tijd loggen, comments bij status changes |
| Relationship Owner | Altijd PM | Eindverantwoordelijke klantcontact. Dev mag ook contact hebben met klant (afspraken per klant met PM). Altijd via PM: scope vragen, nieuwe deals, ontevredenheid, commerciële/gevoelige zaken. |

**Dev mag nooit zelf:** scope changes toezeggen. Bij twijfel altijd → PM.

---

## Definition of Done

| Niveau | Criteria |
|--------|----------|
| Taak | Werk af, tijd gelogd, notities gedocumenteerd |
| Feature | Alle taken DONE, feature test geslaagd, werkt in test/staging |
| Milestone → Internal Review | Alle features DONE, 3 testvormen doorlopen |
| Milestone → Client Review | Internal review OK, bugs opgelost, demo klaar, PM akkoord |
| Build → Complete | Alle milestones COMPLETE, alle feedback verwerkt |
| Handover → Done | Documentatie compleet, handleiding/Loom aanwezig, klant akkoord checkbox ✅ |

---

## Standaard taken onder elke milestone

```
🚩 Milestone
├── [features...]
├── TEST: Integratie + edge cases (Dev)
├── TEST: Roleplay client use case (Dev)
├── REVIEW: Klantaansluiting (PM)
└── Feedback verzamelen (PM)
```

---

## References

### Structure & Fields
- `references/field-requirements.md` — required fields per level with field IDs
- `references/list-guide.md` — per-list breakdown: purpose, what to create, when to use
- `references/automations.md` — planned automations and build status
- `references/mcp-limitations.md` — what cannot be done via MCP
- `references/decisions-log.md` — confirmed decisions and open questions
- `references/gap-analysis.md` — gap analysis between skill and MCP capabilities

### Compound Workflows (AI instructions)
- `references/workflow-build-creation.md` — end-to-end build creation flow (12 steps)
- `references/workflow-milestone-flows.md` — milestone creation, CLIENT REVIEW, feedback processing
- `references/workflow-status-rules.md` — status validation rules, cascades, BLOCKED escalation
- `references/workflow-operational.md` — hours monitoring, paused client, handover, maintenance
