/**
 * HardcoreGamePage.jsx — Survival mode: One wrong guess = elimination.
 * Tracks a per-session streak and saves the highest ever to the profile.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../supabase';
import { fetchPokemon } from '../api';
import {
  getRandomPokemonId,
  getRegion,
  isCorrectGuess,
  calculateScore,
} from '../utils';
import { updateWeeklyProgress } from '../weeklyChallenge';

import PokemonDisplay  from '../components/PokemonDisplay';
import TimerBar        from '../components/TimerBar';
import GuessInput      from '../components/GuessInput';
import FeedbackMessage from '../components/FeedbackMessage';
import Confetti        from '../components/Confetti';

const TOTAL_TIME = 30;

export default function HardcoreGamePage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  // ── Game State ───────────────────────────────────────────────────────────
  const [pokemon, setPokemon] = useState(null);
  const [region, setRegion] = useState('');
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [isEliminated, setIsEliminated] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(3);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const pokemonRef       = useRef(null);
  const pokemonQueueRef  = useRef([]);
  const isRoundOverRef   = useRef(false);
  const streakRef        = useRef(0);
  const scoreRef         = useRef(0);
  const timerRef         = useRef(null);
  const nextRoundTimerRef = useRef(null);
  const countdownRef     = useRef(null);
  const timeRemainingRef = useRef(TOTAL_TIME);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clearAllTimers() {
    clearInterval(timerRef.current);
    clearTimeout(nextRoundTimerRef.current);
    clearInterval(countdownRef.current);
  }

  // ── Queue fill ───────────────────────────────────────────────────────────
  const fillQueue = useCallback(async () => {
    const needed = 3 - pokemonQueueRef.current.length;
    if (needed <= 0) return;
    const promises = [];
    for (let i = 0; i < needed; i++) {
      promises.push(fetchPokemon(getRandomPokemonId()));
    }
    try {
      const results = await Promise.all(promises);
      pokemonQueueRef.current = [...pokemonQueueRef.current, ...results];
    } catch (err) {
      console.error('Queue fill failed:', err);
    }
  }, []);

  // ── Save record ───────────────────────────────────────────────────────────
  const saveRecord = useCallback(async (finalStreakVal) => {
    if (!profile?.id || finalStreakVal === 0) return;
    try {
      const prevBest = profile.highest_hardcore_streak || 0;
      if (finalStreakVal > prevBest) {
        await supabase.from('profiles')
          .update({ highest_hardcore_streak: finalStreakVal })
          .eq('id', profile.id);
        await refreshProfile();
        setIsNewRecord(true);
      }
      // Always update weekly challenge progress (max-based)
      updateWeeklyProgress(profile.id, { hardcoreStreak: finalStreakVal, gameMode: 'hardcore' });
    } catch (err) {
      console.error('Failed to save hardcore record:', err);
    }
  }, [profile, refreshProfile]);

  // ── Elimination ───────────────────────────────────────────────────────────
  const eliminate = useCallback((currentStreak) => {
    clearAllTimers();
    setIsEliminated(true);
    setIsRevealed(true);
    setIsRoundOver(true);
    isRoundOverRef.current = true;
    setFinalStreak(currentStreak);
    saveRecord(currentStreak);
  }, [saveRecord]);

  // ── End round (correct) ───────────────────────────────────────────────────
  const endRoundCorrect = useCallback((points) => {
    if (isRoundOverRef.current) return;
    isRoundOverRef.current = true;
    clearInterval(timerRef.current);

    const newStreak = streakRef.current + 1;
    streakRef.current = newStreak;
    setStreak(newStreak);
    scoreRef.current += points;
    setScore(scoreRef.current);

    setIsRevealed(true);
    setIsRoundOver(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    setFeedback({ type: 'correct', pokemonName: pokemonRef.current?.name || '', pointsEarned: points, nextRoundIn: 3 });
    setNextRoundCountdown(3);
    let cdCount = 3;
    countdownRef.current = setInterval(() => {
      cdCount--;
      setNextRoundCountdown(cdCount);
      setFeedback(prev => prev ? { ...prev, nextRoundIn: cdCount } : prev);
      if (cdCount <= 0) clearInterval(countdownRef.current);
    }, 1000);
    nextRoundTimerRef.current = setTimeout(() => startNewRound(), 3000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    const startTime = Date.now();
    let lastTime = TOTAL_TIME;
    timeRemainingRef.current = TOTAL_TIME;
    setTimeRemaining(TOTAL_TIME);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = Math.max(0, TOTAL_TIME - elapsed);
      if (newTime !== lastTime) {
        lastTime = newTime;
        timeRemainingRef.current = newTime;
        setTimeRemaining(newTime);
        if (newTime <= 0) {
          clearInterval(timerRef.current);
          // Timeout = elimination in Hardcore
          eliminate(streakRef.current);
        }
      }
    }, 100);
  }, [eliminate]);

  // ── Load Pokémon ──────────────────────────────────────────────────────────
  const loadPokemon = useCallback(async () => {
    setIsRevealed(false);
    setIsRoundOver(false);
    isRoundOverRef.current = false;
    setGuess('');
    setFeedback(null);
    setTimeRemaining(TOTAL_TIME);

    try {
      if (pokemonQueueRef.current.length === 0) {
        setIsLoading(true);
        await fillQueue();
      }
      const next = pokemonQueueRef.current.shift();
      if (!next) throw new Error('Queue empty');
      pokemonRef.current = next;
      setPokemon(next);
      setRegion(getRegion(next.id));
      setIsLoading(false);
      fillQueue();
      setTimeout(() => startTimer(), 50);
    } catch (err) {
      console.error('Failed to load Pokemon:', err);
      setIsLoading(false);
    }
  }, [fillQueue, startTimer]);

  const startNewRound = useCallback(() => {
    clearAllTimers();
    loadPokemon();
  }, [loadPokemon]);

  // ── Submit Guess ──────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    if (!guess.trim() || isRoundOverRef.current || !pokemonRef.current) return;
    if (isCorrectGuess(guess, pokemonRef.current.name)) {
      endRoundCorrect(calculateScore(timeRemainingRef.current));
    } else {
      // Wrong guess = ELIMINATION in hardcore
      setGuess('');
      eliminate(streakRef.current);
    }
  }, [guess, endRoundCorrect, eliminate]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPokemon();
    return () => clearAllTimers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ELIMINATION SCREEN ────────────────────────────────────────────────────
  if (isEliminated) {
    return (
      <div className="hc-root">
        <div className="hc-elimination-screen">
          <div className="hc-elim-bg-pulse" />
          <div className="hc-elim-content">
            <div className="hc-skull">💀</div>
            <h1 className="hc-elim-title">ELIMINATED</h1>
            <p className="hc-elim-sub">The Pokémon was: <strong>{pokemon?.name?.toUpperCase()}</strong></p>

            <div className="hc-streak-display">
              <span className="hc-streak-number">{finalStreak}</span>
              <span className="hc-streak-label">Round{finalStreak !== 1 ? 's' : ''} Survived</span>
            </div>

            {isNewRecord && (
              <div className="hc-new-record">
                🎉 New Personal Record!
              </div>
            )}

            <div className="hc-prev-best">
              Personal Best: {Math.max(finalStreak, profile?.highest_hardcore_streak || 0)} 🔥
            </div>

            <div className="hc-elim-actions">
              <button className="btn btn-primary hc-btn" onClick={() => {
                // Reset and play again
                streakRef.current = 0;
                scoreRef.current = 0;
                setStreak(0);
                setScore(0);
                setIsEliminated(false);
                setIsNewRecord(false);
                setFinalStreak(0);
                pokemonQueueRef.current = [];
                loadPokemon();
              }}>
                🔄 Try Again
              </button>
              <button className="btn btn-ghost hc-btn" onClick={() => navigate('/')}>
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  return (
    <div className="hc-root">
      <Confetti active={showConfetti} />

      {/* Top Bar */}
      <header className="hc-header">
        <button className="btn btn-ghost hc-back-btn" onClick={() => {
          clearAllTimers();
          eliminate(streakRef.current);
        }}>
          ← Quit
        </button>
        <div className="hc-header-center">
          <span className="hc-mode-label">☠️ HARDCORE</span>
        </div>
        <div className="hc-stats">
          <div className="hc-stat">
            <span className="hc-stat-label">Streak</span>
            <span className="hc-stat-value hc-streak-fire">🔥 {streak}</span>
          </div>
          <div className="hc-stat">
            <span className="hc-stat-label">Score</span>
            <span className="hc-stat-value">{score}</span>
          </div>
        </div>
      </header>

      <div className="hc-warning-banner">
        ⚠️ One wrong answer ends your run
      </div>

      <main className="hc-game-card">
        {isLoading ? (
          <div className="loading-state"><p className="loading-text">Loading…</p></div>
        ) : pokemon && (
          <>
            <PokemonDisplay pokemon={pokemon} isRevealed={isRevealed} showBlurryImage={false} />

            {isRevealed ? (
              <div className="hc-reveal" style={{ textAlign: 'center', marginTop: '1rem' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--color-pokemon-yellow)', marginBottom: '0.5rem' }}>
                  ⚡ {pokemon.name.toUpperCase()} ⚡
                </h2>
                <div style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                  Next Round in <strong style={{ color: 'white', fontSize: '1.5rem' }}>{nextRoundCountdown}</strong>
                </div>
              </div>
            ) : (
              <>
                <TimerBar timeRemaining={timeRemaining} />
                <div className="section-divider" />
                {/* Hardcore: no clues at all — master difficulty always */}
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  No hints. No mercy. Who's that Pokémon?
                </p>
                <div className="section-divider" />
                <GuessInput
                  guess={guess}
                  onChange={setGuess}
                  onSubmit={submitGuess}
                  onSkip={undefined}
                  disabled={isRoundOver || isLoading}
                />
                <FeedbackMessage feedback={feedback} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
