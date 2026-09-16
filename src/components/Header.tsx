import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSport } from '../lib/SportContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { sport, setSport, sports } = useSport();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-gradient-to-r from-wc-blue to-wc-green py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="Coupe du Monde" className="h-10 w-10" />
          <div className="hidden sm:block">
            <h1 className={`font-bold text-white transition-colors ${scrolled ? 'text-wc-blue' : ''}`}>Pronos</h1>
            <p className={`text-xs font-medium transition-colors ${scrolled ? 'text-gray-500' : 'text-wc-orange'}`}>Multi-sports & Groupes</p>
          </div>
        </Link>

        {/* Sélecteur de sport */}
        <div className="hidden md:block">
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            title="Choisir le sport"
            className={`text-sm font-medium rounded-full px-3 py-1.5 border transition-colors ${scrolled ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/15 border-white/25 text-white [&>option]:text-gray-800'}`}
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <nav className="flex items-center gap-4 md:gap-6">
          {user ? (
            <>
              <Link to="/groups" className={`hidden sm:inline font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>Groupes</Link>
              <Link to="/matches" className={`hidden sm:inline font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>Matchs</Link>
              <Link to="/leaderboard" className={`hidden sm:inline font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>Classement</Link>
              {user.is_admin && (
                <Link to="/admin" className={`font-medium px-3 py-1.5 rounded-lg transition-colors ${scrolled ? 'bg-wc-green text-white hover:bg-green-700' : 'bg-wc-orange text-wc-blue font-bold hover:bg-yellow-300'}`}>Admin</Link>
              )}
              <button onClick={() => logout()} title="Se déconnecter" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                <span className={`font-medium max-w-[140px] truncate ${scrolled ? 'text-gray-700' : 'text-white'}`}>{user.email}</span>
                <span className={`text-xs ${scrolled ? 'text-gray-400' : 'text-white/70'}`}>↩</span>
              </button>
            </>
          ) : (
            <Link to="/login" className={`px-4 py-1.5 rounded-lg font-medium transition-all ${scrolled ? 'bg-wc-green text-white hover:bg-green-700' : 'bg-wc-orange text-wc-blue hover:bg-yellow-300'}`}>Connexion</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
