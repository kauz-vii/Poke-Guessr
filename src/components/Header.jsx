/**
 * Header.jsx - App header with title and game stats (Round, Score, Timer)
 */
import PokeballIcon from './PokeballIcon';
import { getTimerState } from '../utils';

export default function Header({ round, score, timeRemaining, isPlaying }) {
  const timerState = getTimerState(timeRemaining);

  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        <h1 className="app-title">
          <PokeballIcon size={28} />
          Pokémon Silhouette Guesser
        </h1>

        <div className="header-stats" role="status" aria-live="polite">
          {/* Round indicator */}
          <div className="stat-chip" aria-label={`Round ${round}`}>
            <span className="stat-label">Round</span>
            <span className="stat-value">{round}</span>
          </div>

          {/* Score */}
          <div className="stat-chip" aria-label={`Score ${score}`}>
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>

          {/* Timer */}
          <div
            className={`stat-chip timer-chip timer-${timerState}`}
            aria-label={`${timeRemaining} seconds remaining`}
          >
            <span className="stat-label">Time</span>
            <span className="stat-value">{timeRemaining}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
