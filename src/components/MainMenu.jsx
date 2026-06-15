/**
 * MainMenu.jsx — Landing screen, adapts to auth state
 */
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import PokeballIcon from './PokeballIcon';

const BG_SHAPES = [
  { x: 8,  y: 15, size: 60, dur: 7,  delay: 0   },
  { x: 88, y: 20, size: 40, dur: 9,  delay: 1   },
  { x: 20, y: 75, size: 50, dur: 8,  delay: 2   },
  { x: 75, y: 70, size: 35, dur: 10, delay: 0.5 },
  { x: 50, y: 10, size: 25, dur: 6,  delay: 1.5 },
  { x: 35, y: 50, size: 20, dur: 11, delay: 3   },
  { x: 92, y: 55, size: 45, dur: 8,  delay: 2.5 },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { showToast } = useToast();

  async function handleLogout() {
    try {
      await logout();
      showToast('Logged out. See you next time!', 'info');
    } catch {
      showToast('Logout failed.', 'error');
    }
  }

  return (
    <div className="menu-root">
      {/* Floating background orbs */}
      <div className="menu-bg-shapes" aria-hidden="true">
        {BG_SHAPES.map((s, i) => (
          <div
            key={i}
            className="menu-bg-shape"
            style={{
              left: `${s.x}%`,
              top:  `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay:    `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="menu-card">
        {/* Logo */}
        <div className="menu-logo-area">
          <div className="menu-pokeball-wrap">
            <PokeballIcon size={72} />
            <div className="menu-pokeball-glow" aria-hidden="true" />
          </div>
          <h1 className="menu-title">
            Pokémon<br />
            <span className="menu-title-accent">Silhouette</span>
            <br />Guesser
          </h1>
          {user && profile ? (
            <p className="menu-welcome">
              Welcome back, <strong>{profile.username}</strong>! 👋
            </p>
          ) : (
            <p className="menu-subtitle">
              Can you name the Pokémon from its shadow?
            </p>
          )}
        </div>

        {/* Nav buttons — changes based on auth state */}
        <nav className="menu-nav" aria-label="Main menu">
          {user ? (
            /* ── Logged-in menu ── */
            <>
              <button
                id="menu-start-btn"
                className="menu-btn menu-btn-start"
                onClick={() => navigate('/game')}
              >
                <span className="menu-btn-icon">▶</span>
                <span className="menu-btn-label">Play</span>
              </button>

              <button
                id="menu-multiplayer-btn"
                className="menu-btn menu-btn-multi"
                onClick={() => navigate('/multiplayer')}
              >
                <span className="menu-btn-icon">🎮</span>
                <span className="menu-btn-label">Party Match</span>
              </button>

              <button
                id="menu-ranked-btn"
                className="menu-btn menu-btn-start"
                onClick={() => navigate('/ranked')}
                style={{ background: '#9c27b0' }}
              >
                <span className="menu-btn-icon">⚔️</span>
                <span className="menu-btn-label">Ranked Match</span>
              </button>

              <button
                id="menu-daily-btn"
                className="menu-btn menu-btn-daily"
                onClick={() => navigate('/daily')}
                style={{ background: 'var(--color-pokemon-yellow)', color: '#1a1a2e' }}
              >
                <span className="menu-btn-icon">📅</span>
                <span className="menu-btn-label">Daily Challenge</span>
              </button>

              <button
                id="menu-leaderboard-btn"
                className="menu-btn menu-btn-info"
                onClick={() => navigate('/leaderboard')}
              >
                <span className="menu-btn-icon">🏆</span>
                <span className="menu-btn-label">Leaderboard</span>
              </button>
              
              <button
                id="menu-friends-btn"
                className="menu-btn menu-btn-ghost"
                onClick={() => navigate('/friends')}
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <span className="menu-btn-icon">👥</span>
                <span className="menu-btn-label">Friends</span>
              </button>

              <button
                id="menu-profile-btn"
                className="menu-btn menu-btn-ghost"
                onClick={() => navigate('/profile')}
              >
                <span className="menu-btn-icon">👤</span>
                <span className="menu-btn-label">My Profile</span>
              </button>

              <button
                id="menu-logout-btn"
                className="menu-btn menu-btn-danger"
                onClick={handleLogout}
              >
                <span className="menu-btn-icon">🚪</span>
                <span className="menu-btn-label">Logout</span>
              </button>
            </>
          ) : (
            /* ── Guest menu ── */
            <>
              <Link
                id="menu-login-btn"
                className="menu-btn menu-btn-start"
                to="/login"
                style={{ textDecoration: 'none' }}
              >
                <span className="menu-btn-icon">▶</span>
                <span className="menu-btn-label">Sign In &amp; Play</span>
              </Link>

              <Link
                id="menu-register-btn"
                className="menu-btn menu-btn-ghost"
                to="/register"
                style={{ textDecoration: 'none' }}
              >
                <span className="menu-btn-icon">✨</span>
                <span className="menu-btn-label">Create Account</span>
              </Link>

              <Link
                id="menu-leaderboard-guest-btn"
                className="menu-btn menu-btn-info"
                to="/leaderboard"
                style={{ textDecoration: 'none' }}
              >
                <span className="menu-btn-icon">🏆</span>
                <span className="menu-btn-label">Leaderboard</span>
              </Link>
            </>
          )}

          {/* Connect — always visible */}
          <a
            id="menu-connect-link"
            className="menu-btn menu-btn-connect"
            href="https://www.linkedin.com/in/kaushikbhadra07"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="menu-btn-icon">🔗</span>
            <span className="menu-btn-label">Connect</span>
          </a>
        </nav>

        <p className="menu-footer">1,025 Pokémon · Gen I – IX</p>
      </div>
    </div>
  );
}
