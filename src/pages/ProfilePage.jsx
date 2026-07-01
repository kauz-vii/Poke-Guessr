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
import PlayerCard from '../components/PlayerCard';
import PokemonSearchBox from '../components/PokemonSearchBox';

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
  const { profile, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [recentMatches, setRecentMatches] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', favorite_pokemon: '', favorite_region: '' });

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

  async function handleSaveCard() {
    if (!editForm.username.trim()) return;
    try {
      const { error } = await supabase.from('profiles').update({ 
        username: editForm.username,
        favorite_pokemon: editForm.favorite_pokemon,
        favorite_region: editForm.favorite_region
      }).eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setIsEditingCard(false);
      showToast('Profile updated successfully!', 'success');
    } catch (e) {
      showToast('Failed to update profile.', 'error');
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
        <PlayerCard 
          profile={profile} 
          unlockedAchievements={unlockedAchievements} 
          isMe={true} 
          onEditClick={() => {
            setEditForm({ 
              username: profile.username || '', 
              favorite_pokemon: profile.favorite_pokemon || '', 
              favorite_region: profile.favorite_region || '' 
            });
            setIsEditingCard(true);
          }} 
        />

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

        {/* Ranked Stats */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem', letterSpacing: '1px' }}>
            Competitive Profile
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Current Streak</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: profile.current_win_streak >= 3 ? '#ff9800' : 'white' }}>
                🔥 {profile.current_win_streak || 0} Wins
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Best Streak</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-pokemon-yellow)' }}>
                🏆 {profile.highest_win_streak || 0} Wins
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>MVP Awards</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4caf50' }}>
                🌟 {profile.total_mvps || 0}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Placement Matches</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: (profile.placement_matches_played || 0) >= 10 ? '#2196f3' : 'white' }}>
                🎯 {Math.min(10, profile.placement_matches_played || 0)} / 10
              </div>
            </div>
          </div>
          
          {(profile.rating || 0) >= 1400 && (profile.placement_matches_played || 0) >= 10 && (
            <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px', fontSize: '0.85rem', color: '#f44336', textAlign: 'center' }}>
              <strong>Rank Decay Warning:</strong> Play a ranked match within <strong>{Math.max(0, 14 - Math.floor((new Date() - new Date(profile.last_ranked_match || Date.now())) / (1000 * 60 * 60 * 24)))} days</strong> to prevent rating decay!
            </div>
          )}
        </div>

        {/* ── Daily Login Rewards section ── */}
        <div className="dr-profile-section">
          <h3 className="dr-profile-section-title">🔥 Login Streak</h3>
          <div className="dr-profile-stats">
            <div className="dr-profile-stat">
              <span className="dr-profile-stat-icon">🔥</span>
              <span className="dr-profile-stat-value">{profile.current_login_streak || 0}</span>
              <span className="dr-profile-stat-label">Current Streak</span>
            </div>
            <div className="dr-profile-stat">
              <span className="dr-profile-stat-icon">🏆</span>
              <span className="dr-profile-stat-value">{profile.highest_login_streak || 0}</span>
              <span className="dr-profile-stat-label">Best Streak</span>
            </div>
            <div className="dr-profile-stat">
              <span className="dr-profile-stat-icon">📅</span>
              <span className="dr-profile-stat-value">
                {profile.last_login_date
                  ? new Date(profile.last_login_date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '—'}
              </span>
              <span className="dr-profile-stat-label">Last Claimed</span>
            </div>
            <div className="dr-profile-stat dr-profile-stat--badge">
              <span className="dr-profile-stat-icon">🎖️</span>
              <span className="dr-profile-stat-value">{profile.rare_badge_count || 0}</span>
              <span className="dr-profile-stat-label">Rare Badges</span>
            </div>
          </div>
          {/* Rare badge display */}
          {(profile.rare_badge_count || 0) > 0 && (
            <div className="dr-profile-badges">
              {Array.from({ length: profile.rare_badge_count }).map((_, i) => (
                <span key={i} className="dr-rare-badge-icon" title="Rare Badge — 7-Day Streak">🎖️</span>
              ))}
            </div>
          )}
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

      {isEditingCard && (
        <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content auth-card" style={{ maxWidth: 400, width: '100%', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'white' }}>Edit Player Card</h2>
            
            <label className="form-label">Trainer Name</label>
            <input 
              type="text" 
              className="game-input" 
              value={editForm.username} 
              onChange={e => setEditForm({...editForm, username: e.target.value})} 
            />

            <label className="form-label" style={{ marginTop: '1rem' }}>Favorite Region</label>
            <select 
              className="game-input" 
              value={editForm.favorite_region} 
              onChange={e => setEditForm({...editForm, favorite_region: e.target.value})}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              <option value="">-- Select Region --</option>
              <option value="Kanto">Kanto</option>
              <option value="Johto">Johto</option>
              <option value="Hoenn">Hoenn</option>
              <option value="Sinnoh">Sinnoh</option>
              <option value="Unova">Unova</option>
              <option value="Kalos">Kalos</option>
              <option value="Alola">Alola</option>
              <option value="Galar">Galar</option>
              <option value="Paldea">Paldea</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Favorite Pokémon</label>
            <PokemonSearchBox 
              value={editForm.favorite_pokemon} 
              onChange={val => setEditForm({...editForm, favorite_pokemon: val})} 
            />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSaveCard} style={{ flex: 1 }}>Save Changes</button>
              <button className="btn btn-ghost" onClick={() => setIsEditingCard(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
