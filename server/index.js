// ============================================================
//  Pronos Multi-Sports — serveur (auto-hébergé)
//  Node.js + Express + SQLite (node:sqlite) + Nodemailer
//  Lancement :  node index.js
//  Config via variables d'environnement (voir .env.example)
// ============================================================
'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');

// ----------------------------- .env (léger, sans dépendance) -----------------------------
{
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith('#')) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ----------------------------- Config -----------------------------
const PORT = process.env.PORT || 8080;
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const SEEDS_PATH = process.env.SEEDS_PATH || path.join(__dirname, 'seeds.json');
const SESSION_DAYS = 30;
const LOGIN_TTL_MS = 60 * 60 * 1000; // 1 h pour les liens magiques

// SMTP (facultatif : sans config, les liens sont loggués en console)
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'pronos@localhost';

// ----------------------------- SQLite -----------------------------
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, code TEXT UNIQUE,
    sport TEXT NOT NULL, owner_id TEXT NOT NULL, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS members (
    group_id TEXT NOT NULL, user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted', role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (group_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, match_id TEXT NOT NULL,
    predicted_winner TEXT, home_score INTEGER, away_score INTEGER,
    UNIQUE (user_id, match_id)
  );
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY, external_id TEXT, sport TEXT NOT NULL,
    home_team TEXT, away_team TEXT,
    home_score INTEGER, away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    match_date TEXT, stage TEXT, group_name TEXT, pen_score TEXT, aet INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS login_tokens (
    token TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL
  );
`);

const SEEDS = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
const SPORTS = Object.keys(SEEDS); // ['football-m','football-f','basketball-m','basketball-f']

// ---- Seed des matchs (une seule fois, si la table est vide) ----
{
  const c = db.prepare('SELECT COUNT(*) c FROM matches').get().c;
  if (c === 0) {
    db.exec('BEGIN');
    const ins = db.prepare('INSERT INTO matches (id, external_id, sport, home_team, away_team, home_score, away_score, status, match_date, stage, group_name, pen_score, aet) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const s of SPORTS) {
      for (const m of SEEDS[s].matches) {
        ins.run(m.id, m.external_id, s, m.home_team, m.away_team, m.home_score, m.away_score, m.status, m.match_date, m.stage, m.group_name, m.pen_score, m.aet ? 1 : 0);
      }
    }
    db.exec('COMMIT');
    console.log('🌱 Seed des matchs :', SPORTS.reduce((a, s) => a + SEEDS[s].matches.length, 0), 'matchs');
  }
}

const mStmt = {
  all: db.prepare('SELECT * FROM matches'),
  bySport: db.prepare('SELECT * FROM matches WHERE sport = ?'),
  byId: db.prepare('SELECT * FROM matches WHERE id = ?'),
  insert: db.prepare('INSERT INTO matches (id, external_id, sport, home_team, away_team, home_score, away_score, status, match_date, stage, group_name, pen_score, aet) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
  update: db.prepare('UPDATE matches SET home_score = COALESCE(?, home_score), away_score = COALESCE(?, away_score), status = COALESCE(?, status), stage = COALESCE(?, stage), group_name = COALESCE(?, group_name), match_date = COALESCE(?, match_date), aet = COALESCE(?, aet), pen_score = COALESCE(?, pen_score) WHERE id = ?'),
  delete: db.prepare('DELETE FROM matches WHERE id = ?'),
};
const sMatch = (m) => ({ id: m.id, external_id: m.external_id, sport: m.sport, home_team: m.home_team, away_team: m.away_team, home_score: m.home_score, away_score: m.away_score, status: m.status, match_date: m.match_date, stage: m.stage, group_name: m.group_name, pen_score: m.pen_score, aet: !!m.aet });
const matchesForSport = (sport) => mStmt.bySport.all(sport).map(sMatch);

// ----------------------------- Helpers -----------------------------
const uid = () => crypto.randomBytes(16).toString('hex');
const token = () => crypto.randomBytes(24).toString('hex');
const now = () => Date.now();
const code6 = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[crypto.randomInt(a.length)]).join('');
};

const stmt = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (id, email, name, is_admin, created_at) VALUES (?,?,?,?,?)'),
  updateUser: db.prepare('UPDATE users SET name = COALESCE(?, name), is_admin = COALESCE(?, is_admin) WHERE id = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  countUsers: db.prepare('SELECT COUNT(*) c FROM users'),

  insertGroup: db.prepare('INSERT INTO groups (id, name, description, code, sport, owner_id, created_at) VALUES (?,?,?,?,?,?,?)'),
  groupById: db.prepare('SELECT * FROM groups WHERE id = ?'),
  groupByCode: db.prepare('SELECT * FROM groups WHERE code = ?'),
  deleteGroup: db.prepare('DELETE FROM groups WHERE id = ?'),
  allGroups: db.prepare('SELECT * FROM groups'),

  insertMember: db.prepare('INSERT OR REPLACE INTO members (group_id, user_id, status, role) VALUES (?,?,?,?)'),
  deleteMember: db.prepare('DELETE FROM members WHERE group_id = ? AND user_id = ?'),
  membersOf: db.prepare('SELECT * FROM members WHERE group_id = ?'),
  myMembers: db.prepare('SELECT * FROM members WHERE user_id = ?'),
  allMembers: db.prepare('SELECT * FROM members'),
  isMember: db.prepare('SELECT * FROM members WHERE group_id = ? AND user_id = ?'),

  insertInvite: db.prepare('INSERT INTO invitations (id, group_id, email, status) VALUES (?,?,?,?)'),
  updateInvite: db.prepare('UPDATE invitations SET status = ? WHERE id = ? AND email = ?'),
  allInvites: db.prepare('SELECT * FROM invitations'),
  deleteInvite: db.prepare('DELETE FROM invitations WHERE id = ?'),
  inviteByEmailGroup: db.prepare('SELECT * FROM invitations WHERE email = ? AND group_id = ?'),
  invitesByGroup: db.prepare('SELECT * FROM invitations WHERE group_id = ?'),
  invitesByEmail: db.prepare('SELECT * FROM invitations WHERE email = ?'),

  upsertPred: db.prepare(`INSERT INTO predictions (id, user_id, match_id, predicted_winner, home_score, away_score)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(user_id, match_id) DO UPDATE SET
      predicted_winner = excluded.predicted_winner,
      home_score = excluded.home_score, away_score = excluded.away_score`),
  predById: db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?'),
  predsByUser: db.prepare('SELECT * FROM predictions WHERE user_id = ?'),
  allPreds: db.prepare('SELECT * FROM predictions'),

  insertLogin: db.prepare('INSERT INTO login_tokens (token, email, expires_at, used) VALUES (?,?,?,0)'),
  loginByToken: db.prepare('SELECT * FROM login_tokens WHERE token = ?'),
  markLoginUsed: db.prepare('UPDATE login_tokens SET used = 1 WHERE token = ?'),
  purgeLogins: db.prepare('DELETE FROM login_tokens WHERE expires_at < ? OR used = 1'),

  insertSession: db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)'),
  sessionByToken: db.prepare('SELECT * FROM sessions WHERE token = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
};

// nettoyage périodique
setInterval(() => {
  stmt.purgeLogins.run(now());
  stmt.purgeSessions.run(now());
}, 30 * 60 * 1000).unref();

// ----------------------------- Mail -----------------------------
let transporter = null;
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}
async function sendMail(to, subject, html, text) {
  if (transporter) {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html, text });
  } else {
    console.log('\n📧 [DEV - SMTP non configuré] Email qui serait envoyé à ' + to);
    console.log('   ' + subject);
    if (text) console.log(text.split('\n').map((l) => '   ' + l).join('\n'));
  }
}

// ----------------------------- Auth middleware -----------------------------
function authUser(req, res, next) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) return res.status(401).json({ error: 'Non authentifié' });
  const s = stmt.sessionByToken.get(tok);
  if (!s || s.expires_at < now()) return res.status(401).json({ error: 'Session expirée' });
  const u = stmt.userById.get(s.user_id);
  if (!u) return res.status(401).json({ error: 'Utilisateur inexistant' });
  req.user = u; req.sessionToken = tok;
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Accès administrateur requis' });
  next();
}
// Auth optionnelle : renvoie l'utilisateur si un token valide est fourni, sinon undefined.
function resolveUser(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) return undefined;
  const s = stmt.sessionByToken.get(tok);
  if (!s || s.expires_at < now()) return undefined;
  return stmt.userById.get(s.user_id);
}

// ----------------------------- Serializers -----------------------------
const sUser = (u) => ({ id: u.id, email: u.email, name: u.name || null, is_admin: !!u.is_admin, created_at: u.created_at });
const sGroup = (g) => ({ id: g.id, name: g.name, description: g.description || null, code: g.code, sport: g.sport, owner_id: g.owner_id, created_at: g.created_at });
const sMember = (m) => ({ group_id: m.group_id, user_id: m.user_id, status: m.status, role: m.role });
const sInvite = (i) => ({ id: i.id, group_id: i.group_id, email: i.email, status: i.status });
const sPred = (p) => ({ id: p.id, user_id: p.user_id, match_id: p.match_id, predicted_winner: p.predicted_winner || null, home_score: p.home_score === null ? null : p.home_score, away_score: p.away_score === null ? null : p.away_score });
const matchesFor = (sport) => SEEDS[sport] ? SEEDS[sport].matches : [];

// Données publiques (toute personne, connecté ou non)
function publicState() {
  return {
    users: [],
    sessionUserId: null,
    groups: [],
    members: [],
    invitations: [],
    predictions: [],
    matches: mStmt.all.all().map(sMatch),
    sports: SPORTS.map((s) => ({ id: s, label: SEEDS[s].label, sport: SEEDS[s].sport, gender: SEEDS[s].gender, tournament: SEEDS[s].tournament, count: matchesForSport(s).length })),
    seeded: true,
  };
}

// État pour un utilisateur : seulement CE QU'IL EST EN DROIT DE VOIR
// (ses groupes, leurs membres, ses invitations, ses pronostics, + matchs/sports)
function fullState(user) {
  if (!user) return publicState();
  const myMembers = stmt.myMembers.all(user.id);
  const groupIds = myMembers.map((m) => m.group_id);
  const groups = groupIds.map((id) => stmt.groupById.get(id)).filter(Boolean);
  const members = myMembers; // tout ce qui concerne l'utilisateur
  const invitations = groupIds.flatMap((gid) => stmt.invitesByGroup.all(gid)).concat(
    stmt.invitesByEmail.all(user.email)
  );
  const predictions = stmt.predsByUser.all(user.id);
  const userObjs = [...new Set([user.id, ...members.map((m) => m.user_id)])].map((id) => stmt.userById.get(id)).filter(Boolean);
  return {
    users: userObjs.map(sUser),
    sessionUserId: user.id,
    groups: groups.map(sGroup),
    members: members.map(sMember),
    invitations: [...new Map(invitations.map((i) => [i.id, i])).values()].map(sInvite),
    predictions: predictions.map(sPred),
    matches: mStmt.all.all().map(sMatch),
    sports: SPORTS.map((s) => ({ id: s, label: SEEDS[s].label, sport: SEEDS[s].sport, gender: SEEDS[s].gender, tournament: SEEDS[s].tournament, count: matchesForSport(s).length })),
    seeded: true,
  };
}

// Export admin (tout) — uniquement derrière requireAdmin
function fullStateAll() {
  return {
    users: db.prepare('SELECT * FROM users').all().map(sUser),
    sessionUserId: null,
    groups: stmt.allGroups.all().map(sGroup),
    members: stmt.allMembers.all().map(sMember),
    invitations: stmt.allInvites.all().map(sInvite),
    predictions: stmt.allPreds.all().map(sPred),
    matches: mStmt.all.all().map(sMatch),
    sports: SPORTS.map((s) => ({ id: s, label: SEEDS[s].label, sport: SEEDS[s].sport, gender: SEEDS[s].gender, tournament: SEEDS[s].tournament, count: matchesForSport(s).length })),
    seeded: true,
  };
}

// ----------------------------- App -----------------------------
const app = express();
app.use(express.json());
app.disable('x-powered-by');

// CORS (front GitHub Pages -> back auto-hébergé). En prod : CORS_ORIGIN=https://votre-domaine
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : null;
  if (origin && (!allowed || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Auth ---
app.post('/api/auth/request', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Adresse email invalide' });

    let user = stmt.userByEmail.get(email);
    if (!user) {
      const isFirst = stmt.countUsers.get().c === 0;
      const id = uid();
      stmt.insertUser.run(id, email, name || email.split('@')[0], isFirst ? 1 : 0, new Date().toISOString());
      user = stmt.userByEmail.get(email);
    } else if (name && !user.name) {
      stmt.updateUser.run(name, null, user.id);
      user = stmt.userById.get(user.id);
    }

    const tok = token();
    stmt.insertLogin.run(tok, email, now() + LOGIN_TTL_MS);
    const link = APP_URL + '/auth/verify?token=' + tok;
    const sportNote = 'Football (H/F) et Basketball (H/F)';
    await sendMail(email, 'Votre lien de connexion — Pronos Multi-Sports',
      `<p>Bonjour${user.name ? ' ' + user.name : ''},</p>
       <p>Cliquez sur le bouton pour accéder à votre espace de pronostics.</p>
       <p style="margin:24px 0"><a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Ouvrir mon espace</a></p>
       <p>Ou copiez ce lien (valable 1 heure) :</p>
       <p style="word-break:break-all;color:#666">${link}</p>
       <p style="color:#888;font-size:12px">Si ce n'est pas vous, ignorez cet email.</p>`,
      `Votre lien de connexion (valable 1h) :\n${link}`);
    res.json({ ok: true, message: 'Lien envoyé. Vérifiez votre boîte mail.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de l’envoi' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const tok = String(req.body.token || '');
  const lt = stmt.loginByToken.get(tok);
  if (!lt || lt.used || lt.expires_at < now()) return res.status(400).json({ error: 'Lien invalide ou expiré. Demandez un nouveau lien.' });
  const user = stmt.userByEmail.get(lt.email);
  if (!user) return res.status(400).json({ error: 'Utilisateur introuvable' });
  stmt.markLoginUsed.run(tok);
  const stoken = token();
  stmt.insertSession.run(stoken, user.id, now() + SESSION_DAYS * 86400000);
  res.json({ user: sUser(user), sessionToken: stoken });
});

app.get('/api/auth/verify', (req, res) => {
  // GET pour ouvrir le lien dans le navigateur -> renvoi vers le front avec token
  const tok = req.query.token || '';
  res.redirect(APP_URL + '/auth/verify?token=' + encodeURIComponent(tok));
});

app.get('/api/me', authUser, (req, res) => res.json({ user: sUser(req.user) }));
app.post('/api/auth/logout', authUser, (req, res) => { stmt.deleteSession.run(req.sessionToken); res.json({ ok: true }); });

// --- État ---
// state/matches sont publics : ce sont les données de tournoi (lecture seule).
// Les groupes/pronostics admin restent derrière authUser.
app.get('/api/state', (req, res) => {
  const user = resolveUser(req);
  res.json(fullState(user));
});
app.get('/api/matches', (req, res) => {
  const sport = req.query.sport;
  res.json(sport ? matchesForSport(sport) : mStmt.all.all().map(sMatch));
});

// --- Groupes ---
app.post('/api/groups', authUser, (req, res) => {
  const name = String(req.body.name || '').trim();
  const sport = String(req.body.sport || '');
  const description = String(req.body.description || '').trim() || null;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  if (!SEEDS[sport]) return res.status(400).json({ error: 'Sport invalide' });
  const id = uid(); let gcode;
  do { gcode = code6(); } while (stmt.groupByCode.get(gcode));
  stmt.insertGroup.run(id, name, description, gcode, sport, req.user.id, new Date().toISOString());
  stmt.insertMember.run(id, req.user.id, 'accepted', 'owner');
  res.json({ group: sGroup(stmt.groupById.get(id)) });
});

app.post('/api/groups/join', authUser, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const g = stmt.groupByCode.get(code);
  if (!g) return res.status(404).json({ error: 'Aucun groupe avec ce code' });
  const existing = stmt.isMember.get(g.id, req.user.id);
  if (existing) {
    if (existing.status !== 'accepted') stmt.insertMember.run(g.id, req.user.id, 'accepted', existing.role);
    return res.json({ group: sGroup(g), already: true });
  }
  stmt.insertMember.run(g.id, req.user.id, 'accepted', 'member');
  // marque l'invitation email comme acceptée si elle existe
  const inv = stmt.inviteByEmailGroup.get(req.user.email, g.id);
  if (inv) stmt.updateInvite.run('accepted', inv.id, req.user.email);
  res.json({ group: sGroup(g) });
});

app.post('/api/groups/:id/leave', authUser, (req, res) => {
  const m = stmt.isMember.get(req.params.id, req.user.id);
  if (!m) return res.status(404).json({ error: 'Membre introuvable' });
  if (m.role === 'owner') return res.status(400).json({ error: 'Le propriétaire ne peut pas quitter (supprimez le groupe)' });
  stmt.deleteMember.run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/groups/:id/invite', authUser, async (req, res) => {
  const g = stmt.groupById.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupe introuvable' });
  const m = stmt.isMember.get(g.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Vous n’êtes pas membre' });
  const emails = String(req.body.emails || '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
  let created = 0;
  for (const email of emails) {
    const target = stmt.userByEmail.get(email);
    if (target) {
      if (!stmt.isMember.get(g.id, target.id)) {
        stmt.insertMember.run(g.id, target.id, 'pending', 'member');
        created++;
      }
    } else if (!stmt.inviteByEmailGroup.get(email, g.id)) {
      stmt.insertInvite.run(uid(), g.id, email, 'pending');
      created++;
    }
  }
  // envoi des emails (un par adresse inconnue)
  for (const email of emails) {
    if (stmt.userByEmail.get(email)) continue; // déjà compte -> membre pending
    const joinUrl = APP_URL + '/login?invite=' + encodeURIComponent(g.code) + '&email=' + encodeURIComponent(email);
    await sendMail(email, `Invitation au groupe « ${g.name} » — Pronos ${SEEDS[g.sport].label}`,
      `<p>Bonjour,</p>
       <p>Vous êtes invité(e) dans le groupe <b>${g.name}</b> (${SEEDS[g.sport].label}).</p>
       <p style="margin:16px 0"><a href="${joinUrl}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Créer mon compte &amp; rejoindre</a></p>
       <p>Code du groupe : <b style="font-family:monospace">${g.code}</b></p>
       <p style="color:#888;font-size:12px">Le lien vous demandera votre email (pré-rempli), un lien de connexion sera envoyé, puis le groupe se rejoint automatiquement.</p>`,
      `Vous êtes invité au groupe « ${g.name} » (${SEEDS[g.sport].tournament}).\nCode : ${g.code}\nCréez votre compte via le lien, puis rejoignez le groupe.`);
  }
  res.json({ ok: true, created });
});

app.post('/api/members/:groupId/remove', authUser, (req, res) => {
  const m = stmt.isMember.get(req.params.groupId, req.user.id);
  if (!m || m.role !== 'owner') return res.status(403).json({ error: 'Réservé au propriétaire' });
  const target = req.body.userId;
  const tm = stmt.isMember.get(req.params.groupId, target);
  if (tm && tm.role === 'owner') return res.status(400).json({ error: 'Impossible de retirer le propriétaire' });
  stmt.deleteMember.run(req.params.groupId, target);
  res.json({ ok: true });
});

app.post('/api/members/:groupId/respond', authUser, (req, res) => {
  const m = stmt.isMember.get(req.params.groupId, req.user.id);
  if (!m) return res.status(404).json({ error: 'Invitation introuvable' });
  const status = req.body.status === 'rejected' ? 'rejected' : 'accepted';
  const inv = stmt.inviteByEmailGroup.get(req.user.email, req.params.groupId);
  if (status === 'rejected') {
    stmt.deleteMember.run(req.params.groupId, req.user.id);
    if (inv) stmt.updateInvite.run('rejected', inv.id, req.user.email);
  } else {
    stmt.insertMember.run(req.params.groupId, req.user.id, 'accepted', m.role);
    if (inv) stmt.updateInvite.run('accepted', inv.id, req.user.email);
  }
  res.json({ ok: true, status });
});

// --- Pronostics ---
app.post('/api/predictions', authUser, (req, res) => {
  const match_id = String(req.body.match_id || '');
  const match = mStmt.byId.get(match_id);
  if (!match) return res.status(404).json({ error: 'Match inconnu' });
  const g = db.prepare('SELECT id FROM groups WHERE id = ?').get(req.body.group_id || '');
  if (!g) return res.status(404).json({ error: 'Groupe requis' });
  const isMember = stmt.isMember.get(req.body.group_id, req.user.id);
  if (!isMember || isMember.status !== 'accepted') return res.status(403).json({ error: 'Vous devez être membre accepté de ce groupe' });
  const hs = req.body.home_score === null || req.body.home_score === undefined || req.body.home_score === '' ? null : Number(req.body.home_score);
  const as_ = req.body.away_score === null || req.body.away_score === undefined || req.body.away_score === '' ? null : Number(req.body.away_score);
  stmt.upsertPred.run(uid(), req.user.id, match_id, req.body.predicted_winner || null, hs, as_);
  res.json({ ok: true, prediction: sPred(stmt.predById.get(req.user.id, match_id)) });
});

// --- Admin ---
app.put('/api/admin/users/:id', authUser, requireAdmin, (req, res) => {
  const isAdmin = req.body.is_admin ? 1 : 0;
  stmt.updateUser.run(req.body.name || null, isAdmin, req.params.id);
  res.json({ user: sUser(stmt.userById.get(req.params.id)) });
});
app.delete('/api/admin/users/:id', authUser, requireAdmin, (req, res) => {
  const id = req.params.id;
  if (id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM members WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM predictions WHERE user_id = ?').run(id);
    stmt.deleteUser.run(id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'Erreur' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/groups/:id', authUser, requireAdmin, (req, res) => {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM members WHERE group_id = ?').run(req.params.id);
    db.prepare('DELETE FROM invitations WHERE group_id = ?').run(req.params.id);
    stmt.deleteGroup.run(req.params.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'Erreur' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/invitations/:id', authUser, requireAdmin, (req, res) => {
  stmt.deleteInvite.run(req.params.id); res.json({ ok: true });
});

// --- Matchs (admin) ---
app.post('/api/admin/matches', authUser, requireAdmin, (req, res) => {
  const b = req.body;
  const id = uid();
  mStmt.insert.run(id, b.external_id || 'manual_' + Date.now(), b.sport || 'football-m',
    b.home_team, b.away_team, b.home_score ?? null, b.away_score ?? null,
    b.status || 'scheduled', b.match_date || null, b.stage || 'group_stage', b.group_name || null, b.pen_score || null, b.aet ? 1 : 0);
  res.json({ match: sMatch(mStmt.byId.get(id)) });
});
app.patch('/api/admin/matches/:id', authUser, requireAdmin, (req, res) => {
  const m = mStmt.byId.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Match introuvable' });
  const b = req.body;
  mStmt.update.run(
    b.home_score !== undefined ? b.home_score : null,
    b.away_score !== undefined ? b.away_score : null,
    b.status !== undefined ? b.status : null,
    b.stage !== undefined ? b.stage : null,
    b.group_name !== undefined ? b.group_name : null,
    b.match_date !== undefined ? b.match_date : null,
    b.aet !== undefined ? (b.aet ? 1 : 0) : null,
    b.pen_score !== undefined ? b.pen_score : null,
    req.params.id
  );
  res.json({ match: sMatch(mStmt.byId.get(req.params.id)) });
});
app.delete('/api/admin/matches/:id', authUser, requireAdmin, (req, res) => {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM predictions WHERE match_id = ?').run(req.params.id);
    mStmt.delete.run(req.params.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'Erreur' }); }
  res.json({ ok: true });
});
app.post('/api/admin/reset', authUser, requireAdmin, (req, res) => {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM members').run();
    db.prepare('DELETE FROM invitations').run();
    db.prepare('DELETE FROM predictions').run();
    db.prepare('DELETE FROM groups').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM matches').run();
    // reseed matches
    const ins = db.prepare('INSERT INTO matches (id, external_id, sport, home_team, away_team, home_score, away_score, status, match_date, stage, group_name, pen_score, aet) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const s of SPORTS) for (const m of SEEDS[s].matches) ins.run(m.id, m.external_id, s, m.home_team, m.away_team, m.home_score, m.away_score, m.status, m.match_date, m.stage, m.group_name, m.pen_score, m.aet ? 1 : 0);
    // recrée l'admin actuel
    stmt.insertUser.run(req.user.id, req.user.email, req.user.name, 1, new Date().toISOString());
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'Erreur' }); }
  res.json({ ok: true });
});

// export / état global (admin) — l'export JSON de la page admin a besoin de TOUT
app.get('/api/admin/state', authUser, requireAdmin, (req, res) => res.json(fullStateAll()));
app.get('/api/admin/export', authUser, requireAdmin, (req, res) => res.json(fullStateAll()));

// --- Détails d'un groupe (membres, users, invitations si owner) ---
app.get('/api/groups/:id/details', authUser, (req, res) => {
  const g = stmt.groupById.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupe introuvable' });
  const m = stmt.isMember.get(g.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce groupe' });
  const members = stmt.membersOf.all(g.id);
  const users = [...new Set(members.map((x) => x.user_id))].map((id) => stmt.userById.get(id)).filter(Boolean);
  const invitations = m.role === 'owner' ? stmt.invitesByGroup.all(g.id) : [];
  res.json({ group: sGroup(g), members: members.map(sMember), users: users.map(sUser), invitations: invitations.map(sInvite) });
});

// --- Pronostics des membres acceptés d'un groupe ---
app.get('/api/groups/:id/predictions', authUser, (req, res) => {
  const g = stmt.groupById.get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Groupe introuvable' });
  const m = stmt.isMember.get(g.id, req.user.id);
  if (!m || m.status !== 'accepted') return res.status(403).json({ error: 'Vous devez être membre accepté de ce groupe' });
  const matchIds = new Set(matchesForSport(g.sport).map((x) => x.id));
  const accepted = stmt.membersOf.all(g.id).filter((x) => x.status === 'accepted');
  const preds = accepted
    .flatMap((x) => stmt.predsByUser.all(x.user_id))
    .filter((p) => matchIds.has(p.match_id));
  const users = [...new Set(accepted.map((x) => x.user_id))].map((id) => stmt.userById.get(id)).filter(Boolean);
  res.json({ predictions: preds.map(sPred), users: users.map(sUser) });
});

// --- Classement d'un groupe (calculé côté serveur, même barème que le front) ---
app.get('/api/leaderboard', authUser, (req, res) => {
  const gid = String(req.query.groupId || '');
  const g = stmt.groupById.get(gid);
  if (!g) return res.status(404).json({ error: 'Groupe introuvable' });
  const m = stmt.isMember.get(gid, req.user.id);
  if (!m || m.status !== 'accepted') return res.status(403).json({ error: 'Vous devez être membre accepté de ce groupe' });
  const matchIds = new Set(matchesForSport(g.sport).map((x) => x.id));
  const rows = stmt.membersOf.all(gid)
    .filter((x) => x.status === 'accepted')
    .map((mem) => {
      const u = stmt.userById.get(mem.user_id);
      if (!u) return null;
      const preds = stmt.predsByUser.all(mem.user_id).filter((p) => matchIds.has(p.match_id));
      let total = 0, correct = 0, exact = 0;
      for (const p of preds) {
        const mt = mStmt.byId.get(p.match_id);
        if (!mt || mt.status !== 'finished' || mt.home_score === null || mt.away_score === null) continue;
        const winner = mt.home_score > mt.away_score ? 'home' : mt.home_score < mt.away_score ? 'away' : 'draw';
        let pts = 0;
        if (p.predicted_winner === winner) pts += 5;
        const exactHit = p.home_score !== null && p.home_score === mt.home_score && p.away_score === mt.away_score;
        if (exactHit) pts += 5;
        if (!pts) continue;
        if (mt.stage === 'final') pts *= 2;
        total += pts;
        correct++;
        if (exactHit) exact++;
      }
      return { user: sUser(u), total, correct, exact, played: preds.length };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);
  res.json({ rows });
});

// ----------------------------- Lancement -----------------------------
app.get('/api/health', (req, res) => res.json({ ok: true, sports: SPORTS, time: new Date().toISOString() }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); });

app.listen(PORT, () => {
  console.log('\n🏆 Pronos Multi-Sports — serveur démarré');
  console.log('   Port   :', PORT);
  console.log('   DB     :', DB_PATH);
  console.log('   Sports :', SPORTS.map((s) => `${s} (${matchesFor(s).length} matchs)`).join(', '));
  console.log('   SMTP   :', SMTP_HOST ? SMTP_HOST : 'NON CONFIGURÉ (liens loggués en console)');
  console.log('   APP_URL:', APP_URL);
});
