'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X, BookOpen, Layers, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyCollection } from '@/hooks/queries';

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

const GAME_TABS = [
  { id: null,        label: 'All' },
  { id: 'pokemon',   label: '🎴 Pokémon' },
  { id: 'mtg',       label: '⚔️ MTG' },
  { id: 'yugioh',    label: '🐉 Yu-Gi-Oh!' },
  { id: 'onepiece',  label: '🏴‍☠️ One Piece' },
];

/**
 * Compute the binder-page index for a given slot. Pages are 0-indexed
 * internally; we display them 1-indexed.
 */
function pageOfSlot(slotIndex, rows, cols) {
  if (!rows || !cols) return 0;
  return Math.floor(slotIndex / (rows * cols));
}

/**
 * "Find a card in my collection" — the missing global search.
 *
 * Users naturally ask "do I own X?" or "where did I put that Charizard?".
 * Without this page the only way to answer was to remember which binder.
 * Now: type the name, get every match across every binder, click to jump
 * straight to that binder at the right page.
 */
export default function CollectionSearchPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [rawQuery, setRawQuery] = useState('');
  const [game, setGame] = useState(null);

  // Debounce typing so we don't hit Postgres on every keystroke. 250ms is
  // the sweet spot — faster than the 300ms in BinderView's TCG-API search
  // because Postgres is local and we know it can keep up.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data: results, isFetching, error } = useMyCollection(
    profile?.id, debouncedQuery, game,
  );

  // Currency (mirrors the pattern used elsewhere — read from localStorage
  // in a client-only effect to avoid SSR/hydration mismatch).
  const [currency, setCurrency] = useState('USD');
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}');
      if (parsed.currency) setCurrency(parsed.currency);
    } catch { /* ignore */ }
  }, []);
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  // Group results by binder so the eye can scan "I have 3 of these in
  // National Dex" rather than wading through a flat list.
  const grouped = useMemo(() => {
    if (!results) return [];
    const map = new Map();
    for (const card of results) {
      const bid = card.binder?.id;
      if (!bid) continue;
      if (!map.has(bid)) map.set(bid, { binder: card.binder, cards: [] });
      map.get(bid).cards.push(card);
    }
    return Array.from(map.values());
  }, [results]);

  const totalValue = (results || []).reduce(
    (s, c) => s + (Number(c.card_price) || 0), 0
  );

  const showEmptyHint = !debouncedQuery || debouncedQuery.trim().length < 2;
  const showNoResults = !showEmptyHint && !isFetching && results && results.length === 0;

  return (
    <div className="app">
      <div className="container">
        <div className="stats-page">

          <div className="stats-header">
            <Link href="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={18} />My Binders
            </Link>
            <h2><Search size={22} style={{ verticalAlign: '-4px', marginRight: '8px' }} />My Collection</h2>
            <div style={{ width: '130px' }} />
          </div>

          {/* Search input + game filter — sticky so they stay on screen
              while scrolling long result lists. */}
          <div className="collection-search-bar">
            <div className="input-icon-wrap" style={{ flex: 1, minWidth: '240px' }}>
              <Search size={16} className="input-icon" />
              <input
                type="text"
                className="input input--icon"
                placeholder='Find a card you own (e.g. "charizard", "blue-eyes")…'
                value={rawQuery}
                onChange={e => setRawQuery(e.target.value)}
                autoFocus
              />
              {rawQuery && (
                <button
                  type="button"
                  onClick={() => setRawQuery('')}
                  className="collection-search-bar__clear"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="news-tabs" style={{ marginTop: '0' }}>
            {GAME_TABS.map(tab => (
              <button
                key={tab.label}
                type="button"
                className={`news-tab${game === tab.id ? ' is-active' : ''}`}
                onClick={() => setGame(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Result summary or empty state */}
          {showEmptyHint && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', marginTop: '20px' }}>
              <Search size={48} style={{ opacity: 0.25, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
                Start typing to find any card across all your binders.
              </p>
              <p style={{ opacity: 0.55, fontSize: '0.88rem' }}>
                Matches by card name, ≥2 characters. Click a result to jump straight to its binder page.
              </p>
            </div>
          )}

          {error && (
            <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#f87171', marginTop: '20px' }}>
              Couldn&apos;t search your collection. Try again in a moment.
            </div>
          )}

          {showNoResults && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', marginTop: '20px', opacity: 0.7 }}>
              <p>No cards matching <strong>“{debouncedQuery}”</strong> in your collection.</p>
              {game && (
                <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                  Try removing the {GAME_TABS.find(g => g.id === game)?.label} filter to widen the search.
                </p>
              )}
            </div>
          )}

          {!showEmptyHint && results && results.length > 0 && (
            <>
              <div className="collection-summary">
                <span>
                  <strong>{results.length}</strong> card{results.length !== 1 ? 's' : ''} across{' '}
                  <strong>{grouped.length}</strong> binder{grouped.length !== 1 ? 's' : ''}
                </span>
                {totalValue > 0 && (
                  <span className="collection-summary__value">
                    Total value: {symbol}{totalValue.toFixed(2)}
                  </span>
                )}
                {isFetching && <span className="collection-summary__loading">Updating…</span>}
              </div>

              {grouped.map(({ binder, cards }) => (
                <section key={binder.id} className="collection-group">
                  <div className="collection-group__header">
                    <BookOpen size={16} />
                    <h3>{binder.name}</h3>
                    <span className="collection-group__count">
                      {cards.length} match{cards.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="sets-card-grid">
                    {cards.map(card => {
                      const page = pageOfSlot(card.slot_index, binder.rows, binder.cols) + 1;
                      const slotInPage = (card.slot_index % (binder.rows * binder.cols)) + 1;
                      const href = page > 1 ? `/binder/${binder.id}?page=${page - 1}` : `/binder/${binder.id}`;
                      return (
                        <Link
                          key={card.id}
                          href={href}
                          className="sets-browse-card collection-result-card"
                          title={`Jump to ${binder.name}, page ${page}, slot ${slotInPage}`}
                        >
                          {card.card_image_url
                            ? <img src={card.card_image_url} alt={card.card_name} loading="lazy" decoding="async" />
                            : <div style={{ width: '100%', aspectRatio: '2.5/3.5', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Layers size={24} style={{ opacity: 0.3 }} />
                              </div>
                          }
                          <p className="sets-browse-card__name">{card.card_name}</p>
                          {card.card_set && <p className="sets-browse-card__number">{card.card_set}</p>}
                          <p className="collection-result-card__location">
                            <MapPin size={11} />
                            Page {page} · slot {slotInPage}
                          </p>
                          {card.card_price != null
                            ? <p className="sets-browse-card__price">{symbol}{Number(card.card_price).toFixed(2)}</p>
                            : <p className="sets-browse-card__no-price">—</p>
                          }
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
