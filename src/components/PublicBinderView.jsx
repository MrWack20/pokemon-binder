'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Book, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import CardDetailModal from './CardDetailModal.jsx';

/**
 * Read-only, unauthenticated view of a public binder.
 *
 * Deliberately simpler than BinderView: no search, no drag-and-drop, no
 * mutation handlers, no Supabase access. Receives a fully-resolved slot
 * array (length = rows * cols * pages) from the Server Component that
 * renders /share/[binderId].
 */
export default function PublicBinderView({ binder, ownerName, currency = 'USD' }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [modalCard, setModalCard] = useState(null);

  const slotsPerPage = binder.rows * binder.cols;
  const totalPages   = binder.pages;
  const startIndex   = currentPage * slotsPerPage;
  const pageCards    = binder.cards.slice(startIndex, startIndex + slotsPerPage);

  const filledCount  = binder.cards.filter(c => c).length;
  const totalValue   = binder.cards.reduce((s, c) => s + (c?.card_price || 0), 0);

  const goPrev = () => setCurrentPage(p => Math.max(0, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));

  return (
    <div className="app">
      <div className="container">
        {/* Header — minimal, branded back to PokéBinder */}
        <div className="header header--compact">
          <div className="header-top">
            <Link href="/" className="brand-link" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1>
                <Book size={36} style={{ marginRight: '12px', flexShrink: 0, color: '#fbbf24' }} />
                <span className="brand-text">PokéBinder</span>
              </h1>
            </Link>
            <div className="header-actions">
              <Link href="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link href="/register" className="btn btn-success" style={{ textDecoration: 'none' }}>
                <Sparkles size={16} />Make your own
              </Link>
            </div>
          </div>
        </div>

        {/* Cover band — name + owner + counts */}
        <div className="public-binder__cover" style={{
          padding: '24px 28px',
          borderRadius: '16px',
          backgroundColor: binder.cover_color || '#1f2937',
          backgroundImage: binder.cover_image_url ? `url(${binder.cover_image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: binder.cover_image_url ? '#fff' : 'inherit',
          textShadow: binder.cover_image_url ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
            {binder.cover_text || binder.name}
          </h2>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>
            {ownerName ? `${ownerName}'s collection` : 'Public collection'}
            {' · '}
            {filledCount} card{filledCount !== 1 ? 's' : ''}
            {totalValue > 0 && ` · total ${currencySymbol(currency)}${totalValue.toFixed(2)}`}
          </p>
        </div>

        {/* Page navigator */}
        <div className="binder-page-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-secondary" onClick={goPrev} disabled={currentPage === 0}>
            <ChevronLeft size={16} />Prev
          </button>
          <span className="page-indicator">Page {currentPage + 1} / {totalPages}</span>
          <button className="btn btn-secondary" onClick={goNext} disabled={currentPage === totalPages - 1}>
            Next<ChevronRight size={16} />
          </button>
        </div>

        {/* Card grid — read only */}
        <div
          className="binder-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${binder.cols}, 1fr)`,
            gap: '12px',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          {pageCards.map((card, idx) => (
            <div
              key={`slot-${startIndex + idx}`}
              className="card-slot"
              style={{ aspectRatio: '2.5 / 3.5', borderRadius: '8px', overflow: 'hidden', cursor: card ? 'pointer' : 'default' }}
              onClick={() => card && setModalCard(card)}
            >
              {card ? (
                <img
                  src={card.card_image_url}
                  alt={card.card_name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  border: '2px dashed rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', marginTop: '40px', opacity: 0.8 }}>
          <p style={{ marginBottom: '8px' }}>Like what you see?</p>
          <Link href="/register" className="btn btn-success" style={{ textDecoration: 'none' }}>
            Build your own collection
          </Link>
        </div>

        {modalCard && (
          <CardDetailModal
            card={modalCard}
            currency={currency}
            onClose={() => setModalCard(null)}
            // No onRemove / onInspect — public viewers can't mutate.
          />
        )}
      </div>
    </div>
  );
}

function currencySymbol(c) {
  return { USD: '$', EUR: '€', GBP: '£' }[c] || '$';
}
