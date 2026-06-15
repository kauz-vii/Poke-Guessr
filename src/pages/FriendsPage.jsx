/**
 * FriendsPage.jsx — Social hub for trainers
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  searchUsers, 
  sendFriendRequest, 
  getPendingRequests, 
  acceptRequest, 
  rejectRequest, 
  getFriendsList 
} from '../friendsApi';

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (user) {
      loadFriendsData();
    }
  }, [user]);

  async function loadFriendsData() {
    try {
      const f = await getFriendsList(user.id);
      setFriends(f);
      const r = await getPendingRequests(user.id);
      setRequests(r);
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        const results = await searchUsers(searchQuery, user.id);
        // filter out users already in friends list
        const filtered = results.filter(r => !friends.some(f => f.friendId === r.id));
        setSearchResults(filtered);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user?.id, friends]);

  const handleSendRequest = async (receiverId) => {
    try {
      await sendFriendRequest(user.id, receiverId);
      showToast('Friend request sent!', 'success');
      setSearchResults(prev => prev.filter(r => r.id !== receiverId));
    } catch (err) {
      if (err.code === '23505') {
        showToast('Request already sent.', 'error');
      } else {
        showToast('Failed to send request.', 'error');
      }
    }
  };

  const handleAccept = async (reqId, senderId) => {
    try {
      await acceptRequest(reqId, user.id, senderId);
      showToast('Friend request accepted!', 'success');
      loadFriendsData();
    } catch (err) {
      showToast('Failed to accept request.', 'error');
    }
  };

  const handleReject = async (reqId) => {
    try {
      await rejectRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {
      showToast('Failed to reject request.', 'error');
    }
  };

  // Invite to party
  const handleInvite = (friendId) => {
    // Basic redirect to multiplayer to create a room. 
    // In a fully realtime app, we'd use Presence to send a direct notification.
    showToast('To invite a friend, create a Party and send them the Code.', 'info');
    navigate('/multiplayer');
  };

  if (!user) {
    return (
      <div className="page-center">
        <div className="auth-error">Please log in to view friends.</div>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>Sign In</Link>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="profile-topbar" style={{ padding: '2rem 2rem 0 2rem', maxWidth: 800, margin: '0 auto' }}>
        <Link to="/" className="profile-back-btn">← Menu</Link>
      </div>

      <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ color: 'var(--color-pokemon-yellow)', marginBottom: '2rem' }}>Friends & Social</h1>

        {/* Search Section */}
        <div className="game-card" style={{ marginBottom: '2rem' }}>
          <h3>Find Trainers</h3>
          <input
            type="text"
            className="guess-input"
            style={{ width: '100%', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}
            placeholder="Search by username (min 3 chars)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {isSearching && <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Searching...</div>}
          
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map(res => (
                <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{res.username}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>Lv {res.level}</span>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleSendRequest(res.id)}>
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <div className="game-card" style={{ marginBottom: '2rem', border: '1px solid var(--color-pokemon-yellow)' }}>
            <h3>Pending Requests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
              {requests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{req.profiles.username}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>Lv {req.profiles.level}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleAccept(req.id, req.sender_id)}>Accept</button>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleReject(req.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="game-card">
          <h3>My Friends</h3>
          {friends.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>You haven't added any friends yet. Search for trainers above!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
              {friends.map(f => (
                <div key={f.friendId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{f.username}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>Lv {f.level}</span>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#4CAF50' }} onClick={() => handleInvite(f.friendId)}>
                    🎮 Invite
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
