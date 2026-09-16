import { useEffect, useMemo, useState } from 'react';
import { api, useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import type { UserProfile } from '../lib/types';

export default function Leaderboard() {
  const { user } = useAuth();
  const db = useDB();
  const [groupId, setGroupId] = useState<string>('');
  const [rows, setRows] = useState<{ user: UserProfile; total: number; correct: number; exact: number; played: number }[]>([]);

  const myGroups = useMemo(
    () => db.groups.filter((g) => db.members.some((m) => m.group_id === g.id && m.user_id === user?.id)),
    [db, user]
  );
  const activeGroupId = groupId || myGroups[0]?.id || '';

  // Classement calculé côté serveur (même barème)
  useEffect(() => {
    if (!user || !activeGroupId) { setRows([]); return; }
    let alive = true;
    api.leaderboard(activeGroupId)
      .then((d) => { if (alive) setRows(d.rows); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [user, activeGroupId, db.predictions.length]);

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
