# Direct Tool Test

Test a ClickUp MCP tool directly without starting the full server.

## Instructions

1. Identify which tool to test and its parameters from `src/tools/`
2. Create or update a test script in `playground/`
3. Run the test with credentials

## Steps

1. Read the tool schema from the relevant file:
   - Task tools: `src/tools/task/consolidated-tools.ts`
   - Container tools: `src/tools/container-tools.ts`
   - Member tools: `src/tools/member-tools.ts`
   - Tag tools: `src/tools/tag-tools.ts`

2. Create a test file in `playground/test-$ARGUMENTS.js`:
```javascript
import { handleXXX } from '../build/tools/xxx.js';

const result = await handleXXX({
  // parameters here
});

console.log(JSON.stringify(result, null, 2));
```

3. Build and run:
```bash
npm run build && CLICKUP_API_KEY=pk_xxx CLICKUP_TEAM_ID=xxx node playground/test-$ARGUMENTS.js
```

4. Analyze the output and report findings

Remember:
- Keep test files in `playground/` (gitignored)
- Check existing test files for patterns
- Use direct handler imports, not full server startup
