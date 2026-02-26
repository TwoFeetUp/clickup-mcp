# Workflow Status Rules — Validation & Cascade Logic

Guardrails die gelden bij ELKE statuswijziging. Geen apart flow — deze checks worden automatisch doorlopen wanneer een task, feature, milestone of build van status verandert.

**MCP tools in scope:** `manage_task`, `search_tasks`, `task_comments`, `get_container` (met `include_statuses: true`)

---

## Statussen per lijst

| Lijst | Statussen |
|-------|-----------|
| Building | backlog, planned, in progress, internal review, client review, blocked, complete |
| Scope builds | backlog, in progress, blocked, complete |
| Client Handover | backlog, in progress, in review, complete |
| Maintenance | backlog, planned, in progress, internal review, client review, blocked, complete |

---

## Pre-change checklist

Doorloop VOOR elke statuswijziging:

### Check 1: BLOCKED vereist comment (ref C3)

**Trigger:** doelstatus = `blocked`

1. Is er een blokkeer-reden meegegeven?
   - **Nee** → STOP. Vraag de gebruiker: "Wat is de reden voor de blokkade?"
   - **Ja** → ga door
2. Voer BEIDE acties sequentieel uit:
   ```
   a. manage_task  action: update, status: "blocked"
   b. task_comments  action: create, commentText: "🚫 BLOCKED: [reden]. Impact: [wie/wat is geraakt]."
   ```
3. Ga door naar Check 5 (BLOCKED escalatie)

### Check 2: Assignee gate bij PLANNED (ref C4)

**Trigger:** doelstatus = `planned` EN task type = Feature

1. Haal huidige assignees op:
   ```
   search_tasks  task_id: [feature_id]  → check assignees in response
   ```
2. Heeft de feature een assignee?
   - **Nee** → STOP de statuswijziging. Meld: "Feature kan niet naar PLANNED zonder assignee. Wie moet eraan werken?"
   - Wacht op antwoord gebruiker → stel assignee in via `manage_task` → pas daarna status aan
   - **Ja** → ga door met statuswijziging

### Check 3: Geldige status voor lijst

**Trigger:** elke statuswijziging

1. Controleer of de doelstatus geldig is voor de lijst waar de task in staat (zie tabel hierboven)
2. **Ongeldig** → STOP. Meld welke statussen beschikbaar zijn
3. **Geldig** → ga door

### Check 4: Comment-verplichting bij specifieke overgangen

**Trigger:** een van onderstaande overgangen

| Overgang | Vereiste comment | Format |
|----------|-----------------|--------|
| → `blocked` | Blokkeer-reden | `🚫 BLOCKED: [reden]. Impact: [wie/wat is geraakt].` |
| `client review` → terug naar eerdere status | Feedback samenvatting | `📝 Client feedback ontvangen: [samenvatting]. Volgende stappen: [acties].` |
| End date wijziging op build | Datumwijziging + tag RO | `📅 End date gewijzigd naar [nieuwe datum]. @[RO] graag klant informeren.` |

---

## Post-change cascades

Doorloop NA elke geslaagde statuswijziging:

### Cascade 1: Opwaarts — IN PROGRESS (ref C2)

**Trigger:** feature of milestone → `in progress`

**Feature → IN PROGRESS:**
1. Haal parent milestone op (via `search_tasks` of task response)
2. Is de milestone nog in `backlog` of `planned`?
   - **Ja** → `manage_task` action: update, milestone → `in progress`
   - Ga door naar stap 3
   - **Nee** → klaar
3. Haal parent build op
4. Is de build nog in `backlog` of `planned`?
   - **Ja** → `manage_task` action: update, build → `in progress`
   - **Nee** → klaar
5. Meld: "Feature, milestone en build zijn naar IN PROGRESS gezet."

**Milestone → IN PROGRESS:**
1. Haal parent build op
2. Is de build nog in `backlog` of `planned`?
   - **Ja** → `manage_task` action: update, build → `in progress`
   - Meld: "Milestone en build zijn naar IN PROGRESS gezet."
   - **Nee** → klaar

### Cascade 2: Opwaarts — alle features COMPLETE (ref C2)

**Trigger:** feature → `complete`

1. Zoek overige features onder dezelfde milestone:
   ```
   search_tasks  parent: [milestone_id]  (filter op task type Feature, exclude status: complete)
   ```
2. Resterende open features?
   - **Ja** → klaar, geen cascade
   - **Nee (0 resterend)** → NIET automatisch verplaatsen. Meld:
     > "Alle features onder [milestone naam] zijn COMPLETE. Wil je de milestone naar INTERNAL REVIEW zetten?"
   - Wacht op bevestiging gebruiker voordat je de milestone verplaatst

### Cascade 3: Opwaarts — alle milestones COMPLETE (ref C2)

**Trigger:** milestone → `complete`

1. Zoek overige milestones onder dezelfde build:
   ```
   search_tasks  parent: [build_id]  task_type: milestone  (exclude status: complete)
   ```
2. Resterende open milestones?
   - **Ja** → klaar, geen cascade
   - **Nee (0 resterend)** → NIET automatisch verplaatsen. Meld:
     > "Alle milestones onder [build naam] zijn COMPLETE. Wil je de build naar COMPLETE zetten en verplaatsen naar de Client Handover lijst?"
   - Wacht op bevestiging gebruiker

### Cascade 4: Neerwaarts — build-niveau overgangen (ref C2)

**Trigger:** build statuswijziging

| Build → | Actie |
|---------|-------|
| `client review` | Check of de actieve milestone ook in `client review` staat. Zo niet, meld dat aan de gebruiker. |
| `blocked` | Voeg comment toe met build-level impact: `🚫 BLOCKED: [reden]. Impact: alle milestones en features onder deze build zijn geraakt.` |

---

## BLOCKED escalatie logica

Doorloop wanneer een feature naar `blocked` gaat:

### Stap 1: Laatste open feature?

```
search_tasks  parent: [milestone_id]  task_type: Feature
  → filter uit: status = "complete" OF status = "blocked"
```

- **0 resterende open features** (alles is complete of blocked) → Waarschuw:
  > "Dit is de laatste actieve feature onder [milestone naam]. Overweeg om de milestone ook op BLOCKED te zetten."
- **Nog open features** → ga door naar stap 2

### Stap 2: Deadline risico?

1. Haal milestone due date op
2. Is due date binnen 5 dagen vanaf vandaag?
   - **Ja** → Waarschuw:
     > "Deadline voor [milestone naam] is op [datum] — dat is over [X] dagen. De blokkade brengt deze deadline in gevaar."
   - **Nee** → geen extra waarschuwing

### Stap 3: Hele build geraakt?

- NIET automatisch beoordelen
- Alleen als de gebruiker expliciet aangeeft dat de hele build geraakt is, of als alle milestones geblokkeerd zijn
- In dat geval: escaleer naar build-level BLOCKED (met comment)

---

## Samenvatting: beslislogica per statuswijziging

```
VOOR statuswijziging:
  ├── Doelstatus = blocked?        → Check 1 (comment vereist)
  ├── Doelstatus = planned + Feature? → Check 2 (assignee gate)
  ├── Status geldig voor lijst?    → Check 3 (lijst-validatie)
  └── Comment vereist?             → Check 4 (specifieke overgangen)

STATUS WIJZIGEN via manage_task

NA statuswijziging:
  ├── → in progress?               → Cascade 1 (opwaarts IN PROGRESS)
  ├── → complete (feature)?        → Cascade 2 (alle features check)
  ├── → complete (milestone)?      → Cascade 3 (alle milestones check)
  ├── Build-niveau wijziging?      → Cascade 4 (neerwaarts checks)
  └── → blocked (feature)?         → BLOCKED escalatie (3 stappen)
```

---

## Belangrijke principes

1. **Opwaartse cascades zijn automatisch** — als een child `in progress` gaat, gaan parents mee
2. **Completion cascades vragen bevestiging** — nooit automatisch milestone of build naar COMPLETE/INTERNAL REVIEW zetten
3. **BLOCKED vereist altijd een reden** — geen uitzonderingen
4. **Features zonder assignee blokkeren bij PLANNED** — niet bij andere statussen
5. **Comments zijn onderdeel van de statuswijziging** — niet optioneel, niet achteraf
