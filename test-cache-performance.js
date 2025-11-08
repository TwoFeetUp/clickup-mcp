/**
 * Test workspace hierarchy cache performance
 * Should show dramatic improvement on second call
 */

import dotenv from 'dotenv';
dotenv.config();

import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';

console.log('🚀 Testing Workspace Hierarchy Cache Performance\n');
console.log('═'.repeat(70) + '\n');

// Test 1: Cold cache (first call)
console.log('Test 1: COLD CACHE (first call)');
console.log('─'.repeat(70));
const startTime1 = Date.now();

const result1 = await handleSearchTasks({
  listName: '20_LHT-Platform',
  detail_level: 'minimal',
  limit: 5
});

const duration1 = Date.now() - startTime1;
console.log(`✅ First call completed in ${duration1}ms (expected: ~3000ms)`);

if (result1.content && result1.content[0]) {
  const content = JSON.parse(result1.content[0].text);
  const tasks = content.data || content.items || [];
  console.log(`   Found ${tasks.length} tasks`);
}

console.log('\n' + '═'.repeat(70) + '\n');

// Test 2: Warm cache (second call within 15min)
console.log('Test 2: WARM CACHE (second call, should be <50ms)');
console.log('─'.repeat(70));
const startTime2 = Date.now();

const result2 = await handleSearchTasks({
  listName: '20_LHT-Platform',
  detail_level: 'minimal',
  limit: 5
});

const duration2 = Date.now() - startTime2;
console.log(`✅ Second call completed in ${duration2}ms (expected: <50ms)`);

if (result2.content && result2.content[0]) {
  const content = JSON.parse(result2.content[0].text);
  const tasks = content.data || content.items || [];
  console.log(`   Found ${tasks.length} tasks`);
}

console.log('\n' + '═'.repeat(70) + '\n');

// Test 3: Different list with same workspace (also should use cache)
console.log('Test 3: DIFFERENT LIST (should also use cache)');
console.log('─'.repeat(70));
const startTime3 = Date.now();

const result3 = await handleSearchTasks({
  listName: 'Scoping Lijst',
  detail_level: 'minimal',
  limit: 5
});

const duration3 = Date.now() - startTime3;
console.log(`✅ Third call completed in ${duration3}ms (expected: <50ms)`);

if (result3.content && result3.content[0]) {
  const content = JSON.parse(result3.content[0].text);
  const tasks = content.data || content.items || [];
  console.log(`   Found ${tasks.length} tasks`);
}

console.log('\n' + '═'.repeat(70) + '\n');

// Summary
console.log('📊 PERFORMANCE SUMMARY:\n');
console.log(`Cold cache:  ${duration1}ms`);
console.log(`Warm cache:  ${duration2}ms (${Math.round((1 - duration2/duration1) * 100)}% faster)`);
console.log(`Third call:  ${duration3}ms (${Math.round((1 - duration3/duration1) * 100)}% faster)`);

const avgCached = (duration2 + duration3) / 2;
console.log(`\n✨ Average cached speed: ${Math.round(avgCached)}ms`);
console.log(`✨ Speed improvement: ${Math.round((1 - avgCached/duration1) * 100)}%`);

console.log('\n' + '═'.repeat(70) + '\n');
