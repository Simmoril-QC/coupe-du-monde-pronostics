#!/usr/bin/env node

/**
 * Synchronisation manuelle des résultats de matchs vers Supabase.
 *
 * Sans SPORTMONKS_API_KEY : le script ne fait que vérifier les secrets et
 * s'arrête (les matchs sont gérés depuis l'UI /admin).
 * Avec SPORTMONKS_API_KEY : récupère les matchs de la phase de poules et
 * upsert dans la table `matches` (clé d'identification : external_id).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_KEY = process.env.SPORTMONKS_API_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants. Configurez les secrets GitHub.');
  process.exit(1);
}

if (!API_KEY) {
  console.log('Pas de SPORTMONKS_API_KEY : synchronisation API désactivée. Les matchs sont gérés via l\'admin du site.');
  process.exit(0);
}

async function main() {
  const { default: createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Sportmonks : matchs de la Coupe du Monde (ligue 1 = FIFA WC)
  const res = await fetch(
    'https://v3.football.api-sports.io/fixtures?league=1&season=2026&current=false',
    { headers: { 'x-apisports-key': API_KEY } }
  );
  if (!res.ok) {
    console.error('API error:', res.status, await res.text());
    process.exit(1);
  }
  const body = await res.json();
  const fixtures = (body.response || []).slice(0, 10); // free tier: 100 credits/day

  const rows = fixtures.map((f) => ({
    external_id: 'sm_' + f.fixture.id,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_score: f.goals.home ?? null,
    away_score: f.goals.away ?? null,
    status:
      f.fixture.status.short === 'FT'
        ? 'finished'
        : f.fixture.status.short === 'NS'
        ? 'scheduled'
        : 'live',
    match_date: f.fixture.date,
    stage: guessStage(f.round?.name || ''),
    group_name: f.fixture.group || null,
  }));

  const { error } = await supabase.from('matches').upsert(rows, { onConflict: 'external_id' });
  if (error) {
    console.error('Upsert error:', error.message);
    process.exit(1);
  }
  console.log(`Sync OK : ${rows.length} matchs mis à jour.`);
}

function guessStage(roundName) {
  const n = roundName.toLowerCase();
  if (n.includes('final')) return 'final';
  if (n.includes('semi')) return 'semi_final';
  if (n.includes('quarter')) return 'quarter_final';
  if (n.includes('16')) return 'round_of_16';
  return 'group_stage';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
