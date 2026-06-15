/**
 * SettingsPanel.jsx — Generation filter + difficulty selector side panel
 */
import { useState } from 'react';
import { GEN_RANGES, DIFFICULTIES, useGameSettings } from '../contexts/GameSettingsContext';

/** Single generation checkbox row */
function GenRow({ gen, label, region, count, checked, onChange, disabled }) {
  return (
    <label className={`gen-row ${checked ? 'gen-row-active' : ''} ${disabled ? 'gen-row-disabled' : ''}`}>
      <input
        type="checkbox"
        className="gen-checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={`${label} — ${region}`}
      />
      <span className="gen-label">{label}</span>
      <span className="gen-region">{region}</span>
      <span className="gen-count">{count}</span>
    </label>
  );
}

/** Difficulty radio card — icon + label only */
function DifficultyCard({ id, label, icon, color, selected, onChange }) {
  return (
    <label
      className={`diff-card ${selected ? 'diff-card-selected' : ''}`}
      style={selected ? { '--diff-color': color, borderColor: color } : {}}
    >
      <input
        type="radio"
        name="difficulty"
        value={id}
        checked={selected}
        onChange={onChange}
        className="diff-radio"
      />
      <span className="diff-icon">{icon}</span>
      <span className="diff-label">{label}</span>
      {selected && <span className="diff-check">✓</span>}
    </label>
  );
}

export default function SettingsPanel() {
  const {
    selectedGens, toggleGen, selectAllGens, clearAllGens,
    difficulty, setDifficulty,
  } = useGameSettings();

  const [genOpen,  setGenOpen]  = useState(true);
  const [diffOpen, setDiffOpen] = useState(true);

  const allSelected  = selectedGens.size === GEN_RANGES.length;
  const noneSelected = selectedGens.size === 0;

  return (
    <aside className="settings-panel" aria-label="Game settings">

      {/* ── Generation Filter ── */}
      <section className="settings-box">
        <button
          className="settings-box-header"
          onClick={() => setGenOpen(o => !o)}
          aria-expanded={genOpen}
        >
          <span className="settings-box-icon">🔢</span>
          <span className="settings-box-title">Generation</span>
          <span className={`settings-caret ${genOpen ? 'open' : ''}`}>›</span>
        </button>

        {genOpen && (
          <div className="settings-box-body">
            {/* Select all / Clear */}
            <div className="gen-quick-actions">
              <button
                className="gen-quick-btn"
                onClick={selectAllGens}
                disabled={allSelected}
              >All</button>
              <button
                className="gen-quick-btn"
                onClick={clearAllGens}
                disabled={selectedGens.size <= 1}
              >Clear</button>
            </div>

            <div className="gen-list">
              {GEN_RANGES.map(({ gen, label, region, min, max }) => (
                <GenRow
                  key={gen}
                  gen={gen}
                  label={label}
                  region={region}
                  count={max - min + 1}
                  checked={selectedGens.has(gen)}
                  onChange={() => toggleGen(gen)}
                  disabled={selectedGens.has(gen) && selectedGens.size === 1}
                />
              ))}
            </div>

            <p className="gen-summary">
              {selectedGens.size === GEN_RANGES.length
                ? 'All 1,025 Pokémon'
                : `${[...selectedGens].reduce((sum, g) => {
                    const r = GEN_RANGES.find(x => x.gen === g);
                    return sum + (r ? r.max - r.min + 1 : 0);
                  }, 0)} Pokémon selected`}
            </p>
          </div>
        )}
      </section>

      {/* ── Difficulty ── */}
      <section className="settings-box">
        <button
          className="settings-box-header"
          onClick={() => setDiffOpen(o => !o)}
          aria-expanded={diffOpen}
        >
          <span className="settings-box-icon">⚙️</span>
          <span className="settings-box-title">Difficulty</span>
          <span className={`settings-caret ${diffOpen ? 'open' : ''}`}>›</span>
        </button>

        {diffOpen && (
          <div className="settings-box-body">
            <div className="diff-list">
              {DIFFICULTIES.map(d => (
                <DifficultyCard
                  key={d.id}
                  {...d}
                  selected={difficulty === d.id}
                  onChange={() => setDifficulty(d.id)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

    </aside>
  );
}
