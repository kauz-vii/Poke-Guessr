/**
 * MainMenu.jsx — Landing screen, adapts to auth state
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import PokeballIcon from './PokeballIcon';
import NotificationBell from './NotificationBell';
import { useSocial } from '../contexts/SocialContext';
import { useDailyReward } from '../contexts/DailyRewardContext';

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
  const { rewardAvailable, openModal } = useDailyReward();
  const [showPlayMenu, setShowPlayMenu] = useState(false);

  const level = profile ? Math.floor(Math.sqrt((profile.xp || 0) / 100)) + 1 : 1;
  const isRankedLocked = level < 10;
  const isHardcoreLocked = level < 5;

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
            Poke-<span className="menu-title-accent">Guessr</span>
          </h1>
          {user && profile ? (
            <p className="menu-welcome">
              Welcome back, <strong>{profile.username}</strong>! 👋
            </p>
          ) : (
            <p className="menu-subtitle">
               Gotta guess 'em all !
            </p>
          )}
        </div>

        {/* Nav buttons — changes based on auth state */}
        <nav className="menu-nav" aria-label="Main menu">
          {user ? (
            /* ── Logged-in menu ── */
            <>
              {/* ── PLAY button + expandable sub-menu ── */}
              <button
                id="menu-start-btn"
                className={`menu-btn menu-btn-start ${showPlayMenu ? 'menu-btn-active' : ''}`}
                onClick={() => setShowPlayMenu(p => !p)}
              >
                <span className="menu-btn-icon">{showPlayMenu ? '✕' : '▶'}</span>
                <span className="menu-btn-label">
                  {showPlayMenu ? 'Close' : 'Play'}
                </span>
              </button>

              {/* ── Animated Play Sub-menu ── */}
              <div className={`menu-play-submenu ${showPlayMenu ? 'menu-play-submenu--open' : ''}`}>
                {/* Singleplayer */}
                <button
                  className="play-mode-btn"
                  onClick={() => navigate('/game')}
                  title="Casual solo play"
                >
                  <span className="play-mode-icon">🎮</span>
                  <span className="play-mode-label">Singleplayer</span>
                </button>

                {/* Multiplayer / Party Match */}
                <button
                  className="play-mode-btn"
                  onClick={() => navigate('/multiplayer')}
                  title="Custom lobby with friends"
                >
                  <span className="play-mode-icon">👥</span>
                  <span className="play-mode-label">Multiplayer</span>
                </button>

                {/* Hardcore */}
                <button
                  className={`play-mode-btn play-mode-btn--hardcore ${isHardcoreLocked ? 'play-mode-btn--locked' : ''}`}
                  onClick={() => {
                    if (isHardcoreLocked) {
                      showToast('Hardcore Mode unlocks at Level 5!', 'warning');
                    } else {
                      navigate('/hardcore');
                    }
                  }}
                  title={isHardcoreLocked ? 'Unlocks at Level 5' : 'One wrong answer = elimination'}
                >
                  <span className="play-mode-icon">{isHardcoreLocked ? '🔒' : '☠️'}</span>
                  <span className="play-mode-label">
                    Hardcore
                    {isHardcoreLocked && <span className="play-mode-lock-hint">Lvl 5</span>}
                  </span>
                </button>

                {/* Ranked Match */}
                <button
                  className={`play-mode-btn play-mode-btn--ranked ${isRankedLocked ? 'play-mode-btn--locked' : ''}`}
                  onClick={() => {
                    if (isRankedLocked) {
                      showToast('Ranked Match unlocks at Level 10!', 'warning');
                    } else {
                      navigate('/ranked');
                    }
                  }}
                  title={isRankedLocked ? 'Unlocks at Level 10' : 'Competitive 1v1 Elo matches'}
                >
                  <span className="play-mode-icon">{isRankedLocked ? '🔒' : '⚔️'}</span>
                  <span className="play-mode-label">
                    Ranked
                    {isRankedLocked && <span className="play-mode-lock-hint">Lvl 10</span>}
                  </span>
                </button>

                {/* Daily Challenge */}
                <button
                  className="play-mode-btn play-mode-btn--daily"
                  onClick={() => navigate('/daily')}
                  title="One shot, global leaderboard"
                >
                  <span className="play-mode-icon">📅</span>
                  <span className="play-mode-label">Daily</span>
                </button>

                {/* Weekly Challenge */}
                <button
                  className="play-mode-btn play-mode-btn--weekly"
                  onClick={() => navigate('/weekly')}
                  title="Monthly rotating challenges"
                >
                  <span className="play-mode-icon">📆</span>
                  <span className="play-mode-label">Weekly</span>
                </button>
              </div>

              {/* ── Utility buttons ── */}
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
                style={{ background: 'rgba(255,255,255,0.1)', position: 'relative' }}
              >
                <span className="menu-btn-icon">👥</span>
                <span className="menu-btn-label">Friends</span>
                <span className="menu-notif-bell"><NotificationBell /></span>
              </button>

              {/* Daily Reward */}
              <button
                id="menu-daily-reward-btn"
                className="menu-btn menu-btn-ghost"
                onClick={openModal}
                style={{ background: 'rgba(255,255,255,0.1)', position: 'relative' }}
              >
                <span className="menu-btn-icon">🎁</span>
                <span className="menu-btn-label">Daily Reward</span>
                {rewardAvailable && <span className="dr-available-dot" />}
              </button>

              <button
                id="menu-pokedex-btn"
                className="menu-btn menu-btn-ghost"
                onClick={() => navigate('/pokedex')}
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <span className="menu-btn-icon">📖</span>
                <span className="menu-btn-label">Pokédex</span>
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
