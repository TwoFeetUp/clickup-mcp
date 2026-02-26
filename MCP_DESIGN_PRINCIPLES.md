# MCP Server Design Principles & Best Practices

This document consolidates best practices for building efficient, AI-first MCP servers based on industry knowledge and practical experience.

## Source

Much of this content is derived from research in the TwoFeetBase knowledge base (sjoerdsbrein index), particularly from:
- "MCP Tool Design: From APIs to AI-First Interfaces" (useai.substack.com)
- Various MCP implementation guides and practical experiences

## Core Design Philosophy

### AI-First vs Developer-First Design

**The Classic Developer Mistake:**
When building MCP tools, developers often make the mistake of designing them the way they would want to use them: clean, modular, following all the best practices of API design. **The problem? AI models don't think like developers.**

### Key Principles

#### 1. Start with User Intent, Not API Operations

Design your tools around what users will naturally ask for, not how your API is structured.

**Bad Example (API-First):**
```
- get_space_members
- get_community_members
- get_space_groups
- get_member_activity
- filter_by_activity_type
```

**Good Example (Intent-First):**
```
- find_active_members (handles spaces, communities, activity filtering in one tool)
```

#### 2. Reduce Decision Complexity

AI models struggle when faced with too many options or unclear distinctions.

**Example Problem:**
- What's the difference between a "resource", "entity", and "object"?
- When should you use `community_members` vs `space_members`?
- The AI has no context for these distinctions.

**Example Scenario:**
A user asks: _"Can you find the most active members in our JavaScript community who haven't attended any of our recent workshops?"_

With a **direct API conversion**, the model would face a maze of decisions and need to chain 7-8 different calls:
- Search for spaces matching "JavaScript"
- Distinguish between space types
- Get members for each space type
- Filter by activity metrics
- Cross-reference with event attendance
- Determine what counts as "recent"
- Aggregate and rank results

With an **AI-first design**, one tool handles the complete use case with clear, semantic parameters.

#### 3. Consolidate Related Operations

Instead of creating many small, modular tools (like traditional microservices), create fewer, more powerful tools that handle complete user intents.

**Benefits:**
- Fewer tool calls = faster responses
- Less decision-making overhead for the AI
- Clearer user experience
- Reduced API request overhead

**Example:**
Instead of:
```javascript
// 5 separate tools
get_task()
update_task()
add_comment()
get_comments()
assign_task()
```

Consider:
```javascript
// 2 comprehensive tools
manage_task({
  action: "update" | "comment" | "assign",
  taskId: string,
  updates: object
})

search_tasks({
  query: string,
  filters: object,
  include: ["comments", "assignees", "attachments"]
})
```

#### 4. Use Natural Language Friendly Parameters

Design parameters that match how users think and speak, not internal system terminology.

**Bad:**
```javascript
{
  "space": "python",
  "joinedAfter": "7d",
  "activityTypes": ["POST", "COMMENT"],
  "minActivityScore": 5
}
```

**Better:**
```javascript
{
  "community": "python",
  "recentlyJoined": "last week",
  "activityLevel": "active",
  "excludeInactive": true
}
```

#### 5. Return Rich, Contextual Results

Don't just return raw data - return results that help the AI understand and present information effectively.

**Example Result:**
```json
{
  "members": [...],
  "newMemberCount": 5,
  "withoutPosts": 3,
  "message": "Found 5 new members who joined the python space in the last 7 days. 3 haven't made any posts yet.",
  "metadata": {
    "dateRange": "2024-01-18 to 2024-01-25",
    "totalMembers": 142
  }
}
```

The `message` field provides context the AI can use directly, while structured data enables programmatic access.

## Performance & Efficiency Principles

### 1. Minimize API Calls

Each MCP tool invocation should minimize backend API calls:
- Batch related data requests
- Cache frequently accessed data
- Use pagination intelligently
- Pre-fetch related data when predictable

### 2. Optimize Response Size

Return only what's needed:
- Support field selection (`fields` or `include` parameters)
- Implement smart defaults
- Use pagination for large datasets
- Consider summary vs detail modes

### 3. Handle Errors Gracefully

Provide clear, actionable error messages:
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Could not find space 'python'. Available spaces: javascript, typescript, react. Did you mean 'python-beginners'?"
  }]
}
```

### 4. Implement Proper Caching

- Cache API responses when appropriate
- Use ETags or similar mechanisms
- Implement cache invalidation strategies
- Consider using a caching layer like Redis for distributed deployments

## Tool Consolidation Strategy

### When to Consolidate

Consolidate tools when:
- They operate on the same resource type
- They're commonly used together
- They share similar parameters
- The use cases naturally overlap

### When to Keep Separate

Keep tools separate when:
- They serve genuinely different use cases
- Consolidation would make parameters too complex
- Performance characteristics differ significantly
- Security/permission models differ

### Example: Task Management

**Before (9 tools):**
```
- create_task
- get_task
- update_task
- delete_task
- search_tasks
- add_comment
- get_comments
- assign_task
- get_assignees
```

**After (3 tools):**
```
- manage_task (CRUD operations)
- search_tasks (with rich filtering and includes)
- task_bulk_operations (for batch updates)
```

## Schema Design Best Practices

### 1. Use Clear, Descriptive Names

```typescript
// Good
interface TaskSearchParams {
  query?: string;
  status?: "open" | "in_progress" | "completed";
  assignedTo?: string;
  dueBefore?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

// Bad (unclear, technical)
interface TaskSearchParams {
  q?: string;
  st?: number;
  uid?: string;
  dt?: number;
  p?: number;
}
```

### 2. Provide Rich Descriptions

Your tool and parameter descriptions are critical - the AI relies on them to understand when and how to use your tools.

```typescript
{
  name: "search_tasks",
  description: "Search for tasks across all lists and folders. Use this when users ask to find, list, or locate tasks. Supports filtering by status, assignee, due date, priority, and tags. Returns up to 100 results by default.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language search query. Searches task names and descriptions. Example: 'urgent bugs' or 'marketing tasks'"
      },
      // ... more parameters
    }
  }
}
```

### 3. Use Enums for Fixed Options

```typescript
{
  status: {
    type: "string",
    enum: ["open", "in_progress", "completed", "archived"],
    description: "Filter by task status"
  }
}
```

### 4. Provide Sensible Defaults

```typescript
{
  limit: {
    type: "number",
    description: "Maximum number of results to return",
    default: 50,
    minimum: 1,
    maximum: 100
  }
}
```

## Testing & Validation

### Direct Tool Testing

For debugging and optimization, test tools directly without the full MCP protocol:

```javascript
// test-tool-direct.js
import { handleTaskSearch } from './src/tools/task/handlers.js';

const result = await handleTaskSearch({
  query: "test task",
  limit: 10
});

console.log(JSON.stringify(result, null, 2));
```

Benefits:
- Rapid iteration
- Precise performance profiling
- Easy debugging with breakpoints
- Isolated testing of tool logic

### Integration Testing

After direct testing, validate through the full MCP protocol:
- Test with actual MCP clients (Claude Desktop, etc.)
- Verify JSON-RPC formatting
- Validate schema compliance
- Test error handling at protocol level

## Common Patterns

### Pattern: Search with Rich Filtering

```typescript
interface SearchParams {
  query?: string;           // Full-text search
  filters?: {               // Structured filters
    status?: string[];
    assignee?: string[];
    priority?: string[];
    tags?: string[];
  };
  dateRange?: {            // Time-based filtering
    field: "created" | "updated" | "due";
    start?: string;
    end?: string;
  };
  sort?: {                 // Sorting
    field: string;
    direction: "asc" | "desc";
  };
  limit?: number;          // Pagination
  offset?: number;
  include?: string[];      // Related data inclusion
}
```

### Pattern: Batch Operations

```typescript
interface BatchUpdateParams {
  taskIds: string[];
  updates: {
    status?: string;
    assignee?: string;
    priority?: string;
    tags?: string[];
  };
  mode: "merge" | "replace";  // How to handle arrays
}
```

### Pattern: Progressive Disclosure

Start simple, allow complexity:

```typescript
// Simple use
search_tasks({ query: "urgent bugs" })

// Advanced use
search_tasks({
  query: "bugs",
  filters: {
    priority: ["urgent", "high"],
    status: ["open"],
    assignee: ["john@example.com"]
  },
  dateRange: {
    field: "created",
    start: "2024-01-01"
  },
  sort: { field: "priority", direction: "desc" },
  include: ["comments", "attachments"]
})
```

## Summary: The AI-First Mindset

When designing MCP tools, constantly ask yourself:

1. **"What would a user naturally ask for?"** - Not "what does my API expose?"
2. **"Can this be simpler?"** - Fewer tools with clearer purposes beat many granular tools
3. **"Does the AI have enough context?"** - Provide rich descriptions and semantic parameters
4. **"Is this efficient?"** - Minimize API calls, optimize response sizes
5. **"What happens when it fails?"** - Provide clear, actionable error messages

Remember: **You're building an interface for AI agents, not for developers.** The rules are different, and following traditional API design patterns can actually make your MCP server less effective.
