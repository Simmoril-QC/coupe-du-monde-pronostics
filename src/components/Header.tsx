import { useState, useEffect } from 'react';
import { useStore } from '../store';

const Header = () => {
  const { user } = useStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md py-2' : 'bg-gradient-to-r from-wc-blue to-wc-green py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="Coupe du Monde" 
            className="h-10 w-10"
          />
          <div>
            <h1 className={`font-bold text-white transition-colors ${scrolled ? 'text-wc-blue' : ''}`}>
              World Cup
            </h1>
            <p className={`text-xs font-medium transition-colors ${scrolled ? 'text-gray-500' : 'text-wc-orange'}`}>
              Pronos & Groupes
            </p>
          </div>
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <a href="/groups" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>
                Groupes
              </a>
              <a href="/matches" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>
                Matches
              </a>
              <a href="/leaderboard" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>
                Classement
              </a>
              {user.is_admin && (
                <a 
                  href="/admin" 
                  className={`font-medium px-4 py-2 rounded-lg transition-colors ${
                    scrolled 
                      ? 'bg-wc-green text-white hover:bg-green-700' 
                      : 'bg-wc-orange text-wc-blue font-bold hover:bg-yellow-300'
                  }`}
                >
                  Admin
                </a>
              )}
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                <span className={`font-medium ${scrolled ? 'text-gray-700' : 'text-white'}`}>
                  {user.email}
                </span>
              </button>
            </>
          ) : (
            <>
              <a href="/login" className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-wc-blue' : 'text-white hover:text-wc-orange'}`}>
                Connexion
              </a>
              <a 
                href="/signup" 
                className={`px-5 py-2 rounded-lg font-medium transition-all ${
                  scrolled 
                    ? 'bg-wc-green text-white hover:bg-green-700' 
                    : 'bg-wc-orange text-wc-blue hover:bg-yellow-300'
                }`}
              >
                S'inscrire
              </a>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden p-2">
          <svg className={`w-6 h-6 ${scrolled ? 'text-gray-800' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
