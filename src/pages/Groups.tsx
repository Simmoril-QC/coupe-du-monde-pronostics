import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, useDB } from '../lib/store';
import { useAuth } from '../lib/AuthContext';

export default function Groups() {
  const { user, logout } = useAuth();
  const db = useDB();
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Groupes</h1>
          <p className="text-gray-600 mb-6">Connectez-vous pour créer ou rejoindre un groupe.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-wc-green text-white rounded-lg font-bold">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  const createGroup = (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const g = api.createGroup(groupName, user.id);
    setGroupName('');
    setActiveGroupId(g.id);
    setMsg(`Groupe créé ! Code à partager : ${g.code}`);
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    const g = api.joinGroup(joinCode, user.id);
    if (g) {
      setMsg(`Vous avez rejoint « ${g.name} ».`);
      setJoinCode('');
      setActiveGroupId(g.id);
    } else {
      setErr('Aucun groupe avec ce code (sur cet appareil).');
    }
  };

  const invite = (e: FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    api.inviteEmails(activeGroup.id, inviteEmails.split(','), user.id);
    setInviteEmails('');
    setMsg('Invitations enregistrées. En mode local, vos amis doivent saisir le code du groupe sur leur appareil.');
  };

  const members = activeGroup ? db.members.filter((m) => m.group_id === activeGroup.id) : [];
  const isOwner = activeGroup?.owner_id === user.id;

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes groupes</h1>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 font-medium">
            Déconnexion ({user.email})
          </button>
        </div>

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
                      <button
                        onClick={() => setActiveGroupId(g.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          activeGroup?.id === g.id
                            ? 'border-wc-green bg-green-50'
                            : 'border-gray-200 hover:border-wc-blue hover:bg-blue-50'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{g.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {g.memberCount} membre(s) · Code : <span className="font-mono font-bold">{g.code}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Créer un groupe</h2>
              <form onSubmit={createGroup} className="flex gap-2">
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nom du groupe"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                />
                <button className="px-4 py-2 bg-wc-green text-white rounded-lg font-medium">Créer</button>
              </form>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-2">Rejoindre avec un code</h2>
              <form onSubmit={join} className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Code d'invitation"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                />
                <button className="px-4 py-2 bg-wc-blue text-white rounded-lg font-medium">Rejoindre</button>
              </form>
            </section>
          </div>

          <div className="lg:col-span-2">
            {activeGroup ? (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{activeGroup.name}</h2>
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
                    <input
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="amis@email.com, autre@email.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                    />
                    <button className="px-4 py-2 bg-wc-orange text-wc-blue rounded-lg font-bold">Inviter</button>
                  </form>
                )}

                <h3 className="font-semibold text-gray-900 mb-3">Membres</h3>
                <ul className="divide-y divide-gray-100">
                  {members.map((m) => {
                    const u = db.users.find((x) => x.id === m.user_id);
                    return (
                      <li key={m.user_id + m.group_id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-wc-blue/10 flex items-center justify-center text-wc-blue font-bold">
                            {(u?.name || u?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{u?.name || '—'}</div>
                            <div className="text-xs text-gray-500">{u?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              m.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {m.status === 'accepted' ? 'Accepté' : m.status === 'rejected' ? 'Refusé' : 'En attente'}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                          {isOwner && m.user_id !== user.id && (
                            <button
                              onClick={() => api.removeMember(activeGroup.id, m.user_id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Retirer
                            </button>
                          )}
                          {!isOwner && m.user_id === user.id && (
                            <button
                              onClick={() => {
                                api.leaveGroup(activeGroup.id, user.id);
                                setMsg('Vous avez quitté ce groupe.');
                              }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Quitter
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {members.length === 0 && <li className="py-3 text-sm text-gray-500">Aucun membre.</li>}
                </ul>

                {db.invitations
                  .filter((i) => i.group_id === activeGroup.id)
                  .length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Invitations en attente</h4>
                    <ul className="space-y-1">
                      {db.invitations
                        .filter((i) => i.group_id === activeGroup.id)
                        .map((i) => (
                          <li key={i.id} className="text-sm text-gray-600">
                            {i.email} {i.status === 'accepted' && <span className="text-green-600">(acceptée)</span>}
                          </li>
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
