/**
 * dailyReward.js — Daily Login Rewards API + schedule definition
 */
import { supabase } from './supabase';

// ── Reward schedule (Day 1–7) ─────────────────────────────────────────────
export const REWARD_SCHEDULE = [
  { day: 1, xp: 50,  badge: false, icon: '✨', label: '+50 XP'  },
  { day: 2, xp: 75,  badge: false, icon: '⚡', label: '+75 XP'  },
  { day: 3, xp: 100, badge: false, icon: '🌟', label: '+100 XP' },
  { day: 4, xp: 125, badge: false, icon: '💫', label: '+125 XP' },
  { day: 5, xp: 150, badge: false, icon: '🔥', label: '+150 XP' },
  { day: 6, xp: 200, badge: false, icon: '💎', label: '+200 XP' },
  { day: 7, xp: 300, badge: true,  icon: '👑', label: '+300 XP + Rare Badge' },
];

/**
 * Check (without claiming) if a reward is available for today.
 * Returns: { available, streak, reward_day, missed_day }
 */
export async function getDailyRewardStatus(userId) {
  const { data, error } = await supabase.rpc('get_daily_reward_status', {
    p_user_id: userId,
  });
  if (error) {
    console.error('getDailyRewardStatus error:', error);
    return null;
  }
  return data;
}

/**
 * Claim today's daily reward (server-side, idempotent, race-safe).
 * Returns: { already_claimed, streak, reward_day, xp_awarded, badge_awarded, missed_day }
 */
export async function claimDailyReward(userId) {
  const { data, error } = await supabase.rpc('claim_daily_reward', {
    p_user_id: userId,
  });
  if (error) {
    console.error('claimDailyReward error:', error);
    throw error;
  }
  return data;
}
