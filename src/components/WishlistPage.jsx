'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, X, Star, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist, useRemoveFromWishlist, useUpdateWishlistItem } from '@/hooks/queries';

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

const GAME_LABEL = {
  pokemon: '🎴 Pokémon',
  mtg: '⚔️ Magic',
  yugioh: '🐉 Yu-Gi-Oh!',
  onepiece: '🏴‍☠️ One Piece',
};

export default function WishlistPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const { data: items = [], isLoading, error } = useWishlist(profile?.id);
  const removeMut = useRemoveFromWishlist();
  const updateMut = useUpdateWishlistItem();

  // Currency rehydrated from localStorage in an effect (SSR-safe pattern).
  const [currency, setCurrency] = useState('USD');
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}');
      if (parsed.currency) setCurrency(parsed.currency);
    } catch { /* ignore */ }
  }, []);
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  const [filter, setFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('all');

  // Group by game, then sort each group by priority desc, added_at desc.
  const grouped = useMemo(() => {
    const filtered = items.filter(item => {
      if (gameFilter !== 'all' && item.card_game !== gameFilter) return false;
      if (!filter.trim()) return true;
      return item.card_name.toLowerCase().includes(filter.toLowerCase());
    });
    const groups = {};
    for (const item of filtered) {
      const g = item.card_game || 'pokemon';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    }
    return groups;
  }, [items, filter, gameFilter]);

  const totalValue = items.reduce((s, c) => s + (Number(c.card_price) || 0), 0);
  const totalItems = items.length;

  const handleRemove = (item) => {
    removeMut.mutate(
      { wishlistId: item.id, profileId: profile.id, cardApiId: item.card_api_id, cardGame: item.card_game },
      {
        onSuccess: () => toast.success(`Removed ${item.card_name}`),
        onError: () => toast.error('Failed to remove from wishlist.'),
      }
    );
  };

  const togglePriority = (item) => {
    const next = item.priority > 0 ? 0 : 1;
    updateMut.mutate(
      { wishlistId: item.id, profileId: profile.id, updates: { priority: next } },
      { onError: () => toast.error('Failed to update priority.') }
    );
  };

  return (
    <div className="app">
      <div className="container">
        <div className="stats-page">
          {/* Header */}
          <div className="stats-header">
            <button onClick={() => router.push('/')} className="btn btn-secondary">
              <ArrowLeft size={18} />My Binders
            </button>
            <h2><Heart size={24} style={{ verticalAlign: '-4px', marginRight: '8px', color: '#ef4444' }} />Wishlist</h2>
            <div style={{ width: '130px' }} />
          </div>

          {/* Summary */}
          {totalItems > 0 && (
            <div className="stat-cards-row" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="stat-card__icon" style={{ color: '#ef4444' }}><Heart size={24} /></div>
                <div className="stat-card__body">
                  <p className="stat-card__value">{totalItems}</p>
                  <p className="stat-card__label">Cards wanted</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__icon" style={{ color: '#10b981' }}><Star size={24} /></div>
                <div className="stat-card__body">
                  <p className="stat-card__value">{symbol}{totalValue.toFixed(2)}</p>
                  <p className="stat-card__label">Estimated total value</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {totalItems > 0 && (
            <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div className="input-icon-wrap" style={{ flex: 1, minWidth: '220px' }}>
                <Search size={16} className="input-icon" />
                <input
                  type="text"
                  className="input input--icon"
                  placeholder="Filter by card name…"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
              <select
                value={gameFilter}
                onChange={e => setGameFilter(e.target.value)}
                className="input"
                style={{ minWidth: '160px' }}
              >
                <option value="all">All games</option>
                <option value="pokemon">🎴 Pokémon</option>
                <option value="mtg">⚔️ Magic</option>
                <option value="yugioh">🐉 Yu-Gi-Oh!</option>
                <option value="onepiece">🏴‍☠️ One Piece</option>
              </select>
            </div>
          )}

          {/* Loading / error / empty / content */}
          {isLoading && (
            <div className="stats-loading">
              <RefreshCw size={32} className="spinning" />
              <p>Loading your wishlist…</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
              Failed to load wishlist.
            </div>
          )}

          {!isLoading && totalItems === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Heart size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Your wishlist is empty.</p>
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                Open a binder, search for a card, and click the heart icon to add it.
              </p>
            </div>
          )}

          {!isLoading && totalItems > 0 && Object.keys(grouped).length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
              No cards match the filters.
            </div>
          )}

          {/* Grid grouped by game */}
          {Object.entries(grouped).map(([game, gameItems]) => (
            <div key={game} style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '12px', opacity: 0.85, fontSize: '1rem', fontWeight: 600 }}>
                {GAME_LABEL[game] || game} <span style={{ opacity: 0.5, fontWeight: 400 }}>· {gameItems.length}</span>
              </h3>
              <div className="wishlist-grid">
                {gameItems.map(item => (
                  <div key={item.id} className="wishlist-item">
                    {item.card_image_url ? (
                      <img
                        src={item.card_image_url}
                        alt={item.card_name}
                        loading="lazy" decoding="async"
                        className="wishlist-item__img"
                      />
                    ) : (
                      <div className="wishlist-item__img wishlist-item__img--empty" />
                    )}

                    <div className="wishlist-item__body">
                      <p className="wishlist-item__name">{item.card_name}</p>
                      {item.card_set && <p className="wishlist-item__set">{item.card_set}</p>}
                      {item.card_price != null && (
                        <p className="wishlist-item__price">
                          {symbol}{Number(item.card_price).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="wishlist-item__actions">
                      <button
                        type="button"
                        onClick={() => togglePriority(item)}
                        className="wishlist-item__btn"
                        title={item.priority > 0 ? 'Unmark as priority' : 'Mark as priority'}
                        aria-label={item.priority > 0 ? 'Unmark as priority' : 'Mark as priority'}
                        style={{ color: item.priority > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}
                      >
                        <Star size={16} fill={item.priority > 0 ? '#fbbf24' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className="wishlist-item__btn"
                        title="Remove from wishlist"
                        aria-label="Remove from wishlist"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
