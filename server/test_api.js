// Test bout-en-bout de l'API (lit le log par offset, sans tronquer)
const B = process.env.BASE || 'http://localhost:8090';
const LOG = process.argv[2];
const fs = require('fs');

let logOffset = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function newTokens() {
  await sleep(120); // laisse le time de flush du log côté OS
  const txt = fs.readFileSync(LOG, 'utf-8');
  const chunk = txt.slice(logOffset);
  logOffset = txt.length;
  return [...chunk.matchAll(/token=([a-f0-9]+)/g)].map(m => m[1]);
}
async function j(p, b, tok, method) {
  const r = await fetch(B + p, {
    method: method || (b ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
    body: b ? JSON.stringify(b) : undefined,
  });
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}
(async () => {
  const log = [];
  const step = (name, res, ok) => {
    const line = `${ok ? 'PASS' : 'FAIL'} [${res.status}] ${name}`;
    log.push(line);
    console.log(line + (!ok ? '  <- ' + JSON.stringify(res.data)?.slice(0, 200) : ''));
  };

  // 1) alice (premier compte -> admin)
  let r = await j('/api/auth/request', { email: 'alice@test.com', name: 'Alice' });
  let toks = await newTokens();
  step('request alice', r, r.status === 200 && toks.length === 1);
  r = await j('/api/auth/verify', { token: toks[0] });
  step('verify alice', r, r.status === 200 && r.data.sessionToken);
  const aTok = r.data.sessionToken;

  // 2) état
  r = await j('/api/state', null, aTok);
  step('state (296 matchs, 4 sports)', r, r.status === 200 && r.data.matches.length === 296 && r.data.sports.length === 4);
  step('  alice admin', { status: 200, data: r.data.users[0].is_admin }, r.data.users.find(u => u.email === 'alice@test.com')?.is_admin === true);

  // 3) groupes
  r = await j('/api/groups', { name: 'Bande du foot', sport: 'football-m' }, aTok);
  step('create group football-m', r, r.status === 200 && r.data.group.code);
  const g1 = r.data.group;
  r = await j('/api/groups', { name: 'Basket filles', sport: 'basketball-f' }, aTok);
  step('create group basketball-f', r, r.status === 200 && r.data.group.sport === 'basketball-f');
  const g2 = r.data.group;
  r = await j('/api/groups', { name: 'X', sport: 'handball' }, aTok);
  step('create group sport invalide -> 400', r, r.status === 400);

  // 4) invitations
  r = await j('/api/groups/' + g1.id + '/invite', { emails: 'bob@test.com,carol@test.com' }, aTok);
  step('invite bob+carol (2 créées)', r, r.status === 200 && r.data.created === 2);

  // 5) bob se connecte + rejoint par code
  r = await j('/api/auth/request', { email: 'bob@test.com', name: 'Bob' });
  toks = await newTokens();
  step('request bob', r, r.status === 200 && toks.length === 1);
  r = await j('/api/auth/verify', { token: toks[0] });
  step('verify bob', r, r.status === 200);
  const bTok = r.data.sessionToken;
  r = await j('/api/groups/join', { code: g1.code }, bTok);
  step('bob rejoint group1 par code', r, r.status === 200 && r.data.group.id === g1.id);

  // 6) état scopé : alice ne voit QUE ses données. Détails de g1 via endpoint dédié.
  r = await j('/api/groups/' + g1.id + '/details', null, aTok);
  const g1m = r.data.members || [];
  step('group1: 2 membres (tous acceptés)', { status: 200, data: g1m.length + ' membres, ' + g1m.filter(m => m.status === 'accepted').length + ' acceptés' }, r.status === 200 && g1m.length === 2 && g1m.filter(m => m.status === 'accepted').length === 2);
  const bobInv = r.data.invitations.find(i => i.email === 'bob@test.com');
  step('invitation bob -> accepted (vue owner)', { status: 200, data: bobInv?.status }, bobInv?.status === 'accepted');
  const carolInv = r.data.invitations.find(i => i.email === 'carol@test.com');
  step('invitation carol -> pending (vue owner)', { status: 200, data: carolInv?.status }, carolInv?.status === 'pending');
  // carol n'est PAS membre de g1 -> ne voit rien (403 sur details)
  // (carol non connectée ici, donc on teste bob : membre -> 200 mais invitations vides)
  r = await j('/api/groups/' + g1.id + '/details', null, bTok);
  step('bob voit details mais pas les invitations', { status: 200, data: (r.data.invitations || []).length + ' invites' }, r.status === 200 && r.data.invitations.length === 0);
  // is_admin de bob : via l'état GLOBAL admin
  r = await j('/api/admin/state', null, aTok);
  step('bob est admin? non', { status: 200, data: r.data.users.find(u => u.email === 'bob@test.com')?.is_admin }, r.data.users.find(u => u.email === 'bob@test.com')?.is_admin === false);

  // 7) pronostics (on garde l'état sous le coude)
  const state = r.data;
  const fm = state.matches.find(m => m.sport === 'football-m' && m.status === 'finished' && m.home_score !== null);
  r = await j('/api/predictions', { group_id: g1.id, match_id: fm.id, predicted_winner: 'home', home_score: fm.home_score, away_score: fm.away_score }, aTok);
  step('pronostic alice (score exact)', r, r.status === 200 && r.data.prediction.home_score === fm.home_score);

  const bf = state.matches.find(m => m.sport === 'basketball-f' && m.status === 'finished');
  r = await j('/api/predictions', { group_id: g2.id, match_id: bf.id, predicted_winner: 'home' }, aTok);
  step('pronostic alice dans groupe basket-f', r, r.status === 200);

  // bob n'est PAS membre de g2 -> refusé
  r = await j('/api/predictions', { group_id: g2.id, match_id: bf.id, predicted_winner: 'home' }, bTok);
  step('bob non-membre g2 -> 403', r, r.status === 403);

  // 8) admin
  // nouveaux endpoints scopés
  r = await j('/api/groups/' + g1.id + '/predictions', null, bTok);
  step('pronostics groupe (vue membre)', r, r.status === 200 && Array.isArray(r.data.predictions) && r.data.predictions.length >= 1);
  r = await j('/api/leaderboard?groupId=' + g1.id, null, aTok);
  step('leaderboard g1', r, r.status === 200 && Array.isArray(r.data.rows) && r.data.rows.length === 2 && r.data.rows[0].total >= 10);
  r = await j('/api/admin/export', null, bTok);
  step('admin par bob -> 403', r, r.status === 403);
  r = await j('/api/admin/export', null, aTok);
  step('export admin (alice)', r, r.status === 200 && r.data.users.length === 2);
  const pr = await fetch(B + '/api/admin/matches/' + fm.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + aTok }, body: JSON.stringify({ home_score: 99 }) });
  const pd = await pr.json();
  step('admin modifie un score', { status: pr.status, data: pd.match?.home_score }, pr.status === 200 && pd.match.home_score === 99);

  // 9) logout
  r = await j('/api/auth/logout', {}, aTok);
  step('logout alice', r, r.status === 200);
  // state est maintenant public : 200 avec sessionUserId=null (vue anonyme)
  r = await j('/api/state', null, aTok);
  step('state après logout -> public (sessionUserId null)', r, r.status === 200 && r.data.sessionUserId === null);
  // mais /api/me exige toujours une session valide -> 401
  r = await j('/api/me', null, aTok);
  step('/api/me après logout -> 401', r, r.status === 401);

  console.log('\n' + log.join('\n'));
  const fails = log.filter(l => l.startsWith('FAIL')).length;
  console.log('\n' + (fails === 0 ? '✅ TOUS LES TESTS PASSENT' : '❌ ' + fails + ' échec(s)'));
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
