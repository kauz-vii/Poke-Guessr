/**
 * MultiplayerPage.jsx — Create or join a multiplayer room
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase }  from '../supabase';
import { useGameSettings, GEN_RANGES, DIFFICULTIES } from '../contexts/GameSettingsContext';

// ── Room code helpers ──────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function makeCode() {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = makeCode();
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate a unique room code. Try again.');
}

// ──────────────────────────────────────────────────────────────────────────

export default function MultiplayerPage() {
  const navigate         = useNavigate();
  const { user, profile } = useAuth();
  const { showToast }    = useToast();

  const [joinCode,    setJoinCode]    = useState('');
  const [creating,   setCreating]    = useState(false);
  const [joining,    setJoining]     = useState(false);
  const [error,      setError]       = useState('');
  const [showConfig, setShowConfig]  = useState(false);

  // Settings state
  const { selectedGens, toggleGen, difficulty, setDifficulty } = useGameSettings();
  const [totalRounds, setTotalRounds] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(10);

  // ── Create Party ────────────────────────────────────────────────────────
  async function handleCreate(e) {
    if (e) e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const code = await uniqueCode();

      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({ room_code: code, host_id: user.id, status: 'waiting', max_players: maxPlayers })
        .select()
        .single();
      if (roomErr) {
         // Fallback if max_players column doesn't exist yet
         if (roomErr.message.includes('max_players')) {
            const { data: fallbackRoom, error: fallbackErr } = await supabase
              .from('rooms')
              .insert({ room_code: code, host_id: user.id, status: 'waiting' })
              .select()
              .single();
            if (fallbackErr) throw fallbackErr;
            room = fallbackRoom;
         } else {
            throw roomErr;
         }
      }

      // Pre-create game session with configuration
      const gensArray = Array.from(selectedGens.values());
      const { error: sessionErr } = await supabase
        .from('game_sessions')
        .insert({
          room_id: room.id,
          current_round: 1,
          total_rounds: totalRounds,
          timer: 30,
          game_state: 'waiting',
          difficulty: difficulty,
          selected_gens: gensArray,
        });
      if (sessionErr) throw sessionErr;

      const { error: playerErr } = await supabase
        .from('room_players')
        .insert({
          room_id:  room.id,
          user_id:  user.id,
          username: profile?.username || 'Trainer',
          is_host:  true,
        });
      if (playerErr) throw playerErr;

      showToast(`Party created! Code: ${code}`, 'success');
      navigate(`/lobby/${room.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create party.');
    } finally {
      setCreating(false);
    }
  }

  // ── Join Party ──────────────────────────────────────────────────────────
  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setError('Room code must be 6 characters.'); return; }

    setError('');
    setJoining(true);
    try {
      // Find room
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', code)
        .maybeSingle();

      if (roomErr) throw roomErr;
      if (!room) throw new Error('Room not found. Check your code and try again.');
      if (room.status === 'in_game')  throw new Error('That game has already started.');
      if (room.status === 'finished') throw new Error('That game has ended.');

      // Check capacity
      const { count } = await supabase
        .from('room_players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);
      if (count >= (room.max_players || 10)) throw new Error(`Room is full (${room.max_players || 10}/${room.max_players || 10}).`);

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        const { error: joinErr } = await supabase
          .from('room_players')
          .insert({
            room_id:  room.id,
            user_id:  user.id,
            username: profile?.username || 'Trainer',
            is_host:  false,
          });
        if (joinErr) throw joinErr;
      }

      navigate(`/lobby/${room.id}`);
    } catch (err) {
      setError(err.message || 'Failed to join party.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mp-root">
      {/* Floating bg orbs (reuse menu pattern) */}
      <div className="menu-bg-shapes" aria-hidden="true">
        {[
          { x: 5,  y: 10, size: 55, dur: 8,  delay: 0   },
          { x: 85, y: 15, size: 40, dur: 9,  delay: 1   },
          { x: 15, y: 80, size: 50, dur: 7,  delay: 2   },
          { x: 80, y: 75, size: 35, dur: 10, delay: 0.5 },
        ].map((s, i) => (
          <div key={i} className="menu-bg-shape" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>

      <div className="mp-card">
        {/* Header */}
        <div className="mp-header">
          <span className="mp-header-icon">🎮</span>
          <h1 className="mp-title">Multiplayer</h1>
          <p className="mp-subtitle">
            Play with friends — compete round by round!
          </p>
        </div>

        {/* Error */}
        {error && <div className="mp-error" role="alert">⚠️ {error}</div>}

        {/* Create */}
        {!showConfig ? (
          <button
            className="mp-btn mp-btn-create"
            onClick={() => setShowConfig(true)}
            disabled={creating || joining}
            id="mp-create-btn"
          >
            <span>✨</span> Create Party
          </button>
        ) : (
          <form className="mp-config-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-pokemon-yellow)' }}>Party Settings</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Rounds</div>
                <select value={totalRounds} onChange={e => setTotalRounds(Number(e.target.value))} className="game-input" style={{ padding: '4px', width: '80px' }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </label>
              
              <label>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Max Players</div>
                <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="game-input" style={{ padding: '4px', width: '80px' }}>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                </select>
              </label>
            </div>

            <label>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Difficulty</div>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="game-input" style={{ padding: '4px', width: '100%' }}>
                {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Generations ({selectedGens.size} selected)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {GEN_RANGES.map(g => (
                  <button type="button" key={g.gen} onClick={() => toggleGen(g.gen)} disabled={selectedGens.has(g.gen) && selectedGens.size === 1} style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: selectedGens.has(g.gen) ? 'var(--color-pokemon-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}>
                    {g.gen}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mp-btn mp-btn-create"
              disabled={creating || joining}
              style={{ marginTop: '8px' }}
            >
              {creating ? 'Creating…' : 'Start Party'}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="mp-divider">
          <span className="mp-divider-line" />
          <span className="mp-divider-text">or</span>
          <span className="mp-divider-line" />
        </div>

        {/* Join */}
        <form onSubmit={handleJoin} className="mp-join-form" noValidate>
          <label className="mp-join-label" htmlFor="mp-code-input">
            Enter Party Code
          </label>
          <input
            id="mp-code-input"
            type="text"
            className="mp-code-input"
            placeholder="AB7KQ2"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="mp-btn mp-btn-join"
            disabled={joinCode.length !== 6 || joining || creating}
            id="mp-join-btn"
          >
            {joining ? (
              <><span className="auth-spinner" /> Joining…</>
            ) : (
              <><span>🚀</span> Join Party</>
            )}
          </button>
        </form>

        <Link className="mp-back" to="/">← Back to Menu</Link>
      </div>
    </div>
  );
}
