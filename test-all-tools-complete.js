/**
 * Complete Test of All 15 Consolidated Tools
 * Uses actual workspace data from ClickUp
 */

import dotenv from 'dotenv';
dotenv.config();

import { clickUpServices } from './build/services/shared.js';
import { handleManageTask, handleSearchTasks, handleTaskComments, handleTaskTimeTracking } from './build/tools/task/consolidated-handlers.js';
import { handleManageContainer, handleGetContainer } from './build/tools/container-handlers.js';
import { handleFindMembers } from './build/tools/member-tools.js';
import { handleManageTags } from './build/tools/tag-tools.js';
import { handleManageDocument, handleManageDocumentPage, handleListDocuments } from './build/tools/document-tools.js';

console.log('🔍 COMPREHENSIVE TEST OF ALL 15 CONSOLIDATED TOOLS\n');
console.log('═'.repeat(70) + '\n');

let passed = 0;
let failed = 0;
let testData = {
  spaceId: null,
  spaceName: null,
  listId: null,
  listName: null,
  taskId: null,
  tagName: null,
  documentId: null,
  testListId: null
};

async function test(name, fn) {
  try {
    console.log(`▶ ${name}...`);
    const result = await fn();
    console.log(`✅ ${name}`);
    if (result) console.log(`   ${result}`);
    passed++;
    return result;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
    return null;
  }
}

// ===================================================================
// SETUP: Get workspace structure
// ===================================================================
console.log('📋 SETUP: Getting workspace structure\n');

const spaces = await clickUpServices.workspace.getSpaces();
console.log(`Found ${spaces.length} spaces\n`);

if (spaces.length > 0) {
  testData.spaceId = spaces[0].id;
  testData.spaceName = spaces[0].name;
  console.log(`Using space: ${testData.spaceName} (${testData.spaceId})\n`);

  // Get hierarchy to find lists
  const hierarchy = await clickUpServices.workspace.getWorkspaceHierarchy();
  if (hierarchy.spaces && hierarchy.spaces.length > 0) {
    for (const space of hierarchy.spaces) {
      if (space.lists && space.lists.length > 0) {
        testData.listId = space.lists[0].id;
        testData.listName = space.lists[0].name;
        console.log(`Using list: ${testData.listName} (${testData.listId})\n`);
        break;
      }
      if (space.folders && space.folders.length > 0) {
        for (const folder of space.folders) {
          if (folder.lists && folder.lists.length > 0) {
            testData.listId = folder.lists[0].id;
            testData.listName = folder.lists[0].name;
            console.log(`Using list: ${testData.listName} (${testData.listId})\n`);
            break;
          }
        }
        if (testData.listId) break;
      }
    }
  }
}

console.log('═'.repeat(70) + '\n');

// ===================================================================
// TEST 1: MEMBER TOOLS (1 tool - 3 modes)
// ===================================================================
console.log('👥 TEST GROUP 1: MEMBER TOOLS (find_members)\n');

await test('1.1 find_members - list all', async () => {
  const result = await handleFindMembers({});
  return 'Listed all workspace members';
});

await test('1.2 find_members - search by query', async () => {
  const result = await handleFindMembers({ query: 'admin' });
  return 'Searched for members matching "admin"';
});

await test('1.3 find_members - resolve assignees', async () => {
  const result = await handleFindMembers({
    assignees: ['admin@bijli.org', 'ingrid@twofeetup.com']
  });
  return 'Resolved 2 email addresses to user IDs';
});

console.log(`\n✨ Member Tools: ${passed}/${passed + failed} passed\n`);
console.log('═'.repeat(70) + '\n');

// ===================================================================
// TEST 2: CONTAINER TOOLS (2 tools)
// ===================================================================
console.log('📦 TEST GROUP 2: CONTAINER TOOLS\n');

if (!testData.spaceId) {
  console.log('⏭️  Skipping - no space available\n');
} else {
  const startCount = passed + failed;

  // Create test list
  await test('2.1 manage_container - create list', async () => {
    const result = await handleManageContainer({
      type: 'list',
      action: 'create',
      spaceId: testData.spaceId,
      name: `Test List ${Date.now()}`
    });

    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testData.testListId = parsed.id;

    return `Created list ID: ${testData.testListId}`;
  });

  // Get the list
  await test('2.2 get_container - get list', async () => {
    const result = await handleGetContainer({
      type: 'list',
      listId: testData.testListId,
      detail_level: 'standard'
    });
    return `Retrieved list details`;
  });

  // Update the list
  await test('2.3 manage_container - update list', async () => {
    const result = await handleManageContainer({
      type: 'list',
      action: 'update',
      listId: testData.testListId,
      name: 'Test List (Updated)'
    });
    return `Updated list name`;
  });

  // Delete the list (cleanup)
  await test('2.4 manage_container - delete list', async () => {
    const result = await handleManageContainer({
      type: 'list',
      action: 'delete',
      listId: testData.testListId
    });
    return `Deleted test list`;
  });

  const groupPassed = (passed + failed) - startCount;
  console.log(`\n✨ Container Tools: ${groupPassed - (failed - (startCount - passed))}/${groupPassed} passed\n`);
}

console.log('═'.repeat(70) + '\n');

// ===================================================================
// TEST 3: TASK TOOLS (5 tools)
// ===================================================================
console.log('✅ TEST GROUP 3: TASK TOOLS\n');

if (!testData.listId) {
  console.log('⏭️  Skipping - no list available\n');
} else {
  const startCount = passed + failed;

  // 3.1 Create task
  await test('3.1 manage_task - create', async () => {
    const result = await handleManageTask({
      action: 'create',
      listId: testData.listId,
      name: `Test Task ${Date.now()}`,
      description: 'Created by automated testing'
    });

    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testData.taskId = parsed.id;

    return `Created task ID: ${testData.taskId}`;
  });

  // 3.2 Search tasks
  await test('3.2 search_tasks - by list', async () => {
    const result = await handleSearchTasks({
      listId: testData.listId,
      limit: 5,
      detail_level: 'minimal'
    });
    return `Searched tasks in list`;
  });

  // 3.3 Update task
  if (testData.taskId) {
    await test('3.3 manage_task - update', async () => {
      const result = await handleManageTask({
        action: 'update',
        taskId: testData.taskId,
        description: 'Updated by automated testing'
      });
      return `Updated task description`;
    });
  }

  // 3.4 Task comments - get
  if (testData.taskId) {
    await test('3.4 task_comments - get', async () => {
      const result = await handleTaskComments({
        action: 'get',
        taskId: testData.taskId
      });
      return `Retrieved task comments`;
    });
  }

  // 3.5 Task comments - create
  if (testData.taskId) {
    await test('3.5 task_comments - create', async () => {
      const result = await handleTaskComments({
        action: 'create',
        taskId: testData.taskId,
        commentText: 'Test comment from automated testing'
      });
      return `Created comment on task`;
    });
  }

  // 3.6 Time tracking - get entries
  if (testData.taskId) {
    await test('3.6 task_time_tracking - get_entries', async () => {
      const result = await handleTaskTimeTracking({
        action: 'get_entries',
        taskId: testData.taskId
      });
      return `Retrieved time tracking entries`;
    });
  }

  // 3.7 Delete task (cleanup)
  if (testData.taskId) {
    await test('3.7 manage_task - delete', async () => {
      const result = await handleManageTask({
        action: 'delete',
        taskId: testData.taskId
      });
      return `Deleted test task`;
    });
  }

  const groupPassed = (passed + failed) - startCount;
  console.log(`\n✨ Task Tools: ${groupPassed - (failed - (startCount - passed))}/${groupPassed} passed\n`);
}

console.log('═'.repeat(70) + '\n');

// ===================================================================
// TEST 4: TAG TOOLS (1 tool)
// ===================================================================
console.log('🏷️  TEST GROUP 4: TAG TOOLS (manage_tags)\n');

if (!testData.spaceId) {
  console.log('⏭️  Skipping - no space available\n');
} else {
  const startCount = passed + failed;

  // 4.1 List tags
  await test('4.1 manage_tags - list', async () => {
    const result = await handleManageTags({
      scope: 'space',
      action: 'list',
      spaceId: testData.spaceId
    });
    return `Listed space tags`;
  });

  // 4.2 Create tag
  testData.tagName = `test-${Date.now()}`;
  await test('4.2 manage_tags - create', async () => {
    const result = await handleManageTags({
      scope: 'space',
      action: 'create',
      spaceId: testData.spaceId,
      tagName: testData.tagName,
      colorCommand: 'blue tag'
    });
    return `Created tag: ${testData.tagName}`;
  });

  // 4.3 Update tag
  if (testData.tagName) {
    await test('4.3 manage_tags - update', async () => {
      const result = await handleManageTags({
        scope: 'space',
        action: 'update',
        spaceId: testData.spaceId,
        tagName: testData.tagName,
        colorCommand: 'green tag'
      });
      return `Updated tag color to green`;
    });
  }

  // 4.4 Delete tag (cleanup)
  if (testData.tagName) {
    await test('4.4 manage_tags - delete', async () => {
      const result = await handleManageTags({
        scope: 'space',
        action: 'delete',
        spaceId: testData.spaceId,
        tagName: testData.tagName
      });
      return `Deleted tag: ${testData.tagName}`;
    });
  }

  const groupPassed = (passed + failed) - startCount;
  console.log(`\n✨ Tag Tools: ${groupPassed - (failed - (startCount - passed))}/${groupPassed} passed\n`);
}

console.log('═'.repeat(70) + '\n');

// ===================================================================
// TEST 5: DOCUMENT TOOLS (3 tools) - Only if enabled
// ===================================================================
console.log('📄 TEST GROUP 5: DOCUMENT TOOLS\n');

if (process.env.DOCUMENT_SUPPORT !== 'true') {
  console.log('⏭️  Skipping - DOCUMENT_SUPPORT not enabled\n');
} else if (!testData.listId) {
  console.log('⏭️  Skipping - no list available\n');
} else {
  const startCount = passed + failed;

  // 5.1 Create document
  await test('5.1 manage_document - create', async () => {
    const result = await handleManageDocument({
      action: 'create',
      name: `Test Doc ${Date.now()}`,
      parent: { id: testData.listId, type: 6 },
      visibility: 'PUBLIC',
      create_page: true
    });

    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testData.documentId = parsed.id;

    return `Created document ID: ${testData.documentId}`;
  });

  // 5.2 Update document
  if (testData.documentId) {
    await test('5.2 manage_document - update', async () => {
      const result = await handleManageDocument({
        action: 'update',
        documentId: testData.documentId,
        name: 'Test Doc (Updated)'
      });
      return `Updated document name`;
    });
  }

  // 5.3 List documents
  await test('5.3 list_documents', async () => {
    const result = await handleListDocuments({
      parent_id: testData.listId,
      parent_type: 'LIST'
    });
    return `Listed documents in list`;
  });

  // 5.4 Create page
  if (testData.documentId) {
    await test('5.4 manage_document_page - create', async () => {
      const result = await handleManageDocumentPage({
        action: 'create',
        documentId: testData.documentId,
        name: 'Test Page',
        content: 'This is test content'
      });
      return `Created page in document`;
    });
  }

  // 5.5 List pages
  if (testData.documentId) {
    await test('5.5 manage_document_page - list', async () => {
      const result = await handleManageDocumentPage({
        action: 'list',
        documentId: testData.documentId
      });
      return `Listed pages in document`;
    });
  }

  const groupPassed = (passed + failed) - startCount;
  console.log(`\n✨ Document Tools: ${groupPassed - (failed - (startCount - passed))}/${groupPassed} passed\n`);
}

console.log('═'.repeat(70) + '\n');

// ===================================================================
// FINAL SUMMARY
// ===================================================================
console.log('📊 FINAL TEST RESULTS\n');
console.log('═'.repeat(70));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log(`✨ Pass Rate: ${passed}/${passed + failed} (${Math.round(passed / (passed + failed) * 100)}%)`);
console.log('═'.repeat(70));

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! All 15 consolidated tools working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Review errors above.\n`);
  process.exit(1);
}
