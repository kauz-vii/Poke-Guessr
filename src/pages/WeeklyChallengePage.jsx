/**
 * WeeklyChallengePage.jsx — Shows the monthly schedule of 4 weekly challenges
 * and the player's live progress on the current week's challenge.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import {
  CHALLENGES,
  getMonthChallenges,
  getCurrentChallengeId,
  getWeekKey,
  getWeekOfMonth,
  getNextMondayDate,
} from '../weeklyChallenge';

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) { setTimeLeft('Now!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export default function WeeklyChallengePage() {
  const { user } = useAuth();
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentWeekIdx = getWeekOfMonth(now);
  const monthChallenges = useMemo(() => getMonthChallenges(year, month), [year, month]);

  const nextMonday = useMemo(() => getNextMondayDate(), []);
  const countdown  = useCountdown(nextMonday);

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Fetch all progress records for this month's challenges for the current user
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Build the week keys for all 4 weeks of this month
    const weekKeys = monthChallenges.map((_, i) => {
      // Create a date that falls in week i+1 of this month
      const d = new Date(year, month - 1, i * 7 + 1);
      return getWeekKey(d);
    });

    supabase
      .from('weekly_challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('week_key', weekKeys)
      .then(({ data }) => {
        setProgressRecords(data || []);
        setLoading(false);
      });
  }, [user, monthChallenges, year, month]);

  function getProgressForWeek(weekIdx) {
    const d = new Date(year, month - 1, weekIdx * 7 + 1);
    const wk = getWeekKey(d);
    return progressRecords.find(r => r.week_key === wk);
  }

  const currentChallenge = CHALLENGES[monthChallenges[currentWeekIdx]];
  const currentRecord    = getProgressForWeek(currentWeekIdx);
  const currentProgress  = currentRecord?.progress || 0;
  const isCompleted      = currentRecord?.completed || false;
  const percent          = Math.min(100, Math.round((currentProgress / (currentChallenge?.goal || 1)) * 100));

  const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

  return (
    <div className="wc-root">
      {/* Top bar */}
      <div className="profile-topbar">
        <Link to="/" className="profile-back-btn">← Menu</Link>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <div className="wc-container">
        <div className="wc-hero">
          <div className="wc-hero-badge">📆 WEEKLY CHALLENGE</div>
          <h1 className="wc-hero-title">This Week's Mission</h1>
          <p className="wc-hero-sub">Week {currentWeekIdx + 1} of {MONTH_NAMES[month - 1]}</p>
        </div>

        {/* ── Current Challenge Card ── */}
        {currentChallenge && (
          <div className={`wc-current-card ${isCompleted ? 'wc-current-card--done' : ''}`}>
            <div className="wc-current-icon">{currentChallenge.icon}</div>
            <div className="wc-current-body">
              <h2 className="wc-current-label">{currentChallenge.label}</h2>
              <p className="wc-current-desc">{currentChallenge.desc}</p>

              {isCompleted ? (
                <div className="wc-completed-banner">✅ Challenge Completed!</div>
              ) : (
                <>
                  <div className="wc-progress-header">
                    <span>{currentProgress.toLocaleString()} / {currentChallenge.goal.toLocaleString()}</span>
                    <span className="wc-percent">{percent}%</span>
                  </div>
                  <div className="wc-progress-track">
                    <div
                      className="wc-progress-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="wc-next-reset">
                    ⏳ Next challenge in: <strong>{countdown}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Month Schedule ── */}
        <div className="wc-schedule-section">
          <h3 className="wc-section-title">This Month's Schedule</h3>
          <div className="wc-schedule-grid">
            {monthChallenges.map((challengeId, weekIdx) => {
              const ch      = CHALLENGES[challengeId];
              const rec     = getProgressForWeek(weekIdx);
              const prog    = rec?.progress || 0;
              const done    = rec?.completed || false;
              const isCurrent = weekIdx === currentWeekIdx;
              const isPast  = weekIdx < currentWeekIdx;
              const isFuture = weekIdx > currentWeekIdx;

              return (
                <div
                  key={challengeId}
                  className={[
                    'wc-week-card',
                    isCurrent ? 'wc-week-card--current' : '',
                    isPast    ? 'wc-week-card--past'    : '',
                    isFuture  ? 'wc-week-card--future'  : '',
                    done      ? 'wc-week-card--done'    : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="wc-week-label">{weekLabels[weekIdx]}</div>
                  <div className="wc-week-icon">{ch?.icon}</div>
                  <div className="wc-week-name">{ch?.label}</div>
                  {!isFuture && (
                    <div className="wc-week-progress">
                      {done ? '✅ Done' : `${prog} / ${ch?.goal}`}
                    </div>
                  )}
                  {isFuture && (
                    <div className="wc-week-progress wc-week-upcoming">Coming soon</div>
                  )}
                  {isCurrent && <div className="wc-week-current-pip" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Not logged in ── */}
        {!user && (
          <div className="wc-no-user">
            <p>Sign in to track your weekly challenge progress!</p>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In</Link>
          </div>
        )}

        {loading && user && (
          <div className="loading-state"><p className="loading-text">Loading progress…</p></div>
        )}
      </div>
    </div>
  );
}
