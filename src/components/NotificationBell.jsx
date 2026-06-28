/**
 * NotificationBell.jsx — Bell icon with unread badge, dropdown on click.
 */
import { useState, useRef, useEffect, useContext } from 'react';
import { useSocial } from '../contexts/SocialContext';
import { useAuth } from '../contexts/AuthContext';

const NOTIF_ICONS = {
  friend_request:   '👋',
  request_accepted: '🤝',
  party_invite:     '🎮',
  match_challenge:  '⚔️',
  friend_online:    '🟢',
  achievement:      '⭐',
  rank_up:          '📈',
};

// Lightweight time-ago formatter (no date-fns dependency)
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifText(n) {
  const sender = n.profiles?.username || 'Someone';
  switch (n.type) {
    case 'friend_request':   return `${sender} sent you a friend request`;
    case 'request_accepted': return `${sender} accepted your friend request`;
    case 'party_invite':     return `${sender} invited you to a party`;
    case 'match_challenge':  return `${sender} challenged you to a match`;
    case 'friend_online':    return `${sender} is now online`;
    default:                 return n.payload?.text || 'New notification';
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useSocial();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  if (!user) return null;

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleOpen() {
    setOpen(o => !o);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}>
                  <span className="notif-icon">{NOTIF_ICONS[n.type] || '📌'}</span>
                  <div className="notif-body">
                    <p className="notif-text">{notifText(n)}</p>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
