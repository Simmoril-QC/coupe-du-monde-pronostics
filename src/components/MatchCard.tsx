import { useState } from 'react';
import { useStore } from '../store';

interface Group {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

const MatchCard = ({ match }: { match: any }) => {
  const { user, addPrediction } = useStore();
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [prediction, setPrediction] = useState({
    home_score: '',
    away_score: ''
  });

  const handlePredict = () => {
    if (user) {
      addPrediction({
        match_id: match.id,
        predicted_winner: prediction.home_score! > prediction.away_score! 
          ? 'home' 
          : prediction.home_score! < prediction.away_score! 
            ? 'away' 
            : 'draw',
        home_score: Number(prediction.home_score),
        away_score: Number(prediction.away_score)
      });
      setShowScoreInput(false);
    }
  };

  const isFinished = match.status === 'finished';

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
      {/* Match Header */}
      <div className={`px-4 py-3 ${
        isFinished 
          ? 'bg-green-50' 
          : match.status === 'live' 
            ? 'bg-yellow-50 animate-pulse' 
            : 'bg-gradient-to-r from-wc-blue to-wc-green'
      }`}>
        <div className="flex items-center justify-between text-white">
          <span className="text-xs font-semibold uppercase tracking-wide">
            {match.stage.replace('_', ' ')}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isFinished 
              ? 'bg-green-600' 
              : match.status === 'live' 
                ? 'bg-yellow-400 text-yellow-800' 
                : 'bg-white/20'
          }`}>
            {isFinished ? 'Terminé' : match.status === 'live' ? 'En direct' : 'À venir'}
          </span>
        </div>
        
        <div className="mt-2 text-center">
          {isFinished && (
            <div className="text-3xl font-bold text-white mb-1">
              {match.home_score} - {match.away_score}
            </div>
          )}
          {!isFinished && match.match_date && (
            <div className="text-sm text-wc-orange/90 font-medium">
              {new Date(match.match_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </div>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <h3 className="font-bold text-gray-900">{match.home_team}</h3>
            {isFinished && match.home_score !== null && (
              <span className="text-xl font-bold text-wc-green mt-1 block">
                {match.home_score}
              </span>
            )}
          </div>

          <div className="px-4 text-center">
            <span className="text-xs font-medium text-gray-500 uppercase">VS</span>
          </div>

          <div className="text-center flex-1">
            <h3 className="font-bold text-gray-900">{match.away_team}</h3>
            {isFinished && match.away_score !== null && (
              <span className="text-xl font-bold text-wc-green mt-1 block">
                {match.away_score}
              </span>
            )}
          </div>
        </div>

        {/* Prediction Form */}
        {!isFinished && user && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            {!showScoreInput ? (
              <button
                onClick={() => setShowScoreInput(true)}
                className="w-full py-2 px-4 bg-wc-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Faire mon pronostic
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    placeholder="Domicile"
                    value={prediction.home_score}
                    onChange={(e) => setPrediction({ ...prediction, home_score: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Extérieur"
                    value={prediction.away_score}
                    onChange={(e) => setPrediction({ ...prediction, away_score: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-wc-blue focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handlePredict}
                  className="w-full py-2 px-4 bg-gradient-to-r from-wc-green to-wc-orange text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valider le pronostic
                </button>

                <button
                  onClick={() => setShowScoreInput(false)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
              </div>
            )}

            {user && !showScoreInput && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Votre pronostic actuel :</h4>
                {/* Display current prediction if exists */}
                <p className="text-sm text-gray-500 italic">
                  Vous n'avez pas encore fait votre pronostic pour ce match.
                </p>
              </div>
            )}
          </div>
        )}

        {!isFinished && !user && (
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">Connectez-vous pour faire votre pronostic</p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Se connecter
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
