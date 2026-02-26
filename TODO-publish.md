# ClickUp MCP — Publish Checklist

Doel: Package publiceren onder `@sjotie/clickup-mcp` op npm via GitHub Actions.

---

## Vandaag al gedaan (25 feb 2026)

- [x] Issue 1: Fuzzy matching — punctuatie-normalisatie in `isNameMatch()`
- [x] Issue 2: Workspace-brede search (automatisch opgelost door issue 1)
- [x] Issue 3: Subtasks zichtbaar in list search (`include_subtasks` doorvoeren)
- [x] Issue 5: Relationship custom field filtering (client-side post-filter)
- [x] Code gepusht naar `main` op GitHub
- [x] GitHub Actions workflow getriggerd (failed op npm auth)

---

## Nog te doen

### 1. npm Token aanmaken
- [ ] Inloggen op npmjs.com als `sjotie`
- [ ] Granular Access Token aanmaken:
  - Naam: `github-actions-publish`
  - Bypass 2FA: aan
  - Packages: All packages, Read and write
  - Expiration: 90 dagen (max)
- [ ] Token kopieren

### 2. GitHub Secret updaten
- [ ] Ga naar: https://github.com/TwoFeetUp/clickup-mcp/settings/secrets/actions
- [ ] Secret `NPM_TOKEN` updaten met nieuwe token van sjotie account

### 3. Package hernoemen
- [ ] `package.json`: naam wijzigen naar `@sjotie/clickup-mcp`
- [ ] `package.json`: repository URL behouden (blijft TwoFeetUp/clickup-mcp)
- [ ] `smithery.yaml`: package naam updaten als die erin staat
- [ ] `README.md`: installatie-instructies updaten
- [ ] `CLAUDE.md`: referenties naar package naam updaten
- [ ] `src/server.ts`: check of versie/naam hardcoded staat
- [ ] Commit + push

### 4. Publiceren
- [ ] GitHub Actions "Build, Tag and Publish" triggeren met `minor` bump
- [ ] Controleren dat npm publish slaagt
- [ ] Verify: `npm view @sjotie/clickup-mcp`

### 5. Downstream updaten
- [ ] MCP config in Claude Desktop / Claude Code updaten naar nieuwe package naam
- [ ] Smithery.ai listing updaten (als applicable)
- [ ] Beeper/Slack team informeren over nieuwe package naam

---

## Notities

- npm granular tokens zijn gelimiteerd tot **90 dagen max** — moet elk kwartaal vernieuwd
- Oude `@twofeetup/clickup-mcp` package blijft bestaan maar wordt niet meer geupdate
- GitHub repo blijft op `TwoFeetUp/clickup-mcp`
