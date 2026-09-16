import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

// Page de vérification du magic link (ouverture de l'email) :
// /auth/verify?token=XXX [&group=CODE]
export default function AuthVerify() {
  const { verify } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const groupCode = params.get('group') || '';
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        if (!token) throw new Error('Lien manquant. Demandez un nouveau lien.');
        const u = await verify(token);
        setMsg('Connexion réussie : ' + (u.name || u.email));
        // si l'email venait d'une invitation, propose de rejoindre le groupe
        if (groupCode) navigate('/groups?join=' + encodeURIComponent(groupCode), { replace: true });
        else navigate('/', { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de connexion');
        setBusy(false);
      }
    })();
  }, [token, groupCode]);

  if (busy) {
    return (
      <main className="min-h-screen pt-32 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-900">Connexion en cours…</h1>
          <p className="text-gray-500 mt-2">Vérification de votre lien.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen pt-32 pb-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Lien invalide</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-wc-blue text-white rounded-lg font-bold">
            Renvoyer un lien
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-16 bg-gray-50">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes connecté !</h1>
        <p className="text-gray-600 mb-6">{msg}</p>
        <p className="text-sm text-gray-400">Redirection…</p>
      </div>
    </main>
  );
}
