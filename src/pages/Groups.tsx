import { useState } from 'react';
import Header from '../components/Header';

const Groups = () => {
  const [groups] = useState([
    {
      id: '1',
      name: 'Les Amis du Foot',
      description: 'Pronostics entre potes pour la Coupe du Monde',
      memberCount: 5,
      owner: 'Moi'
    },
    {
      id: '2',
      name: 'Famille Coupe du Monde',
      description: 'Tous ensemble pour suivre les matchs',
      memberCount: 8,
      owner: 'Papa'
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes Groupes</h1>
          <button className="bg-wc-green hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouveau groupe
          </button>
        </div>

        {/* Your Groups */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vos groupes</h2>
          
          {groups.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-dashed border-gray-300">
              <p className="text-gray-600 mb-4">Vous n'êtes membre d'aucun groupe.</p>
              <button className="text-wc-blue hover:underline font-medium">
                Rejoindre un groupe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => (
                <div key={group.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{group.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{group.memberCount} membres</span>
                    <span className="bg-wc-blue/10 text-wc-blue px-2 py-1 rounded-full text-xs font-medium">
                      {group.owner}
                    </span>
                  </div>

                  <button className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg font-medium transition-colors">
                    Voir le groupe
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Join a Group */}
        <section className="bg-gradient-to-r from-wc-blue to-wc-green rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Rejoindre un groupe existant</h2>
          <p className="mb-6 opacity-90">Entrez le code d'invitation reçu par email ou créez votre propre lien.</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Code d'invitation"
              className="flex-1 px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
            <button className="bg-wc-orange hover:bg-yellow-300 text-wc-blue font-bold px-6 py-2 rounded-lg transition-colors">
              Rejoindre
            </button>
          </div>

          <p className="mt-4 text-sm opacity-75">
            Créer votre propre groupe → Invite vos amis par email
          </p>
        </section>
      </main>
    </div>
  );
};

export default Groups;
