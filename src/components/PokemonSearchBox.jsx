import { useState, useEffect, useRef } from 'react';

export default function PokemonSearchBox({ value, onChange }) {
  const [pokemonList, setPokemonList] = useState([]);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
      .then(res => res.json())
      .then(data => {
        const names = data.results.map(p => {
          // Capitalize first letter and handle hyphens
          const parts = p.name.split('-');
          return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        });
        setPokemonList(names);
      })
      .catch(err => console.error("Failed to load pokemon list", err));
  }, []);

  useEffect(() => {
    // Update local searchTerm if parent value changes
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = pokemonList.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50);

  return (
    <div ref={wrapperRef} className="pokemon-search-wrapper">
      <input 
        type="text"
        className="game-input"
        placeholder="Type to search..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && searchTerm.length > 0 && (
        <ul className="pokemon-dropdown">
          {filtered.map(p => (
            <li 
              key={p} 
              onClick={() => {
                setSearchTerm(p);
                onChange(p);
                setShowDropdown(false);
              }}
            >
              {p}
            </li>
          ))}
          {filtered.length === 0 && <li className="pokemon-dropdown-empty">No Pokémon found.</li>}
        </ul>
      )}
    </div>
  );
}
