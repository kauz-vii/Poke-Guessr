/**
 * PresenceDot.jsx — Colored status indicator dot with optional label.
 */
import { STATUS_CONFIG } from '../socialApi';

export default function PresenceDot({ status = 'offline', showLabel = false, size = 10 }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <span className="presence-wrapper" title={cfg.label}>
      <span
        className={`presence-dot ${status !== 'offline' ? 'presence-dot--pulse' : ''}`}
        style={{ width: size, height: size, background: cfg.dot }}
      />
      {showLabel && (
        <span className="presence-label" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}
