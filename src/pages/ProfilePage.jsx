/**
 * ProfilePage.jsx — Displays the logged-in trainer's persistent stats
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../supabase';
import { getLevelInfo, getRankTier } from '../utils';
import { ACHIEVEMENTS } from '../achievements';

/** Avatar using initials */
function Avatar({ username }) {
  const initials = (username || '?')
    .split(/[\s_]/)
    .map(w => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
  return (
    <div className="profile-avatar" aria-hidden="true">
      {initials}
    </div>
  );
}

/** One stat card */
function StatCard({ icon, label, value, highlight }) {
  return (
    <div className={`profile-stat-card ${highlight ? 'profile-stat-highlight' : ''}`}>
      <span className="profile-stat-icon">{icon}</span>
      <span className="profile-stat-value">{value ?? 0}</span>
      <span className="profile-stat-label">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { showToast } = useToast();
  const [recentMatches, setRecentMatches] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());

  useEffect(() => {
    if (profile?.id) {
      supabase.from('match_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('date_played', { ascending: false })
        .limit(3)
        .then(({ data }) => { if (data) setRecentMatches(data); });
        
      supabase.from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.id)
        .then(({ data }) => {
          if (data) {
            setUnlockedAchievements(new Set(data.map(a => a.achievement_id)));
          }
        });
    }
  }, [profile?.id]);

  async function handleLogout() {
    try {
      await logout();
      showToast('Logged out. See you next time!', 'info');
      navigate('/');
    } catch {
      showToast('Logout failed. Please try again.', 'error');
    }
  }

  if (!profile) {
    return (
      <div className="page-center">
        <div className="loading-state">
          <p className="loading-text">Loading profile…</p>
        </div>
      </div>
    );
  }

  const { level, xp, xpIntoLevel, xpNeededForLevel, progressPercent } = getLevelInfo(profile.xp || 0);
  const winRate = profile.games_played > 0 ? Math.round(((profile.games_won || 0) / profile.games_played) * 100) : 0;

  return (
    <div className="profile-root">
      {/* Back nav */}
      <div className="profile-topbar">
        <Link to="/" className="profile-back-btn">← Menu</Link>
        <Link to="/leaderboard" className="profile-nav-link">🏆 Leaderboard</Link>
      </div>

      <div className="profile-card">
        {/* Header */}
        <div className="profile-header" style={{ marginBottom: '1rem' }}>
          <Avatar username={profile.username} />
          <div className="profile-info" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 className="profile-username" style={{ margin: 0 }}>{profile.username}</h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ background: 'var(--color-pokemon-yellow)', color: '#1a1a2e', padding: '4px 12px', borderRadius: '20px', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                  LVL {level}
                </div>
                <div style={{ background: '#9c27b0', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                  {getRankTier(profile.rating || 1200)} ({profile.rating || 1200})
                </div>
              </div>
            </div>
            <p className="profile-joined">
              Trainer since{' '}
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            <span>XP: {xp}</span>
            <span>Next Level: {xpIntoLevel} / {xpNeededForLevel}</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--color-pokemon-blue)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="profile-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <StatCard icon="🎮" label="Played"    value={profile.games_played}  />
          <StatCard icon="🏆" label="Win Rate"  value={`${winRate}%`} highlight />
          <StatCard icon="⭐" label="High Score"   value={profile.highest_score} />
          <StatCard icon="🔥" label="Daily Streak"   value={profile.daily_streak || 0} />
        </div>

        {/* Achievements */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem', letterSpacing: '1px' }}>
            Achievements ({unlockedAchievements.size} / {Object.keys(ACHIEVEMENTS).length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {Object.values(ACHIEVEMENTS).map(ach => {
              const isUnlocked = unlockedAchievements.has(ach.id);
              return (
                <div key={ach.id} style={{ 
                  background: isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  padding: '12px', borderRadius: '8px', textAlign: 'center',
                  opacity: isUnlocked ? 1 : 0.4,
                  filter: isUnlocked ? 'none' : 'grayscale(100%)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{ach.icon}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isUnlocked ? 'var(--color-pokemon-yellow)' : 'white' }}>{ach.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.2 }}>{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem', letterSpacing: '1px' }}>Recent Matches</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize', marginRight: '8px' }}>{m.game_mode}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {new Date(m.date_played).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: 'var(--color-pokemon-yellow)' }}>{m.total_score} pts</div>
                    {m.placement && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{m.placement}{['st','nd','rd'][m.placement-1] || 'th'} Place</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="profile-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/game')}
          >
            ▶ Play Now
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
