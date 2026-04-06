import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, FlipHorizontal } from 'lucide-react';

/**
 * CardInspectModal — immersive 3D card inspection.
 *
 * Triggered by long-pressing any card. Shows a full-screen overlay with a
 * 3D tilt effect: moving the cursor (or finger) over the card rotates it
 * and casts a dynamic shine/holographic highlight.
 *
 * Props:
 *   card       — normalised card object (DB row or API shape)
 *   onClose    — callback to dismiss
 */
export default function CardInspectModal({ card, onClose }) {
  const cardRef = useRef(null);
  const [tilt, setTilt]     = useState({ x: 0, y: 0 });
  const [shine, setShine]   = useState({ x: 50, y: 50 });
  const [flipped, setFlipped] = useState(false);

  // Resolve card images ─────────────────────────────────────────────────────
  const isDbCard   = !!card.card_image_url;
  const frontImage = isDbCard
    ? card.card_image_url
    : (card.images?.large || card.images?.small || '');
  const backImage  = card._backImage?.large ?? card._backImage?.small ?? null;
  const currentImage = flipped && backImage ? backImage : frontImage;
  const cardName   = isDbCard ? card.card_name : card.name;

  // Dismiss on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // 3D tilt from pointer position ───────────────────────────────────────────
  const handlePointerMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;   // 0..1
    const y = (clientY - rect.top)  / rect.height;  // 0..1
    setTilt({ x: (y - 0.5) * -28, y: (x - 0.5) * 28 });
    setShine({ x: x * 100, y: y * 100 });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setShine({ x: 50, y: 50 });
  }, []);

  const resetTilt = () => { setTilt({ x: 0, y: 0 }); setShine({ x: 50, y: 50 }); };

  return (
    <div className="inspect-overlay" onClick={onClose}>
      {/* Controls */}
      <div className="inspect-controls" onClick={e => e.stopPropagation()}>
        <span className="inspect-card-name">{cardName}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {backImage && (
            <button className="inspect-btn" onClick={() => setFlipped(f => !f)} title="Flip card">
              <FlipHorizontal size={18} />
            </button>
          )}
          <button className="inspect-btn" onClick={resetTilt} title="Reset tilt">
            <RotateCcw size={18} />
          </button>
          <button className="inspect-btn inspect-btn--close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 3D card */}
      <div className="inspect-stage" onClick={e => e.stopPropagation()}>
        <div
          ref={cardRef}
          className="inspect-card-wrap"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerLeave}
          style={{ transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)` }}
        >
          <img
            src={currentImage}
            alt={cardName}
            className="inspect-card-img"
            draggable={false}
          />
          {/* Holographic shine overlay */}
          <div
            className="inspect-shine"
            style={{
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.28) 0%, rgba(200,180,255,0.12) 30%, transparent 65%)`,
            }}
          />
          {/* Edge gloss */}
          <div className="inspect-gloss" />
        </div>
      </div>

      <p className="inspect-hint">Move cursor to rotate · {backImage ? 'Flip for back face · ' : ''}Click outside to close</p>
    </div>
  );
}
