/**
 * useGameLogic.js - Core game state and logic hook
 *
 * Accepts: difficulty, selectedGens (from GameSettingsContext)
 * New:     showAlternateLetters, showBlurryImage flags
 *          sessionCorrect tracking for Supabase stats
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPokemon } from '../api';
import {
  getRandomPokemonId,
  getRegion,
  isCorrectGuess,
  calculateScore,
  getClueVisibility,
} from '../utils';

const TOTAL_TIME      = 30;
const NEXT_ROUND_DELAY = 3000;
const FADE_DURATION    = 400;

export function useGameLogic({ difficulty = 'elite', selectedGens } = {}) {
  // ── Pokémon data ─────────────────────────────────────────────────────────
  const [pokemon, setPokemon] = useState(null);
  const [region,  setRegion]  = useState('');

  // ── Score / rounds ───────────────────────────────────────────────────────
  const [score,         setScore]         = useState(0);
  const [roundNumber,   setRoundNumber]   = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [isRevealed,    setIsRevealed]    = useState(false);
  const [isRoundOver,   setIsRoundOver]   = useState(false);

  // ── Session stats ────────────────────────────────────────────────────────
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const sessionCorrectRef = useRef(0);

  // ── Clue visibility ──────────────────────────────────────────────────────
  const [showType,             setShowType]             = useState(false);
  const [showRegion,           setShowRegion]           = useState(false);
  const [showNameHint,         setShowNameHint]         = useState(false);
  const [showAlternateLetters, setShowAlternateLetters] = useState(false);
  const [showBlurryImage,      setShowBlurryImage]      = useState(false);

  // ── Guess ────────────────────────────────────────────────────────────────
  const [guess,    setGuess]    = useState('');
  const [feedback, setFeedback] = useState(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState(null);
  const [isFadingOut,        setIsFadingOut]        = useState(false);
  const [isFadedIn,          setIsFadedIn]          = useState(false);
  const [showConfetti,       setShowConfetti]       = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(3);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const timerRef           = useRef(null);
  const nextRoundTimerRef  = useRef(null);
  const countdownRef       = useRef(null);
  const isRoundOverRef     = useRef(false);
  const pokemonRef         = useRef(null);
  const difficultyRef      = useRef(difficulty);
  const selectedGensRef    = useRef(selectedGens);

  // Keep refs in sync with props so callbacks always see current values
  useEffect(() => { difficultyRef.current   = difficulty;    }, [difficulty]);
  useEffect(() => { selectedGensRef.current = selectedGens;  }, [selectedGens]);

  // ─────────────────────────────────────────────────────────────────────────
  function clearAllTimers() {
    clearInterval(timerRef.current);
    clearTimeout(nextRoundTimerRef.current);
    clearInterval(countdownRef.current);
  }

  function applyClueVisibility(time) {
    const v = getClueVisibility(time, difficultyRef.current);
    setShowType(v.showType);
    setShowRegion(v.showRegion);
    setShowNameHint(v.showNameHint);
    setShowAlternateLetters(v.showAlternateLetters);
    setShowBlurryImage(v.showBlurryImage);
  }

  // ─────────────────────────────────────────────────────────────────────────
  const endRound = useCallback((type, pointsToAdd = 0) => {
    if (isRoundOverRef.current) return;
    isRoundOverRef.current = true;

    clearInterval(timerRef.current);
    setIsRoundOver(true);
    setIsRevealed(true);
    // Reset blurry image on reveal
    setShowBlurryImage(false);

    if (type === 'correct') {
      sessionCorrectRef.current += 1;
      setSessionCorrect(sessionCorrectRef.current);
    }
    if (pointsToAdd > 0) setScore(prev => prev + pointsToAdd);
    if (type === 'correct') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }

    setFeedback({
      type,
      pokemonName:  pokemonRef.current?.name || '',
      pointsEarned: pointsToAdd,
      nextRoundIn:  3,
    });

    setNextRoundCountdown(3);
    let cdCount = 3;
    countdownRef.current = setInterval(() => {
      cdCount--;
      setNextRoundCountdown(cdCount);
      setFeedback(prev => prev ? { ...prev, nextRoundIn: cdCount } : prev);
      if (cdCount <= 0) clearInterval(countdownRef.current);
    }, 1000);

    nextRoundTimerRef.current = setTimeout(() => startNewRound(), NEXT_ROUND_DELAY);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    let time = TOTAL_TIME;

    timerRef.current = setInterval(() => {
      time--;
      setTimeRemaining(time);
      applyClueVisibility(time);

      if (time <= 0) {
        clearInterval(timerRef.current);
        endRound('timeout', 0);
      }
    }, 1000);
  }, [endRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  const loadPokemon = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsRevealed(false);
    setIsRoundOver(false);
    isRoundOverRef.current = false;
    setGuess('');
    setFeedback(null);
    setTimeRemaining(TOTAL_TIME);

    // Reset all clues
    setShowType(false);
    setShowRegion(false);
    setShowNameHint(false);
    setShowAlternateLetters(false);
    setShowBlurryImage(false);

    try {
      const id   = getRandomPokemonId(selectedGensRef.current);
      const data = await fetchPokemon(id);
      pokemonRef.current = data;
      setPokemon(data);
      setRegion(getRegion(data.id));
      setIsLoading(false);
      setTimeout(() => { setIsFadedIn(true); startTimer(); }, 100);
    } catch (err) {
      console.error('Failed to fetch Pokémon:', err);
      setError(err.message || 'Failed to load Pokémon. Please try again.');
      setIsLoading(false);
    }
  }, [startTimer]);

  // ─────────────────────────────────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(true);
    setIsFadedIn(false);
    setTimeout(() => {
      setRoundNumber(prev => prev + 1);
      setIsFadingOut(false);
      loadPokemon();
    }, FADE_DURATION);
  }, [loadPokemon]);

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPokemon();
    return () => clearAllTimers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    if (!guess.trim() || isRoundOverRef.current || !pokemon) return;
    if (isCorrectGuess(guess, pokemon.name)) {
      endRound('correct', calculateScore(timeRemaining));
    } else {
      setFeedback({ type: 'wrong-guess', pokemonName: '' });
      setTimeout(() => setFeedback(null), 1200);
      setGuess('');
    }
  }, [guess, pokemon, timeRemaining, endRound]);

  const skipPokemon = useCallback(() => {
    if (isRoundOverRef.current) return;
    endRound('skipped', 0);
  }, [endRound]);

  const resetSession = useCallback(() => {
    clearAllTimers();
    setScore(0);
    setRoundNumber(1);
    setSessionCorrect(0);
    sessionCorrectRef.current = 0;
    isRoundOverRef.current = false;
    setIsFadingOut(true);
    setTimeout(() => { setIsFadingOut(false); loadPokemon(); }, FADE_DURATION);
  }, [loadPokemon]);

  const retryLoad = useCallback(() => loadPokemon(), [loadPokemon]);

  return {
    pokemon, region, score, roundNumber, timeRemaining,
    isRevealed, isRoundOver,
    showType, showRegion, showNameHint,
    showAlternateLetters, showBlurryImage,   // ← new
    guess, feedback, isLoading, error,
    isFadingOut, isFadedIn, showConfetti, nextRoundCountdown,
    sessionCorrect,
    setGuess, submitGuess, skipPokemon, resetSession, retryLoad,
  };
}
