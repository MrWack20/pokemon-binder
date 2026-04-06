import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, RefreshCw, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getSets, getSetCards } from '../services/searchService.js';
import { searchMtgCards } from '../services/mtgService.js';
import { searchYgoCards } from '../services/yugiohService.js';
import { getOpSets, getOpSetCards } from '../services/onepieceService.js';
import { getOwnedApiIds } from '../services/cardService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import CardDetailModal from './CardDetailModal.jsx';

function getStoredCurrency() {
  try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; }
  catch { return 'USD'; }
}

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

const GAME_TABS = [
  { id: 'pokemon',  label: '🎴 Pokémon',   hasSetBrowser: true  },
  { id: 'mtg',      label: '⚔️ MTG',       hasSetBrowser: false },
  { id: 'yugioh',   label: '🐉 Yu-Gi-Oh!', hasSetBrowser: false },
  { id: 'onepiece', label: '🏴‍☠️ One Piece', hasSetBrowser: true  },
];

export default function SetsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const currency = getStoredCurrency();
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  const [activeGame, setActiveGame] = useState('pokemon');

  // Pokémon set state
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardSort, setCardSort] = useState('number');

  // One Piece set state
  const [opSets, setOpSets] = useState([]);
  const [loadingOpSets, setLoadingOpSets] = useState(false);
  const [opNameFilter, setOpNameFilter] = useState('');
  const [selectedOpSet, setSelectedOpSet] = useState(null);
  const [opCards, setOpCards] = useState([]);
  const [loadingOpCards, setLoadingOpCards] = useState(false);

  // MTG/YGO search state (these don't have a "sets" browser — use search)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);

  // Ownership tracking
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [modalCard, setModalCard] = useState(null);

  // ── Load Pokémon sets on mount ──────────────────────────────────────────
  useEffect(() => {
    getSets().then(({ data }) => {
      setSets(data || []);
      setLoadingSets(false);
    });
  }, []);

  // ── Load One Piece sets when tab is first opened ────────────────────────
  useEffect(() => {
    if (activeGame !== 'onepiece' || opSets.length > 0) return;
    setLoadingOpSets(true);
    getOpSets().then(({ data }) => {
      setOpSets(data || []);
      setLoadingOpSets(false);
    });
  }, [activeGame, opSets.length]);

  // ── Ownership tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    getOwnedApiIds(profile.id).then(({ data }) => {
      if (data) setOwnedIds(data);
    });
  }, [profile?.id]);

  // ── Pokémon filtering ──────────────────────────────────────────────────
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

  // ── One Piece filtering ────────────────────────────────────────────────
  const filteredOpSets = useMemo(() => {
    if (!opNameFilter.trim()) return opSets;
    const q = opNameFilter.toLowerCase();
    return opSets.filter(s => s.name.toLowerCase().includes(q));
  }, [opSets, opNameFilter]);

  // ── Pokémon set card browsing ──────────────────────────────────────────
  async function openPkmnSet(set) {
    setSelectedSet(set);
    setCards([]);
    setLoadingCards(true);
    const { data } = await getSetCards(set.id, cardSort);
    setCards(data || []);
    setLoadingCards(false);
  }

  async function handlePkmnSortChange(sort) {
    setCardSort(sort);
    if (!selectedSet) return;
    setLoadingCards(true);
    const { data } = await getSetCards(selectedSet.id, sort);
    setCards(data || []);
    setLoadingCards(false);
  }

  // ── One Piece set card browsing ────────────────────────────────────────
  async function openOpSet(set) {
    setSelectedOpSet(set);
    setOpCards([]);
    setLoadingOpCards(true);
    const { data } = await getOpSetCards(set.id);
    setOpCards(data || []);
    setLoadingOpCards(false);
  }

  // ── MTG/YGO search ────────────────────────────────────────────────────
  const handleGameSearch = useCallback(async (query, page = 1) => {
    if (!query?.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    let result;
    if (activeGame === 'mtg') {
      result = await searchMtgCards(query, page);
    } else {
      result = await searchYgoCards(query, page);
    }
    const { data } = result || {};
    if (data) {
      setSearchResults(data.results || []);
      setSearchTotalPages(data.totalPages || 0);
      setSearchPage(page);
    }
    setSearchLoading(false);
  }, [activeGame]);

  // ── Navigation ────────────────────────────────────────────────────────
  function handleBack() {
    if (selectedSet) { setSelectedSet(null); setCards([]); }
    else if (selectedOpSet) { setSelectedOpSet(null); setOpCards([]); }
    else navigate('/');
  }

  function handleTabChange(gameId) {
    setActiveGame(gameId);
    setSelectedSet(null);
    setSelectedOpSet(null);
    setCards([]);
    setOpCards([]);
    setSearchQuery('');
    setSearchResults([]);
    setSearchPage(1);
    setSearchTotalPages(0);
  }

  const isInSetDetail = selectedSet || selectedOpSet;
  const backLabel = isInSetDetail ? 'All Sets' : 'My Binders';

  return (
    <div className="app">
      <div className="container">
        <div className="sets-page">

          {/* Header */}
          <div className="stats-header">
            <button onClick={handleBack} className="btn btn-secondary">
              <ArrowLeft size={18} />
              {backLabel}
            </button>
            <h2>
              {selectedSet ? selectedSet.name
                : selectedOpSet ? selectedOpSet.name
                : 'Browse Sets & Cards'}
            </h2>
            <div style={{ width: '130px' }} />
          </div>

          {/* ── Game tabs ─────────────────────────────────────────────── */}
          {!isInSetDetail && (
            <div className="sets-game-tabs">
              {GAME_TABS.map(g => (
                <button
                  key={g.id}
                  className={`sets-game-tab${activeGame === g.id ? ' active' : ''}`}
                  onClick={() => handleTabChange(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── POKÉMON TAB ────────────────────────────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeGame === 'pokemon' && !selectedSet && (
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
                      <div key={set.id} className="set-card" onClick={() => openPkmnSet(set)}>
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

          {/* ── Pokémon set detail ──────────────────────────────────── */}
          {activeGame === 'pokemon' && selectedSet && (
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
                    onChange={e => handlePkmnSortChange(e.target.value)}
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

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── MTG / YU-GI-OH TAB (search-based) ─────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {(activeGame === 'mtg' || activeGame === 'yugioh') && (
            <>
              <div className="sets-controls">
                <div className="sets-search-wrap" style={{ flex: 1 }}>
                  <Search size={16} className="sets-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={activeGame === 'mtg' ? 'Search MTG cards by name…' : 'Search Yu-Gi-Oh! cards by name…'}
                    className="input sets-search-input"
                    onKeyDown={e => e.key === 'Enter' && handleGameSearch(searchQuery)}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="sets-clear-btn">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button onClick={() => handleGameSearch(searchQuery)} className="btn btn-info">
                  <Search size={16} />Search
                </button>
              </div>

              {!searchLoading && searchResults.length === 0 && !searchQuery && (
                <div className="sets-empty-state">
                  <Search size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p style={{ opacity: 0.5, fontSize: '0.95rem' }}>
                    Search for {activeGame === 'mtg' ? 'Magic: The Gathering' : 'Yu-Gi-Oh!'} cards by name
                  </p>
                </div>
              )}

              {searchLoading && (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Searching…</p>
                </div>
              )}

              {!searchLoading && searchResults.length === 0 && searchQuery && (
                <p style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>No cards found.</p>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <>
                  <p className="sets-count">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                  <div className="sets-card-grid">
                    {searchResults.map(card => {
                      const owned = ownedIds.has(card.id);
                      return (
                        <div key={card.id} className={`sets-browse-card${owned ? ' sets-browse-card--owned' : ''}`} onClick={() => setModalCard(card)}>
                          {owned && <span className="sets-browse-card__owned-badge"><CheckCircle2 size={12} />Owned</span>}
                          <img src={card.images?.small || card.images?.large} alt={card.name} loading="lazy" />
                          <p className="sets-browse-card__name">{card.name}</p>
                          {card.set?.name && <p className="sets-browse-card__number">{card.set.name}</p>}
                          {card._price != null
                            ? <p className="sets-browse-card__price">{symbol}{card._price.toFixed(2)}</p>
                            : <p className="sets-browse-card__no-price">—</p>
                          }
                        </div>
                      );
                    })}
                  </div>

                  {searchTotalPages > 1 && (
                    <div className="sets-pagination">
                      <button
                        className="btn btn-secondary"
                        disabled={searchPage <= 1}
                        onClick={() => handleGameSearch(searchQuery, searchPage - 1)}
                      >
                        ← Prev
                      </button>
                      <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                        Page {searchPage} / {searchTotalPages}
                      </span>
                      <button
                        className="btn btn-secondary"
                        disabled={searchPage >= searchTotalPages}
                        onClick={() => handleGameSearch(searchQuery, searchPage + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── ONE PIECE TAB (set browser) ────────────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeGame === 'onepiece' && !selectedOpSet && (
            <>
              <div className="sets-controls">
                <div className="sets-search-wrap">
                  <Search size={16} className="sets-search-icon" />
                  <input
                    type="text"
                    value={opNameFilter}
                    onChange={e => setOpNameFilter(e.target.value)}
                    placeholder="Search One Piece sets…"
                    className="input sets-search-input"
                  />
                  {opNameFilter && (
                    <button onClick={() => setOpNameFilter('')} className="sets-clear-btn">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {loadingOpSets ? (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading One Piece sets…</p>
                </div>
              ) : filteredOpSets.length === 0 ? (
                <div className="sets-empty-state">
                  <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ opacity: 0.5 }}>No sets found</p>
                </div>
              ) : (
                <>
                  <p className="sets-count">{filteredOpSets.length} set{filteredOpSets.length !== 1 ? 's' : ''}</p>
                  <div className="sets-grid">
                    {filteredOpSets.map(set => (
                      <div key={set.id} className="set-card" onClick={() => openOpSet(set)}>
                        <div className="set-card__logo-wrap">
                          <Layers size={36} style={{ opacity: 0.4 }} />
                        </div>
                        <div className="set-card__info">
                          <p className="set-card__name">{set.name}</p>
                          {set.total > 0 && (
                            <div className="set-card__meta">
                              <span>{set.total} cards</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── One Piece set detail ────────────────────────────────── */}
          {activeGame === 'onepiece' && selectedOpSet && (
            <>
              <div className="set-detail-banner">
                <div className="set-detail-info">
                  <p className="set-detail-series">One Piece TCG</p>
                  <p className="set-detail-meta">{selectedOpSet.name}</p>
                </div>
              </div>

              {loadingOpCards ? (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading cards…</p>
                </div>
              ) : opCards.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>No cards found in this set.</p>
              ) : (
                <div className="sets-card-grid">
                  {opCards.map(card => {
                    const owned = ownedIds.has(card.id);
                    return (
                      <div key={card.id} className={`sets-browse-card${owned ? ' sets-browse-card--owned' : ''}`} onClick={() => setModalCard(card)}>
                        {owned && <span className="sets-browse-card__owned-badge"><CheckCircle2 size={12} />Owned</span>}
                        {card.images?.small
                          ? <img src={card.images.small} alt={card.name} loading="lazy" />
                          : <div style={{ width: '100%', aspectRatio: '2.5/3.5', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={24} style={{ opacity: 0.3 }} /></div>
                        }
                        <p className="sets-browse-card__name">{card.name}</p>
                        {card.number && <p className="sets-browse-card__number">{card.number}</p>}
                        {card._price != null
                          ? <p className="sets-browse-card__price">{symbol}{card._price.toFixed(2)}</p>
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
