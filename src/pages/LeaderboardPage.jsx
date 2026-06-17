/**
 * LeaderboardPage.jsx — Top trainers ranked across different categories
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { getLevelInfo } from '../utils';

/** Medal emoji for top 3 */
function rankDisplay(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ranked'); // 'ranked', 'xp', 'best', 'daily', 'wins'

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError('');
      try {
        let data, err;
        
        if (activeTab === 'daily') {
          const todayStr = new Date().toISOString().split('T')[0];
          const res = await supabase
            .from('daily_challenges')
            .select('user_id, username, score, completion_time')
            .eq('challenge_date', todayStr)
            .order('score', { ascending: false })
            .order('completion_time', { ascending: true })
            .limit(20);
          data = res.data?.map(d => ({ ...d, id: d.user_id })) || [];
          err = res.error;
        } else {
          const orderColumn = activeTab === 'ranked' ? 'rating' :
                              activeTab === 'xp' ? 'xp' :
                              activeTab === 'best' ? 'highest_score' :
                              'games_won';
          
          let query = supabase
            .from('profiles')
            .select('id, username, highest_score, games_won, xp, rating');
            
          if (activeTab === 'ranked') {
            query = query.gte('xp', 8100); // Only Level 10+ allowed in Ranked
          }
          
          const res = await query
            .order(orderColumn, { ascending: false })
            .limit(20);
          data = res.data;
          err = res.error;
        }

        if (err) throw err;
        setEntries(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard.');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="lb-root">
      <div className="lb-topbar">
        <Link to="/" className="profile-back-btn">← Menu</Link>
        {user && <Link to="/profile" className="profile-nav-link">👤 Profile</Link>}
      </div>

      <div className="lb-card" style={{ maxWidth: 800 }}>
        <div className="lb-header">
          <h1 className="lb-title">Global Leaderboards</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '8px' }}>
          {[
            { id: 'ranked', label: '⚔️ Ranked' },
            { id: 'xp', label: '🌟 Level' },
            { id: 'best', label: '⭐ Best Game' },
            { id: 'daily', label: '📅 Daily' },
            { id: 'wins', label: '🏆 Most Wins' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, minWidth: '120px', padding: '10px',
                background: activeTab === tab.id ? 'var(--color-pokemon-yellow)' : 'rgba(255,255,255,0.1)',
                color: activeTab === tab.id ? '#1a1a2e' : 'white',
                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="loading-state"><p className="loading-text">Loading trainers…</p></div>}
        {!loading && error && <div className="auth-error" role="alert" style={{ margin: '1rem' }}>⚠️ {error}</div>}

        {!loading && !error && (
          <>
            {entries.length === 0 ? (
              <p className="lb-empty">No trainers yet in this category! 🎮</p>
            ) : (
              <div className="lb-table-wrap">
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th className="lb-th lb-th-rank">Rank</th>
                      <th className="lb-th lb-th-name">Trainer</th>
                      {activeTab === 'ranked' && <th className="lb-th">Rating</th>}
                      {activeTab === 'xp' && <th className="lb-th">Level (XP)</th>}
                      {activeTab === 'best' && <th className="lb-th">Best Score</th>}
                      {activeTab === 'daily' && <th className="lb-th">Score</th>}
                      {activeTab === 'wins' && <th className="lb-th">Total Wins</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      const rank = idx + 1;
                      const isMe = user && entry.id === user.id;
                      return (
                         <tr key={entry.id} className={`lb-row ${isMe ? 'lb-row-me' : ''} ${rank <= 3 ? 'lb-row-top' : ''}`}>
                          <td className="lb-td lb-td-rank">
                            <span className={`lb-rank ${rank <= 3 ? `lb-rank-${rank}` : ''}`}>{rankDisplay(rank)}</span>
                          </td>
                          <td className="lb-td lb-td-name">
                            <span className="lb-username">
                              {entry.username}
                              {isMe && <span className="lb-you-badge">YOU</span>}
                            </span>
                          </td>
                          {activeTab === 'ranked' && <td className="lb-td">{entry.rating || 1200}</td>}
                          {activeTab === 'xp' && <td className="lb-td">Lv {getLevelInfo(entry.xp || 0).level} <span style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)'}}>({entry.xp})</span></td>}
                          {activeTab === 'best' && <td className="lb-td">{entry.highest_score}</td>}
                          {activeTab === 'daily' && <td className="lb-td">{entry.score} <span style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)'}}>({entry.completion_time}s)</span></td>}
                          {activeTab === 'wins' && <td className="lb-td">{entry.games_won || 0}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
