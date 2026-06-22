import { getLevelInfo, getRankTier } from '../utils';
import { ACHIEVEMENTS } from '../achievements';

function Avatar({ username }) {
  const initials = (username || '?')
    .split(/[\s_]/)
    .map(w => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
  return (
    <div className="profile-avatar" aria-hidden="true">
      {initials}
    </div>
  );
}

export default function PlayerCard({ profile, unlockedAchievements, onEditClick, isMe }) {
  if (!profile) return null;

  const { level, xp } = getLevelInfo(profile.xp || 0);
  const rank = getRankTier(profile.rating || 1200);

  // Top 4 achievements
  const topAchievements = Array.from(unlockedAchievements || []).slice(0, 4);

  return (
    <div className="player-card">
      <div className="player-card-header">
        <Avatar username={profile.username} />
        <div className="player-card-info">
          <h2 className="player-card-name">
            {profile.username}
            {isMe && <span className="lb-you-badge" style={{ marginLeft: '8px' }}>YOU</span>}
          </h2>
          <div className="player-card-badges">
            <span className="player-card-badge level-badge">Lv {level}</span>
            <span className="player-card-badge rank-badge">{rank}</span>
          </div>
        </div>
        {isMe && onEditClick && (
          <button onClick={onEditClick} className="btn btn-ghost edit-btn">✏️ Edit</button>
        )}
      </div>

      <div className="player-card-body">
        <div className="player-card-favs">
          <div className="fav-item">
            <span className="fav-label">Favorite Region</span>
            <span className="fav-value">{profile.favorite_region || '—'}</span>
          </div>
          <div className="fav-item">
            <span className="fav-label">Favorite Pokémon</span>
            <span className="fav-value">{profile.favorite_pokemon || '—'}</span>
          </div>
        </div>

        <div className="player-card-achievements">
          <span className="fav-label">Top Achievements</span>
          <div className="achievements-list">
            {topAchievements.length > 0 ? topAchievements.map(id => {
              const ach = ACHIEVEMENTS[id];
              if (!ach) return null;
              return (
                <div key={id} className="achievement-icon" title={ach.title}>
                  {ach.icon}
                </div>
              );
            }) : (
              <span className="fav-value" style={{ fontSize: '0.9rem' }}>No badges yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
