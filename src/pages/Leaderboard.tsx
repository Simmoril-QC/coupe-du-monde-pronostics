import { useState } from 'react';
import Header from '../components/Header';

const Leaderboard = () => {
  const [leaderboard] = useState([
    {
      rank: 1,
      name: 'Moi',
      score: 425,
      correctPredictions: 18,
      averagePoints: 23.6
    },
    {
      rank: 2,
      name: 'Thomas',
      score: 398,
      correctPredictions: 16,
      averagePoints: 22.1
    },
    {
      rank: 3,
      name: 'Sophie',
      score: 375,
      correctPredictions: 15,
      averagePoints: 20.8
    },
    {
      rank: 4,
      name: 'Lucas',
      score: 362,
      correctPredictions: 14,
      averagePoints: 19.0
    },
    {
      rank: 5,
      name: 'Camille',
      score: 345,
      correctPredictions: 13,
      averagePoints: 18.1
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-24 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Classement Global</h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Qui est le meilleur pronostiqueur de votre groupe ? Le classement évolue à chaque match !
          </p>
        </div>

        {/* Top 3 Podium */}
        <div className="flex items-end justify-center gap-4 mb-12">
          {/* 2nd Place */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-32 md:w-48 text-center transform translate-y-4">
            <div className="text-gray-500 font-bold mb-2">2ème</div>
            <img src="/avatar-placeholder.png" alt="User" className="w-16 h-16 mx-auto rounded-full mb-3 bg-gray-200" />
            <h3 className="font-bold text-gray-900">Sophie</h3>
            <p className="text-wc-blue font-bold text-2xl mt-2">375 pts</p>
          </div>

          {/* 1st Place */}
          <div className="bg-gradient-to-b from-wc-orange to-yellow-400 rounded-xl shadow-xl p-6 w-40 md:w-56 text-center z-10 transform -translate-y-8">
            <img src="/avatar-placeholder.png" alt="Winner" className="w-20 h-20 mx-auto rounded-full mb-3 bg-white" />
            <h3 className="font-bold text-wc-blue text-xl">Moi</h3>
            <p className="text-white font-bold text-3xl mt-2">425 pts</p>
          </div>

          {/* 3rd Place */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-32 md:w-48 text-center transform translate-y-4">
            <div className="text-gray-500 font-bold mb-2">3ème</div>
            <img src="/avatar-placeholder.png" alt="User" className="w-16 h-16 mx-auto rounded-full mb-3 bg-gray-200" />
            <h3 className="font-bold text-gray-900">Thomas</h3>
            <p className="text-wc-blue font-bold text-2xl mt-2">398 pts</p>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Rang</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Joueur</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-700">Score</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700 hidden sm:table-cell">
                  Bonnes prédictions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((user, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      user.rank === 1 ? 'bg-wc-orange text-wc-blue' :
                      user.rank === 2 ? 'bg-gray-300 text-gray-700' :
                      user.rank === 3 ? 'bg-yellow-600 text-white' :
                      'text-gray-500'
                    }`}>
                      {user.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-wc-blue/10 flex items-center justify-center text-wc-blue font-bold">
                      {user.name[0]}
                    </div>
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-wc-green">
                    {user.score} pts
                  </td>
                  <td className="px-6 py-4 text-center hidden sm:table-cell">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                      {user.correctPredictions}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Points System */}
        <div className="mt-8 bg-gradient-to-r from-wc-blue to-wc-green rounded-xl p-6 text-white">
          <h3 className="font-bold mb-4">Comment ça marche ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-90">
            <div className="flex items-start gap-3">
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">+5</span>
              <p>Bon pronostic gagnant (sans le score exact)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-wc-orange text-wc-blue px-2 py-1 rounded text-xs font-bold">+10</span>
              <p>Bon pronostic avec score exact (bonus double)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">+5</span>
              <p>Prédire la finale gagne 5 points supplémentaires</p>
            </div>
          </div>
        </div>

        {/* Switch Group */}
        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Changer de groupe</label>
          <select className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-wc-blue focus:border-transparent">
            <option>Les Amis du Foot (actif)</option>
            <option>Famille Coupe du Monde</option>
          </select>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
