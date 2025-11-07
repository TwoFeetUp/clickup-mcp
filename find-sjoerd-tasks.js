/**
 * Find Sjoerd and their tasks - FAST VERSION
 * Uses workspace-level search instead of iterating through lists
 */

import dotenv from 'dotenv';
dotenv.config();

import { handleFindMembers } from './build/tools/member-tools.js';
import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';

console.log('🔍 Finding Sjoerd and their tasks\n');
console.log('═'.repeat(70) + '\n');

const startTime = Date.now();

// Step 1: Find Sjoerd
console.log('👥 STEP 1: Find Sjoerd\n');
const sjoerdResult = await handleFindMembers({ query: 'sjoer' });

if (!sjoerdResult.members || sjoerdResult.members.length === 0) {
  console.log('  ❌ No member found matching "sjoer"');
  process.exit(1);
}

const sjoerd = sjoerdResult.members[0];
console.log(`  ✅ Found: ${sjoerd.username} (${sjoerd.email}) - ID: ${sjoerd.id}`);

// Step 2: Find tasks assigned to Sjoerd using workspace-level search
console.log('\n═'.repeat(70));
console.log('\n📋 STEP 2: Find tasks assigned to Sjoerd\n');

const tasksResult = await handleSearchTasks({
  assignees: [sjoerd.id],
  detail_level: 'standard',
  limit: 100
});

// handleSearchTasks returns MCP-wrapped response
if (tasksResult.content && tasksResult.content[0]) {
  const tasksContent = JSON.parse(tasksResult.content[0].text);
  const tasks = tasksContent.data || tasksContent.items || [];

  if (tasks.length > 0) {
    console.log(`Found ${tasks.length} task(s) assigned to ${sjoerd.username}:\n`);

    // Group by list for better organization
    const tasksByList = {};
    tasks.forEach(task => {
      const listName = task.list?.name || 'Unknown List';
      if (!tasksByList[listName]) {
        tasksByList[listName] = [];
      }
      tasksByList[listName].push(task);
    });

    // Display tasks grouped by list
    Object.entries(tasksByList).forEach(([listName, listTasks]) => {
      console.log(`📁 ${listName}:`);
      listTasks.forEach(task => {
        const status = task.status?.status || task.status || 'N/A';
        const url = task.url || 'N/A';
        console.log(`  ✓ ${task.name}`);
        console.log(`    Status: ${status}`);
        console.log(`    URL: ${url}`);
      });
      console.log();
    });
  } else {
    console.log(`  ℹ️  No tasks currently assigned to ${sjoerd.username}`);
  }
} else {
  console.log('  ❌ No tasks found');
}

const totalTime = Date.now() - startTime;
console.log('═'.repeat(70));
console.log(`\n✨ Completed in ${totalTime}ms\n`);
