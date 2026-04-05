import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, RefreshCw, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getSets, getSetCards } from '../services/searchService.js';
import { getOwnedApiIds } from '../services/cardService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import CardDetailModal from './CardDetailModal.jsx';

function getStoredCurrency() {
  try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; }
  catch { return 'USD'; }
}

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

export default function SetsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const currency = getStoredCurrency();
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  // Set list state
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [language, setLanguage] = useState('english'); // 'english' | 'japanese'

  // Card browsing state
  const [selectedSet, setSelectedSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardSort, setCardSort] = useState('number');

  // Ownership tracking
  const [ownedIds, setOwnedIds] = useState(new Set());

  const [modalCard, setModalCard] = useState(null);

  useEffect(() => {
    getSets().then(({ data }) => {
      setSets(data || []);
      setLoadingSets(false);
    });
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    getOwnedApiIds(profile.id).then(({ data }) => {
      if (data) setOwnedIds(data);
    });
  }, [profile?.id]);

  const seriesList = useMemo(() => {
    const seen = new Set();
    sets.forEach(s => { if (s.series) seen.add(s.series); });
    return [...seen].sort();
  }, [sets]);

  const filteredSets = useMemo(() => {
    let result = sets;
    if (seriesFilter) result = result.filter(s => s.series === seriesFilter);
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [sets, nameFilter, seriesFilter]);

  async function openSet(set) {
    setSelectedSet(set);
    setCards([]);
    setLoadingCards(true);
    const { data } = await getSetCards(set.id, cardSort);
    setCards(data || []);
    setLoadingCards(false);
  }

  async function handleSortChange(sort) {
    setCardSort(sort);
    if (!selectedSet) return;
    setLoadingCards(true);
    const { data } = await getSetCards(selectedSet.id, sort);
    setCards(data || []);
    setLoadingCards(false);
  }

  function handleBack() {
    if (selectedSet) { setSelectedSet(null); setCards([]); }
    else navigate('/');
  }

  return (
    <div className="app">
      <div className="container">
        <div className="sets-page">

          {/* Header */}
          <div className="stats-header">
            <button onClick={handleBack} className="btn btn-secondary">
              <ArrowLeft size={18} />
              {selectedSet ? 'All Sets' : 'My Binders'}
            </button>
            <h2>{selectedSet ? selectedSet.name : 'Browse Sets'}</h2>
            <div style={{ width: '130px' }} />
          </div>

          {/* ── Language toggle ─────────────────────────────────────────── */}
          {!selectedSet && (
            <div className="sets-lang-toggle">
              <button
                className={`sets-lang-btn${language === 'english' ? ' active' : ''}`}
                onClick={() => setLanguage('english')}
              >
                English TCG
              </button>
              <button
                className={`sets-lang-btn${language === 'japanese' ? ' active' : ''}`}
                onClick={() => setLanguage('japanese')}
              >
                Japanese TCG
              </button>
            </div>
          )}

          {/* ── Japanese placeholder ─────────────────────────────────────── */}
          {!selectedSet && language === 'japanese' && (
            <div className="sets-jp-notice">
              <AlertCircle size={20} style={{ flexShrink: 0, color: '#fbbf24' }} />
              <div>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>Japanese sets coming soon</p>
                <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>
                  The current data source (pokemontcg.io) only covers the English TCG.
                  Japanese set integration requires a separate data source and is planned for a future update.
                </p>
              </div>
            </div>
          )}

          {/* ── English set list ─────────────────────────────────────────── */}
          {!selectedSet && language === 'english' && (
            <>
              <div className="sets-controls">
                <div className="sets-search-wrap">
                  <Search size={16} className="sets-search-icon" />
                  <input
                    type="text"
                    value={nameFilter}
                    onChange={e => setNameFilter(e.target.value)}
                    placeholder="Search sets by name…"
                    className="input sets-search-input"
                  />
                  {nameFilter && (
                    <button onClick={() => setNameFilter('')} className="sets-clear-btn">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  value={seriesFilter}
                  onChange={e => setSeriesFilter(e.target.value)}
                  className="input sets-series-select"
                >
                  <option value="">All Series</option>
                  {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {loadingSets ? (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading sets…</p>
                </div>
              ) : (
                <>
                  <p className="sets-count">{filteredSets.length} set{filteredSets.length !== 1 ? 's' : ''}</p>
                  <div className="sets-grid">
                    {filteredSets.map(set => (
                      <div key={set.id} className="set-card" onClick={() => openSet(set)}>
                        <div className="set-card__logo-wrap">
                          {set.images?.logo
                            ? <img src={set.images.logo} alt={set.name} className="set-card__logo" />
                            : <Layers size={36} style={{ opacity: 0.4 }} />
                          }
                        </div>
                        <div className="set-card__info">
                          <p className="set-card__name">{set.name}</p>
                          <p className="set-card__series">{set.series}</p>
                          <div className="set-card__meta">
                            <span>{set.printedTotal ?? set.total} cards</span>
                            <span>{set.releaseDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Set detail: all cards ─────────────────────────────────────── */}
          {selectedSet && (
            <>
              <div className="set-detail-banner">
                {selectedSet.images?.logo && (
                  <img src={selectedSet.images.logo} alt={selectedSet.name} className="set-detail-logo" />
                )}
                <div className="set-detail-info">
                  <p className="set-detail-series">{selectedSet.series}</p>
                  <p className="set-detail-meta">
                    {selectedSet.printedTotal ?? selectedSet.total} cards &middot; Released {selectedSet.releaseDate}
                  </p>
                  {ownedIds.size > 0 && cards.length > 0 && (() => {
                    const ownedCount = cards.filter(c => ownedIds.has(c.id)).length;
                    const total = selectedSet.printedTotal ?? selectedSet.total;
                    return ownedCount > 0 ? (
                      <p className="set-detail-owned">
                        <CheckCircle2 size={14} />
                        {ownedCount} / {total} owned ({Math.round(ownedCount / total * 100)}%)
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="set-detail-sort">
                  <label style={{ fontSize: '0.8rem', opacity: 0.55, whiteSpace: 'nowrap' }}>Sort by</label>
                  <select
                    value={cardSort}
                    onChange={e => handleSortChange(e.target.value)}
                    className="input"
                    style={{ marginBottom: 0, fontSize: '0.85rem', padding: '6px 10px' }}
                  >
                    <option value="number">Number 1 → 250</option>
                    <option value="-number">Number 250 → 1</option>
                    <option value="name">Name A → Z</option>
                    <option value="-name">Name Z → A</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="price_asc">Price: Low → High</option>
                  </select>
                </div>
              </div>

              {loadingCards ? (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading {selectedSet.printedTotal ?? selectedSet.total} cards…</p>
                </div>
              ) : (
                <div className="sets-card-grid">
                  {cards.map(card => {
                    const price = card.tcgplayer?.prices?.holofoil?.market
                      ?? card.tcgplayer?.prices?.normal?.market
                      ?? card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
                      ?? card.tcgplayer?.prices?.unlimited?.market;
                    const owned = ownedIds.has(card.id);
                    return (
                      <div key={card.id} className={`sets-browse-card${owned ? ' sets-browse-card--owned' : ''}`} onClick={() => setModalCard(card)}>
                        {owned && <span className="sets-browse-card__owned-badge"><CheckCircle2 size={12} />Owned</span>}
                        <img src={card.images.small} alt={card.name} loading="lazy" />
                        <p className="sets-browse-card__name">{card.name}</p>
                        <p className="sets-browse-card__number">#{card.number}</p>
                        {price != null
                          ? <p className="sets-browse-card__price">{symbol}{price.toFixed(2)}</p>
                          : <p className="sets-browse-card__no-price">—</p>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {modalCard && (
        <CardDetailModal
          card={modalCard}
          currency={currency}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
