/**
 * Test include_empty_custom_fields Parameter
 *
 * Tests the new configurable parameter that controls whether to include
 * custom fields without values in responses.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

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
    name: 'empty-fields-tester',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('✅ MCP server connected\n');

  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

  console.log('='.repeat(70));
  console.log('TEST 1: Default behavior (include_empty_custom_fields: false)');
  console.log('='.repeat(70));

  const result1 = await client.callTool({
    name: 'search_tasks',
    arguments: {
      detail_level: 'standard',
      limit: 1,
      date_updated_gt: ninetyDaysAgo.toString()
    }
  });

  const response1 = JSON.parse(result1.content.find(c => c.type === 'text')?.text);
  const task1 = response1.data[0];

  console.log(`\nTask: ${task1.name}`);
  console.log(`Custom fields count: ${task1.custom_fields?.length || 0}`);
  if (task1.custom_fields) {
    console.log('Custom fields:', JSON.stringify(task1.custom_fields, null, 2));
  }
  console.log(`Total chars: ${JSON.stringify(task1).length}`);

  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: With include_empty_custom_fields: true');
  console.log('='.repeat(70));

  const result2 = await client.callTool({
    name: 'search_tasks',
    arguments: {
      detail_level: 'standard',
      limit: 1,
      date_updated_gt: ninetyDaysAgo.toString(),
      include_empty_custom_fields: true
    }
  });

  const response2 = JSON.parse(result2.content.find(c => c.type === 'text')?.text);
  const task2 = response2.data[0];

  console.log(`\nTask: ${task2.name}`);
  console.log(`Custom fields count: ${task2.custom_fields?.length || 0}`);
  if (task2.custom_fields) {
    console.log('Custom fields:', JSON.stringify(task2.custom_fields, null, 2));
  }
  console.log(`Total chars: ${JSON.stringify(task2).length}`);

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));

  const count1 = task1.custom_fields?.length || 0;
  const count2 = task2.custom_fields?.length || 0;
  const chars1 = JSON.stringify(task1).length;
  const chars2 = JSON.stringify(task2).length;

  console.log(`\nDefault (false): ${count1} fields, ${chars1} chars`);
  console.log(`With flag (true): ${count2} fields, ${chars2} chars`);
  console.log(`Difference: +${count2 - count1} fields, +${chars2 - chars1} chars`);

  if (count2 > count1) {
    console.log(`\n✅ SUCCESS: Flag reveals ${count2 - count1} additional empty custom fields!`);

    // Show which fields are empty
    const fieldsWithValues = new Set(task1.custom_fields?.map(f => f.id) || []);
    const emptyFields = task2.custom_fields?.filter(f => !fieldsWithValues.has(f.id)) || [];

    console.log(`\nEmpty fields revealed:`);
    emptyFields.forEach(f => {
      console.log(`  - ${f.name} (${f.type})`);
    });
  } else {
    console.log(`\n⚠️  No difference - task may not have any empty custom fields`);
  }

  await client.close();
  console.log('\n✅ Test complete');
}

main().catch(console.error);
