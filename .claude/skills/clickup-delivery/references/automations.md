# Geplande Automations
**Updated:** 26 feb 2026

**Status:** Backlog — nog niet gebouwd. Zie ClickUp taak: https://app.clickup.com/t/86c75nxb2

## Trigger → Actie

| Trigger | Actie |
|---------|-------|
| Alle features DONE | Milestone → INTERNAL REVIEW |
| Feature → IN PROGRESS | Milestone ook → IN PROGRESS |
| Milestone → IN PROGRESS | Build → IN PROGRESS |
| Milestone → CLIENT REVIEW | Build → CLIENT REVIEW |
| Milestone → CLIENT REVIEW | Maak taak "Feedback ophalen bij [client]" voor Relationship Owner |
| Milestone → terug naar IN PROGRESS | Build → IN PROGRESS + verplichte comment |
| Alle milestones → COMPLETE | Build → COMPLETE |
| Build COMPLETE | Verplaats naar Client Handover lijst |
| Client Sign-off checkbox + status COMPLETE + Handover lijst | Facturatie trigger (Leonie reviewt handmatig) |
| PM wissel op client | Alleen actieve builds updaten, closed builds met rust laten |
| Uren cap 80% bereikt | Notificatie → PM + Relationship Owner |
| Milestone → INTERNAL REVIEW | Notificatie → PM |
| Terug uit CLIENT REVIEW | Notificatie → Dev + comment met feedback |
| Nieuwe build aangemaakt | Doc Relationship auto-linken (via Make.com) |
| Feature naar PLANNED zonder assignee | Blokkeren (uitzoeken of mogelijk) |
| Build end date changed | Relationship Owner tagged (om klant te informeren) |
| Labels in custom fields | Via automation instellen |

## Nog uit te zoeken
- Subtaak completion → parent status change: werkt dit native?
- Feature naar PLANNED blokkeren zonder assignee: is dit configureerbaar?
- Doc Relationship auto-linken bij nieuwe build: Make.com scenario nodig
- Meerdere milestones tegelijk in CLIENT REVIEW bij zelfde build: alert PM (geen hard block, maar signalering)
- Per-build setting: RO of Developer als klantcontact — hoe implementeren als veld?
