# ClickUp MCP Server

## Overview
- **Type**: Standard Node.js project (TypeScript)
- **Stack**: MCP SDK, Express (SSE), Axios, Zod
- **Architecture**: AI-first MCP server with consolidated tools
- **Purpose**: High-performance ClickUp integration for AI applications

This CLAUDE.md is the authoritative source for development guidelines.
Subdirectories contain specialized CLAUDE.md files that extend these rules.

---

## Universal Development Rules

### Code Quality (MUST)
- **MUST** write TypeScript code matching existing patterns in `src/`
- **MUST** run `npm run build` before committing to verify compilation
- **MUST** follow AI-first design principles from `MCP_DESIGN_PRINCIPLES.md`
- **MUST NOT** commit API keys, tokens, or credentials
- **MUST NOT** hardcode `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID`

### Best Practices (SHOULD)
- **SHOULD** use existing patterns from `src/services/clickup/base.ts` for API services
- **SHOULD** consolidate related tools rather than creating many small ones
- **SHOULD** return rich, contextual results (see `src/utils/response-formatter.ts`)
- **SHOULD** support natural language dates and flexible task identification
- **SHOULD** log operations using `Logger` class from `src/logger.ts`

### Anti-Patterns (MUST NOT)
- **MUST NOT** bypass rate limiting in `BaseClickUpService`
- **MUST NOT** create tools that require AI to chain multiple calls for common intents
- **MUST NOT** use `any` type without explicit justification in comments
- **MUST NOT** push directly to main branch without PR review

### Experimentation (Playground Rule)
- **MUST** use `playground/` directory for all experiments and direct tool testing
- **MUST** keep playground code out of `src/` directory
- **SHOULD** organize playground by concept: `playground/test-*.js`
- **MAY** make playground as messy as needed while debugging
- Playground is gitignored - perfect for:
  - Direct tool invocation testing (see `playground/test-*.js` examples)
  - API response inspection
  - Debugging resolver logic
  - Experimenting with new tool designs

---

## Core Commands

### Development
```bash
npm run build         # Compile TypeScript to build/
npm run dev           # Watch mode - recompile on changes
npm start             # Run built server (STDIO transport)
```

### Testing Direct Tool Invocation
```bash
# Set credentials and run direct tests
CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node playground/test-*.js
```

### Quality Gates (run before PR)
```bash
npm run build
# Then test manually with MCP client or direct invocation
```

### Publishing (via GitHub Actions)
Publishing is handled by the manual GitHub workflow. **Do not run `npm publish` directly.**
1. Go to Actions > "Build, Tag and Publish"
2. Select version increment (patch/minor/major)
3. Run workflow

---

## Project Structure

### Source Code (`src/`)
- **`index.ts`** - Entry point, handles STDIO/SSE transport selection
- **`server.ts`** - MCP server configuration, tool registration
- **`config.ts`** - Environment variable parsing and validation
- **`logger.ts`** - Logging utilities (respects JSON-RPC communication)

### Services (`src/services/`)
- **`clickup/base.ts`** - Base service class with rate limiting, error handling
- **`clickup/workspace.ts`** - Workspace hierarchy and caching
- **`clickup/task/`** - Task-related services (core, search, comments, etc.)
- **`shared.ts`** - Service singleton instances

### Tools (`src/tools/`)
- **`task/consolidated-tools.ts`** - Tool schemas (manage_task, search_tasks, etc.)
- **`task/consolidated-handlers.ts`** - Handler implementations
- **`container-tools.ts`** - List/folder management
- **`member-tools.ts`** - Member search
- **`tag-tools.ts`** - Tag operations
- **`document-tools.ts`** - Document management (optional feature)

### Utilities (`src/utils/`)
- **`cache-service.ts`** - TTL-based workspace hierarchy cache
- **`date-utils.ts`** - Natural language date parsing
- **`resolver-utils.ts`** - Entity resolution (task by name, assignee by email)
- **`response-formatter.ts`** - Response optimization and field selection

### Configuration Files
- **`MCP_DESIGN_PRINCIPLES.md`** - AI-first design philosophy (**read this first**)
- **`smithery.yaml`** - Smithery.ai deployment configuration
- **`Dockerfile`** - Docker build for hosted deployment

### Playground (`playground/`)
- **Gitignored** - experiments, direct tests, debugging scripts
- Example: `playground/test-assignee-resolution.js`

---

## Quick Search Commands

### Find Tool Definitions
```bash
# Find tool schema
rg -n "export const.*Tool = \{" src/tools

# Find tool handler
rg -n "export async function handle" src/tools

# Find tool registration
rg -n "case \"" src/server.ts
```

### Find Service Methods
```bash
# Find service class
rg -n "export class.*Service" src/services

# Find API endpoint usage
rg -n "this\.client\.(get|post|put|delete)" src/services
```

### Find Utilities
```bash
# Find utility functions
rg -n "export (function|const)" src/utils

# Find cache operations
rg -n "(get|set|clear).*cache" src/utils
```

---

## Security Guidelines

### Secrets Management
- **NEVER** commit `CLICKUP_API_KEY` or `CLICKUP_TEAM_ID` to git
- Use environment variables for credentials
- `.env` and `.env.*` files are gitignored
- For testing, pass credentials via command line:
  ```bash
  CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node build/index.js
  ```

### Safe Operations
- Review generated bash commands before execution
- Confirm before: `npm publish`, git force push, removing files
- Test changes locally before pushing

### Rate Limiting
- ClickUp API: 100 requests/minute (Free Forever plan)
- Built-in rate limiting in `BaseClickUpService` with automatic backoff
- Default 600ms spacing between requests

---

## Git Workflow

### Branches
- `main` - stable, published releases
- Feature branches: `feature/description` or `fix/description`

### Commits
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- Keep commits focused and atomic
- Example: `feat: add custom field support to search_tasks`

### Versioning
- **Do not manually edit version numbers** in `package.json`
- Use GitHub Actions workflow to bump versions
- Version is synced to `server.ts` automatically during publish

---

## Available MCP Tools

This server exposes 15 consolidated tools:

### Task Management
| Tool | Description |
|------|-------------|
| `manage_task` | Create, update, delete, move, or duplicate tasks |
| `search_tasks` | Find tasks by ID, list, or workspace-wide filters |
| `task_comments` | Get or create task comments |
| `task_time_tracking` | Manage time entries |
| `attach_file_to_task` | Attach files to tasks |

### Container Management
| Tool | Description |
|------|-------------|
| `manage_container` | Create, update, delete lists/folders |
| `get_container` | Retrieve container details |

### Organization
| Tool | Description |
|------|-------------|
| `find_members` | Search workspace members |
| `operate_tags` | Create, update, delete, list tags |
| `get_workspace_hierarchy` | Get full workspace structure |

### Document Management (Optional)
| Tool | Description |
|------|-------------|
| `manage_document` | Create, update, delete documents |
| `manage_document_page` | Manage document pages |
| `list_documents` | List workspace documents |

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `CLICKUP_API_KEY` | ClickUp API key from Settings > Apps |
| `CLICKUP_TEAM_ID` | Team/workspace ID from URL |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `ERROR` | Logging: TRACE, DEBUG, INFO, WARN, ERROR |
| `DOCUMENT_SUPPORT` | `false` | Enable document tools |
| `ENABLE_SSE` | `false` | Use SSE transport instead of STDIO |
| `SSE_PORT` | `3000` | Port for SSE server |
| `ENABLED_TOOLS` | (all) | Comma-separated list of tools to enable |
| `DISABLED_TOOLS` | (none) | Comma-separated list of tools to disable |

---

## Specialized Context

When working in specific directories, refer to their CLAUDE.md:
- Tool development: [src/tools/CLAUDE.md](src/tools/CLAUDE.md)
- Service development: [src/services/CLAUDE.md](src/services/CLAUDE.md)

---

## Key Design Principles

Read `MCP_DESIGN_PRINCIPLES.md` for the full philosophy. Summary:

1. **User Intent First** - Design tools around what users ask for, not API structure
2. **Reduce Decision Complexity** - Fewer, more powerful tools beat many granular ones
3. **Natural Language Friendly** - Support flexible identification (ID, name, custom ID)
4. **Rich Contextual Results** - Return data that helps AI understand and present info
5. **Performance Matters** - Cache, batch, paginate - minimize API calls

### Example: Good vs Bad Tool Design
```typescript
// BAD: API-first (too many tools)
get_task(), update_task(), get_comments(), add_comment()

// GOOD: Intent-first (consolidated)
manage_task({ action: "update", ... })
task_comments({ action: "get" | "create", ... })
```
