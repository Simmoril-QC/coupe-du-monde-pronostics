import { Routes, Route } from 'react-router-dom';
import Header from '../components/Header';

const Home = () => {
  return (
    <div className="app-container">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-wc-blue via-wc-green to-green-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 1440 320" className="w-full h-full">
            <path fill="currentColor" d="M0,64L48,85.3C96,107,192,149,288,149.3C384,149,480,107,576,112C672,117,768,171,864,181.3C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Coupe du Monde
            <span className="block text-wc-orange mt-2">Pronostics & Groupes</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Suivez tous les matchs, faites vos pronostics et jouez entre amis dans des groupes privés.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/groups"
              className="px-8 py-3 bg-wc-orange text-wc-blue rounded-lg font-bold hover:bg-yellow-300 transition-colors w-full sm:w-auto"
            >
              Rejoindre un groupe
            </a>
            <a
              href="/matches"
              className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-bold hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              Voir les matchs
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Équipes', value: '48' },
              { label: 'Matches', value: '104' },
              { label: 'Groupes', value: '+' },
              { label: 'Joueurs', value: 'Vous' }
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl md:text-5xl font-bold text-wc-blue mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Prochains matchs
            </h2>
            <a href="/matches" className="text-wc-green hover:text-green-700 font-medium flex items-center gap-1">
              Voir tous les matchs
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 h-48 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-r from-wc-blue to-wc-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: 'users',
                title: 'Groupes privés',
                desc: 'Créez votre propre groupe et invitez vos amis par email'
              },
              {
                icon: 'trophy',
                title: 'Classements en direct',
                desc: 'Suivez qui mène dans chaque groupe en temps réel'
              },
              {
                icon: 'calendar',
                title: 'Pronostics avancés',
                desc: 'Prédisez les résultats et accumulez des points'
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-white">
                <div className="w-16 h-16 mx-auto bg-wc-orange rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-wc-blue" fill="currentColor" viewBox="0 0 24 24">
                    {feature.icon === 'users' && (
                      <>
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                      </>
                    )}
                    {feature.icon === 'trophy' && (
                      <>
                        <path d="M20.2 6c-.59 0-1.14.22-1.56.6L17.8 8H13V6h2v2H8V4h2V2H8V0h8v2h-2v2h2v2h-2.2l-1.44 1.4C19.06 7.78 19.53 8 20 8c1.1 0 2-.9 2-2s-.9-2-2-2zm-2.5 3.5L16 7v3H9V7l1.7 2.5C9.4 9.6 8 10.9 8 13c0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.1-1.4-3.4-2.5-4.5zM4 14h2v6c0 3.31 2.69 6 6 6s6-2.69 6-6v-6h2v6c0 3.87-3.13 7-7 7s-7-3.13-7-7v-6z" />
                      </>
                    )}
                    {feature.icon === 'calendar' && (
                      <>
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                      </>
                    )}
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-blue-100">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Prêt à jouer avec vos amis ?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Créez votre groupe dès maintenant et lancez-vous dans l'aventure Coupe du Monde.
          </p>
          <a
            href="/signup"
            className="inline-block px-10 py-4 bg-wc-orange text-wc-blue rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
          >
            S'inscrire gratuitement
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
                <span className="font-bold text-xl">World Cup</span>
              </div>
              <p className="text-gray-400 text-sm">
                L'application de pronostics officielle pour les fans de football.
              </p>
            </div>
            
            {[
              { title: 'Platforme', links: ['Matches', 'Classements', 'Groupes'] },
              { title: 'Légal', links: ['Confidentialité', 'Conditions', 'Contact'] }
            ].map((col, idx) => (
              <div key={idx}>
                <h4 className="font-bold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2026 World Cup App. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
