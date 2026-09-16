import { useEffect, useMemo, useState } from 'react';
import { api, useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import { STAGE_LABELS, type Match, type Prediction, type UserProfile } from '../lib/types';

export default function Matches() {
  const { user } = useAuth();
  const db = useDB();
  const [groupId, setGroupId] = useState<string>('');
  const [stage, setStage] = useState<string>('all');
  const [err, setErr] = useState('');
  const [groupPreds, setGroupPreds] = useState<{ predictions: Prediction[]; users: UserProfile[] } | null>(null);

  const myGroups = useMemo(
    () => db.groups.filter((g) => db.members.some((m) => m.group_id === g.id && m.user_id === user?.id && m.status === 'accepted')),
    [db, user]
  );

  const activeGroupId = groupId || myGroups[0]?.id || '';
  const activeGroup = db.groups.find((g) => g.id === activeGroupId);
  // Les matchs affichés = ceux du sport du groupe actif
  const sport = activeGroup?.sport;

  // Pronostics des membres du groupe (via endpoint scopé au serveur)
  useEffect(() => {
    if (!user || !activeGroupId) { setGroupPreds(null); return; }
    let alive = true;
    api.groupPredictions(activeGroupId)
      .then((d) => { if (alive) setGroupPreds(d); })
      .catch(() => { if (alive) setGroupPreds(null); });
    return () => { alive = false; };
  }, [user, activeGroupId, db.predictions.length]);

  const matches = useMemo(() => {
    if (!sport) return [];
    return db.matches
      .filter((m) => m.sport === sport && (stage === 'all' || m.stage === stage))
      .sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''));
  }, [db.matches, sport, stage]);

  const stages = useMemo(() => {
    const s = new Set(db.matches.filter((m) => m.sport === sport).map((m) => m.stage));
    return Array.from(s).sort();
  }, [db.matches, sport]);

  const submit = async (match: Match, winner: 'home' | 'away' | 'draw', home: number | null, away: number | null) => {
    if (!user || !activeGroupId) return;
    try {
      await api.upsertPrediction(activeGroupId, { match_id: match.id, predicted_winner: winner, home_score: home, away_score: away });
      await api.refresh();
      setErr('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  };

  const userPrediction = (matchId: string) =>
    user ? db.predictions.find((p) => p.user_id === user.id && p.match_id === matchId) : undefined;

  const groupPredictions = (matchId: string) => {
    if (!groupPreds) return [];
    return groupPreds.predictions
      .filter((p) => p.match_id === matchId)
      .map((p) => ({ p, userName: groupPreds.users.find((u) => u.id === p.user_id)?.name || '?' }));
  };

  if (myGroups.length === 0) {
    return (
      <main className="min-h-screen pt-24 pb-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Matchs & pronostics</h1>
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            Rejoignez ou créez d'abord un groupe (chaque groupe a son sport).
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Matchs & pronostics</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select value={activeGroupId} onChange={(e) => { setGroupId(e.target.value); setStage('all'); }} className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm">
            {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm">
            <option value="all">Toutes les étapes</option>
            {stages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>)}
          </select>
          {activeGroup && <span className="self-center text-sm text-gray-500">{db.sports.find((s) => s.id === activeGroup.sport)?.label}</span>}
        </div>

        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}

        {matches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">Aucun match pour ce filtre.</div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const myPred = userPrediction(match.id);
              const finished = match.status === 'finished' && match.home_score !== null && match.away_score !== null;
              const resultWinner: 'home' | 'away' | 'draw' | null = finished
                ? match.home_score! > match.away_score! ? 'home' : match.home_score! < match.away_score! ? 'away' : 'draw'
                : null;
              const iWon = finished && myPred?.predicted_winner === resultWinner;
              const iScoreExact = finished && myPred?.home_score === match.home_score && myPred?.away_score === match.away_score && myPred.home_score !== null;
              const others = groupPredictions(match.id);
              const isFinal = match.stage === 'final';

              return (
                <div key={match.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${isFinal ? 'ring-2 ring-wc-blue' : ''}`}>
                  <div className={`px-6 py-3 text-xs font-bold tracking-wider text-white ${isFinal ? 'bg-wc-blue' : 'bg-gray-700'}`}>
                    {STAGE_LABELS[match.stage] || match.stage.toUpperCase()}
                    {match.group_name ? ` — ${match.group_name}` : ''}
                    {match.match_date ? ` — ${new Date(match.match_date).toLocaleDateString('fr-FR')}` : ''}
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-sm font-semibold text-gray-500 mb-2">{finished ? 'Résultat' : 'Qui va gagner ?'}</div>
                        <div className="flex items-center justify-between gap-2">
                          <TeamName name={match.home_team} align="right" />
                          <div className="text-2xl font-black text-gray-900 px-3">
                            {finished ? (
                              <>
                                {match.home_score} <span className="text-gray-300">–</span> {match.away_score}
                                {match.aet && <span className="ml-1 text-xs font-semibold text-gray-400">(ap)</span>}
                                {match.pen_score && <span className="ml-1 text-xs font-semibold text-gray-400">tab {match.pen_score}</span>}
                              </>
                            ) : 'vs'}
                          </div>
                          <TeamName name={match.away_team} align="left" />
                        </div>
                        {user && (
                          <div className="mt-4 space-y-2">
                            <select
                              value={myPred?.predicted_winner || ''}
                              onChange={(e) => { const w = e.target.value as 'home' | 'away' | 'draw' | ''; if (w) submit(match, w, myPred?.home_score ?? null, myPred?.away_score ?? null); }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                            >
                              <option value="">— Mon pronostic (le vainqueur) —</option>
                              <option value="home">{match.home_team}</option>
                              <option value="draw">Match nul</option>
                              <option value="away">{match.away_team}</option>
                            </select>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Score (optionnel) :</span>
                              <input type="number" min={0} max={200} value={myPred?.home_score ?? ''}
                                onChange={(e) => submit(match, myPred?.predicted_winner || 'draw', e.target.value === '' ? null : Number(e.target.value), myPred?.away_score ?? null)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center" />
                              <span>–</span>
                              <input type="number" min={0} max={200} value={myPred?.away_score ?? ''}
                                onChange={(e) => submit(match, myPred?.predicted_winner || 'draw', myPred?.home_score ?? null, e.target.value === '' ? null : Number(e.target.value))}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center" />
                            </div>
                            {iWon && (
                              <div className="mt-2 text-sm font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
                                {iScoreExact ? '🎯 Résultat ET score exacts ! +10 pts' : '✅ Bon résultat ! +5 pts'}
                              </div>
                            )}
                            {finished && myPred && !iWon && <div className="mt-2 text-sm text-gray-500">Votre pronostic était différent.</div>}
                          </div>
                        )}
                        {!user && <div className="mt-3 text-sm text-gray-400">Connectez-vous pour pronostiquer.</div>}
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-sm font-semibold text-gray-500 mb-2">Pronostics du groupe</div>
                        {others.length === 0 ? (
                          <p className="text-sm text-gray-400">Aucun pronostic du groupe pour ce match.</p>
                        ) : (
                          <ul className="space-y-1">
                            {others.map(({ p, userName }) => {
                              const win = p.predicted_winner === 'home' ? match.home_team : p.predicted_winner === 'away' ? match.away_team : p.predicted_winner === 'draw' ? 'Match nul' : '—';
                              return (
                                <li key={p.user_id} className="flex items-center justify-between text-sm py-1">
                                  <span className="font-medium text-gray-800">{userName}</span>
                                  <span className="text-gray-600">
                                    {win}
                                    {p.home_score !== null && p.away_score !== null && <span className="text-gray-400 ml-2">({p.home_score}-{p.away_score})</span>}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function TeamName({ name, align }: { name: string; align: 'left' | 'right' }) {
  return <div className={`flex-1 ${align === 'right' ? 'text-right' : 'text-left'} font-bold text-gray-900`}>{name}</div>;
}
