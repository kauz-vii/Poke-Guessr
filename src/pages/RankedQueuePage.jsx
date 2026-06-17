/**
 * RankedQueuePage.jsx — Matchmaking queue system
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { getRankTier } from '../utils';
import PokeballIcon from '../components/PokeballIcon';

export default function RankedQueuePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [elapsed, setElapsed] = useState(0);
  const [isMatching, setIsMatching] = useState(true);
  const queueIdRef = useRef(null);

  // 1. Join Queue on mount
  useEffect(() => {
    if (!user || !profile) return;
    
    let active = true;

    async function joinQueue() {
      // Insert or update row (upsert handles the unique constraint safely)
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .upsert({
          user_id: user.id,
          rating: profile.rating || 1200,
          matched_room_id: null // Reset room ID on re-join
        }, { onConflict: 'user_id' })
        .select('id')
        .single();
        
      if (error) {
        console.error('Failed to join queue:', error);
        return;
      }
      
      if (active) {
        queueIdRef.current = data.id;
      }
    }
    
    joinQueue();

    return () => {
      active = false;
      if (queueIdRef.current) {
        supabase.from('matchmaking_queue').delete().eq('id', queueIdRef.current).then();
      }
    };
  }, [user, profile]);

  // 2. Timer
  useEffect(() => {
    const int = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(int);
  }, []);

  // 3. Matchmaking Polling
  useEffect(() => {
    if (!user || !profile || !isMatching) return;
    
    const pollInterval = setInterval(async () => {
      try {
        // Did someone match ME?
        const { data: myStatus } = await supabase
          .from('matchmaking_queue')
          .select('matched_room_id')
          .eq('user_id', user.id)
          .single();
          
        if (myStatus?.matched_room_id) {
          setIsMatching(false);
          // Insert myself as guest
          await supabase.from('room_players').insert({
            room_id: myStatus.matched_room_id,
            user_id: user.id,
            username: profile.username || 'Trainer',
            is_host: false,
          });
          // Cleanup queue row
          await supabase.from('matchmaking_queue').delete().eq('user_id', user.id);
          // Navigate to game-starting
          navigate(`/game-starting/${myStatus.matched_room_id}`);
          return;
        }

        // Expanded rating range over time (100 -> 200 -> 300)
        let maxDiff = 100;
        if (elapsed > 15) maxDiff = 200;
        if (elapsed > 30) maxDiff = 300;

        // Try to find someone else
        const { data: potentialMatches } = await supabase
          .from('matchmaking_queue')
          .select('id, user_id, rating')
          .is('matched_room_id', null)
          .neq('user_id', user.id)
          // We must do rating logic on client since supabase JS doesn't have an absolute value function builder natively
          .order('joined_at', { ascending: true })
          .limit(10);
          
        if (potentialMatches && potentialMatches.length > 0) {
          const opponent = potentialMatches.find(p => Math.abs(p.rating - (profile.rating || 1200)) <= maxDiff);
          
          if (opponent) {
            setIsMatching(false);
            // I AM THE HOST! Create room
            const roomCode = 'RANKED-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: room } = await supabase.from('rooms').insert({
              status: 'in_game',
              room_code: roomCode,
              host_id: user.id,
            }).select('id').single();
            
            // Insert myself as host
            await supabase.from('room_players').insert({
              room_id: room.id,
              user_id: user.id,
              username: profile.username || 'Trainer',
              is_host: true,
            });

            // Update opponent queue row safely and check if we won the race
            const { data: updatedOpponent } = await supabase.from('matchmaking_queue')
              .update({ matched_room_id: room.id })
              .eq('id', opponent.id)
              .is('matched_room_id', null) // Safety check
              .select('id')
              .maybeSingle();
              
            if (!updatedOpponent) {
              // We lost the race condition. Another host matched them milliseconds ago.
              setIsMatching(true); // resume
              await supabase.from('rooms').delete().eq('id', room.id); // delete the orphaned room
              return; // wait for next interval
            }
              
            // We successfully claimed the opponent! Cleanup my queue row.
            await supabase.from('matchmaking_queue').delete().eq('user_id', user.id);
            
            // Go to game-starting
            navigate(`/game-starting/${room.id}`);
            return;
          }
        }
      } catch (e) {
        console.error('Matchmaking error:', e);
      }
    }, 2000); // Check every 2s

    return () => clearInterval(pollInterval);
  }, [user, profile, isMatching, elapsed, navigate]);


  const handleCancel = async () => {
    setIsMatching(false);
    if (user?.id) {
      await supabase.from('matchmaking_queue').delete().eq('user_id', user.id);
    }
    navigate('/');
  };

  if (!profile) return <div className="app"><div className="auth-spinner" style={{width:40, height:40, borderWidth:4}}/></div>;

  const placementsPlayed = profile.placement_matches_played || 0;
  const isPlacing = placementsPlayed < 10;
  const currentRating = profile.rating || 1200;
  const currentRank = isPlacing ? 'Unranked' : getRankTier(currentRating);

  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
      <div className="game-card fade-in" style={{ textAlign: 'center', padding: '3rem', width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <PokeballIcon size={64} spinning={true} />
        </div>
        
        <h2 style={{ color: 'var(--color-pokemon-yellow)' }}>Searching for Opponent...</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          Queue Time: 0:{elapsed.toString().padStart(2, '0')}
        </p>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isPlacing ? '#aaa' : 'white' }}>{currentRank}</div>
          {isPlacing ? (
            <div style={{ marginTop: '0.5rem', color: 'var(--color-pokemon-yellow)', fontWeight: 900 }}>
              Placement Matches: {placementsPlayed} / 10
            </div>
          ) : (
            <div style={{ color: 'var(--color-pokemon-yellow)', fontWeight: 900 }}>Rating: {currentRating}</div>
          )}
        </div>

        <button 
          className="btn btn-ghost" 
          onClick={handleCancel}
          style={{ width: '100%' }}
        >
          Cancel Search
        </button>
      </div>
    </div>
  );
}
