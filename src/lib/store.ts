// Client API — parle au serveur Node (Express + SQLite).
// Retourne la même shape de données que l'ancien store local,
// donc les pages React restent quasi identiques.
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
  sports: { id: string; label: string; sport: string; gender: string; tournament: string; count: number }[];
  seeded: boolean;
}

const EMPTY: DB = { users: [], sessionUserId: null, groups: [], members: [], invitations: [], matches: [], predictions: [], sports: [], seeded: false };

const TOKEN_KEY = 'wc2026-session';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// Base URL de l'API :
//  - dev (proxy Vite) : '' -> /api
//  - prod (GitHub Pages) : VITE_API_URL=https://votre-serveur
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function http<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const tok = getToken();
  const res = await fetch(BASE + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* pas de corps */ }
  if (!res.ok) throw new Error((data && data.error) || 'Erreur serveur (' + res.status + ')');
  return data as T;
}

let db: DB = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

export const api = {
  getState: () => db,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  async refresh(): Promise<DB> {
    db = await http<DB>('/api/state');
    loaded = true;
    emit();
    return db;
  },
  isLoaded: () => loaded,

  // ---- Auth (magic link) ----
  async request(email: string, name?: string) {
    return http<{ ok: boolean; message: string }>('/api/auth/request', { body: { email, name } });
  },
  async verify(token: string): Promise<UserProfile> {
    const r = await http<{ user: UserProfile; sessionToken: string }>('/api/auth/verify', { body: { token } });
    setToken(r.sessionToken);
    await this.refresh();
    return r.user;
  },
  async logout() {
    try { await http('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* ignore */ }
    setToken(null);
    db = EMPTY;
    loaded = false;
    emit();
  },
  currentUser(): UserProfile | null {
    return db.users.find((u) => u.id === db.sessionUserId) || null;
  },

  // ---- Groupes ----
  createGroup(name: string, sport: string, _ownerId: string, description?: string) {
    return http<{ group: Group }>('/api/groups', { body: { name, sport, description } });
  },
  joinGroup(code: string) {
    return http<{ group: Group }>('/api/groups/join', { body: { code } });
  },
  leaveGroup(groupId: string) {
    return http(`/api/groups/${groupId}/leave`, { method: 'POST', body: {} });
  },
  inviteEmails(groupId: string, emails: string[]) {
    return http<{ ok: boolean; created: number }>(`/api/groups/${groupId}/invite`, { body: { emails } });
  },
  removeMember(groupId: string, userId: string) {
    return http(`/api/members/${groupId}/remove`, { method: 'POST', body: { userId } });
  },
  respondInvitation(groupId: string, status: 'accepted' | 'rejected') {
    return http(`/api/members/${groupId}/respond`, { method: 'POST', body: { status } });
  },

  // ---- Pronostics ----
  upsertPrediction(group_id: string, p: { match_id: string; predicted_winner: 'home' | 'away' | 'draw' | null; home_score: number | null; away_score: number | null }) {
    return http<{ ok: boolean }>('/api/predictions', { body: { group_id, ...p } });
  },

  // ---- Données de groupe (scopées au serveur) ----
  groupDetails(groupId: string) {
    return http<{
      group: Group;
      members: GroupMember[];
      users: UserProfile[];
      invitations: Invitation[];
    }>(`/api/groups/${groupId}/details`);
  },
  groupPredictions(groupId: string) {
    return http<{ predictions: Prediction[]; users: UserProfile[] }>(`/api/groups/${groupId}/predictions`);
  },
  leaderboard(groupId: string) {
    return http<{ rows: { user: UserProfile; total: number; correct: number; exact: number; played: number }[] }>(`/api/leaderboard?groupId=${encodeURIComponent(groupId)}`);
  },

  // ---- Admin ----
  adminState() {
    return http<DB>('/api/admin/state');
  },
  setAdmin(userId: string, isAdmin: boolean) {
    return http(`/api/admin/users/${userId}`, { method: 'PUT', body: { is_admin: isAdmin } });
  },
  deleteUser(userId: string) {
    return http(`/api/admin/users/${userId}`, { method: 'DELETE' });
  },
  deleteGroup(groupId: string) {
    return http(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
  },
  deleteInvite(inviteId: string) {
    return http(`/api/admin/invitations/${inviteId}`, { method: 'DELETE' });
  },
  addMatch(data: { sport: string; home_team: string; away_team: string; match_date?: string; stage: string; group_name?: string }) {
    return http<{ match: Match }>('/api/admin/matches', { body: { external_id: 'manual_' + Date.now(), ...data, home_score: null, away_score: null, status: 'scheduled' } });
  },
  updateMatch(id: string, patch: Partial<Match>) {
    return http(`/api/admin/matches/${id}`, { method: 'PATCH', body: patch });
  },
  deleteMatch(id: string) {
    return http(`/api/admin/matches/${id}`, { method: 'DELETE' });
  },
  resetAll() {
    return http('/api/admin/reset', { method: 'POST', body: {} });
  },
  exportJSON(): string {
    return JSON.stringify(db, null, 2);
  },
};

export function useDB(): DB {
  return useSyncExternalStore(api.subscribe, api.getState);
}
export function useCurrentUser(): UserProfile | null {
  const db = useDB();
  return db.users.find((u) => u.id === db.sessionUserId) || null;
}
