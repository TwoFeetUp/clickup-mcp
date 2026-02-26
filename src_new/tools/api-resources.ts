/**
 * API Resources for Code Execution Pattern
 *
 * Exposes the /api directory structure as MCP resources
 * so agents can read function definitions and write code.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API directory is at project root
const API_DIR = path.join(__dirname, '../../api');

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findTypeScriptFiles(fullPath, baseDir));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.md'))) {
        // Convert to relative path from API dir
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath.replace(/\\/g, '/')); // Use forward slashes
      }
    }
  } catch (err) {
    // Directory doesn't exist yet, return empty
  }

  return files;
}

/**
 * Get all API resources
 */
export function getApiResources() {
  const files = findTypeScriptFiles(API_DIR);

  return files.map(file => ({
    uri: `clickup-api:///${file}`,
    mimeType: file.endsWith('.md') ? 'text/markdown' : 'text/typescript',
    name: `ClickUp API: ${file}`,
    description: `Code execution API file: ${file}`
  }));
}

/**
 * Read an API resource by URI
 */
export function readApiResource(uri: string): string {
  // Extract file path from URI (clickup-api:///path/to/file.ts)
  const filePath = uri.replace('clickup-api:///', '');
  const fullPath = path.join(API_DIR, filePath);

  // Security check: ensure path is within API directory
  const resolvedPath = path.resolve(fullPath);
  const resolvedApiDir = path.resolve(API_DIR);

  if (!resolvedPath.startsWith(resolvedApiDir)) {
    throw new Error('Invalid resource path');
  }

  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read resource: ${err.message}`);
  }
}
