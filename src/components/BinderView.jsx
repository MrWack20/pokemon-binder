import React, { useState, useCallback } from 'react';
import { Edit2, ChevronLeft, ChevronRight, Filter, X, Search, Plus, GripVertical, SortAsc, Clock } from 'lucide-react';
import { getRecentSearches } from '../services/searchService.js';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ─── Card slot ────────────────────────────────────────────────────────────────

function CardSlot({ absoluteIndex, card, isSelected, onSelectCell, onRemoveCard, onCardClick, isDragActive }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: absoluteIndex,
    disabled: !card,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: absoluteIndex });

  const setRef = useCallback(
    (node) => { setDragRef(node); setDropRef(node); },
    [setDragRef, setDropRef],
  );

  function handleClick() {
    if (isDragActive) return;
    if (card) { onCardClick?.(card); }
    else { onSelectCell(absoluteIndex); }
  }

  return (
    <div
      ref={setRef}
      {...(card ? attributes : {})}
      {...(card ? listeners : {})}
      onClick={handleClick}
      className={[
        'card-slot',
        card ? 'filled' : 'empty',
        isSelected ? 'selected' : '',
        isDragging ? 'dragging' : '',
        isOver && !isDragging ? 'drag-over' : '',
      ].filter(Boolean).join(' ')}
      style={{ cursor: card ? (isDragging ? 'grabbing' : 'grab') : 'pointer', touchAction: 'none' }}
    >
      {card ? (
        <div className="card-container">
          <GripVertical size={16} className="drag-handle" />
          <img src={card.card_image_url} alt={card.card_name} loading="lazy" />
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveCard(absoluteIndex); }}
            className="remove-btn"
            style={{ touchAction: 'auto' }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <Plus size={28} style={{ opacity: 0.35 }} />
      )}
    </div>
  );
}

// ─── BinderView ───────────────────────────────────────────────────────────────

export default function BinderView({
  binder, currentPage, onPageChange, onBack, onEditCover, selectedCell, onSelectCell,
  onRemoveCard, onCardClick, searchQuery, onSearchChange, onSearch, searchResults, loading, onAddCard,
  searchFilters, onFilterChange, sets, showFilters, onToggleFilters, searchPage, totalSearchPages,
  onSearchPageChange, onSwapCards, searchSort, onSortChange, currency,
}) {
  const slotsPerPage = binder.rows * binder.cols;
  const startIndex = currentPage * slotsPerPage;
  const currentPageCards = binder.cards.slice(startIndex, startIndex + slotsPerPage);
  const totalPages = binder.pages;
  const filledCards = binder.cards.filter(c => c).length;

  const [jumpInput, setJumpInput] = useState('');
  const [activeDragId, setActiveDragId] = useState(null);

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£' }[currency] || '$';
  const pageValue = currentPageCards.reduce((sum, c) => sum + (c?.card_price || 0), 0);
  const recentSearches = getRecentSearches();
  const activeDragCard = activeDragId !== null ? binder.cards[activeDragId] : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart({ active }) {
    setActiveDragId(active.id);
    onSelectCell(null);
  }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    onSwapCards(active.id, over.id);
  }

  // Find next empty slot — current page first, then whole binder
  function openSearch() {
    const pageEmpty = currentPageCards.findIndex(c => c === null);
    if (pageEmpty !== -1) { onSelectCell(startIndex + pageEmpty); return; }
    const globalEmpty = binder.cards.findIndex(c => c === null);
    if (globalEmpty !== -1) { onSelectCell(globalEmpty); return; }
    // Binder full — open panel on current first slot anyway so user can search
    onSelectCell(startIndex);
  }

  function handleJump() {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n - 1);
      setJumpInput('');
    }
  }

  const handleSearch = () => onSearch(searchQuery, searchFilters, 1);
  const clearFilters = () => onFilterChange({ set: '', type: '', rarity: '', supertype: '', language: '' });
  const searchIsOpen = selectedCell !== null;

  return (
    <div className="binder-view-root">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="binder-toolbar">
        <button onClick={onBack} className="back-button" style={{ marginBottom: 0 }}>← Back</button>
        <div className="binder-toolbar__title">
          <h2>{binder.name}</h2>
          <span className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            {filledCards} / {binder.cards.length} cards filled
          </span>
        </div>
        <div className="binder-toolbar__actions">
          <button
            className={`btn ${searchIsOpen ? 'btn-secondary' : 'btn-info'}`}
            onClick={searchIsOpen ? () => onSelectCell(null) : openSearch}
          >
            {searchIsOpen ? <X size={18} /> : <Search size={18} />}
            {searchIsOpen ? 'Close Search' : 'Add Card'}
          </button>
          <button className="btn btn-primary" onClick={onEditCover}>
            <Edit2 size={18} />Edit Cover
          </button>
        </div>
      </div>

      {/* ── Body: grid + optional search drawer ─────────────────────────────── */}
      <div className="binder-body">

        {/* Left: pagination + grid */}
        <div className="binder-main">

          <div className="pagination">
            <button
              className="btn btn-secondary"
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft size={20} />Prev
            </button>

            <span className="page-indicator">Page {currentPage + 1} / {totalPages}</span>

            <div className="page-jump">
              <input
                type="number"
                className="input page-jump__input"
                value={jumpInput}
                min={1}
                max={totalPages}
                placeholder="Go to…"
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              />
              <button className="btn btn-secondary" onClick={handleJump}>Go</button>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next<ChevronRight size={20} />
            </button>
          </div>

          {pageValue > 0 && (
            <div className="page-value-bar">
              <span className="page-value-bar__label">Page value</span>
              <span className="page-value-bar__amount">{currencySymbol}{pageValue.toFixed(2)}</span>
            </div>
          )}

          <div className="binder-grid-container">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div
                className="binder-grid"
                style={{
                  gridTemplateColumns: `repeat(${binder.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${binder.rows}, 1fr)`,
                }}
              >
                {currentPageCards.map((card, pageIndex) => {
                  const absoluteIndex = startIndex + pageIndex;
                  return (
                    <CardSlot
                      key={absoluteIndex}
                      absoluteIndex={absoluteIndex}
                      card={card}
                      isSelected={selectedCell === absoluteIndex}
                      onSelectCell={onSelectCell}
                      onRemoveCard={onRemoveCard}
                      onCardClick={onCardClick}
                      isDragActive={activeDragId !== null}
                    />
                  );
                })}
              </div>

              <DragOverlay>
                {activeDragCard ? (
                  <div style={{ width: '80px', opacity: 0.9, transform: 'rotate(3deg)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.6))' }}>
                    <img src={activeDragCard.card_image_url} alt={activeDragCard.card_name} style={{ width: '100%', borderRadius: '8px' }} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* Right: search drawer */}
        {searchIsOpen && (
          <aside className="search-drawer">

            <div className="search-drawer__header">
              <div>
                <h3>Search Cards</h3>
                {selectedCell !== null && (
                  <span className="slot-badge">Slot {selectedCell + 1}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onToggleFilters(!showFilters)}
                  className={`btn btn-secondary icon-btn${showFilters ? ' active' : ''}`}
                  title="Filters"
                >
                  <Filter size={16} />
                </button>
                <button onClick={() => onSelectCell(null)} className="btn btn-secondary icon-btn" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {recentSearches.length > 0 && !searchQuery && (
              <div className="recent-searches">
                <span className="recent-searches__label"><Clock size={12} />Recent</span>
                <div className="recent-searches__chips">
                  {recentSearches.map(term => (
                    <button
                      key={term}
                      className="recent-chip"
                      onClick={() => { onSearchChange(term); onSearch(term, searchFilters, 1); }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="search-bar" style={{ marginBottom: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name…"
                className="input"
                style={{ marginBottom: 0 }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} className="btn btn-info" style={{ flexShrink: 0 }}>
                <Search size={18} />
              </button>
            </div>

            <div className="drawer-sort" style={{ marginBottom: '12px' }}>
              <SortAsc size={14} style={{ opacity: 0.55, flexShrink: 0 }} />
              <select
                value={searchSort}
                onChange={(e) => onSortChange(e.target.value)}
                className="input drawer-sort__select"
              >
                <option value="">Newest Set</option>
                <option value="name">Name A–Z</option>
                <option value="number">Card Number</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="price_asc">Price: Low → High</option>
              </select>
            </div>

            {showFilters && (
              <div className="filters-panel" style={{ marginBottom: '12px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Set</label>
                    <select value={searchFilters.set} onChange={(e) => onFilterChange({ ...searchFilters, set: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All Sets</option>
                      {sets.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={searchFilters.type} onChange={(e) => onFilterChange({ ...searchFilters, type: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All Types</option>
                      <option value="Colorless">Colorless</option>
                      <option value="Darkness">Darkness</option>
                      <option value="Dragon">Dragon</option>
                      <option value="Fairy">Fairy</option>
                      <option value="Fighting">Fighting</option>
                      <option value="Fire">Fire</option>
                      <option value="Grass">Grass</option>
                      <option value="Lightning">Lightning</option>
                      <option value="Metal">Metal</option>
                      <option value="Psychic">Psychic</option>
                      <option value="Water">Water</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Supertype</label>
                    <select value={searchFilters.supertype} onChange={(e) => onFilterChange({ ...searchFilters, supertype: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All</option>
                      <option value="Pokémon">Pokémon</option>
                      <option value="Trainer">Trainer</option>
                      <option value="Energy">Energy</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rarity</label>
                    <select value={searchFilters.rarity} onChange={(e) => onFilterChange({ ...searchFilters, rarity: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All</option>
                      <option value="Common">Common</option>
                      <option value="Uncommon">Uncommon</option>
                      <option value="Rare">Rare</option>
                      <option value="Rare Holo">Rare Holo</option>
                      <option value="Rare Ultra">Rare Ultra</option>
                      <option value="Rare Secret">Rare Secret</option>
                    </select>
                  </div>
                </div>
                <button onClick={clearFilters} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Clear Filters
                </button>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #4a5568', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Searching…</p>
              </div>
            )}

            {!loading && searchResults.length === 0 && (searchQuery || searchFilters.set || searchFilters.type || searchFilters.rarity || searchFilters.supertype) && (
              <p style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6, fontSize: '0.875rem' }}>
                No cards found. Try different terms.
              </p>
            )}

            {!loading && searchResults.length === 0 && !searchQuery && !searchFilters.set && !searchFilters.type && !searchFilters.rarity && !searchFilters.supertype && (
              <p style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5, fontSize: '0.875rem' }}>
                Type a card name to search.
              </p>
            )}

            <div className="card-results drawer-results">
              {searchResults.map(card => (
                <div key={card.id} onClick={() => onAddCard(card)} className="search-card">
                  <img src={card.images.small} alt={card.name} loading="lazy" />
                  <p>{card.name}</p>
                  <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{card.set.name}</p>
                  {(() => {
                    const p = card.tcgplayer?.prices?.holofoil?.market
                      ?? card.tcgplayer?.prices?.normal?.market
                      ?? card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
                      ?? card.tcgplayer?.prices?.unlimited?.market;
                    return p ? <p className="price">${p.toFixed(2)}</p> : null;
                  })()}
                </div>
              ))}
            </div>

            {totalSearchPages > 1 && (
              <div className="drawer-pagination">
                <button className="btn btn-secondary icon-btn" onClick={() => onSearchPageChange(Math.max(1, searchPage - 1))} disabled={searchPage === 1}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.85rem' }}>{searchPage} / {totalSearchPages}</span>
                <button className="btn btn-secondary icon-btn" onClick={() => onSearchPageChange(Math.min(totalSearchPages, searchPage + 1))} disabled={searchPage === totalSearchPages}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
