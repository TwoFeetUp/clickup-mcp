/**
 * Update SPDX headers in all source files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oldHeader = 'SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>';
const newHeader = 'SPDX-FileCopyrightText: © 2025 Sjoerd van Beuningen';

function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(oldHeader)) {
    const newContent = content.replace(oldHeader, newHeader);
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }

  return false;
}

function processDirectory(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'build') {
      count += processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (updateFile(fullPath)) {
        console.log(`Updated: ${fullPath}`);
        count++;
      }
    }
  }

  return count;
}

const srcDir = path.join(__dirname, 'src');
const count = processDirectory(srcDir);

console.log(`\n✅ Updated ${count} files`);
