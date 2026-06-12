#!/usr/bin/env node

/**
 * Admin CLI - Manage users, groups, sync
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

async function connect() {
  if (!SUPABASE_KEY || SUPABASE_KEY === 'your-anon-key') {
    console.error('❌ Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('\n📋 Users list:');
  data.forEach(user => {
    const adminBadge = user.is_admin ? '👑' : '';
    console.log(`  ${user.id.substring(0, 8)}... | ${user.email} ${adminBadge}`);
  });
}

async function makeAdmin() {
  const email = await ask('\n📧 Enter user email: ');
  
  const { error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('email', email);
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`✅ User ${email} is now admin!`);
  }
  
  rl.close();
}

async function syncMatches() {
  console.log('\n🔄 Syncing matches...');
  
  // Re-import sync-matches.js
  const { execSync } = require('child_process');
  
  try {
    execSync('node scripts/sync-matches.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('Sync failed:', err.message);
  }
  
  rl.close();
}

// Main menu
async function main() {
  await connect();
  
  console.log('\n🔧 Admin CLI');
  console.log('1. List users');
  console.log('2. Make user admin');
  console.log('3. Sync matches');
  console.log('4. Exit\n');
  
  const choice = await ask('Select option: ');
  
  switch (choice) {
    case '1':
      await listUsers();
      break;
    case '2':
      await makeAdmin();
      break;
    case '3':
      await syncMatches();
      break;
    default:
      rl.close();
  }
}

main();
