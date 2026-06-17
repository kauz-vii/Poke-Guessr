/**
 * useGameLogic.js - Core game state and logic hook
 *
 * Accepts: difficulty, selectedGens (from GameSettingsContext)
 * New:     showAlternateLetters, showBlurryImage flags
 *          sessionCorrect tracking for Supabase stats
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
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
  const pokemonQueueRef    = useRef([]);
  const timeRemainingRef   = useRef(TOTAL_TIME);
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
    
    // Asynchronously log the Pokedex encounter
    if (pokemonRef.current) {
      supabase.rpc('update_pokedex_encounter', {
        p_pokemon_id: pokemonRef.current.id,
        p_is_correct: type === 'correct'
      }).then(({ error }) => {
        if (error) console.error('Pokedex RPC error:', error);
      });
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
    const startTime = Date.now();
    let lastTime = TOTAL_TIME;
    timeRemainingRef.current = TOTAL_TIME;
    setTimeRemaining(TOTAL_TIME);

    // Run interval more frequently, but only update state when absolute seconds change.
    // This perfectly eliminates background tab timer throttling/drift.
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = Math.max(0, TOTAL_TIME - elapsed);

      if (newTime !== lastTime) {
        lastTime = newTime;
        timeRemainingRef.current = newTime;
        setTimeRemaining(newTime);
        applyClueVisibility(newTime);

        if (newTime <= 0) {
          clearInterval(timerRef.current);
          endRound('timeout', 0);
        }
      }
    }, 100);
  }, [endRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  const fillQueue = useCallback(async () => {
    const needed = 3 - pokemonQueueRef.current.length;
    if (needed <= 0) return;
    
    const promises = [];
    for (let i = 0; i < needed; i++) {
      const id = getRandomPokemonId(selectedGensRef.current);
      promises.push(fetchPokemon(id));
    }
    
    try {
      const newPokemons = await Promise.all(promises);
      pokemonQueueRef.current = [...pokemonQueueRef.current, ...newPokemons];
    } catch (err) {
      console.error('Failed to fill queue:', err);
    }
  }, []);

  const loadPokemon = useCallback(async () => {
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
      if (pokemonQueueRef.current.length === 0) {
        setIsLoading(true);
        await fillQueue();
      }

      const nextPkmn = pokemonQueueRef.current.shift();
      if (!nextPkmn) throw new Error("Queue empty");

      pokemonRef.current = nextPkmn;
      setPokemon(nextPkmn);
      setRegion(getRegion(nextPkmn.id));
      setIsLoading(false);
      
      // Replenish queue in background
      fillQueue();
      
      setTimeout(() => { setIsFadedIn(true); startTimer(); }, 50);
    } catch (err) {
      console.error('Failed to fetch Pokémon:', err);
      setError(err.message || 'Failed to load Pokémon. Please try again.');
      setIsLoading(false);
    }
  }, [startTimer, fillQueue]);

  const startNewRound = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(true);
    setIsFadedIn(false);
    
    // We don't use FADE_DURATION delay anymore because we want 0 loading screens!
    // Just increment round and load immediately. The UI crossfade can handle itself if needed.
    setRoundNumber(prev => prev + 1);
    setIsFadingOut(false);
    loadPokemon();
  }, [loadPokemon]);

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPokemon();
    return () => clearAllTimers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    if (!guess.trim() || isRoundOverRef.current || !pokemonRef.current) return;
    if (isCorrectGuess(guess, pokemonRef.current.name)) {
      endRound('correct', calculateScore(timeRemainingRef.current));
    } else {
      setFeedback({ type: 'wrong-guess', pokemonName: '' });
      setTimeout(() => setFeedback(null), 1200);
      setGuess('');
    }
  }, [guess, endRound]);

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
