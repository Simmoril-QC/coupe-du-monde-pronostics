import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { SportProvider } from './lib/SportContext';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthVerify from './pages/AuthVerify';
import Groups from './pages/Groups';
import Matches from './pages/Matches';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <SportProvider>
        <div className="app-container">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/verify" element={<AuthVerify />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </SportProvider>
    </AuthProvider>
  );
}
