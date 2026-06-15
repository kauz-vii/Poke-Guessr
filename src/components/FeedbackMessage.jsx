/**
 * FeedbackMessage.jsx - Displays the result message (correct, timeout, wrong, skipped)
 */
import { formatPokemonName } from '../utils';

export default function FeedbackMessage({ feedback }) {
  if (!feedback) return null;

  const { type, pokemonName, pointsEarned, nextRoundIn } = feedback;

  const displayName = formatPokemonName(pokemonName || '');

  return (
    <div className="feedback-area" role="alert" aria-live="assertive">
      <div className={`feedback-message ${type}`}>
        {type === 'correct' && (
          <>
            <div className="feedback-title">✅ Correct!</div>
            <div className="feedback-sub">You guessed {displayName}!</div>
            {pointsEarned > 0 && (
              <div className="points-earned">+{pointsEarned} pts</div>
            )}
          </>
        )}

        {type === 'timeout' && (
          <>
            <div className="feedback-title">⏰ Time's Up!</div>
            <div className="feedback-sub">The Pokémon was {displayName}.</div>
          </>
        )}

        {type === 'skipped' && (
          <>
            <div className="feedback-title">⏭️ Skipped!</div>
            <div className="feedback-sub">It was {displayName}.</div>
          </>
        )}

        {type === 'wrong-guess' && (
          <>
            <div className="feedback-title">❌ Not quite!</div>
            <div className="feedback-sub">Keep trying...</div>
          </>
        )}

        {/* Next round countdown shown on correct/timeout/skipped */}
        {(type === 'correct' || type === 'timeout' || type === 'skipped') && (
          <div className="next-round-countdown">
            Next round in {nextRoundIn}s...
          </div>
        )}
      </div>
    </div>
  );
}
