/**
 * AuthContext.jsx — Auth state + Supabase helpers
 *
 * Provides: user, profile, loading, login, loginWithGoogle, register,
 *           logout, refreshProfile, saveGameSession
 *
 * Race-condition fix: login() and register() eagerly set user + profile
 * state so navigate() in the calling page sees the user immediately,
 * preventing ProtectedRoute from bouncing back to /login.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { evaluateAchievements, ACHIEVEMENTS } from '../achievements';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile row from DB ──────────────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
  }, []);

  // ── Session listener (handles OAuth redirects & page refreshes) ────────
  useEffect(() => {
    // onAuthStateChange fires for INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, etc.
    // This is the single source of truth for session state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Actions ───────────────────────────────────────────────────────────

  /**
   * Email/password sign-in.
   * Eagerly sets user + profile state so the caller can navigate()
   * immediately without waiting for onAuthStateChange.
   */
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Eagerly update state so ProtectedRoute doesn't see user=null on navigate
    setUser(data.user);
    if (data.user) await fetchProfile(data.user.id);
    return data;
  }

  /**
   * Google OAuth — triggers a redirect; no eager state needed
   * because the page reloads and onAuthStateChange handles it.
   */
  async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://poke-guessr-kaushik07oct2004-1414s-projects.vercel.app/' },
    });
    if (error) throw error;
    return data;
  }

  /**
   * Email/password sign-up.
   * Eagerly sets user + profile so the caller can navigate() immediately.
   */
  async function register(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    // Eagerly update state
    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // onAuthStateChange will clear user + profile
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  /**
   * Persist one play session's results to Supabase.
   * Called when the player clicks "Main Menu".
   */
  async function saveGameSession(params) {
    if (!user) return;
    
    // params = { sessionScore, sessionCorrect, gameMode, placement, roundsWon, duration, roomId }
    const { 
      sessionScore = 0, 
      sessionCorrect = 0, 
      gameMode = 'casual', 
      placement = null, 
      roundsWon = 0, 
      duration = 0, 
      roomId = null,
      isDaily = false
    } = params;

    // 1. Calculate XP
    let xpEarned = sessionCorrect * 10;
    if (placement === 1 || gameMode === 'casual') {
      // Reward win XP for multiplayer wins, or a base completion bonus for casual
      xpEarned += 100; 
    }

    // 2. Fetch current profile
    const { data: fresh, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchErr) throw fetchErr;

    // Calculate new progression
    const newXp = (fresh.xp ?? 0) + xpEarned;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const isWin = placement === 1;

    let newStreak = fresh.daily_streak ?? 0;
    let newLastDaily = fresh.last_daily_date;

    if (isDaily) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (fresh.last_daily_date !== todayStr) {
        // Did they play yesterday?
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (fresh.last_daily_date === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
        newLastDaily = todayStr;
      }
    }

    const updates = {
      games_played:  (fresh.games_played  ?? 0) + 1,
      games_won:     (fresh.games_won ?? 0) + (isWin ? 1 : 0),
      highest_score: Math.max(fresh.highest_score ?? 0, sessionScore),
      total_score:   (fresh.total_score   ?? 0) + sessionScore,
      total_correct: (fresh.total_correct ?? 0) + sessionCorrect,
      xp: newXp,
      level: newLevel,
      daily_streak: newStreak,
      last_daily_date: newLastDaily
    };

    // 3. Update Profile
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // 4. Insert Match History
    await supabase.from('match_history').insert({
      user_id: user.id,
      room_id: roomId,
      game_mode: gameMode,
      placement: placement,
      total_score: sessionScore,
      rounds_won: roundsWon,
      match_duration: duration
    });

    // Update local profile state immediately
    setProfile(prev => ({ ...prev, ...updates }));

    // 5. Evaluate Achievements
    const newUnlocks = await evaluateAchievements(user.id, { ...fresh, ...updates }, params);
    
    // Dispatch a custom event so anywhere in the app can show a toast for unlocks
    if (newUnlocks && newUnlocks.length > 0) {
      newUnlocks.forEach(id => {
        const ach = ACHIEVEMENTS[id];
        if (ach) {
          window.dispatchEvent(new CustomEvent('achievement_unlocked', { detail: ach }));
        }
      });
    }

    return newUnlocks;
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      refreshProfile,
      saveGameSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
