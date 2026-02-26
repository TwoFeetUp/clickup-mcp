# MCP Server Setup Guide for Claude Code

This guide provides recommended MCP servers and configuration for developing the ClickUp MCP Server.

---

## Recommended MCP Servers

### 1. Context7 (Documentation Search)
Get up-to-date library documentation while coding.

```bash
claude mcp add --scope user context7 -- bunx context7-mcp
```

**Use for**: Looking up MCP SDK docs, TypeScript patterns, Axios API

### 2. GitHub (Repository Operations)
Work with issues, PRs, and GitHub features.

```bash
claude mcp add --scope user github -- bunx @modelcontextprotocol/server-github
```

**Configuration**: Set `GITHUB_TOKEN` environment variable.

**Use for**: Creating PRs, managing issues, reviewing workflows

### 3. Sequential Thinking (Complex Decisions)
For multi-step reasoning and architectural decisions.

```bash
claude mcp add --scope user sequential-thinking -- bunx @modelcontextprotocol/server-sequential-thinking
```

**Use for**: Planning new features, debugging complex issues

---

## Project-Specific MCP Config

Create `.mcp.json` in project root (commit to git for team sharing):

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "bunx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "context7": {
      "type": "stdio",
      "command": "bunx",
      "args": ["context7-mcp"]
    }
  }
}
```

---

## Using This MCP Server for Testing

You can use this ClickUp MCP server itself for development task tracking:

### Local Development Testing

1. Build the server:
```bash
npm run build
```

2. Configure Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ClickUp-Dev": {
      "command": "node",
      "args": ["C:/path/to/clickup-mcp/build/index.js"],
      "env": {
        "CLICKUP_API_KEY": "pk_your_key",
        "CLICKUP_TEAM_ID": "your_team_id",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

3. Restart Claude Desktop to load the server

### SSE Mode for Web Testing

1. Start the SSE server:
```bash
CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx ENABLE_SSE=true npm start
```

2. Server runs on `http://localhost:3000`

3. Connect via SSE endpoint: `http://localhost:3000/sse`

---

## Environment Variables for MCP Servers

### GitHub Server
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### ClickUp Server (this project)
```bash
export CLICKUP_API_KEY=pk_xxxxxxxxxxxx
export CLICKUP_TEAM_ID=xxxxxxxxxxxx
```

---

## Troubleshooting

### MCP Server Not Loading
1. Check server logs in Claude Desktop settings
2. Verify environment variables are set
3. Test server standalone:
```bash
node build/index.js
# Should output JSON-RPC messages
```

### Rate Limiting Issues
- ClickUp Free Forever: 100 requests/minute
- Built-in rate limiting handles this automatically
- Set `LOG_LEVEL=DEBUG` to see rate limit status

### Permission Errors
- Ensure API key has correct permissions
- Check team ID matches your workspace

---

## MCP Development Resources

- [MCP SDK Documentation](https://modelcontextprotocol.io/docs)
- [ClickUp API v2 Reference](https://clickup.com/api/)
- [MCP Design Principles](../MCP_DESIGN_PRINCIPLES.md) (local)
