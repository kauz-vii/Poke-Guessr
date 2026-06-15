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
  const response = await fetch(`${BASE_URL}/pokemon/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Pokémon #${id}: HTTP ${response.status}`);
  }

  const data = await response.json();

  // Use official artwork if available, fall back to front default sprite
  const imageUrl =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    null;

  // Backup sprite (smaller, always loads)
  const spriteUrl = data.sprites?.front_default || null;

  const types = data.types.map(typeSlot => typeSlot.type.name);

  return {
    id: data.id,
    name: data.name,
    imageUrl,
    spriteUrl,
    types,
  };
}
