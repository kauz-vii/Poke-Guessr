/**
 * GameStartingPage.jsx — Bootstraps the multiplayer match
 *
 * Host: Creates game_sessions row and inserts player_scores.
 * Clients: Wait for game_sessions row to exist.
 * All: Redirect to /multiplayer/game/:roomId
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useGameSettings } from '../contexts/GameSettingsContext';

export default function GameStartingPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();
  const { difficulty, selectedGens } = useGameSettings();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function init() {
      if (!user || !roomId) return;

      try {
        // Are we the host?
        const { data: me } = await supabase
          .from('room_players')
          .select('is_host')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (me?.is_host) {
          // ── HOST INIT ──
          // 1. Fetch all players
          const { data: players } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId);

          // 2. Init player_scores (upsert just in case)
          if (players && players.length > 0) {
            const scoresToInsert = players.map(p => ({
              room_id: roomId,
              user_id: p.user_id,
              username: p.username,
              score: 0,
              correct_guesses: 0,
            }));
            await supabase.from('player_scores').upsert(scoresToInsert, { onConflict: 'room_id,user_id' });
          }

          // 3. Init game_sessions
          const gensArray = Array.from(selectedGens.values());
          const { data: existingSession } = await supabase.from('game_sessions').select('id').eq('room_id', roomId).maybeSingle();
          if (!existingSession) {
            const { error: sessionErr } = await supabase
              .from('game_sessions')
              .insert({
                room_id: roomId,
                current_round: 1,
                timer: 30,
                game_state: 'waiting',
                difficulty: difficulty,
                selected_gens: gensArray,
              });
            if (sessionErr) throw sessionErr;
          }

          // 4. Redirect
          if (active) navigate(`/multiplayer/game/${roomId}`);
        } else {
          // ── CLIENT WAIT ──
          // Wait for game_session to be created by the host
          const checkSession = async () => {
            const { data } = await supabase
              .from('game_sessions')
              .select('id')
              .eq('room_id', roomId)
              .maybeSingle();
            
            if (data && active) {
              navigate(`/multiplayer/game/${roomId}`);
            } else if (active) {
              setTimeout(checkSession, 1000);
            }
          };
          checkSession();
        }
      } catch (err) {
        console.error(err);
        if (active) setError('Failed to initialize game. Please try again.');
      }
    }

    init();
    return () => { active = false; };
  }, [roomId, user, difficulty, selectedGens, navigate]);

  return (
    <div className="gstart-root">
      <div className="menu-bg-shapes" aria-hidden="true">
        {[
          { x: 5,  y: 10, size: 55, dur: 8,  delay: 0 },
          { x: 85, y: 15, size: 40, dur: 9,  delay: 1 },
          { x: 15, y: 80, size: 50, dur: 7,  delay: 2 },
          { x: 80, y: 75, size: 35, dur: 10, delay: 0.5 },
        ].map((s, i) => (
          <div key={i} className="menu-bg-shape" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>

      <div className="gstart-card">
        <div className="gstart-pokeball-wrap">
          <svg viewBox="0 0 100 100" className="gstart-ball" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="#FF5350" stroke="#1a1a2e" strokeWidth="4"/>
            <rect x="2" y="46" width="96" height="8" fill="#1a1a2e"/>
            <circle cx="50" cy="50" r="14" fill="#1a1a2e"/>
            <circle cx="50" cy="50" r="9"  fill="white"/>
          </svg>
        </div>

        <h1 className="gstart-title">Game Starting…</h1>
        <p className="gstart-sub">
          {error || 'Syncing match settings...'}
        </p>
      </div>
    </div>
  );
}
