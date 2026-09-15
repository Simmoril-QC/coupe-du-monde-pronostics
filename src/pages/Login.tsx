import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [error, setError] = useState('');

  if (user) {
    return (
      <main className="min-h-screen pt-28 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes connecté</h1>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </main>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Adresse email invalide');
      return;
    }
    login(email, name || undefined);
    navigate('/');
  };

  return (
    <main className="min-h-screen pt-28 pb-16 bg-gray-50">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {mode === 'signup' ? 'Créer un compte' : 'Connexion'}
          </h1>
          <p className="text-gray-600 text-sm text-center mb-6">
            Mode local : votre compte et vos données restent sur cet appareil.
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
            {mode === 'signup' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom (facultatif)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent"
              />
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-wc-blue to-wc-green text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
            >
              {mode === 'signup' ? 'Commencer' : 'Se connecter'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            {mode === 'signup' ? (
              <>
                Déjà un compte ?{' '}
                <button onClick={() => setMode('login')} className="text-wc-blue font-medium hover:underline">
                  Connectez-vous
                </button>
              </>
            ) : (
              <>
                Pas de compte ?{' '}
                <button onClick={() => setMode('signup')} className="text-wc-blue font-medium hover:underline">
                  Créez-en un
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
