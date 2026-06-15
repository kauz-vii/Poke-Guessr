/**
 * PokeballIcon.jsx - SVG Pokéball component used in the header and spinner
 */
export default function PokeballIcon({ className = '', size = 28, spinning = false }) {
  return (
    <svg
      className={`pokeball-icon ${spinning ? 'pokeball-spinner' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top half - red */}
      <path d="M 2 50 A 48 48 0 0 1 98 50 Z" fill="#FF5350" />
      {/* Bottom half - white */}
      <path d="M 2 50 A 48 48 0 0 0 98 50 Z" fill="#f0f0f0" />
      {/* Outer ring */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a2e" strokeWidth="4" />
      {/* Center band */}
      <rect x="2" y="46" width="96" height="8" fill="#1a1a2e" />
      {/* Center circle outer */}
      <circle cx="50" cy="50" r="14" fill="white" stroke="#1a1a2e" strokeWidth="4" />
      {/* Center circle inner */}
      <circle cx="50" cy="50" r="7" fill="#d0d0d0" />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3.5" fill="#1a1a2e" />
    </svg>
  );
}
