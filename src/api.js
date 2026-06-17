/**
 * api.js - PokéAPI integration for the Pokémon Guesser game
 */

const BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Fetches Pokémon data from PokéAPI and extracts relevant fields.
 *
 * @param {number} id - Pokémon Pokédex ID (1-1025)
 * @returns {Promise<{
 *   id: number,
 *   name: string,
 *   imageUrl: string,
 *   types: string[],
 *   spriteUrl: string
 * }>}
 * @throws {Error} If the fetch fails or the Pokémon is not found
 */
export async function fetchPokemon(id) {
  // Fetch both endpoints in parallel for speed
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`${BASE_URL}/pokemon/${id}`),
    fetch(`${BASE_URL}/pokemon-species/${id}`)
  ]);

  if (!pokemonRes.ok) {
    throw new Error(`Failed to fetch Pokémon #${id}: HTTP ${pokemonRes.status}`);
  }

  const data = await pokemonRes.json();
  const speciesData = speciesRes.ok ? await speciesRes.json() : null;

  // Use official artwork if available, fall back to front default sprite
  const imageUrl =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    null;

  // Backup sprite (smaller, always loads)
  const spriteUrl = data.sprites?.front_default || null;

  const types = data.types.map(typeSlot => typeSlot.type.name);

  // Extract official flavor text (Pokédex entry)
  let flavorText = '';
  if (speciesData && speciesData.flavor_text_entries) {
    const englishEntry = speciesData.flavor_text_entries.find(
      (entry) => entry.language.name === 'en'
    );
    if (englishEntry) {
      // Clean up weird characters \f, \n, \r
      flavorText = englishEntry.flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return {
    id: data.id,
    name: data.name,
    imageUrl,
    spriteUrl,
    types,
    flavorText, // New field for Pokedex feature
  };
}
