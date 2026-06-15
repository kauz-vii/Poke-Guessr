/**
 * Confetti.jsx - Particle confetti effect shown on correct guess
 */
import { useEffect, useState } from 'react';

const COLORS = [
  '#FFD700', '#FF5350', '#48C774', '#4A90D9',
  '#FF69B4', '#FFA500', '#9B59B6', '#1ABC9C',
];

const SHAPES = ['square', 'circle', 'triangle'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createConfettiPiece(id) {
  return {
    id,
    x: randomBetween(5, 95), // percent from left
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: randomBetween(6, 14),
    duration: randomBetween(1.5, 3),
    delay: randomBetween(0, 0.5),
    rotation: randomBetween(0, 360),
  };
}

export default function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (active) {
      // Generate 60 confetti pieces
      const newPieces = Array.from({ length: 60 }, (_, i) => createConfettiPiece(i));
      setPieces(newPieces);

      // Clear after animations finish
      const timer = setTimeout(() => setPieces([]), 3500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!pieces.length) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.shape === 'circle' ? piece.size : piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'triangle' ? '0' : '2px',
            transform: piece.shape === 'triangle'
              ? `rotate(${piece.rotation}deg) scaleX(0.8)`
              : `rotate(${piece.rotation}deg)`,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
