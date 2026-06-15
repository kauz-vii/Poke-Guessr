/**
 * utils.js — Shared game utilities
 *
 * Updated: getRandomPokemonId now accepts a Set of generation numbers.
 *          getClueVisibility now accepts a difficulty string.
 */

import { GEN_RANGES } from './contexts/GameSettingsContext';

// ── Pokémon ID generation ──────────────────────────────────────────────────

/**
 * Returns a random Pokémon ID constrained to the selected generations.
 * Falls back to all 1025 if selectedGens is empty.
 * Uses weighted-random so larger gens are proportionally more likely.
 */
export function getRandomPokemonId(selectedGens) {
  const validRanges = (selectedGens && selectedGens.size > 0)
    ? GEN_RANGES.filter(r => selectedGens.has(r.gen))
    : GEN_RANGES;

  const totalCount = validRanges.reduce((sum, r) => sum + (r.max - r.min + 1), 0);
  let rand = Math.floor(Math.random() * totalCount);

  for (const range of validRanges) {
    const size = range.max - range.min + 1;
    if (rand < size) return range.min + rand;
    rand -= size;
  }
  return 1;
}

// ── Region mapping ─────────────────────────────────────────────────────────

export function getRegion(id) {
  if (id <= 151) return 'Kanto';
  if (id <= 251) return 'Johto';
  if (id <= 386) return 'Hoenn';
  if (id <= 493) return 'Sinnoh';
  if (id <= 649) return 'Unova';
  if (id <= 721) return 'Kalos';
  if (id <= 809) return 'Alola';
  if (id <= 905) return 'Galar';
  return 'Paldea';
}

/** Returns a region emoji for display (used by CluesPanel). */
export function getRegionEmoji(region) {
  const map = {
    Kanto:  '🔴',
    Johto:  '⭐',
    Hoenn:  '🌊',
    Sinnoh: '❄️',
    Unova:  '🗽',
    Kalos:  '🗼',
    Alola:  '🌺',
    Galar:  '⚔️',
    Paldea: '🌿',
  };
  return map[region] || '🌍';
}

// ── Guess validation ───────────────────────────────────────────────────────

export function isCorrectGuess(guess, apiName) {
  if (!guess || !apiName) return false;
  const normalizedGuess   = guess.trim().toLowerCase();
  const normalizedApiName = apiName.toLowerCase();
  const formattedName     = formatPokemonName(apiName).toLowerCase();
  const apiNameNoHyphen   = normalizedApiName.replace(/-/g, ' ');
  const apiNameNoSep      = normalizedApiName.replace(/[-\s]/g, '');
  const guessNoSep        = normalizedGuess.replace(/[-\s]/g, '');

  return (
    normalizedGuess === normalizedApiName ||
    normalizedGuess === formattedName     ||
    normalizedGuess === apiNameNoHyphen   ||
    guessNoSep      === apiNameNoSep
  );
}

// ── Scoring ────────────────────────────────────────────────────────────────

export function calculateScore(timeRemaining) {
  return Math.max(10, timeRemaining * 10);
}

// ── Timer state helper ─────────────────────────────────────────────────────

/** Used by TimerBar and Header for colour-coding the countdown. */
export function getTimerState(timeRemaining) {
  if (timeRemaining > 20) return 'high';
  if (timeRemaining > 10) return 'mid';
  return 'low';
}

// ── Clue visibility ────────────────────────────────────────────────────────

/**
 * Returns which clues are visible given the current time and difficulty.
 *
 * trainer:
 *   ≤ 20s → showAlternateLetters (every other letter of name)
 *   ≤ 10s → showBlurryImage (blurry actual image, no silhouette)
 *
 * elite (default):
 *   ≤ 20s → showType
 *   ≤ 15s → showRegion
 *   ≤ 10s → showNameHint (underscores)
 *
 * master:
 *   No clues ever — only the silhouette
 */
export function getClueVisibility(timeRemaining, difficulty = 'elite') {
  if (difficulty === 'master') {
    return {
      showType:             false,
      showRegion:           false,
      showNameHint:         false,
      showAlternateLetters: false,
      showBlurryImage:      false,
    };
  }

  if (difficulty === 'trainer') {
    return {
      showType:             false,
      showRegion:           false,
      showNameHint:         false,
      showAlternateLetters: timeRemaining <= 20,
      showBlurryImage:      timeRemaining <= 10,
    };
  }

  // elite (default)
  return {
    showType:             timeRemaining <= 20,
    showRegion:           timeRemaining <= 15,
    showNameHint:         timeRemaining <= 10,
    showAlternateLetters: false,
    showBlurryImage:      false,
  };
}

// ── Name formatting & hints ────────────────────────────────────────────────

/** Special-case display names for hyphenated Pokémon. */
const SPECIAL_NAMES = {
  'ho-oh':        'Ho-Oh',       'porygon-z':  'Porygon-Z',
  'mr-mime':      'Mr. Mime',    'mr-rime':    'Mr. Rime',
  'mime-jr':      'Mime Jr.',    'type-null':  'Type: Null',
  'jangmo-o':     'Jangmo-o',   'hakamo-o':   'Hakamo-o',
  'kommo-o':      'Kommo-o',     'tapu-koko':  'Tapu Koko',
  'tapu-lele':    'Tapu Lele',   'tapu-bulu':  'Tapu Bulu',
  'tapu-fini':    'Tapu Fini',   'nidoran-f':  'Nidoran♀',
  'nidoran-m':    'Nidoran♂',   'chi-yu':     'Chi-Yu',
  'ting-lu':      'Ting-Lu',     'chien-pao':  'Chien-Pao',
  'wo-chien':     'Wo-Chien',   'flutter-mane':'Flutter Mane',
  'iron-moth':    'Iron Moth',   'iron-hands': 'Iron Hands',
  'iron-jugulis': 'Iron Jugulis','iron-thorns':'Iron Thorns',
  'iron-bundle':  'Iron Bundle', 'iron-valiant':'Iron Valiant',
  'iron-leaves':  'Iron Leaves', 'iron-boulder':'Iron Boulder',
  'iron-crown':   'Iron Crown',
};

export function formatPokemonName(apiName) {
  if (!apiName) return '';
  const lower = apiName.toLowerCase();
  if (SPECIAL_NAMES[lower]) return SPECIAL_NAMES[lower];
  return apiName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Returns an array of { char, type } objects for the CluesPanel name hint.
 * Shows first and last letters; everything else is underscores.
 * type: 'letter-revealed' | 'underscore' | 'space' | 'separator'
 */
export function generateNameHint(name) {
  const displayName = formatPokemonName(name);
  const chars = displayName.split('');

  const letterIndices = chars
    .map((c, i) => (/[a-zA-Z]/i.test(c) ? i : null))
    .filter(i => i !== null);

  if (letterIndices.length === 0) return [];

  const firstIdx = letterIndices[0];
  const lastIdx  = letterIndices[letterIndices.length - 1];

  return chars.map((char, idx) => {
    if (char === ' ') return { char: ' ', type: 'space' };
    if (char === '-') return { char: '-', type: 'separator' };
    if (idx === firstIdx || idx === lastIdx)
      return { char: char.toUpperCase(), type: 'letter-revealed' };
    return { char: '_', type: 'underscore' };
  });
}

/**
 * Returns the name with every OTHER letter revealed (Trainer mode).
 * e.g. "Pikachu" → "P_k_c_u"
 */
export function generateAlternateLetterHint(name) {
  let letterIndex = 0;
  return name.split('').map(char => {
    if (char === '-' || char === ' ') return ' ';
    const show = letterIndex % 2 === 0;
    letterIndex++;
    return show ? char.toUpperCase() : '_';
  }).join('');
}

// ── Progression & XP ───────────────────────────────────────────────────────

/**
 * Level formula: level = floor(sqrt(xp / 100)) + 1
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 400 XP
 * Level 10: 8100 XP
 */
export function getLevelInfo(xp) {
  const currentLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevel = currentLevel + 1;
  
  // XP required to REACH current level
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * 100;
  // XP required to REACH next level
  const nextLevelXp = Math.pow(nextLevel - 1, 2) * 100;
  
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const progressPercent = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  return {
    level: currentLevel,
    xp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForLevel,
    progressPercent
  };
}

// ── Daily Challenge Seed ───────────────────────────────────────────────────

/**
 * Very basic PRNG for seeded Daily Challenge
 * returns float [0, 1)
 */
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Returns a fixed sequence of 10 Pokémon IDs based on today's date string (YYYY-MM-DD)
 */
export function getDailyChallengeSequence(dateStr) {
  // Convert date string to an integer seed
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed << 5) - seed + dateStr.charCodeAt(i);
    seed |= 0; 
  }
  
  const random = mulberry32(seed);
  const sequence = [];
  
  // Total pokemon up to gen 9 is 1025
  const TOTAL_POKEMON = 1025;
  
  while(sequence.length < 10) {
    const id = Math.floor(random() * TOTAL_POKEMON) + 1;
    if (!sequence.includes(id)) {
      sequence.push(id);
    }
  }
  
  return sequence;
}

// ── Ranked Matchmaking & Elo ───────────────────────────────────────────────

/**
 * Calculates new Elo ratings for a 1v1 match.
 * @param {number} playerRating 
 * @param {number} opponentRating 
 * @param {number} actualScore 1 for win, 0 for loss, 0.5 for draw
 * @returns {number} The new rating
 */
export function calculateElo(playerRating, opponentRating, actualScore) {
  const K = 32; // Standard Elo K-factor
  // Expected probability of winning
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  
  let newRating = playerRating + K * (actualScore - expectedScore);
  return Math.round(newRating);
}

/**
 * Maps an Elo rating to a Rank Tier string
 */
export function getRankTier(rating) {
  if (rating < 1000) return 'Beginner';
  if (rating < 1200) return 'Poké Ball';
  if (rating < 1400) return 'Great Ball';
  if (rating < 1700) return 'Ultra Ball';
  if (rating < 2000) return 'Master Ball';
  return 'Champion';
}
