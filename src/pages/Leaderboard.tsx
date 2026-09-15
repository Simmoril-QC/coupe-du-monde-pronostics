import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import type { Match } from '../lib/types';

interface Row {
  id: string;
  name: string | null;
  email: string;
  points: number;
  correct: number;
  total: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(name)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      const list = ((data || []) as any[]).map((d) => ({
        id: d.group_id,
        name: d.groups?.name || 'Groupe',
      }));
      setMyGroups(list);
      if (list.length && (!activeGroupId || !list.some((g) => g.id === activeGroupId))) {
        setActiveGroupId(list[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !activeGroupId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      // Membres acceptés du groupe
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, users(*)')
        .eq('group_id', activeGroupId)
        .eq('status', 'accepted');
      const memberRows = ((members || []) as any[]).map((r) => ({
        user_id: r.user_id,
        users: Array.isArray(r.users) ? r.users[0] || null : r.users || null,
      }));
      const memberIds = memberRows.map((m) => m.user_id);
      if (memberIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .in('user_id', memberIds);
      const { data: matchesData } = await supabase.from('matches').select('*').eq('status', 'finished');
      const matches = (matchesData || []) as Match[];
      const matchById = new Map(matches.map((m) => [m.id, m]));

      const rows: Row[] = memberRows.map((m) => {
        const userPreds = ((preds || []) as any[]).filter((p) => p.user_id === m.user_id);
        let points = 0;
        let correct = 0;
        for (const p of userPreds) {
          const mch = matchById.get(p.match_id);
          if (!mch) continue;
          const h = mch.home_score;
          const a = mch.away_score;
          if (h === null || a === null) continue;
          const actual: 'home' | 'away' | 'draw' = h > a ? 'home' : h < a ? 'away' : 'draw';
          let pts = 0;
          if (p.predicted_winner === actual) {
            pts += 5;
            correct++;
            if (p.home_score === h && p.away_score === a) pts += 5; // score exact = bonus
            if (mch.stage === 'final' && p.predicted_winner === actual) pts += 2;
          }
          points += pts;
        }
        return {
          id: m.user_id,
          name: m.users?.name || null,
          email: m.users?.email || '',
          points,
          correct,
          total: userPreds.length,
        };
      });
      rows.sort((x, y) => y.points - x.points);
      setRows(rows);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId, user]);

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Classement</h1>
          <p className="text-gray-600 mb-6">Connectez-vous pour voir le classement de vos groupes.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-wc-green text-white rounded-lg font-bold">Se connecter</Link>
        </div>
      </main>
    );
  }

  const top3 = rows.slice(0, 3);

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Classement</h1>

        {myGroups.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Groupe</label>
            <select
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(e.target.value)}
              className="w-full sm:w-80 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
            >
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Calcul du classement…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500">
            Rejoignez un groupe pour voir le classement.
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="flex items-end justify-center gap-4 mb-10">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((r, i) => {
                const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl p-6 text-center w-32 md:w-44 ${
                      place === 1
                        ? 'bg-gradient-to-b from-wc-orange to-yellow-300 shadow-xl md:w-52 md:-translate-y-4 z-10'
                        : 'bg-white shadow-sm border border-gray-100'
                    }`}
                  >
                    <div className={`font-bold mb-2 ${place === 1 ? 'text-wc-blue' : 'text-gray-400'}`}>
                      {place === 1 ? '🥇 1er' : place === 2 ? '🥈 2e' : '🥉 3e'}
                    </div>
                    <div className="text-lg font-bold truncate">{r.name || r.email}</div>
                    <div className={`text-2xl font-bold mt-1 ${place === 1 ? 'text-wc-blue' : 'text-wc-green'}`}>{r.points} pts</div>
                  </div>
                );
              })}
            </div>

            {/* Table complet */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rang</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Joueur</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pts</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 hidden sm:table-cell">Bons pronostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={r.id} className={r.id === user.id ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3 font-bold text-gray-900">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.name || r.email} {r.id === user.id && <span className="text-xs text-wc-blue">(vous)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-wc-green">{r.points}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-sm text-gray-600">{r.correct}/{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white rounded-xl p-5 text-sm text-gray-600">
              <b className="text-gray-900">Barème :</b> +5 pts bon résultat, +5 pts en bonus si le score est exact, +2 pts en bonus sur la finale.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
