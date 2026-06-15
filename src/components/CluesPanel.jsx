/**
 * CluesPanel.jsx - Displays type, region, and name hint clues progressively.
 *
 * New props:
 *   showAlternateLetters — Trainer mode: show every other letter
 *   difficulty           — 'trainer' | 'elite' | 'master'
 *   showBlurryImage      — handled in PokemonDisplay, not here
 */
import { generateNameHint, getRegionEmoji, formatPokemonName } from '../utils';

/** Individual type badge styled by Pokémon type color */
function TypeBadge({ type }) {
  return (
    <span className={`type-badge type-${type.toLowerCase()}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

/** Animated name hint display with individual characters */
function NameHint({ name, show, showAlternateLetters, isRevealed }) {
  const displayName = formatPokemonName(name || '');

  // ── Revealed: show full name in gold ──────────────────────────────────
  if (isRevealed) {
    return (
      <div className="name-hint-container clue-slide-in">
        <div className="name-hint-label">Name</div>
        <div className="name-hint-display" aria-label={`The Pokémon is ${displayName}`}>
          {displayName.split('').map((char, idx) => {
            if (char === ' ') return <span key={idx} className="hint-char space-char">&nbsp;</span>;
            if (char === '-') return <span key={idx} className="hint-char" style={{ color: 'var(--color-text-muted)', fontSize: '0.7em' }}>-</span>;
            return <span key={idx} className="hint-char letter-revealed">{char}</span>;
          })}
        </div>
      </div>
    );
  }

  // ── Trainer mode: alternate letters ───────────────────────────────────
  if (showAlternateLetters) {
    let letterIndex = 0;
    const chars = displayName.split('').map((char, idx) => {
      if (char === ' ') return <span key={idx} className="hint-char space-char">&nbsp;</span>;
      if (char === '-') return <span key={idx} className="hint-char" style={{ color: 'var(--color-text-muted)', fontSize: '0.7em' }}>-</span>;
      const show = letterIndex % 2 === 0;
      letterIndex++;
      return show
        ? <span key={idx} className="hint-char letter-revealed trainer-reveal">{char.toUpperCase()}</span>
        : <span key={idx} className="hint-char underscore">_</span>;
    });
    return (
      <div className="name-hint-container clue-slide-in">
        <div className="name-hint-label">Name Hint <span className="hint-mode-badge">Trainer</span></div>
        <div className="name-hint-display" aria-label="Alternate letters revealed">{chars}</div>
      </div>
    );
  }

  // ── Elite mode: first + last letter + underscores ────────────────────
  if (show) {
    const hintChars = generateNameHint(name);
    return (
      <div className="name-hint-container clue-slide-in">
        <div className="name-hint-label">Name Hint</div>
        <div
          className="name-hint-display"
          aria-label={`Name hint: ${hintChars.map(h => (h.type === 'underscore' ? '_' : h.char)).join('')}`}
        >
          {hintChars.map((item, idx) => {
            if (item.type === 'space') return <span key={idx} className="hint-char space-char">&nbsp;</span>;
            if (item.type === 'separator') return <span key={idx} className="hint-char" style={{ color: 'var(--color-text-muted)', fontSize: '0.7em' }}>-</span>;
            if (item.type === 'letter-revealed') return <span key={idx} className="hint-char letter-revealed">{item.char}</span>;
            return <span key={idx} className="hint-char underscore">_</span>;
          })}
        </div>
      </div>
    );
  }

  // ── Hidden: show underscores matching name length ──────────────────────
  return (
    <div className="name-hint-container">
      <div className="name-hint-label">Name Hint</div>
      <div className="name-hint-display" aria-label="Name hint hidden">
        {displayName.split('').map((char, idx) => {
          if (char === ' ') return <span key={idx} className="hint-char space-char">&nbsp;</span>;
          if (char === '-') return <span key={idx} className="hint-char" style={{ color: 'var(--color-text-muted)', fontSize: '0.7em', opacity: 0.3 }}>-</span>;
          return <span key={idx} className="hint-char underscore" style={{ opacity: 0.3 }}>_</span>;
        })}
      </div>
    </div>
  );
}

/** Main clues panel component */
export default function CluesPanel({
  pokemon,
  showType,
  showRegion,
  showNameHint,
  showAlternateLetters,
  region,
  isRevealed,
  difficulty,
}) {
  // Master mode: hide all clues (only show name after reveal)
  const isMaster = difficulty === 'master';

  return (
    <div className="clues-section" role="region" aria-label="Clues">

      {/* Type Clue — hidden in master mode */}
      {!isMaster && (
        <div className={`clue-row ${showType || isRevealed ? 'revealed-row clue-slide-in' : ''}`}>
          <span className="clue-icon" aria-hidden="true">⚡</span>
          <span className="clue-label">Type</span>
          <div className="clue-value">
            {(showType || isRevealed) && pokemon ? (
              pokemon.types.map(type => <TypeBadge key={type} type={type} />)
            ) : (
              <span className="hidden-value" aria-label="Type hidden">?</span>
            )}
          </div>
        </div>
      )}

      {/* Region Clue — hidden in master mode */}
      {!isMaster && (
        <div className={`clue-row ${showRegion || isRevealed ? 'revealed-row clue-slide-in' : ''}`}>
          <span className="clue-icon" aria-hidden="true">🌍</span>
          <span className="clue-label">Region</span>
          <div className="clue-value">
            {(showRegion || isRevealed) && region ? (
              <span>{getRegionEmoji(region)} {region}</span>
            ) : (
              <span className="hidden-value" aria-label="Region hidden">?</span>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      {!isMaster && <div className="section-divider" style={{ margin: '4px 0' }} aria-hidden="true" />}

      {/* Name Hint */}
      {pokemon && (
        isMaster && !isRevealed ? (
          /* Master mode: show nothing until reveal */
          <div className="name-hint-container">
            <div className="name-hint-label">Name</div>
            <div className="master-no-hint" aria-label="No hints in Master mode">
              <span className="master-no-hint-text">🏆 No hints in Pokémon Master mode</span>
            </div>
          </div>
        ) : (
          <NameHint
            name={pokemon.name}
            show={showNameHint}
            showAlternateLetters={showAlternateLetters}
            isRevealed={isRevealed}
          />
        )
      )}
    </div>
  );
}
