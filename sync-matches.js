#!/usr/bin/env node

/**
 * Sync matches from FIFA API to Supabase
 * 
 * Usage: node sync-matches.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-anon-key';
const API_FIFA_KEY = process.env.API_FIFA_KEY; // Your FIFA API key

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetch matches from FIFA API (free tier)
 * Note: Free tier has 10 requests/day limit
 */
async function fetchMatchesFromFIFA() {
  // TODO: Replace with actual FIFA API endpoint
  // Example: https://api.sportmonks.com/v3/football/matches?live=1
  const apiEndpoint = 'https://api.sportmonks.com/v3/football/matches';
  
  try {
    const response = await fetch(`${apiEndpoint}?include=teams;scorers`, {
      headers: {
        'x-api-key': API_FIFA_KEY || 'demo-key'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform to our DB schema
    return data.data.map(match => ({
      external_id: match.id.toString(),
      home_team: match.teams.data[0]?.name || 'TBD',
      away_team: match.teams.data[1]?.name || 'TBD',
      home_score: match.scores?.home || null,
      away_score: match.scores?.away || null,
      status: match.status, // 'scheduled', 'live', 'finished'
      match_date: match.time.start,
      stage: getStage(match.round_name),
      group_name: match.group_name || null
    }));
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

/**
 * Determine match stage from round name
 */
function getStage(roundName) {
  const stages = {
    'Group Stage': 'group_stage',
    'Round of 16': 'round_of_16',
    'Quarter Final': 'quarter_final',
    'Semi Final': 'semi_final',
    'Final': 'final'
  };
  
  for (const [key, value] of Object.entries(stages)) {
    if (roundName?.includes(key)) return value;
  }
  
  return 'group_stage'; // Default
}

/**
 * Sync matches to Supabase
 */
async function syncMatches() {
  console.log('Fetching matches from FIFA API...');
  
  const matches = await fetchMatchesFromFIFA();
  
  if (matches.length === 0) {
    console.log('No new matches to sync');
    return;
  }

  // Upsert matches
  const { error } = await supabase
    .from('matches')
    .upsert(matches, {
      onConflict: 'external_id'
    })
    .select();

  if (error) {
    console.error('Error syncing matches:', error);
    return;
  }

  console.log(`Successfully synced ${matches.length} matches`);
}

// Run sync
syncMatches().catch(console.error);
