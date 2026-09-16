import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';
import { useSport } from '../lib/SportContext';

export default function Groups() {
  const { user } = useAuth();
  const db = useDB();
  const { sports } = useSport();
  const [params, setParams] = useSearchParams();

  const [groupName, setGroupName] = useState('');
  const [newSport, setNewSport] = useState('football-m');
  const [joinCode, setJoinCode] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // Détails du groupe actif (membres, users, invitations envoyées) — scopés au serveur
  const [details, setDetails] = useState<{ group: import('../lib/types').Group; members: import('../lib/types').GroupMember[]; users: import('../lib/types').UserProfile[]; invitations: import('../lib/types').Invitation[] } | null>(null);

  const myGroups = useMemo(
    () =>
      db.groups
        .filter((g) => db.members.some((m) => m.group_id === g.id && m.user_id === user?.id))
        .map((g) => ({
          ...g,
          memberCount: db.members.filter((m) => m.group_id === g.id && m.status === 'accepted').length,
          isOwner: g.owner_id === user?.id,
        })),
    [db, user]
  );

  const activeGroup = db.groups.find((g) => g.id === activeGroupId) || myGroups[0] || null;

  // Recharger les détails quand le groupe actif change
  useEffect(() => {
    if (!user || !activeGroup) { setDetails(null); return; }
    let alive = true;
    api.groupDetails(activeGroup.id)
      .then((d) => { if (alive) setDetails(d); })
      .catch(() => { if (alive) setDetails(null); });
    return () => { alive = false; };
  }, [user, activeGroup?.id, db.members.length]);

  // Invitations en attente (je suis invité, statut pending)
  const pendingInvites = useMemo(
    () =>
      db.members
        .filter((m) => m.user_id === user?.id && m.status === 'pending')
        .map((m) => ({ member: m, group: db.groups.find((g) => g.id === m.group_id) }))
        .filter((x) => x.group),
    [db, user]
  );

  // Auto-rejoindre via ?join=CODE (depuis l'email d'invitation)
  useEffect(() => {
    if (!user) return;
    const code = params.get('join');
    if (!code) return;
    (async () => {
      try {
        const r = await api.joinGroup(code);
        setMsg(`Vous avez rejoint « ${r.group.name} ».`);
        setActiveGroupId(r.group.id);
        await api.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Rejoindre impossible');
      } finally {
        params.delete('join');
        setParams(params, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const flash = (m: string) => { setMsg(m); setErr(''); };

  const createGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setErr('');
    try {
      const r = await api.createGroup(groupName, newSport, user.id);
      await api.refresh();
      setGroupName('');
      setActiveGroupId(r.group.id);
      flash(`Groupe créé ! Code à partager : ${r.group.code}`);
    } catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api.joinGroup(joinCode);
      await api.refresh();
      flash(`Vous avez rejoint « ${r.group.name} ».`);
      setJoinCode('');
      setActiveGroupId(r.group.id);
    } catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setBusy(true); setErr('');
    try {
      const r = await api.inviteEmails(activeGroup.id, inviteEmails.split(','));
      await api.refresh();
      setInviteEmails('');
      flash(`Invitations envoyées par email (${r.created}). Vos amis recevront un lien de connexion.`);
    } catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  const respond = async (groupId: string, status: 'accepted' | 'rejected') => {
    setBusy(true);
    try {
      await api.respondInvitation(groupId, status);
      await api.refresh();
      flash(status === 'accepted' ? 'Vous avez rejoint le groupe.' : 'Invitation refusée.');
    } catch (er) { setErr(errMsg(er)); }
    finally { setBusy(false); }
  };

  const removeMember = async (groupId: string, userId: string) => {
    if (!window.confirm('Retirer ce membre ?')) return;
    try { await api.removeMember(groupId, userId); await api.refresh(); } catch (er) { setErr(errMsg(er)); }
  };
  const leave = async (groupId: string) => {
    if (!user) return;
    try { await api.leaveGroup(groupId); await api.refresh(); setActiveGroupId(null); flash('Vous avez quitté ce groupe.'); } catch (er) { setErr(errMsg(er)); }
  };

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Groupes</h1>
          <p className="text-gray-600 mb-6">Connectez-vous pour créer ou rejoindre un groupe.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-wc-green text-white rounded-lg font-bold">Se connecter</Link>
        </div>
      </main>
    );
  }

  const sportLabel = (id: string) => sports.find((s) => s.id === id)?.label || id;
  const members = details?.members || [];
  const detailUsers = details?.users || [];
  const sentInvites = details?.invitations || [];
  const isOwner = activeGroup?.owner_id === user.id;

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes groupes</h1>
        </div>

        {pendingInvites.length > 0 && (
          <section className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="font-semibold text-amber-900 mb-3">Invitations en attente — accepter ou refuser</h3>
            <ul className="space-y-2">
              {pendingInvites.map(({ member, group }) => (
                <li key={member.group_id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{group!.name} <span className="text-xs text-gray-400">· {sportLabel(group!.sport)}</span></div>
                    <div className="text-xs text-gray-500">Code : <span className="font-mono">{group!.code}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respond(member.group_id, 'accepted')} className="px-3 py-1.5 bg-wc-green text-white rounded-lg text-sm font-medium" disabled={busy}>Rejoindre</button>
                    <button onClick={() => respond(member.group_id, 'rejected')} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium" disabled={busy}>Refuser</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Mes groupes</h2>
              {myGroups.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun groupe pour le moment. Créez-en un !</p>
              ) : (
                <ul className="space-y-2">
                  {myGroups.map((g) => (
                    <li key={g.id}>
                      <button onClick={() => setActiveGroupId(g.id)} className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${activeGroup?.id === g.id ? 'border-wc-green bg-green-50' : 'border-gray-200 hover:border-wc-blue hover:bg-blue-50'}`}>
                        <div className="font-semibold text-gray-900">{g.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-wc-blue/10 text-wc-blue font-medium">{sportLabel(g.sport)}</span>
                          <span className="ml-2">{g.memberCount} membre(s) · <span className="font-mono font-bold">{g.code}</span></span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Créer un groupe</h2>
              <form onSubmit={createGroup} className="space-y-3">
                <select value={newSport} onChange={(e) => setNewSport(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.label} — {s.tournament}</option>)}
                </select>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent" />
                <button disabled={busy} className="w-full px-4 py-2 bg-wc-green text-white rounded-lg font-medium disabled:opacity-50">Créer</button>
              </form>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-2">Rejoindre avec un code</h2>
              <form onSubmit={join} className="flex gap-2">
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Code d'invitation" required className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent" />
                <button disabled={busy} className="px-4 py-2 bg-wc-blue text-white rounded-lg font-medium disabled:opacity-50">Rejoindre</button>
              </form>
            </section>
          </div>

          <div className="lg:col-span-2">
            {activeGroup ? (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {activeGroup.name}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-wc-blue/10 text-wc-blue font-medium">{sportLabel(activeGroup.sport)}</span>
                    </h2>
                    {activeGroup.description && <p className="text-sm text-gray-600">{activeGroup.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Code d'invitation</div>
                    <div className="font-mono text-lg font-bold text-wc-blue">{activeGroup.code}</div>
                  </div>
                </div>

                {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{msg}</div>}
                {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}

                {isOwner && (
                  <form onSubmit={invite} className="flex gap-2 mb-6">
                    <input value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="amis@email.com, autre@email.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent" />
                    <button disabled={busy} className="px-4 py-2 bg-wc-orange text-wc-blue rounded-lg font-bold disabled:opacity-50">Inviter par email</button>
                  </form>
                )}

                <h3 className="font-semibold text-gray-900 mb-3">Membres</h3>
                <ul className="divide-y divide-gray-100">
                  {members.map((m) => {
                    const u = detailUsers.find((x) => x.id === m.user_id);
                    return (
                      <li key={m.user_id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-wc-blue/10 flex items-center justify-center text-wc-blue font-bold">{(u?.name || u?.email || '?')[0].toUpperCase()}</div>
                          <div>
                            <div className="font-medium text-gray-900">{u?.name || '—'}</div>
                            <div className="text-xs text-gray-500">{u?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {m.status === 'accepted' ? 'Accepté' : m.status === 'rejected' ? 'Refusé' : 'En attente'}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                          {isOwner && m.user_id !== user.id && (
                            <button onClick={() => removeMember(activeGroup.id, m.user_id)} className="text-xs text-red-500 hover:underline">Retirer</button>
                          )}
                          {!isOwner && m.user_id === user.id && (
                            <button onClick={() => leave(activeGroup.id)} className="text-xs text-red-500 hover:underline">Quitter</button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {members.length === 0 && <li className="py-3 text-sm text-gray-500">Aucun membre.</li>}
                </ul>

                {sentInvites.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Invitations envoyées</h4>
                    <ul className="space-y-1">
                      {sentInvites.map((i) => (
                        <li key={i.id} className="text-sm text-gray-600">{i.email} {i.status === 'accepted' && <span className="text-green-600">(acceptée)</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                Créez ou rejoignez un groupe pour voir ses membres.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function errMsg(e: unknown) { return e instanceof Error ? e.message : 'Erreur'; }
