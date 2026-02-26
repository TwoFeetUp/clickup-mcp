/**
 * Token Usage Measurement Script
 *
 * Measures actual token counts for task responses at different detail levels
 * using Anthropic's token counting API to establish intelligent thresholds.
 *
 * Uses actual MCP tool calls to get real response data.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Count tokens using Anthropic's official API
 */
async function countTokens(content) {
  const response = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    }]
  });
  return response.input_tokens;
}

/**
 * Call MCP tool to fetch tasks
 */
async function callMCPTool(client, toolName, args) {
  const result = await client.callTool({
    name: toolName,
    arguments: args
  });

  return result;
}

/**
 * Measure tokens for a given task count and detail level
 */
async function measureTokensForTasks(client, taskCount, detailLevel) {
  console.log(`\n📊 Measuring ${taskCount} tasks at '${detailLevel}' detail level...`);

  try {
    // Call the MCP search_tasks tool
    // Add a date filter to ensure we get results (recent tasks from last 90 days)
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const result = await callMCPTool(client, 'search_tasks', {
      detail_level: detailLevel,
      limit: taskCount,
      date_updated_gt: ninetyDaysAgo.toString()
    });

    // The result.content contains the actual response
    if (!result.content || result.content.length === 0) {
      console.log('  ❌ No content in MCP response');
      return null;
    }

    // Get the text response
    const responseText = result.content.find(c => c.type === 'text')?.text;
    if (!responseText) {
      console.log('  ❌ No text in MCP response');
      return null;
    }

    // Parse it
    const parsed = JSON.parse(responseText);

    // Extract task count from metadata or count items
    const tasks = parsed.data || parsed.tasks || parsed.items || [];
    const actualTaskCount = Array.isArray(tasks) ? tasks.length : 0;

    console.log(`  📝 Got response with ${actualTaskCount} tasks`);

    if (actualTaskCount === 0) {
      console.log('  ❌ No tasks in response');
      return null;
    }

    // Count tokens for the ENTIRE MCP response (as it would be sent to LLM)
    const tokens = await countTokens(responseText);

    const tokensPerTask = (tokens / actualTaskCount).toFixed(1);

    console.log(`  ✅ ${actualTaskCount} tasks: ${tokens} tokens (${tokensPerTask} per task)`);

    return {
      taskCount: actualTaskCount,
      detailLevel,
      totalTokens: tokens,
      tokensPerTask: parseFloat(tokensPerTask),
      responseSize: responseText.length
    };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main measurement routine
 */
async function main() {
  console.log('='.repeat(70));
  console.log('TOKEN USAGE MEASUREMENT');
  console.log('Using Anthropic Messages Count Tokens API with MCP Tool Calls');
  console.log('='.repeat(70));

  // Start MCP client
  console.log('\n🔧 Starting MCP server...');
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
    name: 'token-measurement-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('✅ MCP server connected');

  const testCases = [
    // Small sets
    { count: 1, levels: ['minimal', 'standard', 'detailed'] },
    { count: 5, levels: ['minimal', 'standard', 'detailed'] },
    { count: 10, levels: ['minimal', 'standard', 'detailed'] },
    // Medium sets
    { count: 25, levels: ['minimal', 'standard', 'detailed'] },
    { count: 50, levels: ['minimal', 'standard', 'detailed'] },
    // Large sets
    { count: 100, levels: ['minimal', 'standard'] }
  ];

  const results = [];

  for (const testCase of testCases) {
    for (const level of testCase.levels) {
      const result = await measureTokensForTasks(client, testCase.count, level);
      if (result) {
        results.push(result);
      }
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  await client.close();
  console.log('\n✅ MCP server disconnected');

  // Analysis
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS: Token Thresholds for 10,000 Token Limit');
  console.log('='.repeat(70));

  if (results.length === 0) {
    console.log('\n❌ No results collected! Cannot calculate thresholds.');
    process.exit(1);
  }

  const TOKEN_LIMIT = 10000;

  // Group by detail level
  const byLevel = results.reduce((acc, r) => {
    if (!acc[r.detailLevel]) acc[r.detailLevel] = [];
    acc[r.detailLevel].push(r);
    return acc;
  }, {});

  for (const [level, levelResults] of Object.entries(byLevel)) {
    console.log(`\n📈 ${level.toUpperCase()} Detail Level:`);
    const avgTokensPerTask = levelResults.reduce((sum, r) => sum + r.tokensPerTask, 0) / levelResults.length;
    console.log(`  Average tokens per task: ${avgTokensPerTask.toFixed(1)}`);

    const maxTasks = Math.floor(TOKEN_LIMIT / avgTokensPerTask);
    console.log(`  Estimated max tasks for ${TOKEN_LIMIT} tokens: ~${maxTasks} tasks`);

    console.log(`  Measurements:`);
    levelResults.forEach(r => {
      const status = r.totalTokens <= TOKEN_LIMIT ? '✅' : '❌';
      console.log(`    ${status} ${r.taskCount} tasks = ${r.totalTokens} tokens (${r.tokensPerTask}/task)`);
    });
  }

  // Recommendations
  console.log('\n' + '='.repeat(70));
  console.log('RECOMMENDED THRESHOLDS');
  console.log('='.repeat(70));

  const detailedAvg = byLevel.detailed ?
    byLevel.detailed.reduce((sum, r) => sum + r.tokensPerTask, 0) / byLevel.detailed.length : null;
  const standardAvg = byLevel.standard ?
    byLevel.standard.reduce((sum, r) => sum + r.tokensPerTask, 0) / byLevel.standard.length : null;
  const minimalAvg = byLevel.minimal ?
    byLevel.minimal.reduce((sum, r) => sum + r.tokensPerTask, 0) / byLevel.minimal.length : null;

  if (!detailedAvg || !standardAvg || !minimalAvg) {
    console.log('\n❌ Missing data for some detail levels. Cannot calculate complete thresholds.');
    process.exit(1);
  }

  const detailedMax = Math.floor(TOKEN_LIMIT / detailedAvg);
  const standardMax = Math.floor(TOKEN_LIMIT / standardAvg);
  const minimalMax = Math.floor(TOKEN_LIMIT / minimalAvg);

  console.log(`
For 10,000 token limit (based on REAL MCP responses):

1. DETAILED level:
   - Use when: ≤ ${detailedMax} tasks
   - Avg ${detailedAvg.toFixed(1)} tokens/task

2. STANDARD level:
   - Use when: ${detailedMax + 1} - ${standardMax} tasks
   - Avg ${standardAvg.toFixed(1)} tokens/task

3. MINIMAL level:
   - Use when: > ${standardMax} tasks
   - Avg ${minimalAvg.toFixed(1)} tokens/task
   - Safe up to ~${minimalMax} tasks

Implementation for consolidated-handlers.ts:

const DETAILED_THRESHOLD = ${detailedMax};    // tasks
const STANDARD_THRESHOLD = ${standardMax};   // tasks
const TOKEN_LIMIT = ${TOKEN_LIMIT};       // tokens

Auto-downgrade logic:
- If task_count > STANDARD_THRESHOLD → minimal
- Else if task_count > DETAILED_THRESHOLD && detail_level == 'detailed' → standard
`);

  // Save results
  const fs = await import('fs');
  const reportPath = 'playground/token-measurement-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    tokenLimit: TOKEN_LIMIT,
    results,
    averages: {
      detailed: detailedAvg,
      standard: standardAvg,
      minimal: minimalAvg
    },
    thresholds: {
      detailed: detailedMax,
      standard: standardMax,
      minimal: minimalMax
    }
  }, null, 2));

  console.log(`\n📁 Full results saved to: ${reportPath}\n`);
}

main().catch(console.error);
