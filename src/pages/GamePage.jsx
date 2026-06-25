/**
 * GamePage.jsx — Game UI with settings panels (generation filter + difficulty)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }         from '../contexts/AuthContext';
import { useToast }        from '../contexts/ToastContext';
import { useGameSettings } from '../contexts/GameSettingsContext';
import { useGameLogic }    from '../hooks/useGameLogic';

import Header          from '../components/Header';
import PokemonDisplay  from '../components/PokemonDisplay';
import TimerBar        from '../components/TimerBar';
import CluesPanel      from '../components/CluesPanel';
import GuessInput      from '../components/GuessInput';
import FeedbackMessage from '../components/FeedbackMessage';
import LoadingState    from '../components/LoadingState';
import ErrorState      from '../components/ErrorState';
import Confetti        from '../components/Confetti';
import SettingsPanel   from '../components/SettingsPanel';

export default function GamePage() {
  const navigate            = useNavigate();
  const { saveGameSession } = useAuth();
  const { showToast }       = useToast();
  const { difficulty, selectedGens } = useGameSettings();
  const [isSaving, setIsSaving]      = useState(false);

  const {
    pokemon, region, score, roundNumber, timeRemaining,
    isRevealed, isRoundOver,
    showType, showRegion, showNameHint,
    showAlternateLetters, showBlurryImage,
    guess, feedback, isLoading, error, isFadingOut, showConfetti, nextRoundCountdown,
    sessionCorrect,
    setGuess, submitGuess, resetSession, retryLoad,
  } = useGameLogic({ difficulty, selectedGens });

  const sessionRounds = roundNumber - 1;

  const isInputDisabled = isRoundOver || isLoading || !!error || isSaving;

  async function handleBackToMenu() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveGameSession({
        sessionScore: score,
        sessionCorrect: sessionCorrect,
        gameMode: 'casual',
        difficulty,
        fastCorrect,
        fastCorrect15,
        sessionRounds,
      });
      showToast('Session saved! Great playing! 🎉', 'success');
    } catch {
      showToast('Could not save session — check your connection.', 'error');
    } finally {
      resetSession();
      setIsSaving(false);
      navigate('/');
    }
  }

  return (
    <div className="app">
      <Header
        round={roundNumber}
        score={score}
        timeRemaining={timeRemaining}
        isPlaying={!isRoundOver && !isLoading}
        onBack={handleBackToMenu}
      />

      <Confetti active={showConfetti} />

      <main className="game-layout">
        {/* ── Left settings panel ── */}
        <SettingsPanel />

        {/* ── Centre game card ── */}
        <div className="game-center">
          <article className={`game-card ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
            {isLoading && <LoadingState />}

            {!isLoading && error && (
              <ErrorState error={error} onRetry={retryLoad} />
            )}

            {!isLoading && !error && pokemon && (
              <>
                <PokemonDisplay
                  pokemon={pokemon}
                  isRevealed={isRevealed}
                  showBlurryImage={showBlurryImage}
                />
                
                {isRevealed ? (
                  <div className="reveal-screen slide-in-bottom" style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <h2 className="reveal-name" style={{ fontSize: '2rem', color: 'var(--color-pokemon-yellow)', textShadow: '0 0 10px rgba(255,203,5,0.5)', marginBottom: '1rem' }}>
                      It's ⚡ {pokemon.name.toUpperCase()} ⚡
                    </h2>
                    {pokemon.flavorText && (
                      <p className="reveal-pokedex-entry" style={{ fontStyle: 'italic', fontSize: '1.1rem', color: '#e2e8f0', maxWidth: '80%', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
                        "{pokemon.flavorText}"
                      </p>
                    )}
                    <div className="reveal-next" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      Next Round Starting...<br/>
                      <span className="reveal-countdown" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', display: 'inline-block', marginTop: '0.5rem' }}>{nextRoundCountdown}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <TimerBar timeRemaining={timeRemaining} />
                    <div className="section-divider" aria-hidden="true" />
                    <CluesPanel
                      pokemon={pokemon}
                      showType={showType}
                      showRegion={showRegion}
                      showNameHint={showNameHint}
                      showAlternateLetters={showAlternateLetters}
                      region={region}
                      isRevealed={isRevealed}
                      difficulty={difficulty}
                    />
                    <div className="section-divider" aria-hidden="true" />
                    <GuessInput
                      guess={guess}
                      onChange={setGuess}
                      onSubmit={submitGuess}
                      disabled={isInputDisabled}
                    />
                    <FeedbackMessage feedback={feedback} />
                  </>
                )}
              </>
            )}
          </article>

          <div className="play-again-section">
            <button
              id="back-to-menu-btn"
              className="btn btn-ghost"
              onClick={handleBackToMenu}
              disabled={isSaving}
              aria-label="Save session and return to main menu"
            >
              {isSaving ? '💾 Saving…' : '🏠 Main Menu'}
            </button>
          </div>
        </div>

        {/* ── Right: difficulty legend ── */}
        <div className="game-right-panel">
          <DifficultyLegend difficulty={difficulty} />
        </div>
      </main>
    </div>
  );
}

/** Small legend shown on the right reminding the player of current rules */
function DifficultyLegend({ difficulty }) {
  const rules = {
    trainer: [
      { time: '30s', desc: 'Silhouette only' },
      { time: '20s', desc: 'Alternate letters appear' },
      { time: '10s', desc: 'Blurry image shown' },
    ],
    elite: [
      { time: '30s', desc: 'Silhouette only' },
      { time: '20s', desc: 'Type revealed' },
      { time: '15s', desc: 'Region revealed' },
      { time: '10s', desc: 'Name hint appears' },
    ],
    master: [
      { time: '—', desc: 'No hints at all' },
      { time: '—', desc: 'No type or region' },
      { time: '—', desc: 'No name length' },
    ],
  };

  const icons = { trainer: '🎒', elite: '⭐', master: '🏆' };
  const labels = { trainer: 'Trainer', elite: 'Elite', master: 'Pokémon Master' };
  const colors = { trainer: '#4CAF50', elite: '#FFD700', master: '#FF5350' };

  return (
    <aside className="diff-legend" aria-label="Current difficulty rules">
      <div className="diff-legend-header" style={{ '--diff-color': colors[difficulty] }}>
        <span>{icons[difficulty]}</span>
        <span>{labels[difficulty]}</span>
      </div>
      <ul className="diff-legend-list">
        {rules[difficulty].map((r, i) => (
          <li key={i} className="diff-legend-row">
            <span className="diff-legend-time">{r.time}</span>
            <span className="diff-legend-desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
