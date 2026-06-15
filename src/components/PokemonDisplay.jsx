/**
 * PokemonDisplay.jsx - Shows the Pokémon image as silhouette, blurry, or revealed.
 *
 * New prop: showBlurryImage — Trainer mode at 20s+:
 *   renders the actual coloured image with heavy blur (no silhouette filter)
 */
import { useState, useEffect } from 'react';

export default function PokemonDisplay({ pokemon, isRevealed, showBlurryImage }) {
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 1000);
      return () => clearTimeout(t);
    }
  }, [isRevealed]);

  if (!pokemon) return null;

  const imageSrc = pokemon.imageUrl || pokemon.spriteUrl;

  // Determine image class:
  // - revealed:       full colour, no filter
  // - showBlurryImage: full colour + blur filter (Trainer mode)
  // - default:        brightness(0) silhouette
  let imageClass = 'pokemon-image';
  if (isRevealed)         imageClass += ' revealed';
  else if (showBlurryImage) imageClass += ' blurry-reveal';
  else                    imageClass += ' loading-pulse';

  return (
    <div className="pokemon-stage">
      {/* Pokédex number badge */}
      <div className={`pokemon-number ${isRevealed ? 'revealed-number' : ''}`}>
        #{String(pokemon.id).padStart(4, '0')}
      </div>

      <div className="pokemon-image-wrapper">
        {/* Reveal burst flash */}
        {showBurst && <div className="reveal-burst" aria-hidden="true" />}

        {/* Trainer-mode blurry label */}
        {showBlurryImage && !isRevealed && (
          <div className="blurry-label" aria-hidden="true">🌫️ Blurry…</div>
        )}

        {imageSrc ? (
          <img
            className={imageClass}
            src={imageSrc}
            alt={isRevealed ? `${pokemon.name} revealed` : 'Mystery Pokémon silhouette'}
            draggable={false}
            loading="eager"
          />
        ) : (
          <div
            style={{
              width: 200, height: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '4rem',
              filter: isRevealed || showBlurryImage ? 'none' : 'brightness(0)',
            }}
            role="img"
            aria-label={isRevealed ? pokemon.name : 'Mystery Pokémon'}
          >
            ❓
          </div>
        )}
      </div>
    </div>
  );
}
