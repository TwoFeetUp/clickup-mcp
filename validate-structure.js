/**
 * Structure Validation Script
 *
 * Tests that all consolidated tools are properly structured
 * WITHOUT making any ClickUp API calls
 *
 * Run with: node validate-structure.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Validating Consolidated Tools Structure...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

// Test 1: Check if build directory exists
test('Build directory exists', () => {
  const buildDir = join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory not found. Run: npm run build');
  }
});

// Test 2: Check consolidated tool files exist
test('Consolidated task tools file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'task', 'consolidated-tools.js');
  if (!fs.existsSync(file)) {
    throw new Error('consolidated-tools.js not found in build');
  }
});

test('Consolidated task handlers file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'task', 'consolidated-handlers.js');
  if (!fs.existsSync(file)) {
    throw new Error('consolidated-handlers.js not found in build');
  }
});

test('Container tools file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'container-tools.js');
  if (!fs.existsSync(file)) {
    throw new Error('container-tools.js not found in build');
  }
});

test('Member tools file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'member-tools.js');
  if (!fs.existsSync(file)) {
    throw new Error('member-tools.js not found in build');
  }
});

test('Tag tools file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'tag-tools.js');
  if (!fs.existsSync(file)) {
    throw new Error('tag-tools.js not found in build');
  }
});

test('Document tools file exists', () => {
  const file = join(__dirname, 'build', 'tools', 'document-tools.js');
  if (!fs.existsSync(file)) {
    throw new Error('document-tools.js not found in build');
  }
});

// Test 3: Check utility files
test('Response formatter exists', () => {
  const file = join(__dirname, 'build', 'utils', 'response-formatter.js');
  if (!fs.existsSync(file)) {
    throw new Error('response-formatter.js not found in build');
  }
});

test('Cache service exists', () => {
  const file = join(__dirname, 'build', 'utils', 'cache-service.js');
  if (!fs.existsSync(file)) {
    throw new Error('cache-service.js not found in build');
  }
});

// Test 4: Check server.ts was built
test('Server file exists', () => {
  const file = join(__dirname, 'build', 'server.js');
  if (!fs.existsSync(file)) {
    throw new Error('server.js not found in build');
  }
});

// Test 5: Try importing (without executing)
test('Can import consolidated task tools', async () => {
  const module = await import('./build/tools/task/consolidated-tools.js');
  if (!module.consolidatedTaskTools) {
    throw new Error('consolidatedTaskTools export not found');
  }
  if (!Array.isArray(module.consolidatedTaskTools)) {
    throw new Error('consolidatedTaskTools is not an array');
  }
  console.log(`   Found ${module.consolidatedTaskTools.length} task tools`);
});

test('Can import container tools', async () => {
  const module = await import('./build/tools/container-tools.js');
  if (!module.containerTools) {
    throw new Error('containerTools export not found');
  }
  if (!Array.isArray(module.containerTools)) {
    throw new Error('containerTools is not an array');
  }
  console.log(`   Found ${module.containerTools.length} container tools`);
});

test('Can import member tools', async () => {
  const module = await import('./build/tools/member-tools.js');
  if (!module.findMembersTool) {
    throw new Error('findMembersTool export not found');
  }
  console.log(`   Member tool found`);
});

test('Can import tag tools', async () => {
  const module = await import('./build/tools/tag-tools.js');
  if (!module.manageTagsTool) {
    throw new Error('manageTagsTool export not found');
  }
  console.log(`   Tag tool found`);
});

test('Can import document tools', async () => {
  const module = await import('./build/tools/document-tools.js');
  if (!module.documentToolDefinitions) {
    throw new Error('documentToolDefinitions export not found');
  }
  if (!Array.isArray(module.documentToolDefinitions)) {
    throw new Error('documentToolDefinitions is not an array');
  }
  console.log(`   Found ${module.documentToolDefinitions.length} document tools`);
});

test('Can import response formatter', async () => {
  const module = await import('./build/utils/response-formatter.js');
  if (!module.formatResponse) {
    throw new Error('formatResponse function not found');
  }
  if (!module.formatNormalizedResponse) {
    throw new Error('formatNormalizedResponse function not found');
  }
  console.log(`   Response formatter functions found`);
});

test('Can import cache service', async () => {
  const module = await import('./build/utils/cache-service.js');
  if (!module.CacheService) {
    throw new Error('CacheService class not found');
  }
  if (!module.workspaceCache) {
    throw new Error('workspaceCache singleton not found');
  }
  console.log(`   Cache service found`);
});

// Test 6: Validate tool schemas
test('Task tools have valid schemas', async () => {
  const module = await import('./build/tools/task/consolidated-tools.js');
  for (const tool of module.consolidatedTaskTools) {
    if (!tool.definition) throw new Error('Tool missing definition');
    if (!tool.definition.name) throw new Error('Tool missing name');
    if (!tool.definition.description) throw new Error('Tool missing description');
    if (!tool.definition.inputSchema) throw new Error('Tool missing inputSchema');
    if (!tool.handler) throw new Error('Tool missing handler');
  }
});

test('Container tools have valid schemas', async () => {
  const module = await import('./build/tools/container-tools.js');
  for (const tool of module.containerTools) {
    if (!tool.definition) throw new Error('Tool missing definition');
    if (!tool.definition.name) throw new Error('Tool missing name');
    if (!tool.handler) throw new Error('Tool missing handler');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✅ All structural validation tests passed!');
  console.log('\nNext steps:');
  console.log('1. Review SAFE_TESTING_PLAN.md');
  console.log('2. Create a test space in ClickUp');
  console.log('3. Start with read-only operations');
  console.log('4. Test write operations in test space only\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Fix issues before deploying.\n');
  process.exit(1);
}
