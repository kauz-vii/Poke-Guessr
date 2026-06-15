import { supabase } from './supabase';

export async function searchUsers(query, currentUserId) {
  if (!query || query.length < 3) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, level, highest_score')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  if (error) {
    console.error('Search error:', error);
    return [];
  }
  return data;
}

export async function sendFriendRequest(senderId, receiverId) {
  const { error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId });
  if (error) throw error;
}

export async function getPendingRequests(userId) {
  // Requests received by this user
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id, sender_id, created_at, status,
      profiles!friend_requests_sender_id_fkey(username, level)
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending');
  if (error) {
    console.error(error);
    return [];
  }
  return data;
}

export async function acceptRequest(requestId, user1, user2) {
  // Update request
  await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
  // Insert into friends table (sort IDs so user_id1 < user_id2 to prevent dupes)
  const u1 = user1 < user2 ? user1 : user2;
  const u2 = user1 < user2 ? user2 : user1;
  await supabase.from('friends').insert({ user_id1: u1, user_id2: u2 });
}

export async function rejectRequest(requestId) {
  await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId);
}

export async function getFriendsList(userId) {
  // Fetch where userId is user_id1 OR user_id2
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id, user_id1, user_id2,
      prof1:profiles!friends_user_id1_fkey(id, username, level),
      prof2:profiles!friends_user_id2_fkey(id, username, level)
    `)
    .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
  if (error) {
    console.error(error);
    return [];
  }
  // Map it to just return the "other" friend's profile
  return data.map(f => {
    const friendProfile = f.user_id1 === userId ? f.prof2 : f.prof1;
    return {
      friendId: friendProfile.id,
      username: friendProfile.username,
      level: friendProfile.level
    };
  });
}
