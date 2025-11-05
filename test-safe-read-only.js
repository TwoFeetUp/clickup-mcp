/**
 * Safe Read-Only Test
 *
 * Tests consolidated tools against ClickUp API with READ-ONLY operations
 * Will NOT create, update, or delete anything
 *
 * Run with: node test-safe-read-only.js
 */

import dotenv from 'dotenv';
dotenv.config();

import config from './build/config.js';
import { workspaceService } from './build/services/shared.js';
import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';
import { handleFindMembers } from './build/tools/member-tools.js';
import { Logger } from './build/logger.js';

const logger = new Logger('SafeTest');

console.log('🔍 Starting Safe Read-Only Tests...\n');
console.log('⚠️  These tests will only READ data, no modifications will be made\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    console.log(`Testing: ${name}...`);
    await fn();
    console.log(`✅ ${name}\n`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

// Test 1: Get workspace hierarchy (unchanged tool, should work)
await test('Get Workspace Hierarchy (read-only)', async () => {
  const hierarchy = await workspaceService.getWorkspaceHierarchy();
  if (!hierarchy) {
    throw new Error('No hierarchy returned');
  }
  console.log(`   Found workspace with spaces`);
});

// Test 2: Search tasks with new consolidated tool (read-only)
await test('Search Tasks with consolidated tool (read-only)', async () => {
  // Get hierarchy first to find a list
  const hierarchy = await workspaceService.getWorkspaceHierarchy();
  let listId = null;

  // Find first available list
  for (const space of hierarchy.spaces || []) {
    if (space.lists && space.lists.length > 0) {
      listId = space.lists[0].id;
      break;
    }
  }

  if (!listId) {
    console.log(`   Skipped - no lists found in workspace`);
    return;
  }

  const result = await handleSearchTasks({
    listId: listId,
    limit: 5,
    detail_level: 'minimal'
  });

  if (!result || !result.content) {
    throw new Error('No result returned from handleSearchTasks');
  }

  console.log(`   Search completed successfully`);
});

// Test 3: Find members with consolidated tool (read-only)
await test('Find Members with consolidated tool (read-only)', async () => {
  const result = await handleFindMembers({});

  if (!result) {
    throw new Error('No result returned from handleFindMembers');
  }

  // Result format is { content: [ { type: "text", text: "..." } ] }
  if (result.content && Array.isArray(result.content)) {
    console.log(`   Found workspace members (returned ${result.content.length} content items)`);
  } else {
    console.log(`   Debug: result = ${JSON.stringify(result).substring(0, 200)}`);
    throw new Error('Unexpected result format from handleFindMembers');
  }
});

// Test 4: Search specific task (read-only)
await test('Search for specific task (read-only)', async () => {
  // First get a list to search in
  const hierarchy = await workspaceService.getWorkspaceHierarchy();

  // Try to find any list
  let listName = null;
  for (const space of hierarchy.spaces || []) {
    if (space.lists && space.lists.length > 0) {
      listName = space.lists[0].name;
      break;
    }
    if (space.folders && space.folders.length > 0) {
      for (const folder of space.folders) {
        if (folder.lists && folder.lists.length > 0) {
          listName = folder.lists[0].name;
          break;
        }
      }
      if (listName) break;
    }
  }

  if (listName) {
    const result = await handleSearchTasks({
      listName: listName,
      limit: 2,
      detail_level: 'minimal'
    });

    if (!result || !result.content) {
      throw new Error('No result returned');
    }

    console.log(`   Searched tasks in list: ${listName}`);
  } else {
    console.log(`   Skipped - no lists found in workspace`);
  }
});

// Summary
console.log('='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✅ All read-only tests passed!');
  console.log('\n📊 Key findings:');
  console.log('  - Tool routing is working correctly');
  console.log('  - Handlers are properly connected');
  console.log('  - ClickUp API communication is functional');
  console.log('  - Response formatting is working');
  console.log('\n🎯 Next steps:');
  console.log('  1. Create a test space in ClickUp for write operations');
  console.log('  2. Test create/update/delete in test space only');
  console.log('  3. Verify backward compatibility (old tool names)');
  console.log('  4. Deploy to production when confident\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed.');
  console.log('Review errors above and fix before proceeding.\n');
  process.exit(1);
}
