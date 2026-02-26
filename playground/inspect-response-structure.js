/**
 * Inspect Response Structure
 *
 * Examines the actual structure of task responses at different detail levels
 * to identify optimization opportunities (repetitive data, excessive nesting, etc.)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function main() {
  console.log('Starting MCP server...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js'],
    env: {
      ...process.env,
      CLICKUP_API_KEY: process.env.CLICKUP_API_KEY,
      CLICKUP_TEAM_ID: process.env.CLICKUP_TEAM_ID
    }
  });

  const client = new Client({
    name: 'structure-inspector',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('MCP server connected\n');

  // Fetch 5 tasks at detailed level
  console.log('Fetching 5 tasks at DETAILED level...');
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const result = await client.callTool({
    name: 'search_tasks',
    arguments: {
      detail_level: 'detailed',
      limit: 5,
      date_updated_gt: ninetyDaysAgo.toString()
    }
  });

  const responseText = result.content.find(c => c.type === 'text')?.text;
  const parsed = JSON.parse(responseText);

  // Save full response
  fs.writeFileSync('playground/sample-detailed-response.json', JSON.stringify(parsed, null, 2));
  console.log('✅ Saved full response to: playground/sample-detailed-response.json\n');

  // Analyze structure
  const tasks = parsed.data || parsed.tasks || [];
  if (tasks.length === 0) {
    console.log('No tasks found');
    await client.close();
    return;
  }

  console.log(`📊 Analyzing ${tasks.length} tasks...\n`);

  // Get first task to analyze structure
  const sampleTask = tasks[0];

  console.log('='.repeat(70));
  console.log('STRUCTURE ANALYSIS - SINGLE TASK');
  console.log('='.repeat(70));

  // Analyze top-level fields
  const fieldSizes = {};
  const fieldTypes = {};

  for (const [key, value] of Object.entries(sampleTask)) {
    const valueStr = JSON.stringify(value);
    fieldSizes[key] = valueStr.length;
    fieldTypes[key] = Array.isArray(value) ? 'array' : typeof value;
  }

  // Sort by size
  const sortedFields = Object.entries(fieldSizes).sort((a, b) => b[1] - a[1]);

  console.log('\nFIELD SIZES (characters in JSON):');
  sortedFields.forEach(([field, size]) => {
    const type = fieldTypes[field];
    const percent = ((size / JSON.stringify(sampleTask).length) * 100).toFixed(1);
    console.log(`  ${field.padEnd(20)} ${size.toString().padStart(6)} chars  ${percent.padStart(5)}%  (${type})`);
  });

  // Check for repetitive data across tasks
  console.log('\n' + '='.repeat(70));
  console.log('REPETITIVE DATA ANALYSIS');
  console.log('='.repeat(70));

  // Analyze which fields are the same across all tasks
  const sharedFields = {};

  for (const key of Object.keys(tasks[0])) {
    const values = tasks.map(t => JSON.stringify(t[key]));
    const uniqueValues = new Set(values);

    if (uniqueValues.size === 1) {
      sharedFields[key] = {
        value: values[0],
        size: values[0].length
      };
    }
  }

  console.log('\nFIELDS WITH IDENTICAL VALUES ACROSS ALL TASKS:');
  if (Object.keys(sharedFields).length === 0) {
    console.log('  None - good! No repetitive data.');
  } else {
    for (const [field, info] of Object.entries(sharedFields)) {
      const totalWasted = info.size * (tasks.length - 1);
      console.log(`  ${field}: ${totalWasted} wasted chars (${info.size} × ${tasks.length - 1} tasks)`);
    }
  }

  // Analyze arrays
  console.log('\n' + '='.repeat(70));
  console.log('ARRAY FIELD ANALYSIS');
  console.log('='.repeat(70));

  for (const [key, value] of Object.entries(sampleTask)) {
    if (Array.isArray(value) && value.length > 0) {
      console.log(`\n${key} (${value.length} items):`);

      // Check if array items have repetitive structure
      if (typeof value[0] === 'object') {
        const firstItem = value[0];
        const itemKeys = Object.keys(firstItem);
        console.log(`  Each item has ${itemKeys.length} fields: ${itemKeys.join(', ')}`);

        // Check for common fields across array items
        const itemFieldSizes = {};
        for (const k of itemKeys) {
          itemFieldSizes[k] = JSON.stringify(firstItem[k]).length;
        }

        const sortedItemFields = Object.entries(itemFieldSizes).sort((a, b) => b[1] - a[1]);
        console.log(`  Field sizes per item:`);
        sortedItemFields.forEach(([f, s]) => {
          console.log(`    ${f}: ${s} chars`);
        });
      }
    }
  }

  // Optimization suggestions
  console.log('\n' + '='.repeat(70));
  console.log('OPTIMIZATION OPPORTUNITIES');
  console.log('='.repeat(70));

  console.log(`
1. LARGEST FIELDS (potential for reduction):
${sortedFields.slice(0, 5).map(([field, size], i) =>
  `   ${i + 1}. ${field}: ${size} chars (${((size / JSON.stringify(sampleTask).length) * 100).toFixed(1)}%)`
).join('\n')}

2. NORMALIZATION OPPORTUNITIES:
   - Check if arrays contain repetitive structures that could be normalized
   - Look for deeply nested objects that could be flattened
   - Identify fields that could be shortened or removed at certain detail levels

3. RESPONSE STRUCTURE:
   Total size: ${JSON.stringify(parsed).length} characters
   Per task: ~${Math.round(JSON.stringify(parsed).length / tasks.length)} characters
   Metadata overhead: ${JSON.stringify(parsed.metadata || {}).length} characters

Run 'cat playground/sample-detailed-response.json' to see full structure.
`);

  await client.close();
}

main().catch(console.error);
