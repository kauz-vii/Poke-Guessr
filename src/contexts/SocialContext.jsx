/**
 * SocialContext.jsx — Global realtime social hub.
 * Manages: presence map, notifications, pending party invites, activity feed.
 * Must be rendered inside BrowserRouter and AuthProvider.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';
import {
  updatePresence,
  getPresenceMap,
  getNotifications,
  getFriendActivity,
  markNotificationsRead,
} from '../socialApi';
import { getExtendedFriendsList } from '../socialApi';

const SocialContext = createContext(null);

// Map route path prefixes → presence status
const ROUTE_STATUS = {
  '/game':              'playing_casual',
  '/multiplayer/game':  'playing_party',
  '/hardcore':          'in_hardcore',
  '/daily':             'in_daily',
  '/ranked':            'searching_match',
  '/pokedex':           'viewing_pokedex',
};

function routeToStatus(pathname) {
  for (const [prefix, status] of Object.entries(ROUTE_STATUS)) {
    if (pathname.startsWith(prefix)) return status;
  }
  return 'in_menu';
}

export function SocialProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const [friendIds, setFriendIds]     = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [activityFeed, setActivityFeed]   = useState([]);

  const channelsRef = useRef([]);
  const friendIdsRef = useRef([]);

  // ── Load social data & setup realtime on login ──────────────────────────
  const loadSocialData = useCallback(async () => {
    if (!user) return;
    try {
      // Load friends
      const friends = await getExtendedFriendsList(user.id);
      const ids = friends.map(f => f.friendId);
      setFriendIds(ids);
      friendIdsRef.current = ids;

      // Presence
      const pMap = await getPresenceMap(ids);
      setPresenceMap(pMap);

      // Notifications
      const notifs = await getNotifications(user.id);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);

      // Activity feed
      if (ids.length > 0) {
        const feed = await getFriendActivity(ids);
        setActivityFeed(feed);
      }

      // Setup realtime
      setupSubscriptions(ids);

      // Set own presence
      await updatePresence(user.id, routeToStatus(location.pathname));
    } catch (err) {
      console.error('SocialContext load error:', err);
    }
  }, [user?.id]); // eslint-disable-line

  useEffect(() => {
    if (!user) {
      teardown();
      return;
    }
    loadSocialData();
    return teardown;
  }, [user?.id]); // eslint-disable-line

  // ── Update presence on route change ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const status = routeToStatus(location.pathname);
    updatePresence(user.id, status);
  }, [location.pathname, user?.id]);

  // ── Set offline on page close ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const handleUnload = () => updatePresence(user.id, 'offline');
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id]);

  // ── Realtime subscriptions ────────────────────────────────────────────
  function setupSubscriptions(ids) {
    teardown();

    // 1. Own notifications
    const notifCh = supabase
      .channel(`soc-notif-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'social_notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev.slice(0, 29)]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();

    // 2. Party invites addressed to me
    const inviteCh = supabase
      .channel(`soc-invite-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'party_invites',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        if (payload.new.status === 'pending') {
          setPendingInvite(payload.new);
        }
      })
      .subscribe();

    // 3. Presence of all friends
    const presenceCh = supabase
      .channel('soc-presence-all')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_presence',
      }, payload => {
        const uid = payload.new?.user_id;
        if (uid && friendIdsRef.current.includes(uid)) {
          setPresenceMap(prev => ({ ...prev, [uid]: payload.new.status }));
        }
      })
      .subscribe();

    // 4. Friend activity feed
    const activityCh = supabase
      .channel('soc-activity-all')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'friend_activity',
      }, payload => {
        if (friendIdsRef.current.includes(payload.new.user_id)) {
          setActivityFeed(prev => [payload.new, ...prev.slice(0, 49)]);
        }
      })
      .subscribe();

    channelsRef.current = [notifCh, inviteCh, presenceCh, activityCh];
  }

  function teardown() {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];
  }

  // ── Public API ───────────────────────────────────────────────────────
  const updateMyPresence = useCallback(async (status) => {
    if (user) await updatePresence(user.id, status);
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await markNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user?.id]);

  const dismissInvite = useCallback(() => setPendingInvite(null), []);

  const reloadFriends = useCallback(async () => {
    if (!user) return;
    const friends = await getExtendedFriendsList(user.id);
    const ids = friends.map(f => f.friendId);
    setFriendIds(ids);
    friendIdsRef.current = ids;
    const pMap = await getPresenceMap(ids);
    setPresenceMap(pMap);
    if (ids.length > 0) {
      const feed = await getFriendActivity(ids);
      setActivityFeed(feed);
    }
    setupSubscriptions(ids);
  }, [user?.id]); // eslint-disable-line

  const appendActivity = useCallback((item) => {
    setActivityFeed(prev => [item, ...prev.slice(0, 49)]);
  }, []);

  return (
    <SocialContext.Provider value={{
      friendIds, presenceMap, notifications, unreadCount,
      pendingInvite, activityFeed,
      updateMyPresence, markAllRead, dismissInvite, reloadFriends, appendActivity,
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within <SocialProvider>');
  return ctx;
}
