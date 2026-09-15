import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { STAGE_LABELS, type Match, type Prediction } from '../lib/types';

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true });
    if (!error && data) setMatches(data as Match[]);
    if (user) {
      const { data: p } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);
      const map: Record<string, Prediction> = {};
      for (const row of (p || []) as Prediction[]) map[row.match_id] = row;
      setPredictions(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const savePrediction = async (e: FormEvent, m: Match) => {
    e.preventDefault();
    if (!user) return;
    const draft = drafts[m.id] || { home: '', away: '' };
    const h = draft.home === '' ? null : Math.max(0, parseInt(draft.home, 10) || 0);
    const a = draft.away === '' ? null : Math.max(0, parseInt(draft.away, 10) || 0);
    let winner: 'home' | 'away' | 'draw' | null = null;
    if (h !== null && a !== null) winner = h > a ? 'home' : h < a ? 'away' : 'draw';
    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: m.id,
          predicted_winner: winner,
          home_score: h,
          away_score: a,
        },
        { onConflict: 'user_id,match_id' }
      );
    if (error) setMsg('❌ ' + error.message);
    else setMsg(`✅ Pronostic enregistré pour ${m.home_team} – ${m.away_team}.`);
    setOpenMatch(null);
    load();
  };

  const stages = ['all', 'group_stage', 'round_of_16', 'quarter_final', 'semi_final', 'final'];
  const filtered = useMemo(
    () => (filter === 'all' ? matches : matches.filter((m) => m.stage === filter)),
    [filter, matches]
  );

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Matchs & pronostics</h1>

        {!supabaseReady() && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
            ⚠️ Supabase n'est pas configuré (variables d'environnement manquantes). Aucune donnée chargée.
          </div>
        )}

        {msg && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === s ? 'bg-wc-green text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? 'Tous' : STAGE_LABELS[s] || s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-500">Chargement des matchs…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500">
            Aucun match pour cette étape. Les matchs arrivent via la synchronisation (API / admin).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predictions[m.id]}
                draft={drafts[m.id]}
                open={openMatch === m.id}
                canPredict={Boolean(user) && m.status === 'scheduled'}
                onToggle={() => setOpenMatch(openMatch === m.id ? null : m.id)}
                onDraft={(d) => setDrafts((prev) => ({ ...prev, [m.id]: d }))}
                onSave={(e) => savePrediction(e, m)}
              />
            ))}
          </div>
        )}

        {!user && (
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-3">Connectez-vous pour saisir vos pronostics.</p>
            <Link to="/login" className="inline-block px-6 py-3 bg-wc-green text-white rounded-lg font-bold">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function supabaseReady() {
  try {
    return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  } catch {
    return false;
  }
}

interface CardProps {
  match: Match;
  prediction?: Prediction;
  draft?: { home: string; away: string };
  open: boolean;
  canPredict: boolean;
  onToggle: () => void;
  onDraft: (d: { home: string; away: string }) => void;
  onSave: (e: FormEvent) => void;
}

function MatchCard({ match: m, prediction, draft, open, canPredict, onToggle, onDraft, onSave }: CardProps) {
  const finished = m.status === 'finished';
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
      <div className={`px-4 py-2 flex items-center justify-between text-white ${finished ? 'bg-green-700' : 'bg-gradient-to-r from-wc-blue to-wc-green'}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{STAGE_LABELS[m.stage] || m.stage}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${finished ? 'bg-green-500' : m.status === 'live' ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20'}`}>
          {finished ? 'Terminé' : m.status === 'live' ? 'En direct' : 'À venir'}
        </span>
      </div>

      <div className="p-5 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="font-bold text-gray-900">{m.home_team}</div>
            {finished && <div className="text-2xl font-bold text-wc-green mt-1">{m.home_score ?? '–'}</div>}
          </div>
          <div className="px-3 text-gray-400 font-bold">VS</div>
          <div className="text-center flex-1">
            <div className="font-bold text-gray-900">{m.away_team}</div>
            {finished && <div className="text-2xl font-bold text-wc-green mt-1">{m.away_score ?? '–'}</div>}
          </div>
        </div>

        <div className="mt-3 text-center text-sm text-gray-500">
          {m.match_date && new Date(m.match_date).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>

        {prediction && (
          <div className="mt-4 text-center text-sm bg-blue-50 border border-blue-100 rounded-lg py-2 text-blue-800">
            Votre prono : <b>{prediction.home_score ?? '?'} – {prediction.away_score ?? '?'}</b>{' '}
            ({prediction.predicted_winner === 'home' ? m.home_team : prediction.predicted_winner === 'away' ? m.away_team : 'Nul'})
          </div>
        )}
      </div>

      {canPredict && (
        <div className="border-t border-gray-100">
          <button onClick={onToggle} className="w-full py-2.5 bg-wc-blue text-white rounded-b-xl font-medium hover:bg-blue-700 transition-colors">
            {open ? 'Fermer' : 'Faire mon pronostic'}
          </button>
          {open && (
            <form onSubmit={onSave} className="p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Buts domicile"
                  value={draft?.home ?? ''}
                  onChange={(e) => onDraft({ home: e.target.value, away: draft?.away ?? '' })}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-center"
                />
                <span className="text-gray-400 font-bold">–</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Buts extérieur"
                  value={draft?.away ?? ''}
                  onChange={(e) => onDraft({ home: draft?.home ?? '', away: e.target.value })}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-center"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-wc-green text-white rounded-lg font-medium hover:bg-green-700">
                Valider
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
