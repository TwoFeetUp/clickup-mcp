/**
 * Test Each Tool Individually
 * Manual testing of all 15 consolidated tools
 */

import dotenv from 'dotenv';
dotenv.config();

import { workspaceService } from './build/services/shared.js';
import { handleManageTask, handleSearchTasks, handleTaskComments, handleTaskTimeTracking } from './build/tools/task/consolidated-handlers.js';
import { handleManageContainer, handleGetContainer } from './build/tools/container-handlers.js';
import { handleFindMembers } from './build/tools/member-tools.js';
import { handleManageTags } from './build/tools/tag-tools.js';
import { handleManageDocument, handleManageDocumentPage, handleListDocuments } from './build/tools/document-tools.js';

console.log('🔍 Testing Each Consolidated Tool\n');

let passed = 0;
let failed = 0;
let skipped = 0;
let testData = {
  spaceId: null,
  listId: null,
  taskId: null,
  tagName: null,
  documentId: null
};

async function test(name, fn) {
  try {
    console.log(`Testing: ${name}...`);
    const result = await fn();
    console.log(`✅ ${name}`);
    if (result) console.log(`   ${result}`);
    passed++;
    return result;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
    return null;
  }
}

function skip(name, reason) {
  console.log(`⏭️  ${name} - ${reason}`);
  skipped++;
}

// ===================================================================
// WORKSPACE TOOLS (1 tool)
// ===================================================================
console.log('\n═══ WORKSPACE TOOLS ═══\n');

await test('get_workspace_hierarchy', async () => {
  const hierarchy = await workspaceService.getWorkspaceHierarchy();

  // Extract first space ID for later tests
  if (hierarchy.spaces && hierarchy.spaces.length > 0) {
    testData.spaceId = hierarchy.spaces[0].id;

    // Find first list
    for (const space of hierarchy.spaces) {
      if (space.lists && space.lists.length > 0) {
        testData.listId = space.lists[0].id;
        break;
      }
      if (space.folders && space.folders.length > 0) {
        for (const folder of space.folders) {
          if (folder.lists && folder.lists.length > 0) {
            testData.listId = folder.lists[0].id;
            break;
          }
        }
        if (testData.listId) break;
      }
    }
  }

  return `Found ${hierarchy.spaces?.length || 0} spaces, spaceId=${testData.spaceId}, listId=${testData.listId}`;
});

// ===================================================================
// MEMBER TOOLS (1 tool)
// ===================================================================
console.log('\n═══ MEMBER TOOLS ═══\n');

await test('find_members - list all', async () => {
  const result = await handleFindMembers({});
  return `Listed members`;
});

await test('find_members - search by query', async () => {
  const result = await handleFindMembers({ query: 'admin' });
  return `Searched for 'admin'`;
});

await test('find_members - resolve assignees', async () => {
  const result = await handleFindMembers({ assignees: ['admin@bijli.org'] });
  return `Resolved assignees`;
});

// ===================================================================
// TASK TOOLS (5 tools)
// ===================================================================
console.log('\n═══ TASK TOOLS ═══\n');

if (!testData.listId) {
  skip('Task tools', 'No list available');
} else {
  // Test 1: Create task
  await test('manage_task - create', async () => {
    const result = await handleManageTask({
      action: 'create',
      listId: testData.listId,
      name: 'Test Task (Auto-created)',
      description: 'This is a test task created by automated testing'
    });

    // Extract task ID from result
    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testData.taskId = parsed.id;

    return `Created task ID: ${testData.taskId}`;
  });

  // Test 2: Search tasks
  await test('search_tasks - by list', async () => {
    const result = await handleSearchTasks({
      listId: testData.listId,
      limit: 5,
      detail_level: 'minimal'
    });
    return `Searched tasks in list`;
  });

  // Test 3: Update task
  if (testData.taskId) {
    await test('manage_task - update', async () => {
      const result = await handleManageTask({
        action: 'update',
        taskId: testData.taskId,
        description: 'Updated description - test successful'
      });
      return `Updated task ${testData.taskId}`;
    });
  } else {
    skip('manage_task - update', 'No task ID available');
  }

  // Test 4: Get task comments
  if (testData.taskId) {
    await test('task_comments - get', async () => {
      const result = await handleTaskComments({
        action: 'get',
        taskId: testData.taskId
      });
      return `Retrieved comments for task`;
    });
  } else {
    skip('task_comments - get', 'No task ID available');
  }

  // Test 5: Create comment
  if (testData.taskId) {
    await test('task_comments - create', async () => {
      const result = await handleTaskComments({
        action: 'create',
        taskId: testData.taskId,
        commentText: 'Test comment from automated testing'
      });
      return `Created comment on task`;
    });
  } else {
    skip('task_comments - create', 'No task ID available');
  }

  // Test 6: Time tracking - get entries
  if (testData.taskId) {
    await test('task_time_tracking - get_entries', async () => {
      const result = await handleTaskTimeTracking({
        action: 'get_entries',
        taskId: testData.taskId
      });
      return `Retrieved time entries`;
    });
  } else {
    skip('task_time_tracking - get_entries', 'No task ID available');
  }

  // Test 7: Delete task (cleanup)
  if (testData.taskId) {
    await test('manage_task - delete', async () => {
      const result = await handleManageTask({
        action: 'delete',
        taskId: testData.taskId
      });
      return `Deleted test task ${testData.taskId}`;
    });
  } else {
    skip('manage_task - delete', 'No task ID available');
  }
}

// ===================================================================
// CONTAINER TOOLS (2 tools)
// ===================================================================
console.log('\n═══ CONTAINER TOOLS ═══\n');

if (!testData.spaceId) {
  skip('Container tools', 'No space ID available');
} else {
  // Test 1: Create list
  let testListId = null;
  await test('manage_container - create list', async () => {
    const result = await handleManageContainer({
      type: 'list',
      action: 'create',
      spaceId: testData.spaceId,
      name: 'Test List (Auto-created)'
    });

    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testListId = parsed.id;

    return `Created list ID: ${testListId}`;
  });

  // Test 2: Get list
  if (testListId) {
    await test('get_container - get list', async () => {
      const result = await handleGetContainer({
        type: 'list',
        listId: testListId
      });
      return `Retrieved list ${testListId}`;
    });
  } else {
    skip('get_container - get list', 'No test list created');
  }

  // Test 3: Update list
  if (testListId) {
    await test('manage_container - update list', async () => {
      const result = await handleManageContainer({
        type: 'list',
        action: 'update',
        listId: testListId,
        name: 'Test List (Updated)'
      });
      return `Updated list ${testListId}`;
    });
  } else {
    skip('manage_container - update list', 'No test list created');
  }

  // Test 4: Delete list (cleanup)
  if (testListId) {
    await test('manage_container - delete list', async () => {
      const result = await handleManageContainer({
        type: 'list',
        action: 'delete',
        listId: testListId
      });
      return `Deleted test list ${testListId}`;
    });
  } else {
    skip('manage_container - delete list', 'No test list created');
  }
}

// ===================================================================
// TAG TOOLS (1 tool)
// ===================================================================
console.log('\n═══ TAG TOOLS ═══\n');

if (!testData.spaceId) {
  skip('Tag tools', 'No space ID available');
} else {
  // Test 1: List tags
  await test('manage_tags - list space tags', async () => {
    const result = await handleManageTags({
      scope: 'space',
      action: 'list',
      spaceId: testData.spaceId
    });
    return `Listed tags in space`;
  });

  // Test 2: Create tag
  testData.tagName = `test-tag-${Date.now()}`;
  await test('manage_tags - create tag', async () => {
    const result = await handleManageTags({
      scope: 'space',
      action: 'create',
      spaceId: testData.spaceId,
      tagName: testData.tagName,
      colorCommand: 'blue tag'
    });
    return `Created tag: ${testData.tagName}`;
  });

  // Test 3: Update tag
  if (testData.tagName) {
    await test('manage_tags - update tag', async () => {
      const result = await handleManageTags({
        scope: 'space',
        action: 'update',
        spaceId: testData.spaceId,
        tagName: testData.tagName,
        colorCommand: 'green tag'
      });
      return `Updated tag color`;
    });
  } else {
    skip('manage_tags - update tag', 'No tag created');
  }

  // Test 4: Delete tag (cleanup)
  if (testData.tagName) {
    await test('manage_tags - delete tag', async () => {
      const result = await handleManageTags({
        scope: 'space',
        action: 'delete',
        spaceId: testData.spaceId,
        tagName: testData.tagName
      });
      return `Deleted tag: ${testData.tagName}`;
    });
  } else {
    skip('manage_tags - delete tag', 'No tag created');
  }
}

// ===================================================================
// DOCUMENT TOOLS (3 tools) - If DOCUMENT_SUPPORT enabled
// ===================================================================
console.log('\n═══ DOCUMENT TOOLS ═══\n');

if (process.env.DOCUMENT_SUPPORT !== 'true') {
  skip('Document tools', 'DOCUMENT_SUPPORT not enabled');
} else if (!testData.listId) {
  skip('Document tools', 'No list ID available');
} else {
  // Test 1: Create document
  await test('manage_document - create', async () => {
    const result = await handleManageDocument({
      action: 'create',
      name: 'Test Document (Auto-created)',
      parent: { id: testData.listId, type: 6 },
      visibility: 'PUBLIC',
      create_page: true
    });

    const content = result.content[0].text;
    const parsed = JSON.parse(content);
    testData.documentId = parsed.id;

    return `Created document ID: ${testData.documentId}`;
  });

  // Test 2: Update document
  if (testData.documentId) {
    await test('manage_document - update', async () => {
      const result = await handleManageDocument({
        action: 'update',
        documentId: testData.documentId,
        name: 'Test Document (Updated)'
      });
      return `Updated document ${testData.documentId}`;
    });
  } else {
    skip('manage_document - update', 'No document created');
  }

  // Test 3: List documents
  await test('list_documents', async () => {
    const result = await handleListDocuments({
      parent_id: testData.listId,
      parent_type: 'LIST'
    });
    return `Listed documents`;
  });

  // Test 4: Create document page
  if (testData.documentId) {
    await test('manage_document_page - create', async () => {
      const result = await handleManageDocumentPage({
        action: 'create',
        documentId: testData.documentId,
        name: 'Test Page',
        content: 'This is test content'
      });
      return `Created page in document`;
    });
  } else {
    skip('manage_document_page - create', 'No document created');
  }

  // Test 5: List pages
  if (testData.documentId) {
    await test('manage_document_page - list', async () => {
      const result = await handleManageDocumentPage({
        action: 'list',
        documentId: testData.documentId
      });
      return `Listed pages in document`;
    });
  } else {
    skip('manage_document_page - list', 'No document created');
  }
}

// ===================================================================
// SUMMARY
// ===================================================================
console.log('\n' + '='.repeat(70));
console.log('FINAL TEST RESULTS');
console.log('='.repeat(70));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⏭️  Skipped: ${skipped}`);
console.log(`📊 Total: ${passed + failed + skipped}`);
console.log(`✨ Pass Rate: ${passed}/${passed + failed} (${Math.round(passed / (passed + failed) * 100)}%)`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed\n`);
  process.exit(1);
}
