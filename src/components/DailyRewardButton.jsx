/**
 * DailyRewardButton.jsx
 * Main-menu button that shows a pulsing dot when a reward is unclaimed.
 * Clicking it re-opens the DailyRewardModal.
 */
import { useDailyReward } from '../contexts/DailyRewardContext';

export default function DailyRewardButton({ onClick }) {
  const { rewardAvailable, rewardInfo } = useDailyReward();

  return (
    <button
      id="menu-daily-reward-btn"
      className="menu-btn menu-btn-ghost dr-menu-btn"
      onClick={onClick}
      style={{ background: 'rgba(255,255,255,0.1)', position: 'relative' }}
    >
      <span className="menu-btn-icon">🎁</span>
      <span className="menu-btn-label">Daily Reward</span>
      {rewardAvailable && (
        <span className="dr-available-dot" aria-label="Reward available" />
      )}
    </button>
  );
}
