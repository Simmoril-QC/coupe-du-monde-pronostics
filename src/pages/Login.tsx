import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { error } =
        mode === 'signup'
          ? await (supabase.auth as any).signUp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}${window.location.pathname.split('/').slice(0, 2).join('/')}/` } })
          : await (supabase.auth as any).signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/` } });
      if (error) throw error;
      setMessage(
        mode === 'signup'
          ? 'Inscription envoyée ! Vérifiez votre boîte mail : cliquez sur le lien reçu pour activer votre compte, puis revenez ici.'
          : 'Lien de connexion envoyé ! Vérifiez votre boîte mail (et les spams) et cliquez sur le lien pour entrer.'
      );
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-16 bg-gray-50">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </h1>
          <p className="text-gray-600 text-sm text-center mb-6">
            Pas de mot de passe : on vous envoie un lien magique par email.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-gradient-to-r from-wc-blue to-wc-green text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? 'Envoi en cours…' : mode === 'login' ? 'Recevoir mon lien' : "S'inscrire"}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                Pas de compte ?{' '}
                <button onClick={() => setMode('signup')} className="text-wc-blue font-medium hover:underline">
                  Inscrivez-vous
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{' '}
                <button onClick={() => setMode('login')} className="text-wc-blue font-medium hover:underline">
                  Connectez-vous
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
