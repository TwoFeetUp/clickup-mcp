import dotenv from 'dotenv';
dotenv.config();

import { handleFindMembers } from './build/tools/member-tools.js';
import { handleSearchTasks } from './build/tools/task/consolidated-handlers.js';
import { clickUpServices } from './build/services/shared.js';

console.log('Finding Sjoerd\'s tasks...\n');

// Find Sjoerd
const sjoerd = await handleFindMembers({ query: 'sjoer' });
if (!sjoerd.members || sjoerd.members.length === 0) {
  console.log('Sjoerd not found');
  process.exit(1);
}

const sjoerdId = sjoerd.members[0].id;
console.log(`Found: ${sjoerd.members[0].username} (ID: ${sjoerdId})\n`);

// Get spaces
const spaces = await clickUpServices.workspace.getSpaces();
console.log(`Searching ${spaces.length} spaces...\n`);

let totalTasks = 0;

// Just search the first space's first list as a quick test
if (spaces.length > 0 && spaces[0].id) {
  console.log(`Space: ${spaces[0].name}`);
  
  // Get lists for this space using folder service
  try {
    const folders = await clickUpServices.folder.getFoldersWithoutLists(spaces[0].id);
    console.log(`Found ${folders.length} folders in space`);
    
    for (const folder of folders.slice(0, 2)) {
      console.log(`\nFolder: ${folder.name}`);
      const lists = await clickUpServices.folder.getFolderWithLists(folder.id);
      
      if (lists.lists && lists.lists.length > 0) {
        for (const list of lists.lists.slice(0, 2)) {
          console.log(`  Searching list: ${list.name}...`);
          const result = await handleSearchTasks({
            listId: list.id,
            assignees: [sjoerdId],
            limit: 10
          });
          
          if (result.content && result.content[0]) {
            const data = JSON.parse(result.content[0].text);
            const tasks = data.data || data || [];
            if (tasks.length > 0) {
              console.log(`    ✓ Found ${tasks.length} task(s)`);
              tasks.forEach(t => console.log(`      - ${t.name}`));
              totalTasks += tasks.length;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

console.log(`\n✨ Total: ${totalTasks} task(s)\n`);
