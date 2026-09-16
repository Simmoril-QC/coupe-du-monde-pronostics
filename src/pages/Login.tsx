import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { user, request } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteCode = params.get('invite') || '';

  const [email, setEmail] = useState(() => params.get('email') || '');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);

  if (user) return <main className="min-h-screen" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await request(email, name || undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-16 bg-gray-50">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Connexion / Inscription</h1>
          <p className="text-gray-600 text-sm text-center mb-6">
            Entrez votre email : nous vous envoyons un <b>lien de connexion</b> (pas de mot de passe).
          </p>

          {sent ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h2>
              <p className="text-gray-600 text-sm">
                Nous avons envoyé un lien de connexion à <b>{email}</b>. Cliquez dessus pour accéder à votre espace
                (valable 1 heure).
              </p>
              {inviteCode && (
                <p className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  Après connexion, vous serez proposé de rejoindre le groupe <b>{inviteCode}</b>.
                </p>
              )}
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-wc-blue hover:underline">
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom (facultatif)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-wc-blue to-wc-green text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? 'Envoi en cours…' : 'Recevoir mon lien de connexion'}
              </button>
            </form>
          )}

          {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <p className="mt-6 text-center text-xs text-gray-400">
            Mode compte par email : votre profil, groupes et pronostics sont synchronisés sur le serveur.
          </p>
        </div>
      </div>
    </main>
  );
}
