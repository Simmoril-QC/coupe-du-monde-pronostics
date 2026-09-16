import { Link } from 'react-router-dom';
import { useDB } from '../lib/store';
import { useSport } from '../lib/SportContext';
import { STAGE_LABELS, type Match } from '../lib/types';

const SPORT_ICON: Record<string, string> = { 'football-m': '⚽', 'football-f': '⚽', 'basketball-m': '🏀', 'basketball-f': '🏀' };

export default function Home() {
  const db = useDB();
  const { sport, sports, info, setSport } = useSport();

  const matches = db.matches.filter((m) => m.sport === sport);
  const finishedCount = matches.filter((m) => m.status === 'finished').length;
  const teams = new Set<string>();
  matches.forEach((m) => { teams.add(m.home_team); teams.add(m.away_team); });

  const final = matches.find((m) => m.stage === 'final');
  const highlights = matches
    .filter((m) => ['final', 'semi_final', 'quarter_final', 'third_place', 'fifth_place'].includes(m.stage))
    .sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''))
    .slice(-6);

  const scoreLine = (m: Match) => (
    <span>
      {m.home_score}
      <span className="text-gray-300"> – </span>
      {m.away_score}
      {m.aet && <span className="text-xs font-semibold text-gray-400"> (ap)</span>}
      {m.pen_score && <span className="text-xs font-semibold text-gray-400"> tab {m.pen_score}</span>}
    </span>
  );

  if (db.sports.length === 0) {
    return (
      <main className="min-h-screen pt-32 pb-16 bg-gray-50 text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h1 className="text-2xl font-bold text-gray-900">Chargement…</h1>
        <p className="text-gray-500 mt-2">Connexion au serveur de données.</p>
      </main>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-wc-blue via-wc-green to-green-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="mr-3">{SPORT_ICON[sport] || '🏆'}</span>
            <span className="block text-wc-orange mt-2 text-3xl md:text-4xl">{info?.label}</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            {info?.tournament}. Rejouez le tournoi match après match, comparez vos pronostics au résultat,
            et devinez qui mène dans votre groupe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link to="/groups" className="px-8 py-3 bg-wc-orange text-wc-blue rounded-lg font-bold hover:bg-yellow-300 transition-colors w-full sm:w-auto">
              Rejoindre un groupe
            </Link>
            <Link to="/matches" className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-bold hover:bg-white/20 transition-colors w-full sm:w-auto">
              Voir les matchs
            </Link>
          </div>
          {/* Choix du sport */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sports.map((s) => (
              <button
                key={s.id}
                onClick={() => setSport(s.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${s.id === sport ? 'bg-white text-wc-blue' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {SPORT_ICON[s.id] || '🏆'} {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Palmarès / finale */}
      {final && (
        <section className="py-14 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-wc-green mb-2">Vainqueur — {info?.tournament}</div>
              <h2 className="text-4xl md:text-5xl font-black text-wc-blue">🏆 {final.home_team}</h2>
            </div>
            <div className="bg-gradient-to-r from-wc-blue to-wc-green rounded-2xl p-8 text-white flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="text-2xl font-bold">{final.home_team}</div>
              <div className="text-3xl font-black">{final.home_score} – {final.away_score}{final.aet ? ' (ap)' : ''}</div>
              <div className="text-2xl font-bold">{final.away_team}</div>
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">
              {final.match_date && new Date(final.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {final.pen_score ? ' · après tirs au but' : ''}
            </p>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Équipes', value: String(teams.size) },
              { label: 'Matchs joués', value: String(finishedCount) + '/' + matches.length },
              { label: 'Tournoi', value: info?.tournament.split(' ').slice(0, 2).join(' ') || '—' },
              { label: 'Sport', value: SPORT_ICON[sport] || '🏆' }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-5xl font-bold text-wc-blue mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Résultats clés */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Résultats clés — {info?.label}</h2>
            <Link to="/matches" className="text-wc-green hover:text-green-700 font-medium">Voir tous les matchs →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((m) => (
              <div key={m.id} className="border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-xs font-semibold uppercase tracking-wide text-wc-green mb-3">
                  {STAGE_LABELS[m.stage] || m.stage}
                </div>
                <div className="text-lg font-bold text-gray-900">{m.home_team}</div>
                <div className="text-2xl font-black text-wc-blue my-1">{scoreLine(m)}</div>
                <div className="text-lg font-bold text-gray-900">{m.away_team}</div>
                {m.match_date && (
                  <div className="mt-3 text-sm text-gray-500">
                    {new Date(m.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gradient-to-r from-wc-blue to-wc-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { title: '4 sports', desc: 'Football & Basketball, masculin et féminin, prêts à jouer' },
              { title: 'Groupes privés', desc: 'Créez votre groupe et invitez vos amis par email' },
              { title: 'Classement en direct', desc: 'Suivez qui mène dans chaque groupe' }
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
          <p className="text-xl text-gray-600 mb-8">Choisissez votre sport, créez votre groupe et lancez-vous.</p>
          <Link to="/login" className="inline-block px-10 py-4 bg-wc-orange text-wc-blue rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg">
            S'inscrire gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-lg">Pronos Multi-Sports</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 — Jeu entre amis, sans pari d'argent.</p>
        </div>
      </footer>
    </main>
  );
}
