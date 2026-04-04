import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { getSets, searchCards } from '../services/searchService.js';
import CardDetailModal from './CardDetailModal.jsx';

function getStoredCurrency() {
  try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; }
  catch { return 'USD'; }
}

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

export default function SetsPage() {
  const navigate = useNavigate();
  const currency = getStoredCurrency();
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');

  const [selectedSet, setSelectedSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardPage, setCardPage] = useState(1);
  const [totalCardPages, setTotalCardPages] = useState(0);
  const [cardSort, setCardSort] = useState('number');

  const [modalCard, setModalCard] = useState(null);

  useEffect(() => {
    getSets().then(({ data }) => {
      setSets(data || []);
      setLoadingSets(false);
    });
  }, []);

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
    setCardPage(1);
    await fetchSetCards(set.id, 1, cardSort);
  }

  async function fetchSetCards(setId, page, sort) {
    setLoadingCards(true);
    const { data } = await searchCards('', { set: setId }, page, sort);
    if (data) {
      setCards(data.results);
      setTotalCardPages(data.totalPages);
    }
    setLoadingCards(false);
  }

  async function handleCardPageChange(page) {
    setCardPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await fetchSetCards(selectedSet.id, page, cardSort);
  }

  async function handleSortChange(sort) {
    setCardSort(sort);
    setCardPage(1);
    if (selectedSet) await fetchSetCards(selectedSet.id, 1, sort);
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

          {/* ── Set list ─────────────────────────────────────────────────── */}
          {!selectedSet && (
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

          {/* ── Set detail: card browser ──────────────────────────────── */}
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
                </div>
                <div className="set-detail-sort">
                  <label style={{ fontSize: '0.8rem', opacity: 0.55 }}>Sort</label>
                  <select
                    value={cardSort}
                    onChange={e => handleSortChange(e.target.value)}
                    className="input"
                    style={{ marginBottom: 0, fontSize: '0.85rem', padding: '6px 10px' }}
                  >
                    <option value="number">Card Number</option>
                    <option value="name">Name A–Z</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="price_asc">Price: Low → High</option>
                  </select>
                </div>
              </div>

              {loadingCards ? (
                <div className="stats-loading">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading cards…</p>
                </div>
              ) : (
                <>
                  <div className="sets-card-grid">
                    {cards.map(card => {
                      const price = card.tcgplayer?.prices?.holofoil?.market
                        ?? card.tcgplayer?.prices?.normal?.market
                        ?? card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
                        ?? card.tcgplayer?.prices?.unlimited?.market;
                      return (
                        <div key={card.id} className="sets-browse-card" onClick={() => setModalCard(card)}>
                          <img src={card.images.small} alt={card.name} loading="lazy" />
                          <p className="sets-browse-card__name">{card.name}</p>
                          <p className="sets-browse-card__number">#{card.number}</p>
                          {price != null
                            ? <p className="sets-browse-card__price">{symbol}{price.toFixed(2)}</p>
                            : <p className="sets-browse-card__no-price">No price</p>
                          }
                        </div>
                      );
                    })}
                  </div>

                  {totalCardPages > 1 && (
                    <div className="sets-card-pagination">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleCardPageChange(Math.max(1, cardPage - 1))}
                        disabled={cardPage === 1}
                      >
                        <ChevronLeft size={18} />Prev
                      </button>
                      <span className="page-indicator" style={{ minWidth: 'unset' }}>
                        Page {cardPage} / {totalCardPages}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleCardPageChange(Math.min(totalCardPages, cardPage + 1))}
                        disabled={cardPage === totalCardPages}
                      >
                        Next<ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
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
