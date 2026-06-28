/**
 * socialApi.js — All social-system DB operations
 * Covers: presence, activity feed, notifications, invites, recent players,
 *         friend management extensions (remove, favorites, outgoing requests).
 */
import { supabase } from './supabase';

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  offline:         { label: 'Offline',           color: '#6b7280', dot: '#4b5563' },
  online:          { label: 'Online',             color: '#22c55e', dot: '#22c55e' },
  in_menu:         { label: 'In Menu',            color: '#22c55e', dot: '#22c55e' },
  playing_casual:  { label: 'Playing Casual',     color: '#3b82f6', dot: '#3b82f6' },
  playing_ranked:  { label: 'In Ranked Match',    color: '#a855f7', dot: '#a855f7' },
  playing_party:   { label: 'In Party Match',     color: '#6366f1', dot: '#6366f1' },
  in_daily:        { label: 'In Daily Challenge', color: '#eab308', dot: '#eab308' },
  in_hardcore:     { label: 'In Hardcore',        color: '#ef4444', dot: '#ef4444' },
  searching_match: { label: 'Searching Match',    color: '#f97316', dot: '#f97316' },
  viewing_pokedex: { label: 'Viewing Pokédex',    color: '#06b6d4', dot: '#06b6d4' },
};

export const ACTIVITY_LABELS = {
  match_win:       ({ username })         => `🏆 ${username} won a match!`,
  rank_up:         ({ username, rank })   => `⚔️ ${username} reached ${rank}!`,
  achievement:     ({ username, title })  => `⭐ ${username} unlocked "${title}"`,
  win_streak:      ({ username, streak }) => `🔥 ${username} is on a ${streak}-win streak!`,
  daily_complete:  ({ username })         => `📅 ${username} completed the Daily Challenge!`,
  new_record:      ({ username, score })  => `🎯 ${username} set a new record: ${score} pts!`,
  mvp:             ({ username })         => `👑 ${username} earned Match MVP!`,
  friend_added:    ({ username, friend }) => `👥 ${username} and ${friend} became friends!`,
  hardcore_record: ({ username, streak }) => `☠️ ${username} survived ${streak} Hardcore rounds!`,
  weekly_complete: ({ username, label })  => `📆 ${username} completed "${label}"!`,
};

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function updatePresence(userId, status) {
  if (!userId) return;
  await supabase.from('user_presence').upsert(
    { user_id: userId, status, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

export async function getPresenceMap(friendIds) {
  if (!friendIds || friendIds.length === 0) return {};
  const { data } = await supabase
    .from('user_presence')
    .select('user_id, status')
    .in('user_id', friendIds);
  const map = {};
  (data || []).forEach(r => { map[r.user_id] = r.status; });
  return map;
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export async function logActivity(userId, type, payload = {}) {
  if (!userId) return;
  try {
    await supabase.from('friend_activity').insert({ user_id: userId, type, payload });
  } catch (err) {
    console.error('logActivity error:', err);
  }
}

export async function getFriendActivity(friendIds, limit = 50, offset = 0) {
  if (!friendIds || friendIds.length === 0) return [];
  const { data } = await supabase
    .from('friend_activity')
    .select(`
      id, user_id, type, payload, created_at,
      profiles!friend_activity_user_id_fkey(username)
    `)
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return data || [];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(userId, limit = 30) {
  const { data } = await supabase
    .from('social_notifications')
    .select(`
      id, type, payload, read, created_at,
      profiles!social_notifications_sender_id_fkey(username)
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function sendNotification(recipientId, senderId, type, payload = {}) {
  if (!recipientId || recipientId === senderId) return;
  await supabase.from('social_notifications').insert({
    recipient_id: recipientId, sender_id: senderId, type, payload
  });
}

export async function markNotificationsRead(userId) {
  await supabase
    .from('social_notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
}

// ─── Party Invites ────────────────────────────────────────────────────────────

export async function sendPartyInvite(senderId, receiverId, roomId, roomCode) {
  const { data, error } = await supabase
    .from('party_invites')
    .insert({ sender_id: senderId, receiver_id: receiverId, room_id: roomId, room_code: roomCode })
    .select()
    .single();
  if (error) throw error;
  // Also create a notification
  await sendNotification(receiverId, senderId, 'party_invite', { roomId, roomCode });
  return data;
}

export async function respondToInvite(inviteId, accept) {
  await supabase
    .from('party_invites')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', inviteId);
}

// ─── Friends API Extensions ───────────────────────────────────────────────────

export async function removeFriend(userId, friendId) {
  await supabase
    .from('friends')
    .delete()
    .or(
      `and(user_id1.eq.${userId},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${userId})`
    );
}

export async function toggleFavorite(userId, friendId) {
  // Find the row and which side the user is on
  const { data: row } = await supabase
    .from('friends')
    .select('id, user_id1, user_id2, fav_user1, fav_user2')
    .or(
      `and(user_id1.eq.${userId},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${userId})`
    )
    .single();
  if (!row) return false;
  const isUser1 = row.user_id1 === userId;
  const currentFav = isUser1 ? row.fav_user1 : row.fav_user2;
  const updateKey = isUser1 ? 'fav_user1' : 'fav_user2';
  await supabase.from('friends').update({ [updateKey]: !currentFav }).eq('id', row.id);
  return !currentFav;
}

export async function getExtendedFriendsList(userId) {
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id, user_id1, user_id2, fav_user1, fav_user2,
      prof1:profiles!friends_user_id1_fkey(id, username, xp, rating, trainer_title, favorite_pokemon, games_played, wins),
      prof2:profiles!friends_user_id2_fkey(id, username, xp, rating, trainer_title, favorite_pokemon, games_played, wins)
    `)
    .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
  if (error) { console.error(error); return []; }
  return (data || []).map(f => {
    const isUser1    = f.user_id1 === userId;
    const friendProf = isUser1 ? f.prof2 : f.prof1;
    return {
      rowId:    f.id,
      friendId: friendProf.id,
      username: friendProf.username,
      xp:       friendProf.xp || 0,
      rating:   friendProf.rating || 1200,
      title:    friendProf.trainer_title || '',
      favPoke:  friendProf.favorite_pokemon || '',
      isFav:    isUser1 ? f.fav_user1 : f.fav_user2,
    };
  });
}

export async function getOutgoingRequests(userId) {
  const { data } = await supabase
    .from('friend_requests')
    .select(`
      id, receiver_id, created_at,
      profiles!friend_requests_receiver_id_fkey(username, xp)
    `)
    .eq('sender_id', userId)
    .eq('status', 'pending');
  return data || [];
}

export async function cancelFriendRequest(requestId) {
  await supabase.from('friend_requests').update({ status: 'cancelled' }).eq('id', requestId);
}

// ─── Recent Players ───────────────────────────────────────────────────────────

export async function logRecentPlayers(userId, opponentIds, gameMode) {
  if (!opponentIds || opponentIds.length === 0) return;
  const rows = opponentIds
    .filter(id => id !== userId)
    .map(id => ({ user_id: userId, matched_with: id, game_mode: gameMode, played_at: new Date().toISOString() }));
  if (rows.length === 0) return;
  await supabase.from('recent_players').upsert(rows, { onConflict: 'user_id,matched_with' });
}

export async function getRecentPlayers(userId) {
  const { data } = await supabase
    .from('recent_players')
    .select(`
      id, matched_with, game_mode, played_at,
      profiles!recent_players_matched_with_fkey(id, username, xp, rating)
    `)
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(20);
  return (data || []).map(r => ({
    id:       r.id,
    friendId: r.matched_with,
    username: r.profiles?.username || '',
    xp:       r.profiles?.xp || 0,
    rating:   r.profiles?.rating || 1200,
    gameMode: r.game_mode,
    playedAt: r.played_at,
  }));
}

// ─── Public Profile ───────────────────────────────────────────────────────────

export async function getPublicProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, xp, rating, trainer_title, favorite_pokemon, favorite_region, games_played, wins, win_streak, highest_win_streak, highest_hardcore_streak, privacy_level')
    .eq('id', userId)
    .single();
  return data;
}

export async function getFriendStatus(myId, theirId) {
  // Returns: 'friends' | 'request_sent' | 'request_received' | 'none'
  const { data: friendship } = await supabase
    .from('friends')
    .select('id')
    .or(`and(user_id1.eq.${myId},user_id2.eq.${theirId}),and(user_id1.eq.${theirId},user_id2.eq.${myId})`)
    .maybeSingle();
  if (friendship) return 'friends';

  const { data: sent } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', myId)
    .eq('receiver_id', theirId)
    .eq('status', 'pending')
    .maybeSingle();
  if (sent) return 'request_sent';

  const { data: received } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', theirId)
    .eq('receiver_id', myId)
    .eq('status', 'pending')
    .maybeSingle();
  if (received) return 'request_received';

  return 'none';
}
