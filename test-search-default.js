/**
 * Test search_tasks default behavior
 * Tests that search_tasks works without requiring specific list/space IDs
 */

import dotenv from 'dotenv';
dotenv.config();

import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';

console.log('🔍 Testing search_tasks default behavior\n');
console.log('═'.repeat(70) + '\n');

const startTime = Date.now();

// Test 1: Completely empty search - should return recent workspace tasks
console.log('TEST 1: Empty search (no parameters)\n');
try {
  const result = await handleSearchTasks({
    limit: 5,
    detail_level: 'minimal'
  });

  if (result.content && result.content[0]) {
    const content = JSON.parse(result.content[0].text);
    const tasks = content.data || content.items || [];
    console.log(`✅ Found ${tasks.length} tasks:`);
    tasks.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.name} (${task.status?.status || task.status})`);
    });

    if (content.metadata?.note) {
      console.log(`\n📝 Note: ${content.metadata.note}`);
    }
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('\n' + '═'.repeat(70) + '\n');

// Test 2: Search with just a status filter
console.log('TEST 2: Search with single filter (status only)\n');
try {
  const result = await handleSearchTasks({
    statuses: ['in progress'],
    limit: 5,
    detail_level: 'minimal'
  });

  if (result.content && result.content[0]) {
    const content = JSON.parse(result.content[0].text);
    const tasks = content.data || content.items || [];
    console.log(`✅ Found ${tasks.length} "in progress" tasks:`);
    tasks.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.name}`);
    });
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

const totalTime = Date.now() - startTime;
console.log('\n' + '═'.repeat(70));
console.log(`\n✨ Tests completed in ${totalTime}ms\n`);
