// Store 100% local (localStorage) — aucun backend.
// Les données (comptes, groupes, matchs, pronostics) vivent dans le navigateur.

import { useSyncExternalStore } from 'react';
import type { Group, GroupMember, Invitation, Match, Prediction, UserProfile } from './types';

export interface DB {
  users: UserProfile[];
  sessionUserId: string | null;
  groups: Group[];
  members: GroupMember[];
  invitations: Invitation[];
  matches: Match[];
  predictions: Prediction[];
  seeded: boolean;
}

const KEY = 'wc2026-local-db-v1';
let db: DB = load();
const listeners = new Set<() => void>();

function emit() {
  db = { ...db };
  for (const l of listeners) l();
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && Array.isArray(parsed.users)) return parsed;
    }
  } catch {
    /* données corrompues -> reseed */
  }
  return seed();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* stockage plein : on continue en mémoire */
  }
}

function mutate(fn: (d: DB) => void) {
  const copy: DB = JSON.parse(JSON.stringify(db));
  fn(copy);
  db = copy;
  save();
  emit();
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- Seed : Coupe du Monde 2026 — résultats complets (source Wikipédia/FIFA) ----------
import { SEED_MATCHES } from '../data/matches';

function seed(): DB {
  return {
    users: [],
    sessionUserId: null,
    groups: [],
    members: [],
    invitations: [],
    matches: SEED_MATCHES.map((m) => ({ ...m })),
    predictions: [],
    seeded: true,
  };
}

// ---------- API ----------
export const api = {
  getState: () => db,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  currentUser(): UserProfile | null {
    return db.users.find((u) => u.id === db.sessionUserId) || null;
  },

  // Le 1er compte créé devient admin (mode local : tout est sur cet appareil)
  login(email: string, name?: string): UserProfile {
    const e = email.trim().toLowerCase();
    const existing = db.users.find((u) => u.email === e);
    if (existing) {
      mutate((d) => {
        d.sessionUserId = existing.id;
        if (name && !existing.name) existing.name = name;
      });
      return existing;
    }
    const isFirst = db.users.length === 0;
    const user: UserProfile = {
      id: uid(),
      email: e,
      name: name?.trim() || e.split('@')[0],
      is_admin: isFirst,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.users.push(user);
      d.sessionUserId = user.id;
    });
    return user;
  },

  logout() {
    mutate((d) => {
      d.sessionUserId = null;
    });
  },

  setAdmin(userId: string, isAdmin: boolean) {
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.is_admin = isAdmin;
    });
  },

  deleteUser(userId: string) {
    mutate((d) => {
      d.users = d.users.filter((u) => u.id !== userId);
      d.members = d.members.filter((m) => m.user_id !== userId);
      d.predictions = d.predictions.filter((p) => p.user_id !== userId);
      if (d.sessionUserId === userId) d.sessionUserId = null;
    });
  },

  createGroup(name: string, ownerId: string): Group {
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    const g: Group = {
      id: uid(),
      name: name.trim(),
      description: null,
      code,
      owner_id: ownerId,
      created_at: new Date().toISOString(),
    };
    mutate((d) => {
      d.groups.push(g);
      d.members.push({ user_id: ownerId, group_id: g.id, status: 'accepted', role: 'owner' });
    });
    return g;
  },

  joinGroup(code: string, userId: string): Group | null {
    const g = db.groups.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!g) return null;
    const existing = db.members.find((m) => m.group_id === g.id && m.user_id === userId);
    if (!existing) {
      mutate((d) => {
        d.members.push({ user_id: userId, group_id: g.id, status: 'accepted', role: g.owner_id === userId ? 'owner' : 'member' });
        // si une invitation email attendait ce membre, on la marque acceptée
        const inv = d.invitations.find((i) => i.group_id === g.id);
        if (inv) inv.status = 'accepted';
      });
    } else if (existing.status !== 'accepted') {
      mutate((d) => {
        const mem = d.members.find((m) => m.group_id === g.id && m.user_id === userId);
        if (mem) mem.status = 'accepted';
      });
    }
    return g;
  },

  leaveGroup(groupId: string, userId: string) {
    mutate((d) => {
      d.members = d.members.filter((m) => !(m.group_id === groupId && m.user_id === userId));
    });
  },

  inviteEmails(groupId: string, emails: string[], inviteeId?: string) {
    const lower = emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
    mutate((d) => {
      for (const email of lower) {
        const targetUser = d.users.find((u) => u.email === email);
        if (targetUser) {
          const exists = d.members.find((m) => m.group_id === groupId && m.user_id === targetUser.id);
          if (!exists) {
            d.members.push({ user_id: targetUser.id, group_id: groupId, status: targetUser.id === inviteeId ? 'accepted' : 'pending', role: 'member' });
          }
        } else {
          const exists = d.invitations.find((i) => i.group_id === groupId && i.email === email);
          if (!exists) d.invitations.push({ id: uid(), group_id: groupId, email, status: 'pending' });
        }
      }
    });
  },

  removeMember(groupId: string, userId: string) {
    mutate((d) => {
      d.members = d.members.filter((m) => !(m.group_id === groupId && m.user_id === userId));
    });
  },

  deleteGroup(groupId: string) {
    mutate((d) => {
      d.groups = d.groups.filter((g) => g.id !== groupId);
      d.members = d.members.filter((m) => m.group_id !== groupId);
      d.invitations = d.invitations.filter((i) => i.group_id !== groupId);
      const matchIds = d.matches.map((m) => m.id);
      d.predictions = d.predictions.filter((p) => !matchIds.includes(p.match_id) || true);
    });
  },

  addMatch(data: Omit<Match, 'id'>) {
    mutate((d) => d.matches.push({ id: uid(), ...data }));
  },

  updateMatch(id: string, patch: Partial<Match>) {
    mutate((d) => {
      const m = d.matches.find((x) => x.id === id);
      if (m) Object.assign(m, patch);
    });
  },

  deleteMatch(id: string) {
    mutate((d) => {
      d.matches = d.matches.filter((m) => m.id !== id);
      d.predictions = d.predictions.filter((p) => p.match_id !== id);
    });
  },

  upsertPrediction(p: Omit<Prediction, 'id'>) {
    mutate((d) => {
      const existing = d.predictions.find((x) => x.user_id === p.user_id && x.match_id === p.match_id);
      if (existing) {
        existing.predicted_winner = p.predicted_winner;
        existing.home_score = p.home_score;
        existing.away_score = p.away_score;
      } else {
        d.predictions.push({ id: uid(), ...p });
      }
    });
  },

  exportJSON(): string {
    return JSON.stringify(db, null, 2);
  },

  importJSON(json: string) {
    const parsed = JSON.parse(json) as DB;
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.matches)) {
      throw new Error('Fichier invalide');
    }
    db = parsed;
    save();
    emit();
  },

  resetAll() {
    db = seed();
    save();
    emit();
  },
};

export function useDB(): DB {
  return useSyncExternalStore(api.subscribe, api.getState);
}

export function useCurrentUser(): UserProfile | null {
  const db = useDB();
  return db.users.find((u) => u.id === db.sessionUserId) || null;
}
