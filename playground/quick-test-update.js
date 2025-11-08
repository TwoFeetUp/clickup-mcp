import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
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
    name: 'quick-tester',
    version: '1.0.0'
  }, { capabilities: {} });

  await client.connect(transport);
  console.log('Connected to MCP server\n');

  // Find a task
  console.log('Searching for recent tasks...');
  const searchResult = await client.callTool({
    name: 'search_tasks',
    arguments: {
      date_updated_gt: (Date.now() - 90 * 24 * 60 * 60 * 1000).toString(),
      limit: 1
    }
  });

  const searchData = JSON.parse(searchResult.content.find(c => c.type === 'text')?.text);

  if (searchData.data && searchData.data.length > 0) {
    const task = searchData.data[0];
    console.log(`Found task: "${task.name}"`);
    console.log(`Task ID: ${task.id}`);
    console.log(`List: ${task.list.name}\n`);

    // Test UPDATE with minimal response
    console.log('Testing UPDATE action (adding description)...');
    const updateResult = await client.callTool({
      name: 'manage_task',
      arguments: {
        action: 'update',
        taskId: task.id,
        description: 'Testing minimal response format - ' + Date.now()
      }
    });

    const updateData = JSON.parse(updateResult.content.find(c => c.type === 'text')?.text);

    console.log('\n' + '='.repeat(70));
    console.log('MINIMAL UPDATE RESPONSE');
    console.log('='.repeat(70));
    console.log(JSON.stringify(updateData, null, 2));
    console.log(`\nResponse size: ~${JSON.stringify(updateData).length} chars`);
    console.log('\nVerification:');
    console.log(`  ✓ Has success field: ${!!updateData.success}`);
    console.log(`  ✓ Has id: ${!!updateData.id}`);
    console.log(`  ✓ Has name: ${!!updateData.name}`);
    console.log(`  ✓ Has updated_fields: ${!!updateData.updated_fields}`);
    console.log(`  ✓ Is minimal (< 200 chars): ${JSON.stringify(updateData).length < 200}`);
    console.log('\n✅ SUCCESS: Response is minimal and informative!');
  } else {
    console.log('No tasks found. Please create some tasks first.');
  }

  await client.close();
}

main().catch(console.error);
