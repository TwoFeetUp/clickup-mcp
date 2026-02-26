/**
 * Direct Member Tool Testing
 *
 * Tests the consolidated find_members tool directly without MCP protocol layer.
 * This allows rapid iteration and performance profiling.
 *
 * Usage: node playground/member-tool-test.js
 */

import { handleFindMembers } from '../src/tools/member-tools.js';

// Colors for output
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m'
};

function log(prefix, message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${colors.gray}[${timestamp}]${colors.reset} ${prefix} ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

function logTest(name) {
    console.log(`\n${colors.cyan}=== ${name} ===${colors.reset}`);
}

function logResult(label, data) {
    console.log(`${colors.green}${label}${colors.reset}`);
    console.log(JSON.stringify(data, null, 2));
}

function logError(label, error) {
    console.log(`${colors.red}${label}${colors.reset}`);
    console.log(`${colors.red}${error}${colors.reset}`);
}

async function runTests() {
    console.log(`${colors.cyan}Member Tool Direct Testing${colors.reset}`);
    console.log('Testing consolidated find_members tool\n');

    try {
        // ===== TEST 1: List all members with minimal detail =====
        logTest('TEST 1: List all workspace members (minimal)');
        console.log('Parameters: detail_level="minimal"');

        const startTime1 = performance.now();
        const result1 = await handleFindMembers({
            detail_level: 'minimal'
        });
        const duration1 = (performance.now() - startTime1).toFixed(2);

        logResult(`Result (${duration1}ms):`, {
            type: result1.type,
            count: result1.count,
            cacheHit: result1.cacheHit,
            summary: result1.summary,
            sampleMembers: result1.members?.slice(0, 2)
        });

        // ===== TEST 2: List all members with standard detail =====
        logTest('TEST 2: List all workspace members (standard)');
        console.log('Parameters: detail_level="standard"');

        const startTime2 = performance.now();
        const result2 = await handleFindMembers({
            detail_level: 'standard'
        });
        const duration2 = (performance.now() - startTime2).toFixed(2);

        logResult(`Result (${duration2}ms):`, {
            type: result2.type,
            count: result2.count,
            cacheHit: result2.cacheHit,
            summary: result2.summary,
            sampleMembers: result2.members?.slice(0, 2)
        });

        // ===== TEST 3: List all members with detailed info =====
        logTest('TEST 3: List all workspace members (detailed)');
        console.log('Parameters: detail_level="detailed"');

        const startTime3 = performance.now();
        const result3 = await handleFindMembers({
            detail_level: 'detailed'
        });
        const duration3 = (performance.now() - startTime3).toFixed(2);

        logResult(`Result (${duration3}ms):`, {
            type: result3.type,
            count: result3.count,
            cacheHit: result3.cacheHit,
            summary: result3.summary,
            sampleMembers: result3.members?.slice(0, 1)
        });

        // ===== TEST 4: Search by email =====
        logTest('TEST 4: Search member by email');
        console.log('Parameters: query="example@company.com", detail_level="standard"');

        const startTime4 = performance.now();
        const result4 = await handleFindMembers({
            query: 'example@company.com',
            detail_level: 'standard'
        });
        const duration4 = (performance.now() - startTime4).toFixed(2);

        logResult(`Result (${duration4}ms):`, {
            type: result4.type,
            count: result4.count,
            summary: result4.summary,
            members: result4.members
        });

        // ===== TEST 5: Search by partial name =====
        logTest('TEST 5: Search members by partial name');
        console.log('Parameters: query="john", detail_level="minimal"');

        const startTime5 = performance.now();
        const result5 = await handleFindMembers({
            query: 'john',
            detail_level: 'minimal'
        });
        const duration5 = (performance.now() - startTime5).toFixed(2);

        logResult(`Result (${duration5}ms):`, {
            type: result5.type,
            count: result5.count,
            summary: result5.summary,
            members: result5.members?.slice(0, 3)
        });

        // ===== TEST 6: Resolve assignees (batch) =====
        logTest('TEST 6: Resolve assignees (batch operation)');
        console.log('Parameters: assignees=["john@company.com", "jane.doe", "unknown@test.com"]');

        const startTime6 = performance.now();
        const result6 = await handleFindMembers({
            assignees: ['john@company.com', 'jane.doe', 'unknown@test.com'],
            detail_level: 'minimal'
        });
        const duration6 = (performance.now() - startTime6).toFixed(2);

        logResult(`Result (${duration6}ms):`, {
            type: result6.type,
            count: result6.count,
            summary: result6.summary,
            resolutions: result6.resolutions
        });

        // ===== TEST 7: Cache performance =====
        logTest('TEST 7: Cache performance (second call)');
        console.log('Parameters: Same as TEST 1');

        const startTime7 = performance.now();
        const result7 = await handleFindMembers({
            detail_level: 'minimal'
        });
        const duration7 = (performance.now() - startTime7).toFixed(2);

        logResult(`Result (${duration7}ms):`, {
            type: result7.type,
            count: result7.count,
            cacheHit: result7.cacheHit,
            summary: result7.summary,
            performance: `Cache hit was ${(duration1 / duration7).toFixed(1)}x faster`
        });

        // ===== TEST 8: No parameters (default list) =====
        logTest('TEST 8: No parameters provided (default behavior)');
        console.log('Parameters: {}');

        const startTime8 = performance.now();
        const result8 = await handleFindMembers({});
        const duration8 = (performance.now() - startTime8).toFixed(2);

        logResult(`Result (${duration8}ms):`, {
            type: result8.type,
            count: result8.count,
            summary: result8.summary
        });

        // ===== TEST 9: Query with detail level options =====
        logTest('TEST 9: Search with different detail levels');

        const queries = [
            { query: 'test', detail_level: 'minimal' },
            { query: 'test', detail_level: 'standard' },
            { query: 'test', detail_level: 'detailed' }
        ];

        for (const params of queries) {
            const start = performance.now();
            const result = await handleFindMembers(params);
            const duration = (performance.now() - start).toFixed(2);

            console.log(`  ${colors.yellow}detail_level="${params.detail_level}"${colors.reset} (${duration}ms): ${result.summary}`);
        }

        // ===== PERFORMANCE SUMMARY =====
        console.log(`\n${colors.cyan}=== Performance Summary ===${colors.reset}`);
        console.log(`${colors.green}First call (uncached):${colors.reset} ${duration1}ms`);
        console.log(`${colors.green}Cached call:${colors.reset} ${duration7}ms`);
        console.log(`${colors.green}Speed improvement:${colors.reset} ${(duration1 / duration7).toFixed(1)}x faster`);
        console.log(`${colors.green}Cache enabled:${colors.reset} ${result7.cacheHit ? 'YES' : 'NO'}`);

    } catch (error) {
        logError('ERROR:', error instanceof Error ? error.message : String(error));
        console.error(error);
    }
}

// Run tests
await runTests();
