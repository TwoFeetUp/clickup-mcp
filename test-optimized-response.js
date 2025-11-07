/**
 * Test optimized response format
 * Should show significant token reduction
 */

import dotenv from 'dotenv';
dotenv.config();

import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';

console.log('🔍 Testing Optimized Response Format\n');
console.log('═'.repeat(70) + '\n');

const startTime = Date.now();

// Test with the same list that gave 723 tokens before
const result = await handleSearchTasks({
  listName: '20_LHT-Platform',
  detail_level: 'standard',
  limit: 10
});

if (result.content && result.content[0]) {
  const responseText = result.content[0].text;
  const content = JSON.parse(responseText);

  console.log('📊 Response Analysis:\n');

  // Count tokens (rough estimate: ~4 chars per token)
  const tokens = Math.ceil(responseText.length / 4);
  const tasks = content.data || content.items || [];

  console.log(`Tasks found: ${tasks.length}`);
  console.log(`Response size: ${responseText.length} characters`);
  console.log(`Estimated tokens: ${tokens}`);
  console.log(`Tokens per task: ${Math.ceil(tokens / tasks.length)}`);

  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 Token Reduction:\n');
  console.log(`Before optimization: ~723 tokens (7 tasks = 103 tokens/task)`);
  console.log(`After optimization:  ~${tokens} tokens (${tasks.length} tasks = ${Math.ceil(tokens / tasks.length)} tokens/task)`);

  const reduction = Math.round((1 - tokens / 723) * 100);
  console.log(`\n✨ Reduction: ${reduction}%`);

  console.log('\n' + '═'.repeat(70));
  console.log('\n📝 Sample Task (first one):\n');
  console.log(JSON.stringify(tasks[0], null, 2));

  // Check for sponsor message
  if (result.content.length > 1) {
    console.log('\n⚠️  WARNING: Sponsor message still present!');
  } else {
    console.log('\n✅ Sponsor message removed successfully');
  }
}

const totalTime = Date.now() - startTime;
console.log('\n' + '═'.repeat(70));
console.log(`\n⏱️  Completed in ${totalTime}ms\n`);
