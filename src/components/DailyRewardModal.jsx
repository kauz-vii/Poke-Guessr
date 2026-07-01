/**
 * DailyRewardModal.jsx
 * The main daily login reward popup. Auto-shows on first login of the day.
 * Features: 7-day calendar strip, claim animation, confetti on Day 7.
 */
import { useState, useEffect, useRef } from 'react';
import { REWARD_SCHEDULE } from '../dailyReward';

// ── Confetti particle helper ──────────────────────────────────────────────
function ConfettiCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb923c'];
    const particles = Array.from({ length: 120 }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height * 0.5 - canvas.height * 0.5,
      r:  Math.random() * 6 + 3,
      d:  Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngle: Math.random() * Math.PI * 2,
      tiltSpeed: (Math.random() * 0.07) + 0.05,
    }));

    let frame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.tiltAngle, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        p.y    += p.d;
        p.tiltAngle += p.tiltSpeed;
        p.tilt  = Math.sin(p.tiltAngle) * 12;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="dr-confetti-canvas" />;
}

// ── Floating XP animation ─────────────────────────────────────────────────
function XPFloat({ xp, active }) {
  if (!active) return null;
  return (
    <div className="dr-xp-floats" aria-hidden>
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="dr-xp-float-particle"
          style={{ '--i': i }}
        >
          +{xp} XP
        </span>
      ))}
    </div>
  );
}

// ── Day calendar item ─────────────────────────────────────────────────────
function DayCell({ day, currentDay, claimedUpTo }) {
  const reward = REWARD_SCHEDULE[day - 1];
  const isClaimed = day < currentDay || claimedUpTo >= day;
  const isToday   = day === currentDay;
  const isLocked  = day > currentDay;

  let stateClass = 'dr-day-locked';
  let indicator  = '🔒';
  if (isClaimed && !isToday) { stateClass = 'dr-day-claimed'; indicator = '✅'; }
  if (isToday)               { stateClass = 'dr-day-today';   indicator = '⭐'; }
  if (day === 7 && isLocked) { indicator  = '👑'; }
  if (day === 7 && isToday)  { indicator  = '👑'; }

  return (
    <div className={`dr-day-cell ${stateClass}`}>
      <span className="dr-day-indicator">{indicator}</span>
      <span className="dr-day-num">Day {day}</span>
      <span className="dr-day-xp">{reward.icon}</span>
      <span className="dr-day-label">{day === 7 ? '+300 XP' : reward.label}</span>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────
export default function DailyRewardModal({ rewardInfo, onClaim, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | claiming | done
  const [showXP, setShowXP] = useState(false);

  if (!rewardInfo) return null;

  const { reward_day, streak, missed_day, badge_awarded, xp_awarded, already_claimed } = rewardInfo;

  // If already claimed, show a "come back tomorrow" state
  const isAlreadyClaimed = already_claimed === true;
  const reward = REWARD_SCHEDULE[(reward_day - 1)] || REWARD_SCHEDULE[0];
  const isDay7 = reward_day === 7;

  // Streak restarted message
  const streakResetMsg = missed_day
    ? "You missed a day! Your login streak has been reset."
    : null;

  async function handleClaim() {
    if (phase !== 'idle') return;
    setPhase('claiming');
    try {
      await onClaim();
      setShowXP(true);
      setPhase('done');
    } catch {
      setPhase('idle');
    }
  }

  return (
    <div className="dr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`dr-modal ${isDay7 ? 'dr-modal--day7' : ''}`}>
        {/* Confetti on Day 7 after claiming */}
        {isDay7 && phase === 'done' && <ConfettiCanvas />}

        {/* Header */}
        <div className="dr-header">
          <h2 className="dr-title">
            {isAlreadyClaimed ? '✅ Reward Claimed' : '🎁 Daily Login Reward'}
          </h2>
          <button className="dr-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Missed day warning */}
        {streakResetMsg && !isAlreadyClaimed && (
          <div className="dr-missed-banner">
            ⚠️ {streakResetMsg}
          </div>
        )}

        {/* 7-Day Calendar strip */}
        <div className="dr-calendar">
          {REWARD_SCHEDULE.map(r => (
            <DayCell
              key={r.day}
              day={r.day}
              currentDay={reward_day}
              claimedUpTo={phase === 'done' ? reward_day : reward_day - 1}
            />
          ))}
        </div>

        {/* Reward card */}
        <div className={`dr-reward-card ${isDay7 ? 'dr-reward-card--day7' : ''} ${phase === 'done' ? 'dr-reward-card--claimed' : ''}`}>
          <div className="dr-reward-day-label">Day {reward_day}</div>
          <div className="dr-reward-icon">{reward.icon}</div>

          {phase === 'done' ? (
            <div className="dr-reward-claimed-text">
              <span className="dr-claimed-check">✓</span>
              <span>Claimed!</span>
            </div>
          ) : (
            <>
              <div className="dr-reward-amount">
                {isAlreadyClaimed ? `+${reward.xp} XP` : `+${reward.xp} XP`}
              </div>
              {isDay7 && (
                <div className="dr-rare-badge-label">🎖️ Rare Badge Unlocked!</div>
              )}
            </>
          )}

          {/* Floating XP particles */}
          <XPFloat xp={xp_awarded || reward.xp} active={showXP} />
        </div>

        {/* Streak info */}
        <div className="dr-streak-row">
          <span className="dr-streak-chip">🔥 {streak}-Day Streak</span>
          {isDay7 && phase === 'done' && badge_awarded && (
            <span className="dr-badge-chip">🎖️ Badge Earned!</span>
          )}
        </div>

        {/* Action button */}
        <div className="dr-footer">
          {isAlreadyClaimed ? (
            <button className="btn btn-ghost dr-btn" onClick={onClose}>
              Come back tomorrow!
            </button>
          ) : phase === 'done' ? (
            <button className="btn btn-primary dr-btn" onClick={onClose}>
              🎉 Awesome!
            </button>
          ) : (
            <button
              className={`btn btn-primary dr-btn ${phase === 'claiming' ? 'dr-btn--loading' : ''}`}
              onClick={handleClaim}
              disabled={phase === 'claiming'}
            >
              {phase === 'claiming' ? 'Claiming…' : 'Claim Reward'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
