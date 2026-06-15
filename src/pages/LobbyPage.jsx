/**
 * LobbyPage.jsx — Multiplayer lobby with Supabase Realtime
 *
 * Features:
 * - Live player list (Realtime postgres_changes)
 * - Host badge + host transfer on leave
 * - Player count (X / 10)
 * - Leave Lobby (calls leave_room RPC)
 * - Host-only Start Game (sets status → in_game, all clients redirect)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase }  from '../supabase';

export default function LobbyPage() {
  const { roomId }         = useParams();
  const navigate           = useNavigate();
  const { user, profile }  = useAuth();
  const { showToast }      = useToast();

  const [room,     setRoom]     = useState(null);
  const [players,  setPlayers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [leaving,  setLeaving]  = useState(false);
  const [starting, setStarting] = useState(false);

  // Copied code flash state
  const [copied, setCopied] = useState(false);

  // Prevent double-leave (e.g., unmount race)
  const leavingRef = useRef(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const me     = players.find(p => p.user_id === user?.id);
  const isHost = me?.is_host ?? false;

  // ── Fetch room + players ─────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (error) { setError('Failed to load room.'); return; }
    if (!data)  { setError('Room not found.'); return; }
    setRoom(data);
    return data;
  }, [roomId]);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (!error && data) setPlayers(data);
  }, [roomId]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      const roomData = await fetchRoom();
      if (!roomData) { setLoading(false); return; }

      // Redirect if game already started
      if (roomData.status === 'in_game')  { navigate(`/game-starting/${roomId}`); return; }
      if (roomData.status === 'finished') { navigate('/multiplayer');   return; }

      await fetchPlayers();
      setLoading(false);
    }
    init();
  }, [fetchRoom, fetchPlayers, navigate]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`lobby:${roomId}`)
      // Player joins / leaves
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => fetchPlayers()
      )
      // Room status changes (e.g., host clicks Start)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        ({ new: updatedRoom }) => {
          setRoom(updatedRoom);
          if (updatedRoom.status === 'in_game') {
            navigate(`/game-starting/${roomId}`);
          }
        }
      )
      // Room deleted (host left when empty)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          showToast('The room was closed.', 'info');
          navigate('/multiplayer');
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchPlayers, navigate, showToast]);

  // ── Leave Lobby ──────────────────────────────────────────────────────────
  const handleLeave = useCallback(async () => {
    if (leavingRef.current || leaving) return;
    leavingRef.current = true;
    setLeaving(true);

    try {
      const { error } = await supabase.rpc('leave_room', {
        p_room_id: roomId,
        p_user_id: user.id,
      });
      if (error) throw error;
    } catch (err) {
      showToast('Failed to leave room cleanly.', 'error');
      console.error(err);
    }

    navigate('/multiplayer');
  }, [roomId, user, navigate, showToast, leaving]);

  // ── Start Game (host only) ───────────────────────────────────────────────
  async function handleStart() {
    if (!isHost || starting) return;
    setStarting(true);
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'in_game' })
      .eq('id', roomId);

    if (error) {
      showToast('Failed to start game.', 'error');
      setStarting(false);
    }
    // Realtime subscription will redirect everyone including host
  }

  // ── Copy code ────────────────────────────────────────────────────────────
  function copyCode() {
    navigator.clipboard.writeText(room?.room_code || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lobby-root">
        <div className="lobby-card lobby-loading">
          <div className="auth-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p>Loading lobby…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lobby-root">
        <div className="lobby-card lobby-error-state">
          <p className="lobby-error-msg">⚠️ {error}</p>
          <Link to="/multiplayer" className="mp-btn mp-btn-join" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            ← Back to Multiplayer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-root">
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

      <div className="lobby-card">
        {/* ── Room code header ── */}
        <div className="lobby-code-section">
          <p className="lobby-code-label">Party Code</p>
          <button
            className="lobby-code-display"
            onClick={copyCode}
            title="Click to copy"
            aria-label="Copy party code"
          >
            <span className="lobby-code-text">{room?.room_code}</span>
            <span className="lobby-code-copy">{copied ? '✓ Copied!' : '📋 Copy'}</span>
          </button>
          <p className="lobby-code-hint">Share this code with friends to join</p>
        </div>

        {/* ── Player count ── */}
        <div className="lobby-count">
          <span className="lobby-count-label">Players</span>
          <span className="lobby-count-value">
            {players.length}
            <span className="lobby-count-max"> / {room?.max_players || 10}</span>
          </span>
        </div>

        {/* ── Player list ── */}
        <div className="lobby-players" role="list" aria-label="Players in lobby">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className={`lobby-player-row ${p.user_id === user?.id ? 'lobby-player-me' : ''} ${p.is_host ? 'lobby-player-host' : ''}`}
              role="listitem"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="lobby-player-avatar">
                {p.username.charAt(0).toUpperCase()}
              </div>
              <div className="lobby-player-info">
                <span className="lobby-player-name">
                  {p.username}
                  {p.user_id === user?.id && <span className="lobby-you-badge">You</span>}
                </span>
                {p.is_host && <span className="lobby-host-badge">👑 Host</span>}
              </div>
              {idx === 0 && <span className="lobby-join-num">#1</span>}
            </div>
          ))}
        </div>

        {/* ── Status ── */}
        <div className="lobby-status">
          <span className="lobby-status-dot" />
          <span className="lobby-status-text">Waiting for players…</span>
        </div>

        {/* ── Actions ── */}
        <div className="lobby-actions">
          {isHost && (
            <button
              className="mp-btn mp-btn-create lobby-start-btn"
              onClick={handleStart}
              disabled={starting || players.length < 1}
              id="lobby-start-btn"
            >
              {starting ? (
                <><span className="auth-spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} /> Starting…</>
              ) : (
                <><span>▶</span> Start Game</>
              )}
            </button>
          )}

          <button
            className="mp-btn mp-btn-leave"
            onClick={handleLeave}
            disabled={leaving}
            id="lobby-leave-btn"
          >
            {leaving ? '⏳ Leaving…' : '🚪 Leave Lobby'}
          </button>
        </div>

        {isHost && players.length === 1 && (
          <p className="lobby-host-tip">
            💡 Invite friends using the party code above, then click Start Game.
          </p>
        )}
      </div>
    </div>
  );
}
