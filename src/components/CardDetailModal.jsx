'use client';

import React, { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';

/**
 * CardDetailModal — full card details overlay.
 *
 * Accepts three card shapes:
 *   1. DB row    — card.card_image_url, card.card_name, card.card_game
 *   2. Pokemon TCG API object — card.images, card.name, card.tcgplayer
 *   3. Normalised MTG / YGO object — card.images, card._game, card._raw
 *
 * Optional props:
 *   onRemove     — show "Remove from Binder" button
 *   onInspect    — show "Inspect (3D)" button, called with the card
 */
export default function CardDetailModal({ card, currency = 'USD', onClose, onRemove, onInspect }) {
  const symbol = { USD: '$', EUR: '€', GBP: '£' }[currency] || '$';

  // ── Shape detection ───────────────────────────────────────────────────────
  const isDbCard  = !!card.card_image_url;
  const game      = isDbCard ? (card.card_game || 'pokemon') : (card._game || 'pokemon');

  // ── Field extraction ──────────────────────────────────────────────────────
  let name, imageUrl, setName, number, rarity, artist, price, priceSource;
  let extraRows = [];

  if (isDbCard) {
    name      = card.card_name;
    imageUrl  = card.card_image_url;
    setName   = card.card_set;
    price     = card.card_price;
    priceSource = 'TCGPlayer';
  } else if (game === 'mtg') {
    const raw  = card._raw || card;
    const front = raw.card_faces?.[0];
    name      = raw.name;
    imageUrl  = card.images?.large || card.images?.small || front?.image_uris?.normal || '';
    setName   = raw.set_name;
    number    = raw.collector_number;
    rarity    = raw.rarity;
    artist    = raw.artist || front?.artist;
    price     = parseFloat(raw.prices?.usd) || parseFloat(raw.prices?.usd_foil) || null;
    priceSource = 'TCGPlayer';
    if (raw.type_line)   extraRows.push({ label: 'Type',   value: raw.type_line });
    if (raw.oracle_text) extraRows.push({ label: 'Text',   value: raw.oracle_text });
    if (raw.power)       extraRows.push({ label: 'P / T',  value: `${raw.power} / ${raw.toughness}` });
    if (raw.mana_cost)   extraRows.push({ label: 'Cost',   value: raw.mana_cost });
    if (raw.prices?.usd_foil) extraRows.push({ label: 'Foil', value: `${symbol}${parseFloat(raw.prices.usd_foil).toFixed(2)}` });
  } else if (game === 'yugioh') {
    const raw  = card._raw || card;
    name      = raw.name;
    imageUrl  = card.images?.large || card.images?.small || raw.card_images?.[0]?.image_url || '';
    setName   = raw.card_sets?.[0]?.set_name;
    number    = raw.card_sets?.[0]?.set_code;
    rarity    = raw.card_sets?.[0]?.set_rarity;
    price     = parseFloat(raw.card_prices?.[0]?.tcgplayer_price) || null;
    priceSource = 'TCGPlayer';
    if (raw.type)       extraRows.push({ label: 'Type',    value: raw.type });
    if (raw.race)       extraRows.push({ label: 'Race',    value: raw.race });
    if (raw.attribute)  extraRows.push({ label: 'Attribute', value: raw.attribute });
    if (raw.atk != null) extraRows.push({ label: 'ATK / DEF', value: `${raw.atk} / ${raw.def ?? '?'}` });
    if (raw.level)      extraRows.push({ label: 'Level',   value: String(raw.level) });
    if (raw.desc)       extraRows.push({ label: 'Effect',  value: raw.desc });
  } else if (game === 'onepiece') {
    const raw  = card._raw || card;
    name      = card.name || raw.card_name || 'Unknown';
    imageUrl  = card.images?.large || card.images?.small || raw.card_image || '';
    setName   = card.set?.name || raw.set_name;
    number    = card.number || raw.card_set_id;
    rarity    = card.rarity || raw.rarity;
    price     = card._price;
    priceSource = 'TCGPlayer';
    if (raw.card_color)  extraRows.push({ label: 'Color',  value: raw.card_color });
    if (raw.card_type)   extraRows.push({ label: 'Type',   value: raw.card_type });
    if (raw.card_cost)   extraRows.push({ label: 'Cost',   value: String(raw.card_cost) });
    if (raw.card_power)  extraRows.push({ label: 'Power',  value: String(raw.card_power) });
    if (raw.sub_types)   extraRows.push({ label: 'Traits', value: raw.sub_types });
    if (raw.card_text)   extraRows.push({ label: 'Effect', value: raw.card_text });
  } else {
    // Pokemon TCG API or normalised pokemon card
    name      = card.name;
    imageUrl  = card.images?.large || card.images?.small || '';
    setName   = card.set?.name;
    number    = card.number;
    rarity    = card.rarity;
    artist    = card.artist;
    price     = card._price
      ?? card.tcgplayer?.prices?.holofoil?.market
      ?? card.tcgplayer?.prices?.normal?.market
      ?? card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
      ?? card.tcgplayer?.prices?.unlimited?.market
      ?? null;
    priceSource = 'TCGPlayer';
    if (card.types?.length)      extraRows.push({ label: 'Type',     value: card.types.join(', ') });
    if (card.supertype)          extraRows.push({ label: 'Supertype', value: card.supertype });
    if (card.hp)                 extraRows.push({ label: 'HP',        value: card.hp });
  }

  const GAME_BADGE = { pokemon: '🎴 Pokémon TCG', mtg: '⚔️ Magic: The Gathering', yugioh: '🐉 Yu-Gi-Oh!', onepiece: '🏴‍☠️ One Piece TCG' };

  // Escape key handler
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

        <div className="modal-body">
          {/* Card image */}
          <div className="modal-image-wrap">
            <img src={imageUrl} alt={name} className="modal-card-image" />
            {onInspect && (
              <button
                className="btn btn-secondary modal-inspect-btn"
                onClick={() => { onClose(); onInspect(card); }}
                title="View in 3D"
              >
                <Maximize2 size={14} />Inspect 3D
              </button>
            )}
          </div>

          {/* Details */}
          <div className="modal-details">
            <p className="modal-game-badge">{GAME_BADGE[game] || game}</p>
            <h2 className="modal-card-name">{name}</h2>

            <div className="modal-meta">
              {setName  && <MetaRow label="Set"    value={setName} />}
              {number   && <MetaRow label="Number" value={`#${number}`} />}
              {rarity   && <MetaRow label="Rarity" value={rarity} />}
              {artist   && <MetaRow label="Artist" value={artist} />}
              {extraRows.map((r, i) => <MetaRow key={i} label={r.label} value={r.value} />)}
            </div>

            {price != null ? (
              <div className="modal-price">
                <span className="modal-price__label">Market Price</span>
                <span className="modal-price__value">{symbol}{Number(price).toFixed(2)}</span>
                <span className="modal-price__source">{priceSource}</span>
              </div>
            ) : (
              <p style={{ opacity: 0.45, fontSize: '0.875rem', marginTop: '16px' }}>
                No pricing data available.
              </p>
            )}

            <div className="modal-actions">
              {onRemove && (
                <button className="btn btn-danger" onClick={() => { onRemove(); onClose(); }} style={{ flex: 1, justifyContent: 'center' }}>
                  Remove from Binder
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
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
