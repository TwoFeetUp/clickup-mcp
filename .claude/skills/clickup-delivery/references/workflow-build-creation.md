# Workflow: Build Aanmaken

Compound flow die een AI-assistent stap voor stap volgt wanneer een gebruiker vraagt om een nieuwe build aan te maken in ClickUp.

Bron: gap-analysis C9, SKILL.md, field-requirements.md

---

## Vereisten voordat je begint

De AI heeft toegang nodig tot de volgende ClickUp MCP tools:
- `manage_task` — taken aanmaken, updaten, custom fields instellen
- `search_tasks` — client opzoeken in All Clients lijst
- `find_members` — workspace members resolven op naam/email
- `task_comments` — comment plaatsen op build task

---

## Stap 1: Informatie ophalen bij de gebruiker

Vraag de gebruiker om de volgende gegevens. Markeer verplichte velden met (verplicht).

| Gegeven | Verplicht | Voorbeeld |
|---------|-----------|-----------|
| Client naam | Ja | "Acme Corp" |
| Build naam | Ja | "Offerteflow automatisering" |
| Start datum | Ja | "volgende maandag", "2026-03-10" |
| Eind datum | Ja | "over 6 weken", "2026-04-20" |
| Developer (assignee) | Ja | "Lex", "lex@twofeetup.com" |
| Max hours (uren cap) | Ja | 40 |
| Relationship Owner | Nee (default: overnemen van client task) | "Thomas" |
| Salesforce link | Nee (kan later) | "https://twofeetup.lightning.force.com/..." |
| Milestone namen | Nee (kan later) | ["MVP Scope Validatie", "Iteratie 1", "Iteratie 2"] |
| Milestone deadlines | Nee (kan later) | per milestone een datum |
| Repos (task IDs) | Nee (kan later) | task IDs uit de Repos lijst |
| Delivery ritme | Nee | "phase model" of "weekly contact" |

**Gedrag als velden ontbreken:**
- Verplichte velden die ontbreken: vraag expliciet door, ga niet verder zonder.
- Optionele velden die ontbreken: ga door, noteer ze voor de skip-comment in stap 10.
- Relationship Owner niet opgegeven: probeer deze op te halen van de client task (field `a8b23d9f`) in stap 2. Als die ook leeg is, vraag aan de gebruiker.

---

## Stap 2: Client resolven

**Doel:** Client task ID ophalen voor de list relationship.

**MCP tool:** `search_tasks`

```
search_tasks({
  search_type: "list",
  list_id: "901517909340",
  query: "<client naam>"
})
```

**Verwerk het resultaat:**
- Match gevonden: sla `client_task_id` op. Lees ook het veld `a8b23d9f` (Relationship Owner) uit als de gebruiker geen RO heeft opgegeven.
- Meerdere matches: toon de opties aan de gebruiker en vraag welke correct is.
- Geen match: meld aan de gebruiker dat de client niet gevonden is. Vraag of de naam correct is gespeld. Bied aan de exacte naam te zoeken of de build zonder client relationship aan te maken (wordt dan een skip-item in stap 10).

---

## Stap 3: Members resolven

**Doel:** User IDs ophalen voor assignee (developer) en Relationship Owner.

**MCP tool:** `find_members`

```
find_members({
  query: "<developer naam of email>"
})
```

Herhaal voor de Relationship Owner als die verschilt van de developer.

**Verwerk het resultaat:**
- Match gevonden: sla `developer_user_id` en `ro_user_id` op.
- Geen match: meld aan de gebruiker. Vraag om de exacte naam of email. Ga niet verder zonder minimaal de developer.
- RO niet gevonden en niet verplicht opgegeven: noteer als skip-item.

---

## Stap 4: Build task aanmaken

**Doel:** De build task aanmaken in de Building lijst.

**MCP tool:** `manage_task`

```
manage_task({
  action: "create",
  listId: "901517909345",
  task_type: "Build",
  name: "<build naam>",
  description: "<optioneel: delivery ritme notitie, bijv. 'Delivery ritme: weekly contact model'>",
  startDate: "<start datum>",
  endDate: "<eind datum>",
  assignees: [<developer_user_id>],
  custom_fields: [
    {
      id: "1a231a8a",
      value: <max_hours_getal>
    },
    {
      id: "a8b23d9f",
      value: [<ro_user_id>]
    },
    {
      id: "f5b79c59",
      value: "<salesforce_link>"
    }
  ]
})
```

**Parameters toelichting:**
- `task_type: "Build"` — zet `custom_item_id` naar 1015
- `listId: "901517909345"` — Building lijst
- `startDate` / `endDate` — accepteert natural language ("volgende maandag") of ISO datum
- `custom_fields`:
  - `1a231a8a` = Max hours (number) — vul het getal in, geen time estimate
  - `a8b23d9f` = Relationship Owner (users type) — array met user ID
  - `f5b79c59` = Salesforce link (url) — string, weglaten als niet opgegeven

**Laat weg uit custom_fields als niet beschikbaar:**
- `f5b79c59` (Salesforce) als gebruiker die niet heeft opgegeven
- `a8b23d9f` (RO) als niet geresolved

**Verwerk het resultaat:**
- Succes: sla `build_task_id` op. Ga door naar stap 5.
- Fout: toon de foutmelding aan de gebruiker. Veelvoorkomende oorzaken:
  - Ongeldige datums
  - Onbekende custom field ID (configuratie probleem)
  - Rate limit — wacht en probeer opnieuw

---

## Stap 5: Client relationship instellen

**Doel:** De list relationship "All Clients" instellen op de build task.

**MCP tool:** `manage_task`

```
manage_task({
  action: "update",
  taskId: "<build_task_id>",
  custom_fields: [
    {
      id: "bf5893a1",
      value: [<client_task_id>]
    }
  ]
})
```

**Toelichting:**
- Field `bf5893a1` = "All Clients" (list_relationship type)
- De MCP handler converteert `[task_id]` automatisch naar `{ "add": [task_id], "rem": [] }` format
- Als de client niet geresolved is (stap 2 faalde): sla deze stap over en noteer als skip-item

**Bij fout:**
- Als het `add`/`rem` format niet correct doorkomt: noteer als handmatig in te stellen en ga door.

---

## Stap 6: Repos relationship instellen (optioneel)

**Voorwaarde:** Alleen uitvoeren als de gebruiker repo task IDs heeft opgegeven.

**MCP tool:** `manage_task`

```
manage_task({
  action: "update",
  taskId: "<build_task_id>",
  custom_fields: [
    {
      id: "82ddf7ad",
      value: [<repo_task_id_1>, <repo_task_id_2>]
    }
  ]
})
```

**Toelichting:**
- Field `82ddf7ad` = "Repos" (list_relationship type)
- Zelfde format als stap 5
- Als niet opgegeven: sla over en noteer als skip-item in stap 10

---

## Stap 7: Client dropdown instellen

**Doel:** Het Client dropdown veld synchroniseren op de build task.

**Toelichting:** Het veld `26f11895` (Client dropdown) moet dezelfde waarde hebben als op de client task. Dit veld wordt normaal door een Make automation gedupliceerd naar child tasks, maar moet bij build aanmaken handmatig worden ingesteld.

**MCP tool:** `manage_task`

```
manage_task({
  action: "update",
  taskId: "<build_task_id>",
  custom_fields: [
    {
      id: "26f11895",
      value: "<dropdown_option_id>"
    }
  ]
})
```

**Probleem:** Je hebt de juiste `option_orderindex` of `option_id` nodig van de dropdown, die je moet uitlezen van de client task of de list custom fields. Als je deze niet kunt resolven: sla over en noteer als skip-item. De Make automation zal het uiteindelijk synchroniseren.

---

## Stap 8: Milestones aanmaken (optioneel)

**Voorwaarde:** Alleen uitvoeren als de gebruiker milestone namen heeft opgegeven.

**MCP tool:** `manage_task` — herhaal per milestone

```
manage_task({
  action: "create",
  listId: "901517909345",
  task_type: "milestone",
  name: "<milestone naam>",
  parent: "<build_task_id>",
  endDate: "<milestone deadline indien opgegeven>"
})
```

**Per milestone opslaan:** `milestone_task_id` en `milestone_name` — nodig voor stap 9.

**Toelichting:**
- `task_type: "milestone"` — zet `custom_item_id` naar 1 (standaard milestone type)
- `parent: build_task_id` — maakt het een subtask van de build
- `listId` moet dezelfde lijst zijn als de parent (Building)
- `endDate` is verplicht voor milestones volgens de workflow — als de gebruiker geen deadline per milestone heeft opgegeven, vraag ernaar of noteer als skip-item
- Eerste milestone moet een klein MVP zijn voor scope validatie (noteer dit in de naam als de gebruiker het niet specificeert)

**Volgorde:** Maak milestones aan in de volgorde die de gebruiker opgeeft. Dit bepaalt de natuurlijke volgorde op het board.

---

## Stap 9: Standaard subtasks per milestone aanmaken

**Voorwaarde:** Alleen uitvoeren als er milestones zijn aangemaakt in stap 8.

**Per milestone 4 subtasks aanmaken.** Gebruik `manage_task` per subtask.

### Subtask 1: TEST integratie

```
manage_task({
  action: "create",
  listId: "901517909345",
  name: "TEST: Integratie + edge cases",
  parent: "<milestone_task_id>",
  assignees: [<developer_user_id>]
})
```

### Subtask 2: TEST roleplay

```
manage_task({
  action: "create",
  listId: "901517909345",
  name: "TEST: Roleplay client use case",
  parent: "<milestone_task_id>",
  assignees: [<developer_user_id>]
})
```

### Subtask 3: REVIEW klantaansluiting

```
manage_task({
  action: "create",
  listId: "901517909345",
  name: "REVIEW: Klantaansluiting",
  parent: "<milestone_task_id>",
  assignees: [<ro_user_id>]
})
```

**Fallback:** Als `ro_user_id` niet beschikbaar is, wijs toe aan `developer_user_id` en noteer dat dit later naar de RO/PM moet worden overgezet.

### Subtask 4: Feedback ophalen

```
manage_task({
  action: "create",
  listId: "901517909345",
  name: "Feedback ophalen bij <client_naam>",
  parent: "<milestone_task_id>",
  assignees: [<ro_user_id>]
})
```

**Let op:** Gebruik de daadwerkelijke clientnaam in de taaknaam, niet een placeholder.

**Fallback:** Als `ro_user_id` niet beschikbaar is, wijs toe aan `developer_user_id`.

**Totaal:** 4 subtasks x aantal milestones = 4 `manage_task` calls per milestone.

**Rate limiting:** Bij meer dan 3 milestones (= 12+ calls) kunnen rate limits optreden. Voer calls sequentieel uit, niet parallel. De MCP server heeft ingebouwde rate limiting (600ms spacing), maar wees alert op 429 responses.

---

## Stap 10: Handoff voor Doc Relationship

**Altijd uitvoeren. Dit is een harde API-beperking (gap A1).**

Meld aan de gebruiker:

> "De Doc Relationship kan niet via de API worden ingesteld. Koppel het client document handmatig aan de build task in ClickUp:
> 1. Open de build task in ClickUp
> 2. Klik op 'Add Relationship' > 'Doc'
> 3. Zoek en selecteer het client document voor [client naam]"

---

## Stap 11: Overgeslagen velden rapporteren

**Doel:** Een comment plaatsen op de build task als er verplichte velden ontbreken.

**Verzamel alle overgeslagen items uit voorgaande stappen.** Mogelijke items:

| Veld | Reden overgeslagen |
|------|--------------------|
| Client relationship (`bf5893a1`) | Client niet gevonden in stap 2, of stap 5 faalde |
| Salesforce link (`f5b79c59`) | Niet opgegeven door gebruiker |
| Relationship Owner (`a8b23d9f`) | Niet geresolved in stap 3 |
| Repos (`82ddf7ad`) | Niet opgegeven door gebruiker |
| Client dropdown (`26f11895`) | Option ID niet geresolved in stap 7 |
| Doc Relationship | Altijd — kan niet via MCP (stap 10) |
| Milestone deadlines | Niet opgegeven per milestone |
| Milestone namen | Niet opgegeven — geen milestones aangemaakt |

**Als er overgeslagen items zijn, plaats een comment:**

**MCP tool:** `task_comments`

```
task_comments({
  action: "create",
  taskId: "<build_task_id>",
  text: "Vul nog in:\n- <item 1>\n- <item 2>\n- ...\n\nDoc Relationship moet handmatig gekoppeld worden in ClickUp."
})
```

**Als er GEEN overgeslagen items zijn (behalve Doc Relationship):** Plaats alsnog een comment alleen over de Doc Relationship.

---

## Stap 12: Samenvatting aan de gebruiker

Geef de gebruiker een overzicht van wat er is aangemaakt:

```
Build aangemaakt: "<build naam>"
- Task ID: <build_task_id>
- Lijst: Building (901517909345)
- Client: <client naam> (gekoppeld: ja/nee)
- Developer: <developer naam>
- Relationship Owner: <ro naam of "niet ingesteld">
- Periode: <start> - <eind>
- Max hours: <uren>
- Salesforce: <link of "niet ingesteld">
- Repos: <gekoppeld/niet ingesteld>
- Milestones: <aantal> aangemaakt (<namen>)
  - Per milestone: 4 standaard subtasks aangemaakt

Handmatig af te ronden:
- [ ] Doc Relationship koppelen in ClickUp
- [ ] <eventuele andere overgeslagen items>
```

---

## Foutafhandeling — overzicht

| Situatie | Actie |
|----------|-------|
| Client niet gevonden (stap 2) | Vraag gebruiker. Als niet op te lossen: ga door zonder, noteer als skip. |
| Member niet gevonden (stap 3) | Vraag gebruiker om exacte naam/email. Developer is verplicht — stop als niet op te lossen. |
| Build task aanmaken faalt (stap 4) | Toon foutmelding. Probeer niet opnieuw zonder gebruikersinput. Stop de flow. |
| Custom field update faalt (stap 5/6/7) | Noteer als skip-item, ga door met volgende stap. Niet-kritisch. |
| Milestone aanmaken faalt (stap 8) | Toon fout voor die specifieke milestone. Ga door met de overige milestones. |
| Subtask aanmaken faalt (stap 9) | Toon fout, ga door met overige subtasks. Niet-kritisch. |
| Rate limit (429) | Wacht 60 seconden, probeer opnieuw. Max 2 retries per call. |
| Onverwachte fout | Toon de foutmelding aan de gebruiker. Rapporteer wat al wel is aangemaakt. |

---

## Snelle referentie — Field IDs

| Veld | Field ID | Type | Waar |
|------|----------|------|------|
| All Clients (relationship) | `bf5893a1` | list_relationship | Build |
| Relationship Owner | `a8b23d9f` | users | Build + Client |
| Salesforce link (opportunity) | `f5b79c59` | url | Build |
| Max hours | `1a231a8a` | number | Build |
| Repos | `82ddf7ad` | list_relationship | Build |
| Client dropdown | `26f11895` | drop_down | Build + Client |
| Client Sign-off | `77c51a60` | checkbox | Build (niet zetten bij aanmaken) |
| Progress | `c5c9befc` | automatic_progress | Build (automatisch) |

---

## Snelle referentie — List IDs

| Lijst | List ID |
|-------|---------|
| Building | `901517909345` |
| All Clients | `901517909340` |
| Scope builds | `901521465791` |
| Maintenance | `901518191956` |
| Client Handover | `901517909344` |

---

## Snelle referentie — Task Types

| Type | custom_item_id |
|------|----------------|
| Build | 1015 |
| Client | 1010 |
| Feature | 1003 |
| milestone | 1 |
