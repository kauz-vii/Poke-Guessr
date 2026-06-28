/**
 * App.jsx — Root component with React Router routes
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import ProtectedRoute    from './components/ProtectedRoute';
import MainMenu          from './components/MainMenu';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import GamePage          from './pages/GamePage';
import ProfilePage       from './pages/ProfilePage';
import LeaderboardPage   from './pages/LeaderboardPage';
import MultiplayerPage   from './pages/MultiplayerPage';
import PokedexPage       from './pages/PokedexPage';
import LobbyPage         from './pages/LobbyPage';
import GameStartingPage  from './pages/GameStartingPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import DailyChallengePage  from './pages/DailyChallengePage';
import FriendsPage       from './pages/FriendsPage';
import HardcoreGamePage  from './pages/HardcoreGamePage';
import WeeklyChallengePage from './pages/WeeklyChallengePage';
import FriendProfilePage from './pages/FriendProfilePage';
import FriendInviteModal from './components/FriendInviteModal';
import { useEffect } from 'react';
import RankedQueuePage   from './pages/RankedQueuePage';
import LoadingState      from './components/LoadingState';
import { useToast }      from './contexts/ToastContext';
import FeedbackWidget    from './components/FeedbackWidget';

export default function App() {
  const { loading } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const handleAchieve = (e) => {
      const ach = e.detail;
      showToast(`${ach.icon} Achievement Unlocked: ${ach.title}`, 'success');
    };
    window.addEventListener('achievement_unlocked', handleAchieve);
    return () => window.removeEventListener('achievement_unlocked', handleAchieve);
  }, [showToast]);

  // Wait for Supabase session to resolve before rendering routes
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/"            element={<MainMenu />} />
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        {/* Protected */}
        <Route path="/game"          element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/multiplayer"   element={<ProtectedRoute><MultiplayerPage /></ProtectedRoute>} />
        <Route path="/lobby/:roomId" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/game-starting/:roomId" element={<ProtectedRoute><GameStartingPage /></ProtectedRoute>} />
        <Route path="/multiplayer/game/:roomId" element={<ProtectedRoute><MultiplayerGamePage /></ProtectedRoute>} />
        <Route path="/daily"         element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
        <Route path="/friends"       element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/ranked"        element={<ProtectedRoute><RankedQueuePage /></ProtectedRoute>} />
        <Route path="/pokedex"       element={<ProtectedRoute><PokedexPage /></ProtectedRoute>} />
        <Route path="/hardcore"      element={<ProtectedRoute><HardcoreGamePage /></ProtectedRoute>} />
        <Route path="/weekly"        element={<ProtectedRoute><WeeklyChallengePage /></ProtectedRoute>} />
        <Route path="/friends/:userId" element={<ProtectedRoute><FriendProfilePage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global feedback button — floats on every screen */}
      <FeedbackWidget />
      {/* Party invite modal — floats globally */}
      <FriendInviteModal />
    </>
  );
}
