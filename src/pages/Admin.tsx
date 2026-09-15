import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import type { Match, UserProfile } from '../lib/types';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'groups' | 'matches' | 'invitations' | 'config'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [newMatch, setNewMatch] = useState({ home_team: '', away_team: '', match_date: '', stage: 'group_stage' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const isAdmin = Boolean(user?.is_admin);

  const load = async () => {
    const [u, g, m, inv, c] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('invitations').select('*').order('created_at', { ascending: false }),
      supabase.from('config').select('*'),
    ]);
    setUsers((u.data || []) as UserProfile[]);
    setGroups((g.data || []) as any[]);
    setMatches((m.data || []) as Match[]);
    setInvitations((inv.data || []) as any[]);
    const cmap: Record<string, string> = {};
    for (const row of (c.data || []) as { key: string; value: string }[]) cmap[row.key] = row.value;
    setConfig(cmap);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin</h1>
          <p className="text-gray-600 mb-6">Connectez-vous avec un compte administrateur.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-wc-green text-white rounded-lg font-bold">Se connecter</Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600 mb-6">Votre compte ({user.email}) n'a pas le rôle administrateur.</p>
        </div>
      </main>
    );
  }

  const toggleAdmin = async (u: UserProfile) => {
    const { error } = await supabase.from('users').update({ is_admin: !u.is_admin }).eq('id', u.id);
    if (error) setErr(error.message);
    load();
  };

  const deleteUser = async (u: UserProfile) => {
    if (!window.confirm(`Supprimer définitivement ${u.email} ? (groupes, membres, pronostics)`)) return;
    const { error } = await supabase.from('users').delete().eq('id', u.id);
    if (error) setErr(error.message);
    load();
  };

  const deleteGroup = async (gid: string) => {
    if (!window.confirm('Supprimer ce groupe et toutes ses données ?')) return;
    const { error } = await supabase.from('groups').delete().eq('id', gid);
    if (error) setErr(error.message);
    load();
  };

  const addMatch = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('matches').insert({
      external_id: 'manual_' + Date.now(),
      home_team: newMatch.home_team,
      away_team: newMatch.away_team,
      match_date: newMatch.match_date,
      stage: newMatch.stage,
      status: 'scheduled',
    });
    if (error) setErr(error.message);
    else {
      setMsg('Match ajouté.');
      setNewMatch({ home_team: '', away_team: '', match_date: '', stage: 'group_stage' });
    }
    load();
  };

  const deleteMatch = async (mid: string) => {
    const { error } = await supabase.from('matches').delete().eq('id', mid);
    if (error) setErr(error.message);
    load();
  };

  const saveConfig = async (key: string, value: string) => {
    const { error } = await supabase.from('config').upsert({ key, value });
    if (error) setErr(error.message);
    load();
  };

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Administration</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['users', 'groups', 'matches', 'invitations', 'config'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMsg(''); setErr(''); }}
              className={`px-4 py-2 rounded-full text-sm font-medium ${tab === t ? 'bg-wc-blue text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            >
              {t === 'users' ? 'Utilisateurs' : t === 'groups' ? 'Groupes' : t === 'matches' ? 'Matchs' : t === 'invitations' ? 'Invitations' : 'Config'}
            </button>
          ))}
        </div>

        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{msg}</div>}
        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}

        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rôle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Créé le</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{u.is_admin ? '👑 admin' : 'membre'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right text-sm space-x-3">
                      <button onClick={() => toggleAdmin(u)} className="text-wc-blue hover:underline">{u.is_admin ? 'Retirer admin' : 'Rendre admin'}</button>
                      <button onClick={() => deleteUser(u)} className="text-red-500 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'groups' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Créé le</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3 text-sm font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-sm font-mono">{g.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(g.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteGroup(g.id)} className="text-red-500 hover:underline text-sm">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'matches' && (
          <div className="space-y-6">
            <form onSubmit={addMatch} className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-5 gap-3">
              <input value={newMatch.home_team} onChange={(e) => setNewMatch({ ...newMatch, home_team: e.target.value })} placeholder="Équipe domicile" required className="px-3 py-2 border border-gray-300 rounded-lg" />
              <input value={newMatch.away_team} onChange={(e) => setNewMatch({ ...newMatch, away_team: e.target.value })} placeholder="Équipe extérieur" required className="px-3 py-2 border border-gray-300 rounded-lg" />
              <input type="datetime-local" value={newMatch.match_date} onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })} required className="px-3 py-2 border border-gray-300 rounded-lg" />
              <select value={newMatch.stage} onChange={(e) => setNewMatch({ ...newMatch, stage: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg">
                <option value="group_stage">Groupes</option>
                <option value="round_of_16">1/8</option>
                <option value="quarter_final">1/4</option>
                <option value="semi_final">Demi-finale</option>
                <option value="final">Finale</option>
              </select>
              <button className="px-4 py-2 bg-wc-green text-white rounded-lg font-medium">Ajouter</button>
            </form>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Match</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Étape</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.match_date ? new Date(m.match_date).toLocaleString('fr-FR') : '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{m.home_team} vs {m.away_team}</td>
                      <td className="px-4 py-3 text-sm">{m.home_score ?? '-'} – {m.away_score ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{m.status}</td>
                      <td className="px-4 py-3 text-sm">{m.stage}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMatch(m.id)} className="text-red-500 hover:underline text-sm">Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'invitations' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Groupe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 text-sm">{i.email}</td>
                    <td className="px-4 py-3 text-sm">{i.groups?.name || i.group_id}</td>
                    <td className="px-4 py-3 text-sm">{i.status}</td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500 text-sm">Aucune invitation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'config' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 max-w-lg">
            {Object.entries(config).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-600 w-48 shrink-0">{k}</span>
                <input
                  key={k + v}
                  defaultValue={v}
                  onBlur={(e) => e.target.value !== v && saveConfig(k, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            ))}
            <p className="text-xs text-gray-400">Modifiez une valeur puis cliquez ailleurs pour enregistrer.</p>
          </div>
        )}
      </div>
    </main>
  );
}
