import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/LoadingState';

const TOTAL_POKEMON = 1025;

// Generation breakpoints
const GENERATIONS = [
  { gen: 1, name: 'Kanto', start: 1, end: 151 },
  { gen: 2, name: 'Johto', start: 152, end: 251 },
  { gen: 3, name: 'Hoenn', start: 252, end: 386 },
  { gen: 4, name: 'Sinnoh', start: 387, end: 493 },
  { gen: 5, name: 'Unova', start: 494, end: 649 },
  { gen: 6, name: 'Kalos', start: 650, end: 721 },
  { gen: 7, name: 'Alola', start: 722, end: 809 },
  { gen: 8, name: 'Galar', start: 810, end: 905 },
  { gen: 9, name: 'Paldea', start: 906, end: 1025 },
];

function getGenForId(id) {
  return GENERATIONS.find(g => id >= g.start && id <= g.end)?.gen || 1;
}

export default function PokedexPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allPokemon, setAllPokemon] = useState([]);
  const [userPokedex, setUserPokedex] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'seen', 'caught', 'unseen'
  const [filterGen, setFilterGen] = useState('all'); // 'all', 1, 2, ...
  const [selectedPokemon, setSelectedPokemon] = useState(null); // For Modal
  const [selectedFlavorText, setSelectedFlavorText] = useState(null);

  useEffect(() => {
    if (selectedPokemon) {
      setSelectedFlavorText(null);
      import('../api').then(({ fetchPokemon }) => {
        fetchPokemon(selectedPokemon.id).then(data => {
          setSelectedFlavorText(data.flavorText);
        }).catch(err => console.error(err));
      });
    }
  }, [selectedPokemon]);

  useEffect(() => {
    async function loadPokedex() {
      setLoading(true);
      try {
        // Fetch base pokemon list from PokeAPI
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`);
        const data = await res.json();
        const baseList = data.results.map((p, index) => ({
          id: index + 1,
          name: p.name,
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`,
        }));
        setAllPokemon(baseList);

        // Fetch user's pokedex from Supabase
        if (user) {
          const { data: dexData, error } = await supabase
            .from('user_pokedex')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          const dexMap = {};
          for (const entry of dexData || []) {
            dexMap[entry.pokemon_id] = entry;
          }
          setUserPokedex(dexMap);
        }
      } catch (err) {
        console.error('Failed to load Pokedex:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPokedex();
  }, [user]);

  const filteredPokemon = useMemo(() => {
    return allPokemon.filter(p => {
      const stats = userPokedex[p.id];
      const isSeen = stats && stats.times_seen > 0;
      const isCaught = stats && stats.times_correct > 0;

      // Status filter
      if (filterStatus === 'seen' && (!isSeen || isCaught)) return false;
      if (filterStatus === 'caught' && !isCaught) return false;
      if (filterStatus === 'unseen' && isSeen) return false;

      // Gen filter
      if (filterGen !== 'all' && getGenForId(p.id) !== parseInt(filterGen)) return false;

      // Search filter
      if (search && !p.name.includes(search.toLowerCase())) return false;

      return true;
    });
  }, [allPokemon, userPokedex, search, filterStatus, filterGen]);

  const totalSeen = Object.values(userPokedex).filter(s => s.times_seen > 0).length;
  const totalCaught = Object.values(userPokedex).filter(s => s.times_correct > 0).length;

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingState /></div>;
  }

  return (
    <div className="lb-root">
      <div className="lb-topbar">
        <Link to="/" className="profile-back-btn">← Menu</Link>
        <div style={{color: 'white', fontWeight: 'bold', fontSize: '1.2rem'}}>National Pokédex</div>
        <div style={{width: 60}}></div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem', color: 'white' }}>
        
        {/* Progress Overview */}
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Overall Progress</h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Seen</span>
                <span>{totalSeen} / {TOTAL_POKEMON}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#4CAF50', height: '100%', width: `${(totalSeen/TOTAL_POKEMON)*100}%` }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Caught</span>
                <span>{totalCaught} / {TOTAL_POKEMON}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--color-pokemon-yellow)', height: '100%', width: `${(totalCaught/TOTAL_POKEMON)*100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search Pokémon..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 2, padding: '0.8rem', borderRadius: '8px', border: 'none', minWidth: '200px' }}
          />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', minWidth: '120px' }}
          >
            <option value="all">All Status</option>
            <option value="caught">Caught 🏆</option>
            <option value="seen">Seen 👀</option>
            <option value="unseen">Unseen ❓</option>
          </select>
          <select 
            value={filterGen} 
            onChange={(e) => setFilterGen(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', minWidth: '120px' }}
          >
            <option value="all">All Generations</option>
            {GENERATIONS.map(g => (
              <option key={g.gen} value={g.gen}>Gen {g.gen} - {g.name}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
          gap: '1rem' 
        }}>
          {filteredPokemon.map(p => {
            const stats = userPokedex[p.id];
            const isSeen = stats && stats.times_seen > 0;
            const isCaught = stats && stats.times_correct > 0;

            return (
              <div 
                key={p.id}
                onClick={() => isSeen && setSelectedPokemon({ ...p, stats })}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '12px', 
                  padding: '1rem 0.5rem', 
                  textAlign: 'center',
                  cursor: isSeen ? 'pointer' : 'default',
                  transition: 'transform 0.2s, background 0.2s',
                  border: isCaught ? '2px solid var(--color-pokemon-yellow)' : '2px solid transparent',
                  opacity: isSeen ? 1 : 0.4
                }}
                onMouseOver={(e) => isSeen && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseOut={(e) => isSeen && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>#{String(p.id).padStart(3, '0')}</div>
                <img 
                  src={p.sprite} 
                  alt={isSeen ? p.name : 'Unknown'} 
                  loading="lazy"
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    filter: isSeen ? 'none' : 'brightness(0)',
                    opacity: isSeen ? 1 : 0.5
                  }} 
                />
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', textTransform: 'capitalize' }}>
                  {isSeen ? p.name : '?????'}
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredPokemon.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
            No Pokémon found matching those filters.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPokemon && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setSelectedPokemon(null)}>
          <div style={{
            background: '#1a1a2e', padding: '2rem', borderRadius: '16px', maxWidth: '400px', width: '100%',
            textAlign: 'center', position: 'relative', border: '1px solid #333'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPokemon(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
            >×</button>
            <h2 style={{ textTransform: 'capitalize', margin: '0 0 1rem 0', color: 'var(--color-pokemon-yellow)' }}>
              {selectedPokemon.name}
            </h2>
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPokemon.id}.png`}
              alt={selectedPokemon.name}
              style={{ width: '150px', height: '150px', objectFit: 'contain' }}
            />
            {selectedFlavorText ? (
              <p style={{ fontStyle: 'italic', fontSize: '0.95rem', color: '#e2e8f0', margin: '1rem 0', lineHeight: '1.5' }}>
                "{selectedFlavorText}"
              </p>
            ) : (
              <div style={{ margin: '1rem 0', fontSize: '0.9rem', color: '#888' }}>Loading fun fact...</div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa' }}>Status:</span>
                <strong style={{ color: selectedPokemon.stats.times_correct > 0 ? 'var(--color-pokemon-yellow)' : 'white' }}>
                  {selectedPokemon.stats.times_correct > 0 ? 'Caught 🏆' : 'Seen 👀'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa' }}>Times Seen:</span>
                <strong>{selectedPokemon.stats.times_seen}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa' }}>Times Correct:</span>
                <strong>{selectedPokemon.stats.times_correct}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Accuracy:</span>
                <strong>{Math.round((selectedPokemon.stats.times_correct / selectedPokemon.stats.times_seen) * 100)}%</strong>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '1.5rem' }}>
              First Encounter: {new Date(selectedPokemon.stats.first_seen).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
