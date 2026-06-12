import { useState } from 'react';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';

const Matches = () => {
  const [filter, setFilter] = useState('all');
  const [matches] = useState([
    {
      id: '1',
      external_id: 'wc_001',
      home_team: 'Canada',
      away_team: 'Mexico',
      status: 'scheduled',
      match_date: '2026-06-11T18:00:00Z',
      stage: 'group_stage'
    },
    {
      id: '2',
      external_id: 'wc_002',
      home_team: 'United States',
      away_team: 'Costa Rica',
      status: 'scheduled',
      match_date: '2026-06-12T15:00:00Z',
      stage: 'group_stage'
    },
    {
      id: '3',
      external_id: 'wc_003',
      home_team: 'Argentina',
      away_team: 'Jamaica',
      status: 'scheduled',
      match_date: '2026-06-13T18:00:00Z',
      stage: 'group_stage'
    },
    {
      id: '4',
      external_id: 'wc_final_2026',
      home_team: 'TBD',
      away_team: 'TBD',
      status: 'scheduled',
      match_date: '2026-07-19T18:00:00Z',
      stage: 'final'
    }
  ]);

  const stages = [
    { id: 'all', label: 'Tous' },
    { id: 'group_stage', label: 'Phase de groupes' },
    { id: 'round_of_16', label: '1/8 de finale' },
    { id: 'quarter_final', label: '1/4 de finale' },
    { id: 'semi_final', label: 'Demi-finale' },
    { id: 'final', label: 'Finale' }
  ];

  const filteredMatches = filter === 'all' 
    ? matches 
    : matches.filter(m => m.stage === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Tous les matchs</h1>
          
          {/* Filters */}
          <div className="flex overflow-x-auto pb-2 scrollbar-hide">
            {stages.map(stage => (
              <button
                key={stage.id}
                onClick={() => setFilter(stage.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors mr-2 ${
                  filter === stage.id
                    ? 'bg-wc-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Match Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>

        {/* Final Match Highlight */}
        {filter === 'all' && (
          <section className="mt-12 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="bg-wc-orange text-wc-blue px-3 py-1 rounded-lg text-sm font-bold">FINAL</span>
              Finale de la Coupe du Monde 2026
            </h2>
            
            {filteredMatches.filter(m => m.stage === 'final').map(match => (
              <div key={match.id} className="bg-gradient-to-br from-wc-blue via-wc-green to-green-900 rounded-2xl p-8 text-white shadow-xl">
                <div className="text-center">
                  <p className="text-lg opacity-90 mb-4">Vendredi 19 juillet 2026</p>
                  <h3 className="text-3xl font-bold mb-6">Équipe A vs Équipe B</h3>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <p className="mb-4 text-center">Prédisez le vainqueur de la finale !</p>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-4">
                      <button className="bg-white/20 hover:bg-white/30 py-3 rounded-lg font-medium transition-colors">
                        Équipe A
                      </button>
                      <button className="bg-white/20 hover:bg-white/30 py-3 rounded-lg font-medium transition-colors">
                        Équipe B
                      </button>
                    </div>

                    <input
                      type="number"
                      placeholder="Score Équipe A"
                      className="w-full mb-3 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-center focus:ring-2 focus:ring-wc-orange focus:border-transparent"
                    />
                    
                    <button className="w-full py-3 bg-wc-orange text-wc-blue font-bold rounded-lg hover:bg-yellow-300 transition-colors">
                      Valider ma prédiction
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default Matches;
