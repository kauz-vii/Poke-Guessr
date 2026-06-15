/**
 * GuessInput.jsx - Text input and submit button for guessing the Pokémon
 */

export default function GuessInput({ guess, onChange, onSubmit, onSkip, disabled }) {
  /**
   * Handles Enter key press to submit guess
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !disabled) {
      onSubmit();
    }
  }

  return (
    <div className="guess-section">
      {/* Input row: text field + submit button */}
      <div className="input-row">
        <input
          id="guess-input"
          type="text"
          className="guess-input"
          placeholder="Who's that Pokémon?"
          value={guess}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          aria-label="Enter your Pokémon guess"
          maxLength={50}
        />

        <button
          id="submit-guess-btn"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={disabled || !guess.trim()}
          aria-label="Submit your guess"
        >
          Guess!
        </button>
      </div>

      {/* Action buttons row: Skip */}
      <div className="action-buttons">
        <button
          id="skip-pokemon-btn"
          className="btn btn-ghost"
          onClick={onSkip}
          disabled={disabled}
          aria-label="Skip this Pokémon"
        >
          🏃 Skip Pokémon
        </button>
      </div>
    </div>
  );
}
