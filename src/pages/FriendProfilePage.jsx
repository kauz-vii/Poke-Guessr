/**
 * FriendProfilePage.jsx — Public profile viewer for any trainer.
 * Route: /friends/:userId
 * Respects privacy_level: public | friends | private
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocial } from '../contexts/SocialContext';
import PresenceDot from '../components/PresenceDot';
import {
  getPublicProfile,
  getFriendStatus,
  sendPartyInvite,
  removeFriend,
  STATUS_CONFIG,
} from '../socialApi';
import { sendFriendRequest } from '../friendsApi';
import { getLevelInfo, getRankTier } from '../utils';

const RANK_COLORS = {
  'Beginner':    '#6b7280',
  'Poké Ball':   '#ef4444',
  'Great Ball':  '#3b82f6',
  'Ultra Ball':  '#a855f7',
  'Master Ball': '#f59e0b',
  'Champion':    '#fbbf24',
};

function StatCard({ label, value }) {
  return (
    <div className="fp-stat-card">
      <div className="fp-stat-value">{value}</div>
      <div className="fp-stat-label">{label}</div>
    </div>
  );
}

export default function FriendProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { showToast } = useToast();
  const { presenceMap, reloadFriends, friendIds } = useSocial();

  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState('none'); // friends | request_sent | request_received | none
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = user?.id === userId;
  const isFriend = friendIds.includes(userId);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId, user?.id]); // eslint-disable-line

  async function loadProfile() {
    setLoading(true);
    try {
      const [prof, status] = await Promise.all([
        getPublicProfile(userId),
        user ? getFriendStatus(user.id, userId) : Promise.resolve('none'),
      ]);
      setProfile(prof);
      setFriendStatus(status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFriend() {
    if (!user) { navigate('/login'); return; }
    setActionLoading(true);
    try {
      await sendFriendRequest(user.id, userId);
      setFriendStatus('request_sent');
      showToast('Friend request sent! 👋', 'success');
    } catch {
      showToast('Failed to send request.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this friend?')) return;
    setActionLoading(true);
    try {
      await removeFriend(user.id, userId);
      setFriendStatus('none');
      await reloadFriends();
      showToast('Friend removed.', 'info');
    } catch {
      showToast('Failed to remove friend.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInvite() {
    showToast('Create a Party room, then use the Invite button from your friends list!', 'info');
    navigate('/multiplayer');
  }

  if (loading) {
    return (
      <div className="fp-root">
        <div className="profile-topbar"><Link to="/friends" className="profile-back-btn">← Friends</Link></div>
        <div className="page-center"><p className="loading-text">Loading profile...</p></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fp-root">
        <div className="profile-topbar"><Link to="/friends" className="profile-back-btn">← Friends</Link></div>
        <div className="page-center"><p style={{ color: 'var(--color-text-muted)' }}>Trainer not found.</p></div>
      </div>
    );
  }

  // Privacy check
  const isPrivate = profile.privacy_level === 'private' && !isMe;
  const isFriendsOnly = profile.privacy_level === 'friends' && !isFriend && !isMe;
  const statsHidden = isPrivate || isFriendsOnly;

  const { level, progressPercent, xpIntoLevel, xpNeededForLevel } = getLevelInfo(profile.xp || 0);
  const rankTier  = getRankTier(profile.rating || 1200);
  const rankColor = RANK_COLORS[rankTier] || '#6b7280';
  const winRate   = profile.games_played
    ? Math.round((profile.wins / profile.games_played) * 100)
    : 0;

  const presenceStatus = presenceMap[userId] || 'offline';
  const statusCfg      = STATUS_CONFIG[presenceStatus] || STATUS_CONFIG.offline;

  return (
    <div className="fp-root">
      <div className="profile-topbar">
        <Link to="/friends" className="profile-back-btn">← Friends</Link>
        {isMe && <Link to="/profile" className="profile-back-btn" style={{ marginLeft: 'auto' }}>Edit Profile</Link>}
      </div>

      <div className="fp-container">
        {/* Hero section */}
        <div className="fp-hero">
          <div className="fp-avatar-ring" style={{ borderColor: rankColor }}>
            <div className="fp-avatar-letters">
              {(profile.username || '?').slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="fp-hero-info">
            <h1 className="fp-username">{profile.username}</h1>
            {profile.trainer_title && (
              <p className="fp-title">{profile.trainer_title}</p>
            )}
            <div className="fp-hero-badges">
              <span className="fp-rank-badge" style={{ borderColor: rankColor, color: rankColor }}>
                {rankTier}
              </span>
              <span className="fp-level-badge">Lv {level}</span>
              <PresenceDot status={presenceStatus} showLabel size={10} />
            </div>
            <div className="fp-status-text" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </div>

            {/* XP bar */}
            <div className="fp-xp-row">
              <div className="fp-xp-track">
                <div className="fp-xp-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="fp-xp-text">{xpIntoLevel} / {xpNeededForLevel} XP</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!isMe && (
          <div className="fp-actions">
            {friendStatus === 'friends' && (
              <>
                <button className="btn btn-primary" onClick={handleInvite} disabled={actionLoading}>
                  🎮 Invite to Party
                </button>
                <button className="btn btn-ghost" onClick={handleRemove} disabled={actionLoading}>
                  ✕ Remove Friend
                </button>
              </>
            )}
            {friendStatus === 'none' && (
              <button className="btn btn-primary" onClick={handleAddFriend} disabled={actionLoading}>
                + Add Friend
              </button>
            )}
            {friendStatus === 'request_sent' && (
              <button className="btn btn-ghost" disabled>✓ Request Sent</button>
            )}
            {friendStatus === 'request_received' && (
              <button className="btn btn-primary" onClick={() => navigate('/friends')}>
                Accept Request
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        {statsHidden ? (
          <div className="fp-private-notice">
            <p>🔒 This trainer's stats are {profile.privacy_level}.</p>
          </div>
        ) : (
          <>
            {/* Favorites */}
            <div className="fp-favorites-row">
              {profile.favorite_pokemon && (
                <div className="fp-favorite-chip">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.favorite_pokemon}.png`}
                    alt=""
                    className="fp-fav-sprite"
                  />
                  <span>Favourite Pokémon</span>
                </div>
              )}
              {profile.favorite_region && (
                <div className="fp-favorite-chip">
                  🌍 <span>{profile.favorite_region}</span>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="fp-stats-section">
              <h3 className="fp-section-title">Trainer Stats</h3>
              <div className="fp-stats-grid">
                <StatCard label="Games Played"     value={profile.games_played || 0} />
                <StatCard label="Wins"             value={profile.wins || 0} />
                <StatCard label="Win Rate"         value={`${winRate}%`} />
                <StatCard label="Win Streak"       value={profile.win_streak || 0} />
                <StatCard label="Best Streak"      value={profile.highest_win_streak || 0} />
                <StatCard label="Hardcore Record"  value={profile.highest_hardcore_streak || 0} />
                <StatCard label="Rating"           value={profile.rating || 1200} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
