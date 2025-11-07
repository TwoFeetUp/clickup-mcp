# Quick Start: Running the Test Suite

Get the test suite running in 2 minutes.

## One-Minute Setup

1. **Set your API key** in `.env`:
   ```bash
   CLICKUP_API_KEY=your_key_here
   ```

2. **Create a test list** in ClickUp named `MCP_AUTOMATED_TESTS` (recommended)

3. **(Optional) Add the list ID** to `.env`:
   ```bash
   TEST_LIST_ID=your_list_id_here
   ```

## Run Tests

```bash
# Build the project
npm run build

# Run the test suite
node test-all-consolidated-tools.js
```

## What Happens

The test suite:
- Tests all 7 tool groups (Workspace, Tasks, Containers, Members, Tags, Documents, Backward Compatibility)
- Creates test items in the `MCP_AUTOMATED_TESTS` list
- Runs through all operations (create, read, update, delete)
- Shows color-coded results with pass/fail counts
- Automatically cleans up all test data
- Exits with code 0 (all passed) or 1 (failures)

## Example Output

```
Testing: Task Tools
======================================================================
  ✅ Create task
  ✅ Search tasks in list
  ✅ Update task
  ✅ Create task comment
  ✅ Get task comments
  ✅ Get task time entries
  ✅ Delete task
  Results: 7/7 passed (100%)

... [other groups] ...

Total Tests: 25
Passed: 23
Failed: 2
Pass Rate: 92%
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "TEST_LIST_ID not configured" | Create a test list in ClickUp and add its ID to `.env` |
| "Permission denied" | Verify API key scope includes task/list/tag management |
| Tests timeout | Check internet connection and ClickUp API status |
| No workspace detected | Ensure you have at least one space in your workspace |

## What's Tested

✅ Workspace hierarchy retrieval
✅ Task CRUD operations
✅ Task comments and time tracking
✅ Container (list/folder) operations
✅ Member lookup and resolution
✅ Tag management and assignment
✅ Document creation and management
✅ Backward compatibility

## Exit Codes

- `0` = All tests passed
- `1` = Some tests failed

## Files

- `test-all-consolidated-tools.js` - Main test suite
- `TEST_GUIDE.md` - Full documentation
- `QUICK_TEST_START.md` - This quick reference

## Next Steps

1. Read `TEST_GUIDE.md` for detailed information
2. Check test output for any failures
3. Review error messages and troubleshooting section
4. Extend tests by following the pattern in `test-all-consolidated-tools.js`

## Tips

- Tests use direct tool invocation (fast, no MCP protocol overhead)
- Test data cleanup is automatic (check `.createdItems` if something goes wrong)
- Add `console.log()` calls in handlers for debugging
- Increase `delay()` values if API rate limiting is an issue
- Review test output carefully - detailed error messages are provided

---

**Ready?** Run `npm run build && node test-all-consolidated-tools.js`
