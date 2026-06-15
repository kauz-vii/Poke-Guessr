/**
 * GameSettingsContext.jsx — Generation filter + difficulty settings
 *
 * Provides: selectedGens, toggleGen, selectAllGens, clearAllGens,
 *           difficulty, setDifficulty
 */
import { createContext, useContext, useState } from 'react';

export const GEN_RANGES = [
  { gen: 1, label: 'Gen I',  region: 'Kanto',  min: 1,   max: 151  },
  { gen: 2, label: 'Gen II', region: 'Johto',  min: 152, max: 251  },
  { gen: 3, label: 'Gen III',region: 'Hoenn',  min: 252, max: 386  },
  { gen: 4, label: 'Gen IV', region: 'Sinnoh', min: 387, max: 493  },
  { gen: 5, label: 'Gen V',  region: 'Unova',  min: 494, max: 649  },
  { gen: 6, label: 'Gen VI', region: 'Kalos',  min: 650, max: 721  },
  { gen: 7, label: 'Gen VII',region: 'Alola',  min: 722, max: 809  },
  { gen: 8, label: 'Gen VIII',region:'Galar',  min: 810, max: 905  },
  { gen: 9, label: 'Gen IX', region: 'Paldea', min: 906, max: 1025 },
];

export const DIFFICULTIES = [
  {
    id: 'trainer',
    label: 'Trainer',
    icon: '🎒',
    desc: 'Alternate letters at 10s · Blurry image at 20s',
    color: '#4CAF50',
  },
  {
    id: 'elite',
    label: 'Elite',
    icon: '⭐',
    desc: 'Type, region & name hints appear over time',
    color: '#FFD700',
  },
  {
    id: 'master',
    label: 'Pokémon Master',
    icon: '🏆',
    desc: 'No hints. No clues. Just the silhouette.',
    color: '#FF5350',
  },
];

const ALL_GENS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const GameSettingsContext = createContext(null);

export function GameSettingsProvider({ children }) {
  const [selectedGens, setSelectedGens] = useState(new Set(ALL_GENS));
  const [difficulty,   setDifficulty]   = useState('elite');

  function toggleGen(gen) {
    setSelectedGens(prev => {
      const next = new Set(prev);
      if (next.has(gen)) {
        if (next.size === 1) return prev; // must keep at least one
        next.delete(gen);
      } else {
        next.add(gen);
      }
      return next;
    });
  }

  function selectAllGens()  { setSelectedGens(new Set(ALL_GENS)); }
  function clearAllGens()   { setSelectedGens(new Set([1])); } // keep Gen I as minimum

  return (
    <GameSettingsContext.Provider value={{
      selectedGens, toggleGen, selectAllGens, clearAllGens,
      difficulty,   setDifficulty,
    }}>
      {children}
    </GameSettingsContext.Provider>
  );
}

export function useGameSettings() {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used within <GameSettingsProvider>');
  return ctx;
}
