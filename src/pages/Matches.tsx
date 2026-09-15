import { useMemo, useState } from 'react';
import { api, useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import type { Match, Prediction } from '../lib/types';

interface PredictionWithUser {
  p: Prediction;
  userName: string;
}

export default function Matches() {
  const { user } = useAuth();
  const db = useDB();
  const [groupId, setGroupId] = useState<string>('');
  const [stage, setStage] = useState<string>('all');

  const myGroups = useMemo(
    () => db.groups.filter((g) => db.members.some((m) => m.group_id === g.id && m.user_id === user?.id)),
    [db, user]
  );

  const activeGroupId = groupId || myGroups[0]?.id || '';

  const matches = useMemo(() => {
    return db.matches
      .filter((m) => stage === 'all' || m.stage === stage)
      .sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''));
  }, [db.matches, stage]);

  const stages = useMemo(() => {
    const s = new Set(db.matches.map((m) => m.stage));
    return Array.from(s).sort();
  }, [db.matches]);

  const groupMembers = activeGroupId
    ? db.members
        .filter((m) => m.group_id === activeGroupId && m.status === 'accepted')
        .map((m) => db.users.find((u) => u.id === m.user_id))
        .filter(Boolean)
    : [];

  const submit = (match: Match, winner: 'home' | 'away' | 'draw', home: number | null, away: number | null) => {
    if (!user) return;
    api.upsertPrediction({
      user_id: user.id,
      match_id: match.id,
      predicted_winner: winner,
      home_score: home,
      away_score: away,
    });
  };

  const userPrediction = (matchId: string) =>
    user ? db.predictions.find((p) => p.user_id === user.id && p.match_id === matchId) : undefined;

  const groupPredictions = (matchId: string): PredictionWithUser[] => {
    const ids = new Set(groupMembers.map((u) => u!.id));
    return db.predictions
      .filter((p) => p.match_id === matchId && ids.has(p.user_id))
      .map((p) => ({ p, userName: groupMembers.find((u) => u!.id === p.user_id)?.name || '?' }));
  };

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Matchs & pronostics</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <select
            value={activeGroupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            {myGroups.length === 0 && <option value="">Aucun groupe — créez-en un dans l'onglet Groupes</option>}
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            <option value="all">Toutes les étapes</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            Aucun match disponible. Un admin peut en ajouter dans /admin.
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const myPred = userPrediction(match.id);
              const finished = match.status === 'finished' && match.home_score !== null && match.away_score !== null;
              const resultWinner: 'home' | 'away' | 'draw' | null = finished
                ? match.home_score! > match.away_score!
                  ? 'home'
                  : match.home_score! < match.away_score!
                    ? 'away'
                    : 'draw'
                : null;
              const iWon = finished && myPred?.predicted_winner === resultWinner;
              const iScoreExact =
                finished &&
                myPred?.home_score === match.home_score &&
                myPred?.away_score === match.away_score &&
                myPred.home_score !== null;

              const others = groupPredictions(match.id);
              const isFinal = match.stage === 'final';

              return (
                <div key={match.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${isFinal ? 'ring-2 ring-wc-blue' : ''}`}>
                  <div className={`px-6 py-3 text-xs font-bold tracking-wider text-white ${isFinal ? 'bg-wc-blue' : 'bg-gray-700'}`}>
                    {match.stage.toUpperCase()}
                    {match.group_name ? ` — ${match.group_name}` : ''}
                    {match.match_date ? ` — ${new Date(match.match_date).toLocaleDateString('fr-FR')}` : ''}
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Vainqueur */}
                      <div>
                        <div className="text-sm font-semibold text-gray-500 mb-2">
                          {finished ? 'Résultat' : 'Qui va gagner ?'}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <TeamName name={match.home_team} align="right" />
                          <div className="text-2xl font-black text-gray-900 px-3">
                            {finished ? (
                              <>
                                {match.home_score} <span className="text-gray-300">–</span> {match.away_score}
                                {match.aet && (
                                  <span className="ml-1 text-xs font-semibold text-gray-400">(ap)</span>
                                )}
                                {match.pen_score && (
                                  <span className="ml-1 text-xs font-semibold text-gray-400">tab {match.pen_score}</span>
                                )}
                              </>
                            ) : (
                              'vs'
                            )}
                          </div>
                          <TeamName name={match.away_team} align="left" />
                        </div>
                        {!finished && user && (
                          <div className="mt-4 space-y-2">
                            <select
                              value={myPred?.predicted_winner || ''}
                              onChange={(e) => {
                                const w = e.target.value as 'home' | 'away' | 'draw' | '';
                                if (w) submit(match, w, myPred?.home_score ?? null, myPred?.away_score ?? null);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                            >
                              <option value="">— Choisir le vainqueur —</option>
                              <option value="home">{match.home_team}</option>
                              <option value="draw">Match nul</option>
                              <option value="away">{match.away_team}</option>
                            </select>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Score (optionnel) :</span>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={myPred?.home_score ?? ''}
                                onChange={(e) =>
                                  submit(
                                    match,
                                    myPred?.predicted_winner || 'draw',
                                    e.target.value === '' ? null : Number(e.target.value),
                                    myPred?.away_score ?? null
                                  )
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center"
                              />
                              <span>–</span>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={myPred?.away_score ?? ''}
                                onChange={(e) =>
                                  submit(
                                    match,
                                    myPred?.predicted_winner || 'draw',
                                    myPred?.home_score ?? null,
                                    e.target.value === '' ? null : Number(e.target.value)
                                  )
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center"
                              />
                            </div>
                            {iWon && (
                              <div className="mt-2 text-sm font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
                                {iScoreExact ? '🎯 Résultat ET score exacts ! +10 pts' : '✅ Bon résultat ! +5 pts'}
                              </div>
                            )}
                            {finished && myPred && !iWon && (
                              <div className="mt-2 text-sm text-gray-500">Votre pronostic était différent.</div>
                            )}
                          </div>
                        )}
                        {!user && !finished && <div className="mt-3 text-sm text-gray-400">Connectez-vous pour pronostiquer.</div>}
                      </div>

                      {/* Pronostics du groupe */}
                      <div className="md:col-span-2">
                        <div className="text-sm font-semibold text-gray-500 mb-2">Pronostics du groupe</div>
                        {others.length === 0 ? (
                          <p className="text-sm text-gray-400">Aucun pronostic du groupe pour ce match.</p>
                        ) : (
                          <ul className="space-y-1">
                            {others.map(({ p, userName }) => {
                              const win =
                                p.predicted_winner === 'home'
                                  ? match.home_team
                                  : p.predicted_winner === 'away'
                                    ? match.away_team
                                    : 'Match nul';
                              return (
                                <li key={p.user_id} className="flex items-center justify-between text-sm py-1">
                                  <span className="font-medium text-gray-800">{userName}</span>
                                  <span className="text-gray-600">
                                    {win}
                                    {p.home_score !== null && p.away_score !== null && (
                                      <span className="text-gray-400 ml-2">({p.home_score}-{p.away_score})</span>
                                    )}
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
  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : 'text-left'} font-bold text-gray-900`}>{name}</div>
  );
}
