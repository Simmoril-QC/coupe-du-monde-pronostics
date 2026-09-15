import { useMemo, useState } from 'react';
import { useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import type { Match, Prediction } from '../lib/types';

// Barème : 5 pts bon vainqueur · +5 pts score exact (soit 10) · finale x2
function scorePrediction(m: Match, p: Prediction): { pts: number; detail: string } {
  if (m.status !== 'finished' || m.home_score === null || m.away_score === null) return { pts: 0, detail: '' };
  const winner: 'home' | 'away' | 'draw' =
    m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw';
  let pts = 0;
  const parts: string[] = [];
  if (p.predicted_winner === winner) {
    pts += 5;
    parts.push('résultat');
  }
  if (p.home_score === m.home_score && p.away_score === m.away_score) {
    pts += 5;
    parts.push('score');
  }
  if (parts.length === 0) return { pts: 0, detail: '—' };
  const mult = m.stage === 'final' ? 2 : 1;
  return { pts: pts * mult, detail: parts.join(' +') + (mult === 2 ? ' (finale x2)' : '') };
}

export default function Leaderboard() {
  const { user } = useAuth();
  const db = useDB();
  const [groupId, setGroupId] = useState<string>('');

  const myGroups = useMemo(
    () => db.groups.filter((g) => db.members.some((m) => m.group_id === g.id && m.user_id === user?.id)),
    [db, user]
  );
  const activeGroupId = groupId || myGroups[0]?.id || '';

  const rows = useMemo(() => {
    if (!activeGroupId) return [];
    const memberIds = db.members
      .filter((m) => m.group_id === activeGroupId && m.status === 'accepted')
      .map((m) => m.user_id);
    return memberIds
      .map((uid) => {
        const u = db.users.find((x) => x.id === uid);
        const preds = db.predictions.filter((p) => p.user_id === uid);
        let total = 0;
        let correct = 0;
        let exact = 0;
        for (const p of preds) {
          const m = db.matches.find((x) => x.id === p.match_id);
          if (!m) continue;
          const r = scorePrediction(m, p);
          total += r.pts;
          if (r.pts >= 5) correct++;
          if (r.detail.includes('score')) exact++;
        }
        return { user: u, total, correct, exact, played: preds.length };
      })
      .filter((r) => r.user)
      .sort((a, b) => b.total - a.total);
  }, [db, activeGroupId]);

  const activeGroup = db.groups.find((g) => g.id === activeGroupId);

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Classement</h1>

        {myGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            Rejoignez ou créez un groupe pour voir un classement.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <select
                value={activeGroupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                {myGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {activeGroup && <span className="text-sm text-gray-500">Barème : 5 pts résultat · +5 score exact · finale x2</span>}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100">
                    <th className="px-6 py-3 w-12">#</th>
                    <th className="px-6 py-3">Joueur</th>
                    <th className="px-6 py-3 text-right">Pts</th>
                    <th className="px-6 py-3 text-right">Résultats</th>
                    <th className="px-6 py-3 text-right">Scores exacts</th>
                    <th className="px-6 py-3 text-right">Prédits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={r.user!.id} className={r.user!.id === user?.id ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {r.user!.name || r.user!.email}
                          {r.user!.id === user?.id && <span className="ml-2 text-xs text-wc-blue">(vous)</span>}
                        </div>
                        <div className="text-xs text-gray-500">{r.user!.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-black text-wc-blue">{r.total}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{r.correct}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{r.exact}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{r.played}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Aucun membre dans ce groupe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
