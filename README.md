# ClickUp MCP - Optimized AI Integration

A high-performance Model Context Protocol (MCP) server for integrating ClickUp with AI applications. This optimized fork features consolidated tools, response optimization, and intelligent caching for superior performance.

## 🚀 Key Optimizations

This repository builds on the original ClickUp MCP server with significant performance and efficiency improvements:

- **Tool Consolidation**: Reduced from 36 tools to 15 consolidated, action-based tools following MCP design principles
- **Response Optimization**: 54% token reduction through intelligent field filtering and data flattening
- **Intelligent Caching**: 15-minute TTL workspace hierarchy cache with 85% performance improvement
- **Hybrid Lookups**: Direct API calls when IDs available, fallback to cached hierarchy when needed
- **AI-First Design**: Tools designed around user intent rather than API structure

### Performance Results

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Response tokens (7 tasks) | 723 | 331 | **54% reduction** |
| Workspace lookup (warm) | 2400ms | 350ms | **85% faster** |
| Task search (cached) | 3000ms | 350ms | **88% faster** |

## Requirements

- **Node.js v18.0.0 or higher** (required for MCP SDK compatibility)
- ClickUp API key and Team ID

## Installation

### Quick Start (Recommended)

Add this to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": [
        "-y",
        "@twofeetup/clickup-mcp@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key-here",
        "CLICKUP_TEAM_ID": "your-team-id-here"
      }
    }
  }
}
```

**Get your credentials:**
- ClickUp API key: [ClickUp Settings](https://app.clickup.com/settings/apps)
- Team ID: Found in your ClickUp workspace URL

Restart Claude Desktop and the server will be automatically installed and ready to use!

### Local Development Setup

1. Clone this repository:
```bash
git clone https://github.com/TwoFeetUp/clickup-mcp.git
cd clickup-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL

5. Configure your MCP client (e.g., Claude Desktop):

Add this entry to your client's MCP settings JSON file:

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "node",
      "args": [
        "/path/to/clickup-mcp/build/index.js"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id"
      }
    }
  }
}
```

## Consolidated Tools

This server provides 15 consolidated tools instead of the original 36:

### Task Management
- **manage_task**: Create, update, delete, move, or duplicate tasks with action-based routing
- **search_tasks**: Find tasks by ID, list, or workspace-wide filters with configurable detail levels
- **task_comments**: Get or create task comments
- **task_time_tracking**: Manage time entries (get, start, stop, add, delete)
- **attach_file_to_task**: Attach files to tasks

### Container Management
- **manage_container**: Create, update, delete, or get lists and folders
- **get_container**: Retrieve container details

### Document Management
- **manage_document**: Create, update, delete documents
- **manage_document_page**: Create, update, delete document pages
- **list_documents**: List all documents in workspace

### Organization
- **find_members**: Search workspace members by name/email
- **manage_tags**: Create, update, delete, or list tags

### Bulk Operations
- **bulk_create_tasks**: Create multiple tasks efficiently
- **bulk_update_tasks**: Update multiple tasks at once
- **bulk_delete_tasks**: Delete multiple tasks in one operation

## Key Features

### AI-First Tool Design
- Tools organized by user intent, not API structure
- Natural language parameter names
- Support for flexible task identification (ID, name, or custom ID)
- Detail level control (minimal, standard, detailed)

### Response Optimization
- Automatic field filtering and null removal
- Nested object flattening (status → string, assignees → usernames)
- Configurable detail levels for token efficiency
- Pagination support for large result sets

### Performance Features
- 15-minute TTL workspace hierarchy cache
- Direct API lookups when IDs provided
- Graceful fallback to cached hierarchy
- Automatic cache invalidation
- Rate limit awareness (600ms spacing)

### Developer Experience
- Comprehensive TypeScript types
- Detailed logging with operation tracking
- Consistent error handling
- Input validation with helpful messages

## Configuration

Environment variables:
- `CLICKUP_API_KEY`: Your ClickUp API key (required)
- `CLICKUP_TEAM_ID`: Your ClickUp team/workspace ID (required)
- `LOG_LEVEL`: Logging verbosity (default: "info")

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode (for development)
npm run dev

# Run tests
node test-cache-performance.js
node test-optimized-response.js
```

## Architecture

This server follows MCP design principles:

- **Tool Consolidation**: Related operations grouped into single tools with action parameters
- **Token Efficiency**: Optimized response formats with field selection and detail levels
- **Performance**: Intelligent caching and direct API fallbacks
- **Maintainability**: Clear separation of concerns, consistent patterns

See [MCP_DESIGN_PRINCIPLES.md](MCP_DESIGN_PRINCIPLES.md) for detailed design philosophy.

## License

MIT

## Credits

This optimized version builds upon the original [ClickUp MCP Server](https://github.com/TaazKareem/clickup-mcp-server) by Talib Kareem, with significant architectural improvements and performance optimizations.

Optimizations by Sjoerd Tiemensma.
