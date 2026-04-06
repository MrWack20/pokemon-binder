import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, FlipHorizontal } from 'lucide-react';

/**
 * CardInspectModal — GPU-accelerated 3D card inspection.
 *
 * Performance strategy:
 *  - Tilt and shine are applied via direct DOM style mutation (no React state),
 *    so mousemove NEVER triggers a React re-render.
 *  - All frame updates go through requestAnimationFrame — one paint per frame max.
 *  - `will-change: transform` on the card forces a dedicated GPU compositor layer.
 *  - CSS transition is removed during active movement and re-applied on mouse leave
 *    so the "return to centre" is smooth without queuing transition frames on every move.
 */
export default function CardInspectModal({ card, onClose }) {
  const wrapRef  = useRef(null);   // the 3D-tilting div
  const shineRef = useRef(null);   // holographic overlay
  const rafRef   = useRef(null);   // pending rAF id
  const [flipped, setFlipped] = useState(false);

  // ── Image resolution ───────────────────────────────────────────────────────
  const isDbCard   = !!card.card_image_url;
  const frontImage = isDbCard
    ? card.card_image_url
    : (card.images?.large || card.images?.small || '');
  const backImage  = card._backImage?.large ?? card._backImage?.small ?? null;
  const currentImage = flipped && backImage ? backImage : frontImage;
  const cardName   = isDbCard ? card.card_name : card.name;

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => {
      document.removeEventListener('keydown', h);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onClose]);

  // ── Pointer move — direct DOM, zero React re-renders ──────────────────────
  const handlePointerMove = useCallback((e) => {
    if (!wrapRef.current || !shineRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = wrapRef.current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left)  / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top)   / rect.height));
      const tX = (y - 0.5) * -26;
      const tY = (x - 0.5) *  26;

      // Remove settling transition so rapid moves aren't queued
      wrapRef.current.classList.remove('inspect-card-wrap--settling');
      wrapRef.current.style.transform =
        `perspective(700px) rotateX(${tX}deg) rotateY(${tY}deg) scale(1.05)`;

      shineRef.current.style.background =
        `radial-gradient(circle at ${x * 100}% ${y * 100}%, ` +
        `rgba(255,255,255,0.30) 0%, rgba(210,190,255,0.14) 28%, transparent 62%)`;
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!wrapRef.current || !shineRef.current) return;
    // Add smooth settling transition back for the return-to-centre animation
    wrapRef.current.classList.add('inspect-card-wrap--settling');
    wrapRef.current.style.transform =
      'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1.04)';
    shineRef.current.style.background =
      'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)';
  }, []);

  const handleReset = useCallback(() => {
    handlePointerLeave();
  }, [handlePointerLeave]);

  return (
    <div className="inspect-overlay" onClick={onClose}>

      {/* Top bar */}
      <div className="inspect-controls" onClick={e => e.stopPropagation()}>
        <span className="inspect-card-name">{cardName}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {backImage && (
            <button className="inspect-btn" onClick={() => setFlipped(f => !f)} title="Flip card">
              <FlipHorizontal size={18} />
            </button>
          )}
          <button className="inspect-btn" onClick={handleReset} title="Reset tilt">
            <RotateCcw size={18} />
          </button>
          <button className="inspect-btn inspect-btn--close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 3D stage — pointer events handled here so touch works */}
      <div className="inspect-stage" onClick={e => e.stopPropagation()}>
        <div
          ref={wrapRef}
          className="inspect-card-wrap"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerLeave}
        >
          <img
            src={currentImage}
            alt={cardName}
            className="inspect-card-img"
            draggable={false}
          />
          <div ref={shineRef} className="inspect-shine" />
          <div className="inspect-gloss" />
        </div>
      </div>

      <p className="inspect-hint">
        Move cursor to rotate{backImage ? ' · Flip for back face' : ''} · Click outside to close
      </p>
    </div>
  );
}
