import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { STAGE_LABELS, type Match } from '../lib/types';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'scheduled')
      .order('match_date', { ascending: true })
      .limit(3)
      .then(({ data }) => setMatches((data || []) as Match[]));
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-wc-blue via-wc-green to-green-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Coupe du Monde
            <span className="block text-wc-orange mt-2">Pronostics & Groupes</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Suivez tous les matchs, faites vos pronostics et jouez entre amis dans des groupes privés.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/groups"
              className="px-8 py-3 bg-wc-orange text-wc-blue rounded-lg font-bold hover:bg-yellow-300 transition-colors w-full sm:w-auto"
            >
              Rejoindre un groupe
            </Link>
            <Link
              to="/matches"
              className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-bold hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              Voir les matchs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Équipes', value: '48' },
              { label: 'Matches', value: '104' },
              { label: 'Groupes', value: 'Privés' },
              { label: 'Joueurs', value: 'Vous' }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-5xl font-bold text-wc-blue mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prochains matchs */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Prochains matchs</h2>
            <Link to="/matches" className="text-wc-green hover:text-green-700 font-medium">
              Voir tous les matchs →
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
              Aucun match programmé pour l'instant.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matches.map((m) => (
                <div key={m.id} className="border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wide text-wc-green mb-3">
                    {STAGE_LABELS[m.stage] || m.stage}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{m.home_team}</div>
                  <div className="text-gray-400 text-sm my-1">contre</div>
                  <div className="text-lg font-bold text-gray-900">{m.away_team}</div>
                  {m.match_date && (
                    <div className="mt-3 text-sm text-gray-500">
                      {new Date(m.match_date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gradient-to-r from-wc-blue to-wc-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { title: 'Groupes privés', desc: 'Créez votre groupe et invitez vos amis par email' },
              { title: 'Classement en direct', desc: 'Suivez qui mène dans chaque groupe' },
              { title: 'Pronostics', desc: 'Prédisez le gagnant et le score, cumulez des points' }
            ].map((f) => (
              <div key={f.title} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-white">
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-blue-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Prêt à jouer avec vos amis ?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Créez votre groupe et lancez-vous dans l'aventure Coupe du Monde.
          </p>
          <Link
            to="/login"
            className="inline-block px-10 py-4 bg-wc-orange text-wc-blue rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
          >
            S'inscrire gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-lg">World Cup Pronostics</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 — Jeu entre amis, sans pari d'argent.</p>
        </div>
      </footer>
    </main>
  );
}
