/**
 * Test assignee_ids parameter
 */

import dotenv from 'dotenv';
dotenv.config();

import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';

console.log('Testing assignee_ids parameter\n');

const result = await handleSearchTasks({
  assignee_ids: [94722743],  // Sjoerd's ID
  detail_level: 'minimal',
  limit: 5
});

if (result.content && result.content[0]) {
  const content = JSON.parse(result.content[0].text);
  const tasks = content.data || content.items || [];

  console.log(`✅ Found ${tasks.length} tasks for assignee ID 94722743\n`);

  if (tasks.length > 0) {
    console.log('Sample task:');
    console.log(JSON.stringify(tasks[0], null, 2));
  }

  // Check response structure
  console.log('\n📊 Response metadata:');
  if (content.metadata) {
    console.log(`  Estimated tokens: ${content.metadata.estimatedTokens}`);
    console.log(`  Detail level: ${content.metadata.detailLevel}`);
  }
} else {
  console.log('❌ No response');
}
