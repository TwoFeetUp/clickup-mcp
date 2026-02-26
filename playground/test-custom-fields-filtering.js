/**
 * Test Custom Fields Filtering
 *
 * Tests the new smart custom fields handling:
 * - Only keeps fields with values
 * - At minimal/standard: simplifies to {id, name, value}
 * - At detailed: keeps full structure for fields with values
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
    name: 'custom-fields-tester',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('✅ MCP server connected\n');

  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

  // Test at different detail levels
  for (const detailLevel of ['minimal', 'standard', 'detailed']) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing: ${detailLevel.toUpperCase()} detail level`);
    console.log('='.repeat(70));

    const result = await client.callTool({
      name: 'search_tasks',
      arguments: {
        detail_level: detailLevel,
        limit: 3,
        date_updated_gt: ninetyDaysAgo.toString()
      }
    });

    const responseText = result.content.find(c => c.type === 'text')?.text;
    const parsed = JSON.parse(responseText);
    const tasks = parsed.data || parsed.tasks || [];

    if (tasks.length > 0) {
      const task = tasks[0];
      console.log(`\nTask: ${task.name || task.id}`);
      console.log(`Custom fields:`, JSON.stringify(task.custom_fields, null, 2));

      // Calculate token savings
      const withCustomFields = JSON.stringify(task).length;
      const withoutCustomFields = JSON.stringify({ ...task, custom_fields: undefined }).length;
      const savings = ((1 - withCustomFields / withoutCustomFields) * 100).toFixed(1);

      console.log(`\nTask size: ${withCustomFields} chars`);
      if (task.custom_fields && Object.keys(task.custom_fields).length > 0) {
        console.log(`Custom fields: ${JSON.stringify(task.custom_fields).length} chars`);
      } else {
        console.log(`No custom fields with values`);
      }
    } else {
      console.log('No tasks found');
    }
  }

  await client.close();
  console.log('\n✅ Test complete');
}

main().catch(console.error);
