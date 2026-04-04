import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

/**
 * CardDetailModal — shows full card details in an overlay.
 *
 * Accepts either a DB card row (card_name, card_image_url, card_set, card_price)
 * or a TCG API card object (name, images, set, tcgplayer).
 * Pass `onRemove` to show a remove button (binder context only).
 */
export default function CardDetailModal({ card, currency = 'USD', onClose, onRemove }) {
  // Normalise both DB-row and API-object shapes
  const isApiCard = !!card.images;
  const name     = isApiCard ? card.name : card.card_name;
  const imageUrl = isApiCard ? (card.images?.large || card.images?.small) : card.card_image_url;
  const setName  = isApiCard ? card.set?.name : card.card_set;
  const number   = isApiCard ? card.number : null;
  const rarity   = isApiCard ? card.rarity : null;
  const artist   = isApiCard ? card.artist : null;

  const getPrice = (c) => {
    if (!isApiCard) return c.card_price;
    return c.tcgplayer?.prices?.holofoil?.market
      ?? c.tcgplayer?.prices?.normal?.market
      ?? c.tcgplayer?.prices?.['1stEditionHolofoil']?.market
      ?? c.tcgplayer?.prices?.unlimited?.market
      ?? null;
  };

  const price = getPrice(card);
  const symbol = { USD: '$', EUR: '€', GBP: '£' }[currency] || '$';

  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-body">
          {/* Card image */}
          <div className="modal-image-wrap">
            <img src={imageUrl} alt={name} className="modal-card-image" />
          </div>

          {/* Details */}
          <div className="modal-details">
            <h2 className="modal-card-name">{name}</h2>

            <div className="modal-meta">
              {setName  && <MetaRow label="Set"    value={setName} />}
              {number   && <MetaRow label="Number" value={number} />}
              {rarity   && <MetaRow label="Rarity" value={rarity} />}
              {artist   && <MetaRow label="Artist" value={artist} />}
            </div>

            {price != null && (
              <div className="modal-price">
                <span className="modal-price__label">Market Price</span>
                <span className="modal-price__value">
                  {symbol}{Number(price).toFixed(2)}
                </span>
                <span className="modal-price__source">TCGPlayer</span>
              </div>
            )}

            {!price && (
              <p style={{ opacity: 0.45, fontSize: '0.875rem', marginTop: '16px' }}>
                No pricing data available.
              </p>
            )}

            <div className="modal-actions">
              {onRemove && (
                <button
                  className="btn btn-danger"
                  onClick={() => { onRemove(); onClose(); }}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Remove from Binder
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="modal-meta-row">
      <span className="modal-meta-row__label">{label}</span>
      <span className="modal-meta-row__value">{value}</span>
    </div>
  );
}
