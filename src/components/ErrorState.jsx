/**
 * ErrorState.jsx - Shown when PokéAPI request fails
 */

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div className="error-icon" aria-hidden="true">😵</div>
      <h2 className="error-title">Oops! Something went wrong</h2>
      <p className="error-message">
        {error || 'Failed to load Pokémon data. Please check your connection and try again.'}
      </p>
      <button
        id="retry-btn"
        className="btn btn-primary"
        onClick={onRetry}
        aria-label="Retry loading Pokémon data"
      >
        🔄 Retry
      </button>
    </div>
  );
}
