# Review Tool Design

Review MCP tool implementations against AI-first design principles.

## Instructions

1. Read `MCP_DESIGN_PRINCIPLES.md` first
2. Analyze the specified tool or all tools if not specified: $ARGUMENTS

## Review Checklist

### User Intent First
- [ ] Tool name describes user intent, not API operation
- [ ] Description helps AI understand when to use this tool
- [ ] Common use cases can be accomplished in a single tool call

### Reduced Decision Complexity
- [ ] Related operations consolidated (not separate get/update/delete tools)
- [ ] Action-based routing for multiple operations
- [ ] Clear parameter distinctions (no confusing overlaps)

### Natural Language Friendly
- [ ] Supports flexible identification (ID, name, custom ID)
- [ ] Date parameters accept natural language ("tomorrow", "next week")
- [ ] Parameters use semantic names (not internal API terminology)

### Rich Contextual Results
- [ ] Returns helpful message with results
- [ ] Includes metadata (counts, date ranges)
- [ ] Supports detail level selection (minimal/standard/detailed)
- [ ] Optimizes token usage (field selection, pagination)

### Performance
- [ ] Minimizes API calls per tool invocation
- [ ] Uses caching where appropriate
- [ ] Supports pagination for large results
- [ ] Handles rate limiting gracefully

## Report Format

For each tool reviewed, report:
1. **Tool Name**:
2. **Score**: (1-5 stars)
3. **Strengths**: What's done well
4. **Issues**: Design violations found
5. **Recommendations**: Specific improvements

## Files to Check

- Tool schemas: `src/tools/*/consolidated-tools.ts`, `src/tools/*-tools.ts`
- Handlers: `src/tools/*/consolidated-handlers.ts`, `src/tools/*-handlers.ts`
- Response formatting: `src/utils/response-formatter.ts`
