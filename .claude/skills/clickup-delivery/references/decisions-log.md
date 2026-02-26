# Beslissingen Log
**Updated:** 26 feb 2026

## ✅ Besloten

1. 3 lijsten: Building, Maintenance, Client Handover (+ Scope builds voor scoping/paused)
2. Client Review = STATUS in Building lijst, geen aparte lijst
3. Build = 1 factuur, gelinkt aan client
4. 4 niveaus: Build → Milestone → Feature → Taak
5. Features reizen door board, taken zijn subtasks
6. Milestone = oplevermoment, ~6-9 per build, start- + einddatum verplicht
7. Eerste milestone = MVP voor scope-validatie
8. PM + Dev bepalen milestones samen
9. 3 testvormen: Feature test, Edge case/stress test, Roleplay
10. Milestone naar Client Review (niet hele build tegelijk)
11. PM = gate voor CLIENT REVIEW
12. Scope changes altijd via PM — devs zeggen niet zelf ja
13. Verplichte comments bij: terug uit review, blocked, na check-ins
14. Maintenance tickets gelinkt aan build via relaties
15. Client doc als ClickUp Doc per klant (via native Linked Docs, niet custom field)
16. Klant akkoord checkbox voor handover gate
17. COMPLETE = Closed status
18. Time estimates op feature-niveau (niet op build)
19. ClickUp MCP officieel beschikbaar (OAuth)
20. Build verplicht: client relatie, PM, start/einddatum, uren cap
21. Feature: assignee verplicht bij PLANNED, priority optioneel
22. Planning validatie: milestones + estimates + feedback buffer → haalbaarheid
23. Uren cap signalering bij 80%
24. PM koppeling via automation vanuit client (closed builds niet overschrijven)
25. Dev mag milestone naar CLIENT REVIEW, PM kan terugzetten
26. Notificaties: PM bij INTERNAL REVIEW, Dev bij terug uit review
27. Milestone volgorde: pas volgende starten na feedback vorige
28. Scope builds lijst voor builds in scoping fase of bij PAUSED clients
29. Client statussen: POTENTIAL → ACTIVE → MAINTENANCE / PAUSED / OFFBOARDED
30. PAUSED flow: alle builds → Scope builds lijst + BLOCKED + comment "client paused"
31. Scoping requests = automatisch/optioneel veld via intake flow, niet handmatig
32. Payables & Invoices = relationship veld op All Clients naar Finance ruimte
33. Linked Docs = native ClickUp feature, niet via MCP beschikbaar
34. Build type = custom dropdown veld op Building lijst (aangemaakt 24 feb 2026)
35. Time estimate logica: bij toevoegen feature-estimates, check of hogere lagen naar beneden bijgesteld moeten (verfijning vs toevoeging)
36. ✅ Client Sign-off is gate voor COMPLETE in Client Handover: status → COMPLETE + checkbox + juiste lijst. Leonie reviewt daarna handmatig → Moneybird → factuur → Salesforce.
37. Assignee cascade automation: build assignee → nieuwe milestones + features erven zelfde assignee, handmatige aanpassingen worden niet overschreven

---

## Decision 36 detail: Invoicing flow — dependency-based, niet checkbox-triggered
**Datum:** 23 feb 2026
**Context:** Hoe triggert Client Sign-off checkbox de facturatie?
**Besluit:**
- Payables & Invoices taken hebben een **dependency op de build task**
- Checkbox (✅ Client Sign-off) opheft de dependency — pas dan kunnen de Payables taken doorgaan
- Voorwaarden: build staat in **Client Handover lijst** + checkbox aangevinkt
- Leonie reviewt handmatig (niet Thomas) voor Moneybird + Salesforce update
- Exacte flow nog verder aanscherpen (combinatie van lijstpositie + checkbox)
**Reden:** Voorkomen dat per ongeluk aangevinkte checkbox of build op complete automatisch factuur triggert.

## Decision 37: Build doc page — MCP flow bij aanmaken build
**Datum:** 23 feb 2026
**Context:** Hoe wordt de build pagina in het client doc gevuld?
**Besluit:**
- Momenteel: handmatig / gebeurt nauwelijks
- Uiteindelijk: via MCP bij aanmaken van een build in de skill
- Bij build aanmaken: skill vraagt info op via connectors (Salesforce opportunity, Fireflies transcript)
- Als stappen worden overgeslagen: skill plaatst comment op build task met:
  - Wat er overgeslagen/niet ingevuld is
  - Tag aan Relationship Owner (@[user_id] via users field `a8b23d9f`)
**Implementatie:** Relationship Owner uitlezen uit field `a8b23d9f`, user ID gebruiken voor @mention in comment.

---

## ❓ Open vragen

1. **Build type opties finaliseren** — huidige voorstel: AI Colleague, Personal Assistant configuratie, Custom build, SaaS implementatie, Workshop. Nog bevestigen.
2. **Automation triggers fine-tunen** — automatisch vs handmatig, subtask completion → parent status?
3. **Bestaande builds opschonen** — Lex & Sjoerd elk 1 build (Maandag bespreken)
4. **Feedback buffer standaard** — hoeveel dagen inplannen voor client review + verwerking?
5. **Rapportage requirements** — welke metrics wil Thomas? Doorlooptijd, spent vs estimate, maintenance ratio?

## Open vraag: Client Handover sign-off email
**Datum gesignaleerd:** 23 feb 2026
**Context:** Bij IN REVIEW in Client Handover stuur je een formeel akkoord-mailtje naar de klant.
**Nog te bepalen:**
- Exacte tekst van het mailtje
- Stilzwijgend akkoord termijn (X dagen)
- Wie stuurt het (RO/PM)?
- Hoe verwerk je het akkoord terug in ClickUp (checkbox? comment? status change door wie?)

## Open vraag: Salesforce flow voor nieuwe scope vanuit lopende builds
**Datum gesignaleerd:** 23 feb 2026
**Context:** Als klant tijdens een build iets totaal nieuws vraagt, moet dat terug naar sales en uiteindelijk als nieuwe opportunity in Salesforce komen.
**Huidig:** RO tagt sales in client doc, rest is handmatig.
**Nog te bepalen:**
- Exacte flow van client doc → Salesforce opportunity
- Wie maakt de opportunity aan in Salesforce?
- Hoe link je het terug aan de bestaande klant/build context?
