/**
 * DailyChallengePage.jsx — Play a fixed sequence of 10 Pokémon once per day.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { fetchPokemon } from '../api';
import {
  getDailyChallengeSequence,
  getRegion,
  isCorrectGuess,
  calculateScore,
  getClueVisibility,
} from '../utils';

import Header          from '../components/Header';
import PokemonDisplay  from '../components/PokemonDisplay';
import TimerBar        from '../components/TimerBar';
import CluesPanel      from '../components/CluesPanel';
import GuessInput      from '../components/GuessInput';
import FeedbackMessage from '../components/FeedbackMessage';
import LoadingState    from '../components/LoadingState';
import ErrorState      from '../components/ErrorState';
import Confetti        from '../components/Confetti';

const TOTAL_ROUNDS = 1;
const ROUND_TIME = 30;

export default function DailyChallengePage() {
  const navigate = useNavigate();
  const { user, saveGameSession } = useAuth();
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [todayScore, setTodayScore] = useState(null);

  const [sequence, setSequence] = useState([]);
  
  // Game State
  const [pokemon, setPokemon] = useState(null);
  const [region, setRegion] = useState('');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_TIME);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [matchOver, setMatchOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef(null);
  const nextRoundRef = useRef(null);
  const isRoundOverRef = useRef(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Initial Check
  useEffect(() => {
    let active = true;
    async function init() {
      const { data } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_date', todayStr)
        .maybeSingle();

      if (data && active) {
        setAlreadyPlayed(true);
        setTodayScore(data.score);
      } else if (active) {
        setSequence(getDailyChallengeSequence(todayStr));
      }
      if (active) setLoadingInitial(false);
    }
    init();
    return () => { active = false; };
  }, [user.id, todayStr]);

  // 2. Load Pokemon
  const loadPokemon = useCallback(async (currentRoundNum, currentSeq) => {
    if (!currentSeq || currentSeq.length === 0) return;
    
    if (currentRoundNum > TOTAL_ROUNDS) {
      setMatchOver(true);
      return;
    }

    setPokemon(null);
    setIsRevealed(false);
    setIsRoundOver(false);
    isRoundOverRef.current = false;
    setGuess('');
    setFeedback(null);
    setTimeRemaining(ROUND_TIME);

    try {
      const pkmnId = currentSeq[currentRoundNum - 1];
      const data = await fetchPokemon(pkmnId);
      setPokemon(data);
      setRegion(getRegion(data.id));
      
      clearInterval(timerRef.current);
      let t = ROUND_TIME;
      timerRef.current = setInterval(() => {
        t--;
        setTimeRemaining(t);
        if (t <= 0) {
          clearInterval(timerRef.current);
          endRound('timeout', 0);
        }
      }, 1000);
    } catch (err) {
      setError('Failed to load Pokémon.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadingInitial && !alreadyPlayed && sequence.length > 0 && !matchOver) {
      loadPokemon(roundNumber, sequence);
    }
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(nextRoundRef.current);
    };
  }, [loadingInitial, alreadyPlayed, sequence, roundNumber, matchOver, loadPokemon]);

  // 3. Round Logic
  const endRound = useCallback((type, points) => {
    if (isRoundOverRef.current) return;
    isRoundOverRef.current = true;
    clearInterval(timerRef.current);
    setIsRoundOver(true);
    setIsRevealed(true);

    if (points > 0) {
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }

    setFeedback({ type, pointsEarned: points, nextRoundIn: 3 });

    nextRoundRef.current = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setRoundNumber(r => r + 1);
        setIsFadingOut(false);
      }, 400);
    }, 3000);
  }, []);

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

  // 4. Save Match
  useEffect(() => {
    if (matchOver && !alreadyPlayed && !isSaving) {
      setIsSaving(true);
      const save = async () => {
        try {
          // 1. Save Daily Result
          await supabase.from('daily_challenges').insert({
            user_id: user.id,
            username: user.user_metadata?.username || 'Trainer',
            challenge_date: todayStr,
            score: score,
            completion_time: 300 // Approximation
          });

          // 2. Save Global Session/XP
          await saveGameSession({
            sessionScore: score,
            sessionCorrect: correctCount,
            gameMode: 'daily',
            placement: null,
            roundsWon: correctCount,
            duration: 300,
            isDaily: true
          });

          setAlreadyPlayed(true);
          setTodayScore(score);
        } catch (e) {
          console.error(e);
          setError('Failed to save score!');
        }
      };
      save();
    }
  }, [matchOver, alreadyPlayed, isSaving, score, correctCount, user, todayStr, saveGameSession]);

  // Render Clues
  const clues = getClueVisibility(timeRemaining, 'elite'); // Daily challenge uses standard elite rules

  if (loadingInitial) return <LoadingState />;

  if (alreadyPlayed) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="game-card fade-in" style={{ textAlign: 'center', padding: '2rem' }}>
          <h1>📅 Daily Challenge Complete!</h1>
          <p>You have already played today's challenge.</p>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-pokemon-yellow)', margin: '1rem 0' }}>
            Score: {todayScore}
          </div>
          <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
            Come back tomorrow for a new sequence of Pokémon!
          </p>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Back to Main Menu
          </Link>
        </div>
      </div>
    );
  }

  if (error && !pokemon) return <ErrorState error={error} />;

  return (
    <div className="app">
      <Header
        round={roundNumber}
        score={score}
        timeRemaining={timeRemaining}
        isPlaying={!isRoundOver && !matchOver}
        onBack={() => navigate('/')}
      />
      
      <Confetti active={showConfetti} />

      <main className="game-layout">
        <div className="game-center" style={{ margin: '0 auto' }}>
          <article className={`game-card ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
            {pokemon ? (
              <>
                <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-pokemon-yellow)', marginBottom: '0.5rem' }}>
                  Daily Challenge • {todayStr}
                </div>
                <PokemonDisplay
                  pokemon={pokemon}
                  isRevealed={isRevealed}
                  showBlurryImage={clues.showBlurryImage}
                />
                <TimerBar timeRemaining={timeRemaining} />
                <div className="section-divider" aria-hidden="true" />
                <CluesPanel
                  pokemon={pokemon}
                  showType={clues.showType}
                  showRegion={clues.showRegion}
                  showNameHint={clues.showNameHint}
                  showAlternateLetters={clues.showAlternateLetters}
                  region={region}
                  isRevealed={isRevealed}
                  difficulty="elite"
                />
                <div className="section-divider" aria-hidden="true" />
                <GuessInput
                  guess={guess}
                  onChange={setGuess}
                  onSubmit={submitGuess}
                  onSkip={skipPokemon}
                  disabled={isRoundOver || isSaving}
                />
                <FeedbackMessage feedback={feedback} />
              </>
            ) : (
              <LoadingState />
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
