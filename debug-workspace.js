/**
 * Debug Workspace Structure
 * Investigate what's actually in the ClickUp workspace
 */

import dotenv from 'dotenv';
dotenv.config();

import { clickUpServices } from './build/services/shared.js';
import config from './build/config.js';

console.log('🔍 Debugging ClickUp Workspace Structure\n');
console.log(`Team ID: ${config.clickupTeamId}\n`);

try {
  // Get raw workspace data
  console.log('Fetching workspace data...\n');

  const { workspace: workspaceService } = clickUpServices;

  // Try to get teams/workspaces
  console.log('=== Attempting to get workspace/team info ===');
  const spaces = await workspaceService.getSpaces();
  console.log(`Spaces found: ${spaces.length}`);
  if (spaces.length > 0) {
    console.log('First space:', JSON.stringify(spaces[0], null, 2));
  }

} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
