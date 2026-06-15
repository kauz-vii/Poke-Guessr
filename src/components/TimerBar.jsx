/**
 * TimerBar.jsx - Horizontal progress bar showing remaining time
 */
import { getTimerState } from '../utils';

const TOTAL_TIME = 30;

export default function TimerBar({ timeRemaining }) {
  const timerState = getTimerState(timeRemaining);
  const fillPercent = (timeRemaining / TOTAL_TIME) * 100;

  return (
    <div className="timer-bar-container" role="none">
      <div
        className="timer-bar-track"
        role="progressbar"
        aria-valuenow={timeRemaining}
        aria-valuemin={0}
        aria-valuemax={TOTAL_TIME}
        aria-label={`${timeRemaining} seconds remaining`}
      >
        <div
          className={`timer-bar-fill ${timerState}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
