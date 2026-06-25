/**
 * weeklyChallenge.js — 25-challenge pool with monthly rotation.
 *
 * Every month, 4 challenges are deterministically selected (seeded by year+month),
 * with the previous month's 4 challenges always excluded.
 * Each week of the month (weeks 1–4) has one active challenge.
 */
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// 25 Challenge Definitions
// ─────────────────────────────────────────────────────────────────────────────
export const CHALLENGES = {
  catch_75:    { id: 'catch_75',    label: 'Pokémon Catcher',    icon: '🎯', desc: 'Guess 75 Pokémon correctly across any game mode.',          goal: 75,   type: 'catch'       },
  catch_100:   { id: 'catch_100',   label: 'Century Catcher',    icon: '🎯', desc: 'Guess 100 Pokémon correctly across any game mode.',         goal: 100,  type: 'catch'       },
  catch_150:   { id: 'catch_150',   label: 'Elite Catcher',      icon: '🎯', desc: 'Guess 150 Pokémon correctly across any game mode.',         goal: 150,  type: 'catch'       },
  catch_200:   { id: 'catch_200',   label: 'Legendary Catcher',  icon: '🎯', desc: 'Guess 200 Pokémon correctly across any game mode.',         goal: 200,  type: 'catch'       },
  speed_30:    { id: 'speed_30',    label: 'Speed Demon',        icon: '⚡', desc: 'Get 30 correct guesses with 20+ seconds on the clock.',     goal: 30,   type: 'fast20'      },
  speed_50:    { id: 'speed_50',    label: 'Lightning Reflexes', icon: '⚡', desc: 'Get 50 correct guesses with 15+ seconds on the clock.',     goal: 50,   type: 'fast15'      },
  wins_5:      { id: 'wins_5',      label: 'Winner',             icon: '🏆', desc: 'Win (place 1st) in 5 matches.',                            goal: 5,    type: 'win'         },
  wins_10:     { id: 'wins_10',     label: 'Champion',           icon: '🏆', desc: 'Win 10 matches.',                                          goal: 10,   type: 'win'         },
  wins_15:     { id: 'wins_15',     label: 'Grand Champion',     icon: '🏆', desc: 'Win 15 matches.',                                          goal: 15,   type: 'win'         },
  social_10:   { id: 'social_10',   label: 'Social Starter',     icon: '🌐', desc: 'Play 10 multiplayer rounds (party or ranked).',            goal: 10,   type: 'social'      },
  social_20:   { id: 'social_20',   label: 'Social Trainer',     icon: '🌐', desc: 'Play 20 multiplayer rounds (party or ranked).',            goal: 20,   type: 'social'      },
  social_30:   { id: 'social_30',   label: 'Social Butterfly',   icon: '🌐', desc: 'Play 30 multiplayer rounds (party or ranked).',            goal: 30,   type: 'social'      },
  master_15:   { id: 'master_15',   label: 'Master Mode',        icon: '👑', desc: 'Get 15 correct in Pokémon Master difficulty.',             goal: 15,   type: 'master'      },
  master_30:   { id: 'master_30',   label: 'True Master',        icon: '👑', desc: 'Get 30 correct in Pokémon Master difficulty.',             goal: 30,   type: 'master'      },
  daily_3:     { id: 'daily_3',     label: 'Daily Player',       icon: '📅', desc: 'Complete 3 daily challenges this week.',                   goal: 3,    type: 'daily'       },
  daily_7:     { id: 'daily_7',     label: 'Daily Devotee',      icon: '📅', desc: 'Complete 7 daily challenges this week.',                   goal: 7,    type: 'daily'       },
  hardcore_10: { id: 'hardcore_10', label: 'Survivor',           icon: '☠️', desc: 'Survive 10 consecutive rounds in a single Hardcore run.',  goal: 10,   type: 'hardcore'    },
  hardcore_20: { id: 'hardcore_20', label: 'Iron Trainer',       icon: '☠️', desc: 'Survive 20 consecutive rounds in a single Hardcore run.',  goal: 20,   type: 'hardcore'    },
  ranked_3:    { id: 'ranked_3',    label: 'Ranked Contender',   icon: '⚔️', desc: 'Win 3 ranked multiplayer matches.',                        goal: 3,    type: 'ranked_win'  },
  ranked_5:    { id: 'ranked_5',    label: 'Ranked Champion',    icon: '⚔️', desc: 'Win 5 ranked multiplayer matches.',                        goal: 5,    type: 'ranked_win'  },
  party_5:     { id: 'party_5',     label: 'Party Starter',      icon: '🎮', desc: 'Complete 5 party matches.',                               goal: 5,    type: 'party'       },
  party_10:    { id: 'party_10',    label: 'Party Host',         icon: '🎮', desc: 'Complete 10 party matches.',                              goal: 10,   type: 'party'       },
  score_1000:  { id: 'score_1000',  label: 'Point Hunter',       icon: '⭐', desc: 'Earn 1,000+ total points across games this week.',         goal: 1000, type: 'score'       },
  score_2500:  { id: 'score_2500',  label: 'Score Machine',      icon: '⭐', desc: 'Earn 2,500+ total points across games this week.',         goal: 2500, type: 'score'       },
  rounds_80:   { id: 'rounds_80',   label: 'Marathon Trainer',   icon: '🎲', desc: 'Play 80 total rounds across any game mode.',               goal: 80,   type: 'rounds'      },
};

export const CHALLENGE_IDS = Object.keys(CHALLENGES);

// ─────────────────────────────────────────────────────────────────────────────
// Seeded shuffle (LCG — deterministic, no server needed)
// ─────────────────────────────────────────────────────────────────────────────
function lcgShuffle(arr, seed) {
  const a = [...arr];
  let s = (seed ^ 0x12345678) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns 4 challenge IDs for the given month, excluding the previous month's 4.
 */
export function getMonthChallenges(year, month) {
  const seed = year * 100 + month;
  const shuffled = lcgShuffle(CHALLENGE_IDS, seed);

  // Previous month's challenges to exclude
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevShuffled = lcgShuffle(CHALLENGE_IDS, prevYear * 100 + prevMonth);
  const prevSet = new Set(prevShuffled.slice(0, 4));

  const result = [];
  for (const id of shuffled) {
    if (!prevSet.has(id)) {
      result.push(id);
      if (result.length === 4) break;
    }
  }
  return result;
}

/** Returns ISO week key like '2026-W26'. */
export function getWeekKey(date) {
  const d = date ? new Date(date) : new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** 0-indexed week of month (0-3), capped so week 5 uses slot 3. */
export function getWeekOfMonth(date) {
  const d = date || new Date();
  return Math.min(3, Math.ceil(d.getDate() / 7) - 1);
}

/** Returns the active challenge ID for the current week. */
export function getCurrentChallengeId(date) {
  const d = date || new Date();
  const challenges = getMonthChallenges(d.getFullYear(), d.getMonth() + 1);
  return challenges[getWeekOfMonth(d)];
}

/** Returns the Date of next Monday (start of next week's challenge). */
export function getNextMondayDate() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  const next = new Date(d);
  next.setDate(d.getDate() + daysUntilMon);
  next.setHours(0, 0, 0, 0);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called after every game session. Computes the increment for the active
 * challenge and upserts into `weekly_challenge_progress`.
 *
 * @param {string} userId
 * @param {object} params - { sessionCorrect, gameMode, isWin, difficulty,
 *                            sessionRounds, sessionScore, fastCorrect,
 *                            fastCorrect15, hardcoreStreak }
 */
export async function updateWeeklyProgress(userId, params) {
  if (!userId) return;

  const now = new Date();
  const challengeId = getCurrentChallengeId(now);
  const challenge   = CHALLENGES[challengeId];
  const weekKey     = getWeekKey(now);
  if (!challenge) return;

  const {
    sessionCorrect = 0,
    gameMode       = 'casual',
    isWin          = false,
    difficulty     = 'elite',
    sessionRounds  = 0,
    sessionScore   = 0,
    fastCorrect    = 0,   // correct with ≥20s remaining
    fastCorrect15  = 0,   // correct with ≥15s remaining
    hardcoreStreak = 0,
  } = params;

  let increment = 0;
  const isMulti = gameMode === 'party' || gameMode === 'ranked';

  switch (challenge.type) {
    case 'catch':       increment = sessionCorrect; break;
    case 'fast20':      increment = fastCorrect; break;
    case 'fast15':      increment = fastCorrect15; break;
    case 'win':         increment = isWin ? 1 : 0; break;
    case 'social':      increment = isMulti ? sessionRounds : 0; break;
    case 'master':      increment = difficulty === 'master' ? sessionCorrect : 0; break;
    case 'daily':       increment = gameMode === 'daily' ? 1 : 0; break;
    case 'hardcore':    increment = hardcoreStreak; break; // max-based, handled below
    case 'ranked_win':  increment = (gameMode === 'ranked' && isWin) ? 1 : 0; break;
    case 'party':       increment = gameMode === 'party' ? 1 : 0; break;
    case 'score':       increment = sessionScore; break;
    case 'rounds':      increment = sessionRounds; break;
    default:            return;
  }

  if (increment <= 0) return;

  try {
    const { data: existing } = await supabase
      .from('weekly_challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('week_key', weekKey)
      .maybeSingle();

    if (existing?.completed) return;

    const currentProgress = existing?.progress || 0;
    // Hardcore uses max-of-runs instead of cumulative sum
    const newProgress = challenge.type === 'hardcore'
      ? Math.max(currentProgress, increment)
      : Math.min(challenge.goal, currentProgress + increment);

    const nowComplete = newProgress >= challenge.goal;

    if (!existing) {
      await supabase.from('weekly_challenge_progress').insert({
        user_id:      userId,
        week_key:     weekKey,
        challenge_id: challengeId,
        goal:         challenge.goal,
        progress:     newProgress,
        completed:    nowComplete,
        completed_at: nowComplete ? new Date().toISOString() : null,
      });
    } else {
      await supabase.from('weekly_challenge_progress').update({
        progress:     newProgress,
        goal:         challenge.goal,
        completed:    nowComplete,
        completed_at: nowComplete ? new Date().toISOString() : existing.completed_at,
      }).eq('id', existing.id);
    }

    if (nowComplete && !existing?.completed) {
      window.dispatchEvent(new CustomEvent('achievement_unlocked', {
        detail: { icon: challenge.icon, title: `Weekly Complete: ${challenge.label}!` },
      }));
    }
  } catch (err) {
    console.error('Failed to update weekly challenge progress:', err);
  }
}
