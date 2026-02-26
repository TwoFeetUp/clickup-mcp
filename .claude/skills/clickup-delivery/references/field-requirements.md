# Field Requirements per Niveau
**Updated:** 26 feb 2026

## All Clients lijst (ID: 901517909340)

### Verplicht bij aanmaken
| Veld | Type | Field ID | Opmerking |
|------|------|----------|-----------|
| Naam | native | — | Klantnaam |
| Status | native | — | Start op POTENTIAL of ACTIVE |
| Relationship Owner | users | `a8b23d9f-09cf-42af-b4be-a29d8bbd5c20` | = PM |
| Service Type | labels | `cb67a48a-8011-4d80-9ff9-806348554c2b` | Zie opties hieronder |
| Client (dropdown) | drop_down | `26f11895-2bfd-403a-851d-c72b764fbfb4` | Via automation invullen indien mogelijk |
| Salesforce link | url | `965ab5f4-3f74-495a-b65d-60f4782b89ea` | Verplicht |
| Linked Docs | native (UI only) | — | Verplicht — automatisch via client template |

### Optioneel / automatisch
| Veld | Type | Field ID | Opmerking |
|------|------|----------|-----------|
| Builds relationship | list_relationship | `bf5893a1-2bb4-4638-8577-71b6131c0479` | Automatisch via Building lijst |
| Payables & Invoices | list_relationship | `3de10927-a0b3-44fd-9927-90380d31d9f0` | Optioneel |
| Scoping requests | list_relationship | `18d2b179-40e6-4212-8c65-7916ee61dc2a` | Automatisch via intake flow, NIET handmatig |

### Client statussen
- **POTENTIAL** — lead/prospect, geen getekende deal
- **ACTIVE** — één of meer lopende builds
- **MAINTENANCE** — geen actieve builds, wel onderhoud/subscriptie
- **PAUSED** — tijdelijk on hold (alle builds → Scope builds + BLOCKED)
- **OFFBOARDED** — klant is weg

### Service Type opties (labels)
Ai-as-a-Service, Custom Project, SaaS, Workshop, Automation Scan, Pre-sell Scoping, DeepDive, Partner, Personal Assistent

---

## Building lijst (ID: 901517909345)

### Verplicht bij aanmaken (altijd)
| Veld | Type | Field ID | Opmerking |
|------|------|----------|-----------|
| Naam | native | — | Bijv. "Agent Dashboard LHT" |
| Status | native | — | Start op BACKLOG |
| Client relatie (All Clients) | list_relationship | `bf5893a1-2bb4-4638-8577-71b6131c0479` | Verplicht koppelen aan client |
| Client (dropdown) | drop_down | `26f11895-2bfd-403a-851d-c72b764fbfb4` | Verplicht |
| Relationship Owner | users | `a8b23d9f-09cf-42af-b4be-a29d8bbd5c20` | = PM |
| Salesforce link | url | `f5b79c59-b901-4685-a2cd-2a1569a15b77` | Verplicht |
| Linked Docs | native (UI only) | — | Verplicht — handmatig koppelen (niet via MCP) |

### Verplicht bij status PLANNED
| Veld | Type | Opmerking |
|------|------|-----------|
| Start date | native | Op basis van planning |
| Due date | native | Op basis van milestones + buffer |
| Assignee | native | Minimaal PM |

### Verplicht bij IN PROGRESS
| Veld | Type | Field ID | Opmerking |
|------|------|----------|-----------|
| 🧢 Max hours (u) | number | `1a231a8a-9de2-4410-ab58-81ac6508f80e` | Uren cap — verplicht voor start |

### Optioneel
| Veld | Type | Field ID | Opmerking |
|------|------|----------|-----------|
| Build type | drop_down | `337b7bd0-f912-4ea2-9fc7-f55b6bbfba55` | Zie opties hieronder |
| Repos relationship | list_relationship | `82ddf7ad-488a-4456-a893-ee868602f426` | Koppelen als repo beschikbaar |

### Automatisch
| Veld | Field ID | Opmerking |
|------|----------|-----------|
| ✅ Client Sign-off | `77c51a60-6039-4c11-8976-5fa00f38382f` | Gate voor COMPLETE in Handover lijst |
| 🚀 Progress | `c5c9befc-e25b-4011-8e6d-45f00a71c173` | Automatisch berekend |

### ⚠️ Time estimate op builds
**Zet GEEN time estimate op build-niveau.** ClickUp telt estimates van subtasks automatisch op naar parent. Als je ook op build-niveau een estimate zet, klopt de vergelijking met de uren cap niet.

### Build type opties (te bevestigen)
- AI Colleague
- Personal Assistant configuratie
- Custom build
- SaaS implementatie
- Workshop

### Build statussen
BACKLOG → PLANNED → IN PROGRESS → INTERNAL REVIEW → CLIENT REVIEW → COMPLETE
+ BLOCKED (overal tussendoor mogelijk, altijd verplichte comment)

---

## Milestone (subtask van build)

### Verplicht bij aanmaken
| Veld | Opmerking |
|------|-----------|
| Naam | Bijv. "MVP", "Fase 1 v1" |
| Due date | Verplicht |
| Standaard testtaken | TEST integratie, TEST roleplay, REVIEW klantaansluiting, Feedback verzamelen |

### Niet verplicht
| Veld | Opmerking |
|------|-----------|
| Start date | Optioneel |

---

## Feature (subtask van milestone)

### Verplicht bij aanmaken
| Veld | Opmerking |
|------|-----------|
| Naam | Concrete functionaliteit |
| Time estimate | Altijd verplicht op feature-niveau |

### Verplicht bij status PLANNED
| Veld | Opmerking |
|------|-----------|
| Assignee | Erft van build/milestone tenzij handmatig aangepast |

### Niet verplicht
| Veld | Opmerking |
|------|-----------|
| Testtaak per feature | Niet verplicht — testen op milestone-niveau |
| Priority | Optioneel, handig voor sprint planning |

---

## Taak (subtask van feature)

### Verplicht bij aanmaken
| Veld | Opmerking |
|------|-----------|
| Naam | Beschrijvend |

### Niet verplicht
| Veld | Opmerking |
|------|-----------|
| Tijd loggen | Optioneel op taakniveau — mag ook op feature-niveau |
| Assignee | Optioneel — erft van feature/milestone/build |

---

## Assignee cascade (automation)
Als een build een assignee heeft, erven nieuwe milestones en features automatisch dezelfde assignee. Handmatige aanpassingen worden **niet** overschreven.
→ Automation taak: https://app.clickup.com/t/86c8ft2md

---

## Scope builds lijst
- Builds in scoping fase (nog niet gestart)
- Builds van PAUSED clients
- Tellen **niet** mee in capaciteitsplanning
- Bij PAUSED: status BLOCKED + comment "client paused"

---

## Client Documentation — Doc Template Structuur

Elke client krijgt 1 ClickUp doc, gelinkt via Doc Relationship aan de client task én alle builds.

```
[Client name] - Client documentation
├── [Client Name]                    ← root pagina
│   └── 👀 Client overview
│         - Primary Contacts (Main / Technical / Escalation)
│         - Tech Stack & Integrations (Systems, APIs, Auth → Bitwarden link)
│         - Terminology tabel
│         - Scoping input link
└── Builds
    └── 🔨 Build - [Build Name]
          - 🎯 Scope
              Boundaries: IN SCOPE / OUT OF SCOPE
              Success Criteria
          - 📋 Requirements
              Process Context (huidig proces, pijnpunten, screen recordings, Fireflies link)
              Happy Flows (flow 1, flow 2...)
              Use Cases
              Data Model
              Technical Constraints + workarounds
          ├── 🛞 Feedback & Changes
          │     ├── Feedback Log → [YYYY-MM-DD] [Source: Slack/Email/Call/Meeting]
          │     └── Scope Changes → [YYYY-MM-DD]
          └── 🚀 Handover
                Deployment (live URL, staging, Bitwarden, go-live date)
                Deliverables (user guide, admin docs, tech docs, training)
                Known Issues
                Deferred Features
```

**Invulstrategie:**
- Zoveel mogelijk direct invullen bij aanmaken (naam, contacts, Salesforce link)
- Rest uitvragen bij klant of ophalen via Fireflies transcript / Salesforce
- Als link niet automatisch gevonden kan worden: handmatig vragen
- Scoping input: link naar Fireflies transcript of scoping document

---

## Client Handover — Invoicing keten

1. Build → Client Sign-off checkbox ✅ aangevinkt
2. → Automation maakt invoicing task aan in **Payables & Invoices** (gelinkt aan client)
3. → **Human in the loop**: Thomas/PM reviewt de invoicing task vóór verzending
4. → Goedkeuring → Moneybird workflow → factuur eruit
5. → Salesforce update (deal gesloten)

**Waarom human in the loop:**
Voorkomen dat bij een per ongeluk aangevinkte checkbox of build op complete automatisch een factuur de deur uitgaat.

**Veld op All Clients:**
- Payables & Invoices: list_relationship (`3de10927-a0b3-44fd-9927-90380d31d9f0`) — gelinkt aan factuurlijst
