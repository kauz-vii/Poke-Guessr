/**
 * LoadingState.jsx - Shown while fetching Pokémon data from API
 */
import PokeballIcon from './PokeballIcon';

export default function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Loading Pokémon data">
      <PokeballIcon size={64} spinning />
      <p className="loading-text">Loading Pokémon...</p>
    </div>
  );
}
