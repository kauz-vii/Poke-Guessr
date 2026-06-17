/**
 * MultiplayerGamePage.jsx — Core synchronized gameplay
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { fetchPokemon } from '../api';
import {
  getRandomPokemonId,
  getRegion,
  isCorrectGuess,
  getClueVisibility,
  calculateElo,
  getRankTier
} from '../utils';

import PokemonDisplay  from '../components/PokemonDisplay';
import TimerBar        from '../components/TimerBar';
import CluesPanel      from '../components/CluesPanel';
import GuessInput      from '../components/GuessInput';
import FeedbackMessage from '../components/FeedbackMessage';
import Confetti        from '../components/Confetti';

const ROUND_TIME = 30;

export default function MultiplayerGamePage() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const { user, saveGameSession } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // ── Sync State (from DB) ─────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [scores,  setScores]  = useState([]);
  const [room, setRoom] = useState(null);
  
  // ── Local State ──────────────────────────────────────────────────────────
  const [pokemon, setPokemon] = useState(null);
  const [region,  setRegion]  = useState('');
  const [guess,   setGuess]   = useState('');
  const [feedback, setFeedback] = useState(null);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [activePlayerIds, setActivePlayerIds] = useState([]);
  const [matchFinalData, setMatchFinalData] = useState(null);

  useEffect(() => {
    if (gameState === 'finished' && scores.length > 0) {
      supabase.rpc('finalize_match_results', { p_room_id: roomId })
        .then(({ data, error }) => {
          if (!error && data) setMatchFinalData(data);
        });
    }
  }, [gameState, roomId, scores.length]);
  
  const hostTimerRef   = useRef(null);
  const revealTimerRef = useRef(null);

  // Derived
  const timeRemaining = session?.timer ?? ROUND_TIME;
  const gameState     = session?.game_state ?? 'waiting';
  const currentRound  = session?.current_round ?? 1;
  const isRevealed    = gameState === 'reveal' || gameState === 'finished';
  
  // Load Clues using the shared timer and shared difficulty
  const clues = getClueVisibility(timeRemaining, session?.difficulty || 'elite');

  // ── 1. Initial Fetch & Setup ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function init() {
      // Check if host
      const { data: me } = await supabase
        .from('room_players')
        .select('is_host')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (me?.is_host && active) setIsHost(true);

      // Fetch initial session
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (sess && active) setSession(sess);

      // Fetch initial scores
      const { data: scrs } = await supabase
        .from('player_scores')
        .select('*')
        .eq('room_id', roomId)
        .order('score', { ascending: false });

      // Fetch room (to determine if ranked)
      const { data: rm } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();
      if (rm && active) setRoom(rm);

      if (scrs && active) setScores(scrs);
    }
    init();
    return () => { active = false; };
  }, [roomId, user.id]);

  // ── 2. Realtime Subscriptions & Presence ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`game:${roomId}`, { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setActivePlayerIds(ids);
      })
      // Listen to session changes (timer, state, pokemon)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
        (payload) => setSession(payload.new)
      )
      // Listen to score changes
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_scores', filter: `room_id=eq.${roomId}` },
        async () => {
          // Re-fetch sorted scores
          const { data } = await supabase
            .from('player_scores')
            .select('*')
            .eq('room_id', roomId)
            .order('score', { ascending: false });
          if (data) setScores(data);
        }
      )
      // Room deleted? Go home.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => navigate('/multiplayer')
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [roomId, navigate, user.id]);

  // ── 2b. Host Migration & Forfeit Detection ───────────────────────────────
  useEffect(() => {
    if (activePlayerIds.length === 0 || !session || session.game_state === 'finished') return;
    
    // Check for forfeit: if original player count was >= 2, and only 1 is left
    if (activePlayerIds.length === 1 && scores.length >= 2) {
      if (activePlayerIds[0] === user.id) {
        // I'm the last one standing, I win!
        supabase.from('game_sessions').update({ game_state: 'finished' }).eq('room_id', roomId);
      }
      return;
    }

    // Host Migration: The player with the alphabetically first ID becomes the host
    const designatedHostId = [...activePlayerIds].sort()[0];
    if (designatedHostId === user.id && !isHost) {
      setIsHost(true);
      supabase.from('room_players').update({ is_host: true }).eq('room_id', roomId).eq('user_id', user.id);
    } else if (designatedHostId !== user.id && isHost) {
      setIsHost(false); // Fix: Relinquish host if someone else takes priority
    }
  }, [activePlayerIds, scores.length, session, user.id, isHost, roomId]);

  // ── 3. Fetch Pokémon when ID changes ─────────────────────────────────────
  useEffect(() => {
    if (!session?.current_pokemon_id) return;
    let active = true;
    async function getPkmn() {
      try {
        const data = await fetchPokemon(session.current_pokemon_id);
        if (active) {
          setPokemon(data);
          setRegion(getRegion(data.id));
        }
      } catch (err) {
        console.error(err);
      }
    }
    getPkmn();
    return () => { active = false; };
  }, [session?.current_pokemon_id]);

  // ── 4. HOST ONLY: Game Loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !session) return;
    if (session.game_state === 'finished') return;

    const runHostLoop = async () => {
      // If waiting, start Round 1
      if (session.game_state === 'waiting') {
        const gensSet = new Set(session.selected_gens || [1,2,3,4,5,6,7,8,9]);
        const nextId = getRandomPokemonId(gensSet);
        await supabase.from('game_sessions').update({
          game_state: 'round_active',
          current_pokemon_id: nextId,
          timer: ROUND_TIME
        }).eq('room_id', roomId);
        return;
      }

      // If active, run timer
      if (session.game_state === 'round_active') {
        clearInterval(hostTimerRef.current);
        let t = session.timer;
        
        hostTimerRef.current = setInterval(async () => {
          t--;
          if (t <= 0) {
            clearInterval(hostTimerRef.current);
            await supabase.from('game_sessions').update({
              game_state: 'reveal',
              timer: 0
            }).eq('room_id', roomId);
          } else {
            // Update DB timer (Realtime will broadcast)
            await supabase.from('game_sessions').update({ timer: t }).eq('room_id', roomId);
            
            // Check early end condition (everyone ACTIVE guessed correctly)
            const activeCount = activePlayerIds.length > 0 ? activePlayerIds.length : 1; // fallback to 1 to prevent divide-by-zero logic
            const { count: correctGuesses } = await supabase.from('round_results').select('id', { count: 'exact', head: true })
              .eq('room_id', roomId)
              .eq('round_number', session.current_round)
              .eq('guessed_correctly', true);
            
            if (correctGuesses >= activeCount) {
              clearInterval(hostTimerRef.current);
              await supabase.from('game_sessions').update({
                game_state: 'reveal',
                timer: t // preserve remaining time
              }).eq('room_id', roomId);
            }
          }
        }, 1000);
      }

      // If reveal, wait 3s then next round
      if (session.game_state === 'reveal') {
        revealTimerRef.current = setTimeout(async () => {
          const totalRounds = session.total_rounds || 10;
          if (session.current_round >= totalRounds) {
            await supabase.from('game_sessions').update({ game_state: 'finished' }).eq('room_id', roomId);
          } else {
            const gensSet = new Set(session.selected_gens || [1,2,3,4,5,6,7,8,9]);
            const nextId = getRandomPokemonId(gensSet);
            await supabase.from('game_sessions').update({
              game_state: 'round_active',
              current_pokemon_id: nextId,
              current_round: session.current_round + 1,
              timer: ROUND_TIME
            }).eq('room_id', roomId);
          }
        }, 3000);
      }
    };

    runHostLoop();

    return () => {
      clearInterval(hostTimerRef.current);
      clearTimeout(revealTimerRef.current);
    };
  }, [isHost, session?.game_state, session?.current_round, activePlayerIds.length]); // added activePlayerIds.length dependency for dynamic early end

  // ── 5. Client: Reset local state on new round ────────────────────────────
  useEffect(() => {
    if (session?.game_state === 'round_active' && session?.timer === ROUND_TIME) {
      setHasGuessedCorrectly(false);
      setGuess('');
      setFeedback(null);
    }
  }, [session?.game_state, session?.timer]);


  // ── 6. Client: Submit Guess ──────────────────────────────────────────────
  const submitGuess = useCallback(async () => {
    if (!guess.trim() || gameState !== 'round_active' || hasGuessedCorrectly || !pokemon) return;

    if (isCorrectGuess(guess, pokemon.name)) {
      setHasGuessedCorrectly(true);
      const points = Math.max(10, timeRemaining * 5); // Time * 5 for multiplayer
      setFeedback({ type: 'correct', pokemonName: '', pointsEarned: points });

      // Call secure RPC to handle score calculation atomically on the database!
      const { error } = await supabase.rpc('record_round_result', {
        p_room_id: roomId,
        p_round_number: currentRound,
        p_guessed_correctly: true,
        p_points_earned: points,
        p_guess_time: ROUND_TIME - timeRemaining,
        p_username: user.user_metadata?.username || 'Trainer'
      });
      
      if (error) {
        console.error("Double submission or DB error:", error);
      }
    } else {
      setFeedback({ type: 'wrong-guess', pokemonName: '' });
      setTimeout(() => setFeedback(null), 1200);
      setGuess('');
    }
  }, [guess, gameState, hasGuessedCorrectly, pokemon, timeRemaining, currentRound, roomId, user]);


  // ── 7. Client: Exit Match ────────────────────────────────────────────────
  const handleExit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const isRanked = room && !room.party_code;
      const myScore = scores.find(s => s.user_id === user.id);
      const placement = scores.findIndex(s => s.user_id === user.id) + 1;
      
      await saveGameSession({
        sessionScore: myScore?.score || 0,
        sessionCorrect: myScore?.correct_guesses || 0,
        gameMode: isRanked ? 'ranked' : 'party',
        placement: placement,
        roundsWon: myScore?.correct_guesses || 0,
        duration: 300,
        roomId: roomId
      });
      
      if (isRanked) {
        // Fetch new profile to get updated rating, streaks, etc.
        const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (newProfile) {
          const oldRating = profile?.rating || 1200;
          const diff = newProfile.rating - oldRating;
          const eloChangeStr = diff > 0 ? `+${diff}` : `${diff}`;
          
          if (newProfile.placement_matches_played < 10) {
            window.dispatchEvent(new CustomEvent('achievement_unlocked', { detail: { icon: '🎯', title: `Placement Match Complete (${newProfile.placement_matches_played}/10)` } }));
          } else if (oldRating === 1200 && newProfile.placement_matches_played === 10) {
            window.dispatchEvent(new CustomEvent('achievement_unlocked', { detail: { icon: '🏆', title: `Placements Complete! Rating: ${newProfile.rating}` } }));
          } else {
            window.dispatchEvent(new CustomEvent('achievement_unlocked', { detail: { icon: '⚔️', title: `Ranked Match Complete. Rating ${eloChangeStr}` } }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to save multiplayer session:', err);
    } finally {
      setIsSaving(false);
      navigate('/');
    }
  };

  // ── UI Renders ───────────────────────────────────────────────────────────

  if (!session) {
    return <div className="mp-root"><div className="auth-spinner" style={{ width: 40, height: 40, borderWidth: 4 }} /></div>;
  }

  // Final Leaderboard Screen
  if (gameState === 'finished') {
    const winner = scores[0];
    const mvpUser = scores.find(s => s.user_id === matchFinalData?.mvp_id);
    
    return (
      <div className="mp-root">
        <Confetti active={true} />
        <div className="mp-card" style={{ maxWidth: 600 }}>
          <h1 className="mp-title" style={{ color: 'var(--color-pokemon-yellow)' }}>Match Complete!</h1>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👑</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{winner?.username} wins!</div>
            <div style={{ color: 'var(--color-text-muted)' }}>Score: {winner?.score}</div>
          </div>

          {mvpUser && (
            <div style={{ background: 'rgba(255, 203, 5, 0.1)', border: '2px solid var(--color-pokemon-yellow)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌟</div>
              <div style={{ color: 'var(--color-pokemon-yellow)', fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.2rem' }}>Match MVP</div>
              <div style={{ fontWeight: 'bold' }}>{mvpUser.username}</div>
              <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.5rem' }}>
                {mvpUser.correct_guesses} Guesses • {mvpUser.score} Score
              </div>
            </div>
          )}

          <div className="mp-divider"><span className="mp-divider-line"/></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scores.map((s, idx) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>#{idx + 1} {s.username}</span>
                <span style={{ color: 'var(--color-pokemon-yellow)', fontWeight: 900 }}>{s.score} pts</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleExit}
            disabled={isSaving}
            className="mp-btn mp-btn-join" 
            style={{ marginTop: '1rem' }}
          >
            {isSaving ? 'Saving...' : 'Exit to Multiplayer Menu'}
          </button>
        </div>
      </div>
    );
  }

  // Active Game Screen
  return (
    <div className="app">
      {/* Shared Header */}
      <header className="header" style={{ justifyContent: 'space-between', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            ROOM: {session.room_id.split('-')[0].toUpperCase()}
          </div>
          <div className="header-score">
            <span className="header-score-label">Round</span>
            <span className="header-score-value">{currentRound} / {session?.total_rounds || 10}</span>
          </div>
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-pokemon-yellow)' }}>
          TIMER: {timeRemaining}s
        </div>
      </header>

      <Confetti active={hasGuessedCorrectly && gameState === 'reveal'} />

      <main className="game-layout" style={{ gridTemplateColumns: '1fr 260px', maxWidth: '900px' }}>
        {/* ── Center Game Card ── */}
        <div className="game-center">
          <article className={`game-card fade-in`}>
            {pokemon ? (
              <>
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
                  difficulty={session.difficulty}
                />
                <div className="section-divider" aria-hidden="true" />
                
                {gameState === 'reveal' ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-pokemon-yellow)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {pokemon.name.toUpperCase()}
                  </div>
                ) : hasGuessedCorrectly ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#4CAF50', fontWeight: 'bold', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                    ✓ Correct! Waiting for others...
                  </div>
                ) : (
                  <GuessInput
                    guess={guess}
                    onChange={setGuess}
                    onSubmit={submitGuess}
                    onSkip={() => {}} // No skipping in multiplayer
                    disabled={gameState !== 'round_active' || hasGuessedCorrectly}
                  />
                )}
                <FeedbackMessage feedback={feedback} />
              </>
            ) : (
              <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading Next Round...
              </div>
            )}
          </article>
        </div>

        {/* ── Right Scoreboard ── */}
        <aside className="diff-legend" style={{ position: 'sticky', top: '16px' }}>
          <div className="diff-legend-header" style={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}>
            <span>🏆</span> Live Scoreboard
          </div>
          <ul className="diff-legend-list" style={{ gap: '8px' }}>
            {scores.map((s, idx) => (
              <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: s.user_id === user.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: s.user_id === user.id ? 800 : 600 }}>
                  {idx === 0 && '👑 '} {s.username}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-pokemon-yellow)' }}>
                  {s.score}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
