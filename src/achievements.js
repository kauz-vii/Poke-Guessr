/**
 * achievements.js — Defines the achievement registry and evaluation logic
 */
import { supabase } from './supabase';

export const ACHIEVEMENTS = {
  first_catch: { id: 'first_catch', title: 'First Catch', desc: 'Correctly guess your first Pokémon.', icon: '🎯' },
  rookie: { id: 'rookie', title: 'Pokédex Rookie', desc: '50 total correct guesses.', icon: '📘' },
  expert: { id: 'expert', title: 'Pokédex Expert', desc: '500 total correct guesses.', icon: '📕' },
  champion: { id: 'champion', title: 'Champion', desc: 'Win 10 matches.', icon: '👑' },
  master: { id: 'master', title: 'Master Trainer', desc: 'Win 100 matches.', icon: '🏆' },
  daily_grinder: { id: 'daily_grinder', title: 'Daily Grinder', desc: 'Reach a 10-day Daily Streak.', icon: '🔥' },
  perfect: { id: 'perfect', title: 'Legendary Hunter', desc: 'Guess every Pokémon correctly in a single 10-round match.', icon: '✨' },
};

/**
 * Evaluates conditions and unlocks achievements.
 * Called at the end of a game session.
 * 
 * @param {string} userId - Auth user ID
 * @param {object} freshProfile - Profile data AFTER the current session's updates
 * @param {object} sessionParams - Details about the match just played
 * @returns {Promise<string[]>} Array of newly unlocked achievement IDs
 */
export async function evaluateAchievements(userId, freshProfile, sessionParams) {
  try {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
      
    const unlocked = new Set(existing?.map(a => a.achievement_id) || []);
    const newUnlocks = [];
    
    // Evaluate 
    if (!unlocked.has('first_catch') && freshProfile.total_correct > 0) newUnlocks.push('first_catch');
    if (!unlocked.has('rookie') && freshProfile.total_correct >= 50) newUnlocks.push('rookie');
    if (!unlocked.has('expert') && freshProfile.total_correct >= 500) newUnlocks.push('expert');
    
    if (!unlocked.has('champion') && freshProfile.games_won >= 10) newUnlocks.push('champion');
    if (!unlocked.has('master') && freshProfile.games_won >= 100) newUnlocks.push('master');
    
    if (!unlocked.has('daily_grinder') && freshProfile.daily_streak >= 10) newUnlocks.push('daily_grinder');
    
    // Match specific
    // If they got 10 correct in this session (assuming a 10 round match)
    if (!unlocked.has('perfect') && sessionParams?.sessionCorrect >= 10) newUnlocks.push('perfect');

    if (newUnlocks.length > 0) {
      const inserts = newUnlocks.map(id => ({ user_id: userId, achievement_id: id }));
      await supabase.from('user_achievements').insert(inserts);
    }
    
    return newUnlocks;
  } catch (err) {
    console.error('Failed to evaluate achievements:', err);
    return [];
  }
}
