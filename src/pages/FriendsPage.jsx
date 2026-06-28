/**
 * FriendsPage.jsx — Full social hub with 4 tabs:
 * [Friends] [Requests] [Activity] [Recent]
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocial } from '../contexts/SocialContext';
import PresenceDot from '../components/PresenceDot';
import {
  searchUsers,
  sendFriendRequest,
  getPendingRequests,
  acceptRequest,
  rejectRequest,
} from '../friendsApi';
import {
  getExtendedFriendsList,
  getOutgoingRequests,
  cancelFriendRequest,
  removeFriend,
  toggleFavorite,
  getRecentPlayers,
  ACTIVITY_LABELS,
  STATUS_CONFIG,
} from '../socialApi';
import { getLevelInfo, getRankTier } from '../utils';

const TABS = [
  { id: 'friends',  label: '👥 Friends'  },
  { id: 'requests', label: '🔔 Requests' },
  { id: 'activity', label: '📡 Activity' },
  { id: 'recent',   label: '🕐 Recent'   },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ username, size = 40 }) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const hue = (username || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="friend-avatar"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 60%, 35%)`,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

function RankBadge({ rating }) {
  const tier = getRankTier(rating || 1200);
  const colors = {
    'Beginner': '#6b7280', 'Poké Ball': '#ef4444',
    'Great Ball': '#3b82f6', 'Ultra Ball': '#a855f7',
    'Master Ball': '#f59e0b', 'Champion': '#fbbf24',
  };
  return (
    <span className="rank-badge" style={{ borderColor: colors[tier] || '#6b7280', color: colors[tier] || '#6b7280' }}>
      {tier}
    </span>
  );
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { presenceMap, activityFeed, reloadFriends } = useSocial();

  const [activeTab, setActiveTab] = useState('friends');

  // Friends tab state
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Requests tab state
  const [incoming, setIncoming]   = useState([]);
  const [outgoing, setOutgoing]   = useState([]);
  const [incomingCount, setIncomingCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [requestedIds, setRequestedIds]   = useState(new Set());

  // Recent players
  const [recentPlayers, setRecentPlayers] = useState([]);

  // ── Load data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user?.id]); // eslint-disable-line

  async function loadAll() {
    setLoadingFriends(true);
    try {
      const [f, inc, out, recent] = await Promise.all([
        getExtendedFriendsList(user.id),
        getPendingRequests(user.id),
        getOutgoingRequests(user.id),
        getRecentPlayers(user.id),
      ]);
      setFriends(f);
      setIncoming(inc);
      setIncomingCount(inc.length);
      setOutgoing(out);
      setRecentPlayers(recent);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFriends(false);
    }
  }

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 3) { setSearchResults([]); return; }
      setIsSearching(true);
      const results = await searchUsers(searchQuery, user.id);
      const friendSet = new Set(friends.map(f => f.friendId));
      setSearchResults(results.filter(r => !friendSet.has(r.id)));
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, friends]); // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleSendRequest(receiverId) {
    try {
      await sendFriendRequest(user.id, receiverId);
      setRequestedIds(prev => new Set([...prev, receiverId]));
      showToast('Friend request sent! 👋', 'success');
    } catch (err) {
      showToast(err?.code === '23505' ? 'Request already sent.' : 'Failed to send request.', 'error');
    }
  }

  async function handleAccept(reqId, senderId) {
    try {
      await acceptRequest(reqId, user.id, senderId);
      showToast('Friend added! 🤝', 'success');
      setIncoming(prev => prev.filter(r => r.id !== reqId));
      setIncomingCount(c => Math.max(0, c - 1));
      await reloadFriends();
      loadAll();
    } catch {
      showToast('Failed to accept.', 'error');
    }
  }

  async function handleReject(reqId) {
    await rejectRequest(reqId);
    setIncoming(prev => prev.filter(r => r.id !== reqId));
    setIncomingCount(c => Math.max(0, c - 1));
  }

  async function handleCancel(reqId) {
    await cancelFriendRequest(reqId);
    setOutgoing(prev => prev.filter(r => r.id !== reqId));
  }

  async function handleRemove(friendId) {
    if (!window.confirm('Remove this friend?')) return;
    await removeFriend(user.id, friendId);
    setFriends(prev => prev.filter(f => f.friendId !== friendId));
    await reloadFriends();
    showToast('Friend removed.', 'info');
  }

  async function handleToggleFav(friendId) {
    const newVal = await toggleFavorite(user.id, friendId);
    setFriends(prev => prev.map(f =>
      f.friendId === friendId ? { ...f, isFav: newVal } : f
    ));
  }

  function handleInvite() {
    showToast('Create a Party room, then invite from your friends list!', 'info');
    navigate('/multiplayer');
  }

  // ── Sort: favorites first → online → offline → alphabetical ─────────────
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.isFav !== b.isFav) return a.isFav ? -1 : 1;
    const aOnline = (presenceMap[a.friendId] || 'offline') !== 'offline';
    const bOnline = (presenceMap[b.friendId] || 'offline') !== 'offline';
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return a.username.localeCompare(b.username);
  });

  const onlineCount  = friends.filter(f => (presenceMap[f.friendId] || 'offline') !== 'offline').length;
  const playingCount = friends.filter(f => {
    const s = presenceMap[f.friendId] || 'offline';
    return s.startsWith('playing') || s === 'in_daily' || s === 'in_hardcore';
  }).length;

  if (!user) return (
    <div className="page-center">
      <p style={{ color: 'var(--color-text-muted)' }}>Sign in to see your friends.</p>
      <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>Sign In</Link>
    </div>
  );

  return (
    <div className="soc-root">
      {/* ── Header ── */}
      <div className="soc-header">
        <Link to="/" className="profile-back-btn">← Menu</Link>
        <div className="soc-header-center">
          <h1 className="soc-title">Social Hub</h1>
        </div>
        <div className="soc-stats-bar">
          <span className="soc-stat"><span style={{ color: '#22c55e' }}>●</span> {onlineCount} online</span>
          <span className="soc-stat"><span style={{ color: '#3b82f6' }}>●</span> {playingCount} playing</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="soc-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`soc-tab ${activeTab === t.id ? 'soc-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'requests' && incomingCount > 0 && (
              <span className="soc-tab-badge">{incomingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="soc-content">

        {/* ════════════ FRIENDS TAB ════════════ */}
        {activeTab === 'friends' && (
          <div className="soc-panel">
            {/* Search */}
            <div className="soc-search-wrap">
              <input
                className="soc-search-input"
                placeholder="🔍 Search trainers by username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 3 && (
              <div className="soc-search-results">
                {isSearching && <p className="soc-empty">Searching...</p>}
                {!isSearching && searchResults.length === 0 && (
                  <p className="soc-empty">No trainers found.</p>
                )}
                {searchResults.map(r => {
                  const { level } = getLevelInfo(r.xp || 0);
                  const sent = requestedIds.has(r.id);
                  return (
                    <div key={r.id} className="soc-search-card">
                      <Avatar username={r.username} />
                      <div className="soc-search-info">
                        <span className="soc-username">{r.username}</span>
                        <span className="soc-level">Lv {level}</span>
                      </div>
                      <div className="soc-search-actions">
                        <button
                          className="btn btn-ghost soc-btn-sm"
                          onClick={() => navigate(`/friends/${r.id}`)}
                        >👤 Profile</button>
                        <button
                          className={`btn soc-btn-sm ${sent ? 'btn-ghost' : 'btn-primary'}`}
                          onClick={() => !sent && handleSendRequest(r.id)}
                          disabled={sent}
                        >{sent ? '✓ Sent' : '+ Add'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friends List */}
            {loadingFriends ? (
              <p className="soc-empty">Loading friends...</p>
            ) : sortedFriends.length === 0 && searchQuery.length < 3 ? (
              <div className="soc-empty-state">
                <p style={{ fontSize: '3rem' }}>👥</p>
                <p>No friends yet! Search for trainers above.</p>
              </div>
            ) : (
              sortedFriends.map(f => {
                const { level } = getLevelInfo(f.xp);
                const status = presenceMap[f.friendId] || 'offline';
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
                return (
                  <div key={f.friendId} className={`soc-friend-card ${f.isFav ? 'soc-friend-card--fav' : ''}`}>
                    <div className="soc-friend-left">
                      <div className="soc-avatar-wrap">
                        <Avatar username={f.username} />
                        <PresenceDot status={status} size={12} />
                      </div>
                      <div className="soc-friend-info">
                        <div className="soc-friend-top">
                          {f.isFav && <span className="soc-fav-star">★</span>}
                          <span className="soc-username">{f.username}</span>
                          <span className="soc-level">Lv {level}</span>
                          <RankBadge rating={f.rating} />
                        </div>
                        <div className="soc-friend-status" style={{ color: statusCfg.color }}>
                          {statusCfg.label}
                        </div>
                      </div>
                    </div>
                    <div className="soc-friend-actions">
                      <button className="soc-icon-btn" title="Invite to Party" onClick={handleInvite}>🎮</button>
                      <button className="soc-icon-btn" title="View Profile" onClick={() => navigate(`/friends/${f.friendId}`)}>👤</button>
                      <button
                        className={`soc-icon-btn ${f.isFav ? 'soc-icon-btn--active' : ''}`}
                        title={f.isFav ? 'Unpin' : 'Pin Friend'}
                        onClick={() => handleToggleFav(f.friendId)}
                      >★</button>
                      <button
                        className="soc-icon-btn soc-icon-btn--danger"
                        title="Remove Friend"
                        onClick={() => handleRemove(f.friendId)}
                      >✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════════════ REQUESTS TAB ════════════ */}
        {activeTab === 'requests' && (
          <div className="soc-panel">
            {incoming.length > 0 && (
              <>
                <h3 className="soc-section-title">Incoming ({incoming.length})</h3>
                {incoming.map(req => {
                  const { level } = getLevelInfo(req.profiles?.xp || 0);
                  return (
                    <div key={req.id} className="soc-req-card">
                      <Avatar username={req.profiles?.username} />
                      <div className="soc-req-info">
                        <span className="soc-username">{req.profiles?.username}</span>
                        <span className="soc-level">Lv {level}</span>
                        <span className="soc-req-time">{timeAgo(req.created_at)}</span>
                      </div>
                      <div className="soc-req-actions">
                        <button className="btn btn-primary soc-btn-sm" onClick={() => handleAccept(req.id, req.sender_id)}>✓ Accept</button>
                        <button className="btn btn-ghost soc-btn-sm" onClick={() => handleReject(req.id)}>✕ Decline</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <h3 className="soc-section-title" style={{ marginTop: '1.5rem' }}>Sent ({outgoing.length})</h3>
                {outgoing.map(req => {
                  const { level } = getLevelInfo(req.profiles?.xp || 0);
                  return (
                    <div key={req.id} className="soc-req-card">
                      <Avatar username={req.profiles?.username} />
                      <div className="soc-req-info">
                        <span className="soc-username">{req.profiles?.username}</span>
                        <span className="soc-level">Lv {level}</span>
                        <span className="soc-req-time">Pending · {timeAgo(req.created_at)}</span>
                      </div>
                      <button className="btn btn-ghost soc-btn-sm" onClick={() => handleCancel(req.id)}>Cancel</button>
                    </div>
                  );
                })}
              </>
            )}

            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="soc-empty-state">
                <p style={{ fontSize: '3rem' }}>🔔</p>
                <p>No pending requests.</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════ ACTIVITY TAB ════════════ */}
        {activeTab === 'activity' && (
          <div className="soc-panel">
            {activityFeed.length === 0 ? (
              <div className="soc-empty-state">
                <p style={{ fontSize: '3rem' }}>📡</p>
                <p>No friend activity yet. Play some games!</p>
              </div>
            ) : (
              activityFeed.map(item => {
                const template = ACTIVITY_LABELS[item.type];
                const username = item.profiles?.username || 'Someone';
                const text = template
                  ? template({ username, ...item.payload })
                  : `${username} did something`;
                return (
                  <div key={item.id} className="soc-activity-item">
                    <Avatar username={username} size={36} />
                    <div className="soc-activity-body">
                      <p className="soc-activity-text">{text}</p>
                      <span className="soc-activity-time">{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════════════ RECENT TAB ════════════ */}
        {activeTab === 'recent' && (
          <div className="soc-panel">
            {recentPlayers.length === 0 ? (
              <div className="soc-empty-state">
                <p style={{ fontSize: '3rem' }}>🕐</p>
                <p>No recent players yet. Play a multiplayer game!</p>
              </div>
            ) : (
              recentPlayers.map(p => {
                const { level } = getLevelInfo(p.xp);
                const isFriend = friends.some(f => f.friendId === p.friendId);
                return (
                  <div key={p.id} className="soc-recent-card">
                    <Avatar username={p.username} />
                    <div className="soc-req-info">
                      <span className="soc-username">{p.username}</span>
                      <span className="soc-level">Lv {level}</span>
                      <span className="soc-req-time">{timeAgo(p.playedAt)} · {p.gameMode}</span>
                    </div>
                    <div className="soc-req-actions">
                      <button className="btn btn-ghost soc-btn-sm" onClick={() => navigate(`/friends/${p.friendId}`)}>👤 Profile</button>
                      {!isFriend && (
                        <button
                          className="btn btn-primary soc-btn-sm"
                          onClick={() => handleSendRequest(p.friendId)}
                          disabled={requestedIds.has(p.friendId)}
                        >
                          {requestedIds.has(p.friendId) ? '✓ Sent' : '+ Add'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
