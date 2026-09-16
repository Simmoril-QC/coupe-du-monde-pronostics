import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type DB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import { STAGE_LABELS, type Match, type UserProfile } from '../lib/types';

type Tab = 'users' | 'groups' | 'matches' | 'invitations' | 'data';

export default function Admin() {
  const { user } = useAuth();
  // État GLOBAL (admin) — la vue scopée du /api/state ne suffit pas ici
  const [full, setFull] = useState<DB | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newMatch, setNewMatch] = useState({ home_team: '', away_team: '', match_date: '', stage: 'group_stage', group_name: '', sport: 'football-m' });
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = Boolean(user?.is_admin);

  const reload = useCallback(() => {
    api.adminState().then(setFull).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin, reload]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Votre compte ({user.email}) n'a pas le rôle administrateur.</p>
          <p className="text-sm text-gray-500">Le premier compte créé est administrateur.</p>
        </div>
      </main>
    );
  }
  if (!full) {
    return <main className="min-h-screen pt-28 pb-16 bg-gray-50 text-center text-gray-500">Chargement…</main>;
  }
  const db = full;

  const flash = (m: string) => { setMsg(m); setErr(''); };
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Erreur');
  const sportLabel = (id: string) => db.sports.find((s) => s.id === id)?.label || id;

  const addMatch = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addMatch({ ...newMatch, sport: newMatch.sport, match_date: newMatch.match_date ? new Date(newMatch.match_date).toISOString() : undefined });
      await reload();
      setNewMatch({ home_team: '', away_team: '', match_date: '', stage: 'group_stage', group_name: '', sport: newMatch.sport });
      flash('Match ajouté.');
    } catch (er) { fail(er); }
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { flash('Import JSON : l’export sert de sauvegarde (le serveur est la source de vérité).'); };
    reader.readAsText(file);
  };
  const exportJSON = () => {
    const blob = new Blob([api.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pronos-donnees.json'; a.click(); URL.revokeObjectURL(url);
    flash('Export téléchargé.');
  };
  const resetAll = async () => {
    if (!window.confirm('Réinitialiser TOUTES les données (comptes, groupes, matchs, pronostics) ?')) return;
    try { await api.resetAll(); await reload(); flash('Données réinitialisées.'); } catch (er) { fail(er); }
  };

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Administration</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {([['users', 'Utilisateurs'], ['groups', 'Groupes'], ['matches', 'Matchs'], ['invitations', 'Invitations'], ['data', 'Données']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setMsg(''); setErr(''); }} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === t ? 'bg-wc-blue text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{msg}</div>}
        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}

        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Créé le</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {db.users.map((u: UserProfile) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{u.is_admin ? '👑 admin' : 'membre'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right text-sm space-x-3 whitespace-nowrap">
                      <button onClick={async () => { try { await api.setAdmin(u.id, !u.is_admin); await reload(); flash('Rôle mis à jour.'); } catch (e) { fail(e); } }} className="text-wc-blue hover:underline">
                        {u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                      </button>
                      <button onClick={async () => { if (u.id === user.id) return; if (!window.confirm(`Supprimer définitivement ${u.email} ?`)) return; try { await api.deleteUser(u.id); await reload(); flash('Utilisateur supprimé.'); } catch (e) { fail(e); } }} className="text-red-500 hover:underline">
                        Supprimer
                      </button>
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
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sport</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Membres</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {db.groups.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3 text-sm font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-sm">{sportLabel(g.sport)}</td>
                    <td className="px-4 py-3 text-sm font-mono">{g.code}</td>
                    <td className="px-4 py-3 text-sm">{db.members.filter((m) => m.group_id === g.id && m.status === 'accepted').length}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={async () => { if (!window.confirm('Supprimer ce groupe ?')) return; try { await api.deleteGroup(g.id); await reload(); flash('Groupe supprimé.'); } catch (e) { fail(e); } }} className="text-red-500 hover:underline text-sm">Supprimer</button>
                    </td>
                  </tr>
                ))}
                {db.groups.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">Aucun groupe.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'matches' && (
          <div className="space-y-6">
            <form onSubmit={addMatch} className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-7 gap-3">
              <select value={newMatch.sport} onChange={(e) => setNewMatch({ ...newMatch, sport: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {db.sports.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input value={newMatch.home_team} onChange={(e) => setNewMatch({ ...newMatch, home_team: e.target.value })} placeholder="Domicile" required className="px-3 py-2 border border-gray-300 rounded-lg" />
              <input value={newMatch.away_team} onChange={(e) => setNewMatch({ ...newMatch, away_team: e.target.value })} placeholder="Extérieur" required className="px-3 py-2 border border-gray-300 rounded-lg" />
              <input type="datetime-local" value={newMatch.match_date} onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
              <select value={newMatch.stage} onChange={(e) => setNewMatch({ ...newMatch, stage: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg">
                {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={newMatch.group_name} onChange={(e) => setNewMatch({ ...newMatch, group_name: e.target.value })} placeholder="Groupe (A)" className="px-3 py-2 border border-gray-300 rounded-lg" />
              <button className="px-4 py-2 bg-wc-green text-white rounded-lg font-medium">Ajouter</button>
            </form>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Sport</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Match</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Étape</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {db.matches.map((m: Match) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">{sportLabel(m.sport)}</td>
                      <td className="px-4 py-2 text-sm font-medium whitespace-nowrap">{m.home_team} vs {m.away_team}{m.group_name ? <span className="text-gray-400"> ({m.group_name})</span> : ''}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">
                        <input type="number" min={-1} value={m.home_score ?? ''} placeholder="-"
                          onChange={(e) => api.updateMatch(m.id, { home_score: e.target.value === '' ? null : Number(e.target.value) }).then(() => reload()).catch(fail)}
                          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-center" />{' '}–{' '}
                        <input type="number" min={-1} value={m.away_score ?? ''} placeholder="-"
                          onChange={(e) => api.updateMatch(m.id, { away_score: e.target.value === '' ? null : Number(e.target.value) }).then(() => reload()).catch(fail)}
                          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-center" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={m.status} onChange={(e) => api.updateMatch(m.id, { status: e.target.value as Match['status'] }).then(() => reload()).catch(fail)} className="px-2 py-1 border border-gray-200 rounded text-sm">
                          <option value="finished">terminé</option>
                          <option value="live">en direct</option>
                          <option value="scheduled">programmé</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{STAGE_LABELS[m.stage] || m.stage}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={async () => { if (!window.confirm('Supprimer ce match et ses pronostics ?')) return; try { await api.deleteMatch(m.id); await reload(); flash('Match supprimé.'); } catch (e) { fail(e); } }} className="text-red-500 hover:underline text-sm">Supprimer</button>
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
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Groupe</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {db.invitations.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 text-sm">{i.email}</td>
                    <td className="px-4 py-3 text-sm">{db.groups.find((g) => g.id === i.group_id)?.name || i.group_id}</td>
                    <td className="px-4 py-3 text-sm">{i.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={async () => { try { await api.deleteInvite(i.id); await reload(); flash('Invitation supprimée.'); } catch (e) { fail(e); } }} className="text-red-500 hover:underline text-sm">Supprimer</button>
                    </td>
                  </tr>
                ))}
                {db.invitations.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">Aucune invitation.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'data' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 max-w-xl">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Sauvegarde</h3>
              <p className="text-sm text-gray-500 mb-3">Téléchargez l'intégralité des données actuelles (JSON).</p>
              <button onClick={exportJSON} className="px-4 py-2 bg-wc-blue text-white rounded-lg font-medium">Exporter en JSON</button>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Fichier de sauvegarde</h3>
              <p className="text-sm text-gray-500 mb-3">Le serveur est la source de vérité ; cet export sert d'archive.</p>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); if (fileRef.current) fileRef.current.value = ''; }} />
              <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-wc-green text-white rounded-lg font-medium">Charger un fichier</button>
            </div>
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-red-600">Zone de danger</h3>
              <p className="text-sm text-gray-500 mb-3">Supprime tous les comptes, groupes et pronostics, puis restaure les matchs des 4 sports.</p>
              <button onClick={resetAll} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium">Réinitialiser toutes les données</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
