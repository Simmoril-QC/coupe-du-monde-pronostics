import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import type { Group, GroupMember } from '../lib/types';

export default function Groups() {
  const { user, signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [invite, setInvite] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('group_members')
      .select('groups(*), status')
      .eq('user_id', user.id)
      .eq('status', 'accepted');
    const rows = (data || []) as any[];
    const list: Group[] = rows
      .map((r) => ({
        id: r.groups?.id ?? '',
        name: r.groups?.name ?? '',
        description: r.groups?.description ?? null,
        code: r.groups?.code ?? null,
        owner_id: r.groups?.owner_id ?? '',
        created_at: r.groups?.created_at ?? '',
      }))
      .filter((g) => g.id);
    setGroups(list);
    if (list.length && (!activeGroup || !list.some((g) => g.id === activeGroup?.id))) {
      selectGroup(list[0]);
    }
  };

  const selectGroup = async (g: Group) => {
    setActiveGroup(g);
    setMsg('');
    setErr('');
    if (!user) return;
    const { data } = await supabase
      .from('group_members')
      .select('user_id, status, role, users(id, name, email)')
      .eq('group_id', g.id)
      .order('invited_at', { ascending: true });
    const rows = (data || []) as any[];
    setMembers(rows.map((r) => ({
      user_id: r.user_id,
      status: r.status,
      role: r.role,
      users: Array.isArray(r.users) ? r.users[0] || null : r.users || null,
    })));
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const { data: newRow, error } = await supabase
      .from('groups')
      .insert({ name: code.trim(), owner_id: user.id })
      .select()
      .single();
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const { error: memErr } = await supabase.from('group_members').insert({
      group_id: newRow.id,
      user_id: user.id,
      status: 'accepted',
      role: 'owner',
    });
    if (memErr) setErr(memErr.message);
    else {
      setCode('');
      await loadGroups();
    }
    setBusy(false);
  };

  const joinByCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const { data: g } = await supabase
      .from('groups')
      .select('*')
      .eq('code', code.trim())
      .maybeSingle();
    if (!g) {
      setErr('Aucun groupe avec ce code. Vérifiez le code reçu dans l\'invitation.');
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from('group_members')
      .upsert(
        { group_id: g.id, user_id: user.id, status: 'accepted', role: g.owner_id === user.id ? 'owner' : 'member' },
        { onConflict: 'group_id,user_id' }
      );
    if (error) {
      setErr(error.message);
    } else {
      setCode('');
      await loadGroups();
    }
    setBusy(false);
  };

  const inviteByEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !activeGroup) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const emails = invite.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@'));
    let invited = 0;
    for (const email of emails) {
      // Si l'utilisateur existe déjà, l'ajouter directement (accepté s'il est connecté, pending sinon)
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('group_members')
          .upsert(
            { group_id: activeGroup.id, user_id: existing.id, status: existing.id === user.id ? 'accepted' : 'pending', role: 'member' },
            { onConflict: 'group_id,user_id' }
          );
        if (!error) invited++;
        continue;
      }
      const { error: invErr } = await supabase.from('invitations').insert({
        group_id: activeGroup.id,
        email,
        status: 'pending',
      });
      if (!invErr) invited++;
    }
    if (invited > 0) {
      setMsg(`${invited} invitation(s) enregistrée(s). Partagez aussi le code du groupe : ${activeGroup.code}`);
      setInvite('');
    } else {
      setErr('Aucun email valide n\'a pu être invité.');
    }
    setBusy(false);
  };

  const kickMember = async (uid: string) => {
    if (!user || !activeGroup) return;
    await supabase.from('group_members').delete().eq('group_id', activeGroup.id).eq('user_id', uid);
    await selectGroup(activeGroup);
  };

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

  const isOwner = activeGroup?.owner_id === user.id;

  return (
    <main className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes groupes</h1>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-red-600 font-medium">
            Déconnexion ({user.email})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : liste + création + rejoindre */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Mes groupes</h2>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun groupe pour le moment. Créez-en un !</p>
              ) : (
                <ul className="space-y-2">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <button
                        onClick={() => selectGroup(g)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          activeGroup?.id === g.id
                            ? 'border-wc-green bg-green-50'
                            : 'border-gray-200 hover:border-wc-blue hover:bg-blue-50'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{g.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Code : <span className="font-mono font-bold">{g.code || '—'}</span>
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
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Nom du groupe"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                />
                <button disabled={busy} className="px-4 py-2 bg-wc-green text-white rounded-lg font-medium disabled:opacity-50">
                  Créer
                </button>
              </form>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-2">Rejoindre avec un code</h2>
              <form onSubmit={joinByCode} className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code d'invitation"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                />
                <button disabled={busy} className="px-4 py-2 bg-wc-blue text-white rounded-lg font-medium disabled:opacity-50">
                  Rejoindre
                </button>
              </form>
            </section>
          </div>

          {/* Colonne droite : détail du groupe actif */}
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

                {isOwner && (
                  <form onSubmit={inviteByEmail} className="flex gap-2 mb-6">
                    <input
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                      placeholder="amis@email.com, autre@email.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                    />
                    <button disabled={busy} className="px-4 py-2 bg-wc-orange text-wc-blue rounded-lg font-bold disabled:opacity-50">
                      Inviter
                    </button>
                  </form>
                )}

                {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{msg}</div>}
                {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}

                <h3 className="font-semibold text-gray-900 mb-3">Membres</h3>
                <ul className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <li key={m.user_id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-wc-blue/10 flex items-center justify-center text-wc-blue font-bold">
                          {(m.users?.name || m.users?.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{m.users?.name || m.users?.email || '—'}</div>
                          <div className="text-xs text-gray-500">{m.users?.email}</div>
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
                          <button onClick={() => kickMember(m.user_id)} className="text-xs text-red-500 hover:underline">
                            Retirer
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                  {members.length === 0 && <li className="py-3 text-sm text-gray-500">Aucun membre.</li>}
                </ul>
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
