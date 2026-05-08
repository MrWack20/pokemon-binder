'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Edit2, ChevronLeft, ChevronRight, Filter, X, Search,
  Plus, GripVertical, SortAsc, Clock, LayoutGrid, Columns, Images, Maximize2, Heart, CheckCircle2,
  Download, FileText, FileJson, FileImage, Share2, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportBinderCsv, exportBinderJson } from '../lib/export.js';
import { exportBinderPdf } from '../lib/exportPdf.js';
import ShareBinderModal from './ShareBinderModal.jsx';
import { getRecentSearches } from '../services/searchService.js';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ─── Export menu (CSV / JSON) ─────────────────────────────────────────────────
//
// Tiny dropdown next to "Edit Cover". Two formats — CSV for spreadsheet
// users, JSON for re-import into another PokéBinder instance later. Pure
// client-side; no Supabase round-trip needed (the binder + cards are
// already in memory by the time this menu opens).

function ExportMenu({ binder }) {
  const [open, setOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const ref = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filledCount = (binder.cards || []).filter(c => c && c.id).length;

  async function handlePdfExport() {
    setOpen(false);
    if (pdfBusy) return;
    if (filledCount === 0) {
      toast('This binder is empty — nothing to PDF.', { icon: '📭' });
      return;
    }
    setPdfBusy(true);
    const toastId = toast.loading(`Generating PDF (0/${filledCount})…`);
    try {
      const result = await exportBinderPdf(binder, (done, total) => {
        toast.loading(`Generating PDF (${done}/${total})…`, { id: toastId });
      });
      const skipNote = result.skippedCards > 0
        ? ` (${result.skippedCards} image${result.skippedCards !== 1 ? 's' : ''} couldn't load — placeholders used)`
        : '';
      toast.success(`PDF ready — ${result.totalCards} card${result.totalCards !== 1 ? 's' : ''}${skipNote}`, { id: toastId });
    } catch (err) {
      console.error('exportBinderPdf:', err);
      toast.error('PDF export failed. Try again, or use CSV/JSON for now.', { id: toastId });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(o => !o)}
        title="Export this binder"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pdfBusy}
      >
        <Download size={18} />{pdfBusy ? 'Exporting…' : 'Export'}
      </button>
      {open && (
        <div className="export-menu" role="menu">
          <button
            role="menuitem"
            className="export-menu__item"
            onClick={() => { exportBinderCsv(binder); setOpen(false); }}
          >
            <FileText size={16} />
            <span>
              Export as CSV
              <span className="export-menu__hint">{filledCount} card{filledCount !== 1 ? 's' : ''}, spreadsheet-friendly</span>
            </span>
          </button>
          <button
            role="menuitem"
            className="export-menu__item"
            onClick={() => { exportBinderJson(binder); setOpen(false); }}
          >
            <FileJson size={16} />
            <span>
              Export as JSON
              <span className="export-menu__hint">includes binder layout for re-import</span>
            </span>
          </button>
          <button
            role="menuitem"
            className="export-menu__item"
            onClick={handlePdfExport}
            disabled={pdfBusy}
          >
            <FileImage size={16} />
            <span>
              Export as PDF
              <span className="export-menu__hint">printable A4, one page per binder page</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card slot ────────────────────────────────────────────────────────────────

function CardSlot({ absoluteIndex, card, isSelected, onSelectCell, onRemoveCard, onCardClick, onInspectCard, isDragActive }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: absoluteIndex,
    disabled: !card,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: absoluteIndex });
  const longPressRef = useRef(null);
  const cancelLongPressRef = useRef(null);

  const setRef = useCallback(
    (node) => { setDragRef(node); setDropRef(node); },
    [setDragRef, setDropRef],
  );

  // Clean up on unmount — prevents orphaned window listeners and timers
  useEffect(() => {
    return () => {
      clearTimeout(longPressRef.current);
      cancelLongPressRef.current?.();
    };
  }, []);

  function handlePointerDown(e) {
    if (!card) return;
    const startX = e.clientX, startY = e.clientY;
    longPressRef.current = setTimeout(() => {
      onInspectCard?.(card);
      cancelLongPressRef.current = null;
    }, 450);
    function cancel() {
      clearTimeout(longPressRef.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cancel);
      cancelLongPressRef.current = null;
    }
    function onMove(ev) {
      if (Math.abs(ev.clientX - startX) > 6 || Math.abs(ev.clientY - startY) > 6) cancel();
    }
    cancelLongPressRef.current = cancel;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cancel);
  }

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
      onPointerDown={handlePointerDown}
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
          <img src={card.card_image_url} alt={card.card_name} loading="lazy" decoding="async" />
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

// ─── Grid renderer (shared across page / spread modes) ────────────────────────

function BinderGrid({
  cards, startIndex, rows, cols, selectedCell, onSelectCell,
  onRemoveCard, onCardClick, onInspectCard, isDragActive,
}) {
  return (
    <div
      className="binder-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {cards.map((card, pageIndex) => {
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
            onInspectCard={onInspectCard}
            isDragActive={isDragActive}
          />
        );
      })}
    </div>
  );
}

// ─── BinderView ───────────────────────────────────────────────────────────────

export default function BinderView({
  binder, currentPage, onPageChange, onBack, onEditCover,
  selectedCell, onSelectCell, onRemoveCard, onCardClick, onInspectCard,
  searchQuery, onSearchChange, onSearch, searchResults, loading, onAddCard,
  searchFilters, onFilterChange, sets, showFilters, onToggleFilters,
  searchPage, totalSearchPages, onSearchPageChange, onSwapCards,
  searchSort, onSortChange, currency, searchGame, onGameChange,
  // Wishlist (Phase 4.2): a Set<"<api_id>::<game>"> + a single toggle
  // callback. Both optional so the component still works on /share pages.
  wishlistedKeys, onToggleWishlist,
  // Owned-card cross-reference (Phase 4.2 polish): a Set<card_api_id> of
  // every card already in any of this user's binders. Drives the small
  // "Owned" check badge on search results so the Have/Want signal is
  // visible at a glance.
  ownedApiIds,
}) {
  const slotsPerPage  = binder.rows * binder.cols;
  const totalPages    = binder.pages;
  const filledCards   = binder.cards.filter(c => c).length;

  const [jumpInput, setJumpInput]     = useState('');
  const [activeDragId, setActiveDragId] = useState(null);
  const [viewMode, setViewMode]       = useState('page'); // 'page' | 'spread' | 'gallery'
  const [shareOpen, setShareOpen]     = useState(false);

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£' }[currency] || '$';
  const recentSearches = getRecentSearches();
  const searchIsOpen   = selectedCell !== null;

  // ── Page mode ────────────────────────────────────────────────────────────
  const startIndex       = currentPage * slotsPerPage;
  const currentPageCards = binder.cards.slice(startIndex, startIndex + slotsPerPage);
  const pageValue        = currentPageCards.reduce((s, c) => s + (c?.card_price || 0), 0);

  // ── Adjacent-page image preload ─────────────────────────────────────────
  // Card images are loaded lazily, so flipping to a new page used to mean
  // a network roundtrip per slot. We warm the browser's HTTP cache for
  // pages currentPage ± 1 in the background — by the time the user clicks
  // Next/Prev, those images are already decoded and ready to paint.
  useEffect(() => {
    const adjacentRanges = [];
    if (currentPage + 1 < totalPages) {
      const nextStart = (currentPage + 1) * slotsPerPage;
      adjacentRanges.push([nextStart, nextStart + slotsPerPage]);
    }
    if (currentPage - 1 >= 0) {
      const prevStart = (currentPage - 1) * slotsPerPage;
      adjacentRanges.push([prevStart, prevStart + slotsPerPage]);
    }

    const urls = [];
    for (const [s, e] of adjacentRanges) {
      for (let i = s; i < e; i++) {
        const c = binder.cards[i];
        if (c?.card_image_url) urls.push(c.card_image_url);
      }
    }
    if (!urls.length) return;

    // `new Image()` with a src triggers the same fetch that <img> would,
    // hitting the browser's HTTP cache. We don't append to DOM — the
    // Image object is GC'd once it goes out of scope, after the browser
    // has cached the response.
    const cleanup = [];
    for (const url of urls) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      cleanup.push(img);
    }
    return () => {
      // Best-effort: clear src to allow GC if the page changes again
      // before all preloads finish.
      cleanup.forEach(img => { img.src = ''; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, slotsPerPage, totalPages, binder.id]);

  // ── Spread mode ──────────────────────────────────────────────────────────
  const spreadBase       = Math.floor(currentPage / 2) * 2;
  const leftStart        = spreadBase * slotsPerPage;
  const rightStart       = (spreadBase + 1) * slotsPerPage;
  const leftCards        = binder.cards.slice(leftStart, leftStart + slotsPerPage);
  const rightCards       = binder.cards.slice(rightStart, rightStart + slotsPerPage);
  const spreadTotalSpreads = Math.ceil(totalPages / 2);
  const currentSpread    = Math.floor(spreadBase / 2);
  const spreadValue      = [...leftCards, ...rightCards].reduce((s, c) => s + (c?.card_price || 0), 0);

  // ── Gallery mode ─────────────────────────────────────────────────────────
  const allCards = binder.cards;

  const activeDragCard = activeDragId !== null ? binder.cards[activeDragId] : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart({ active }) { setActiveDragId(active.id); onSelectCell(null); }
  function handleDragEnd({ active, over }) {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    onSwapCards(active.id, over.id);
  }

  function openSearch() {
    const pageEmpty = currentPageCards.findIndex(c => c === null);
    if (pageEmpty !== -1) { onSelectCell(startIndex + pageEmpty); return; }
    const globalEmpty = binder.cards.findIndex(c => c === null);
    if (globalEmpty !== -1) { onSelectCell(globalEmpty); return; }
    onSelectCell(startIndex);
  }

  function handleJump() {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) { onPageChange(n - 1); setJumpInput(''); }
  }

  // Keep latest filters in a ref so the debounce always uses current values
  const filtersRef = useRef(searchFilters);
  useEffect(() => { filtersRef.current = searchFilters; });

  // Auto-search after 300 ms when user types 3+ characters. 300ms is the
  // industry-standard "feels-instant" debounce; 500ms used to feel laggy.
  // Cleanup cancels the pending fire if the user keeps typing — only the
  // final keystroke after the pause triggers the API call.
  useEffect(() => {
    if (!searchIsOpen || !searchQuery.trim() || searchQuery.trim().length < 3) return;
    const t = setTimeout(() => onSearch(searchQuery, filtersRef.current, 1), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchIsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => onSearch(searchQuery, searchFilters, 1);
  const clearFilters  = () => onFilterChange({ set: '', type: '', rarity: '', supertype: '', language: '' });

  return (
    <div className="binder-view-root">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="binder-toolbar">
        <button onClick={onBack} className="back-button" style={{ marginBottom: 0 }}>← Back</button>

        <div className="binder-toolbar__title">
          <h2>{binder.name}</h2>
          <span className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            {filledCards} / {binder.cards.length} cards
          </span>
        </div>

        {/* View mode toggle */}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn${viewMode === 'page' ? ' active' : ''}`}
            onClick={() => setViewMode('page')}
            title="Page view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-mode-btn${viewMode === 'spread' ? ' active' : ''}`}
            onClick={() => setViewMode('spread')}
            title="Two-page spread"
          >
            <Columns size={16} />
          </button>
          <button
            className={`view-mode-btn${viewMode === 'gallery' ? ' active' : ''}`}
            onClick={() => setViewMode('gallery')}
            title="Gallery (all cards)"
          >
            <Images size={16} />
          </button>
        </div>

        <div className="binder-toolbar__actions">
          <button
            className={`btn ${searchIsOpen ? 'btn-secondary' : 'btn-info'}`}
            onClick={searchIsOpen ? () => onSelectCell(null) : openSearch}
          >
            {searchIsOpen ? <X size={18} /> : <Search size={18} />}
            {searchIsOpen ? 'Close' : 'Add Card'}
          </button>
          <button
            className={`btn ${binder.is_public ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setShareOpen(true)}
            title={binder.is_public ? 'Public — manage share link' : 'Share this binder'}
          >
            {binder.is_public ? <Globe size={18} /> : <Share2 size={18} />}
            {binder.is_public ? 'Public' : 'Share'}
          </button>
          <ExportMenu binder={binder} />
          <button className="btn btn-primary" onClick={onEditCover}>
            <Edit2 size={18} />Edit Cover
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="binder-body">
        <div className="binder-main">

          {/* ══ PAGE MODE ══════════════════════════════════════════════════ */}
          {viewMode === 'page' && (
            <>
              <div className="pagination">
                <button className="btn btn-secondary" onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
                  <ChevronLeft size={20} />Prev
                </button>
                <span className="page-indicator">Page {currentPage + 1} / {totalPages}</span>
                <div className="page-jump">
                  <input
                    type="number" className="input page-jump__input"
                    value={jumpInput} min={1} max={totalPages} placeholder="Go to…"
                    onChange={e => setJumpInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJump()}
                  />
                  <button className="btn btn-secondary" onClick={handleJump}>Go</button>
                </div>
                <button className="btn btn-secondary" onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>
                  Next<ChevronRight size={20} />
                </button>
              </div>

              {pageValue > 0 && (
                <div className="page-value-bar">
                  <span className="page-value-bar__label">Page value</span>
                  <span className="page-value-bar__amount">{currencySymbol}{pageValue.toFixed(2)}</span>
                </div>
              )}

              <div className="binder-grid-container view-page">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <BinderGrid
                    cards={currentPageCards} startIndex={startIndex}
                    rows={binder.rows} cols={binder.cols}
                    selectedCell={selectedCell} onSelectCell={onSelectCell}
                    onRemoveCard={onRemoveCard} onCardClick={onCardClick}
                    onInspectCard={onInspectCard}
                    isDragActive={activeDragId !== null}
                  />
                  <DragOverlay>
                    {activeDragCard && (
                      <div style={{ width: '80px', opacity: 0.9, transform: 'rotate(3deg)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.6))' }}>
                        <img src={activeDragCard.card_image_url} alt={activeDragCard.card_name} style={{ width: '100%', borderRadius: '8px' }} />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </div>
            </>
          )}

          {/* ══ SPREAD MODE ════════════════════════════════════════════════ */}
          {viewMode === 'spread' && (
            <>
              <div className="pagination">
                <button className="btn btn-secondary"
                  onClick={() => onPageChange(Math.max(0, spreadBase - 2))}
                  disabled={spreadBase === 0}
                >
                  <ChevronLeft size={20} />Prev
                </button>
                <span className="page-indicator">
                  Pages {spreadBase + 1}–{Math.min(spreadBase + 2, totalPages)} / {totalPages}
                </span>
                <button className="btn btn-secondary"
                  onClick={() => onPageChange(Math.min(totalPages - 1, spreadBase + 2))}
                  disabled={spreadBase + 2 >= totalPages}
                >
                  Next<ChevronRight size={20} />
                </button>
              </div>

              {spreadValue > 0 && (
                <div className="page-value-bar">
                  <span className="page-value-bar__label">Spread value</span>
                  <span className="page-value-bar__amount">{currencySymbol}{spreadValue.toFixed(2)}</span>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="binder-spread">
                  {/* Left page */}
                  <div className="binder-spread__page">
                    <div className="binder-spread__label">Page {spreadBase + 1}</div>
                    <div className="binder-grid-container view-spread">
                      <BinderGrid
                        cards={leftCards} startIndex={leftStart}
                        rows={binder.rows} cols={binder.cols}
                        selectedCell={selectedCell} onSelectCell={onSelectCell}
                        onRemoveCard={onRemoveCard} onCardClick={onCardClick}
                        onInspectCard={onInspectCard}
                        isDragActive={activeDragId !== null}
                      />
                    </div>
                  </div>

                  {/* Spine */}
                  <div className="binder-spread__spine" />

                  {/* Right page */}
                  <div className="binder-spread__page">
                    <div className="binder-spread__label">Page {spreadBase + 2}</div>
                    <div className="binder-grid-container view-spread">
                      {spreadBase + 1 < totalPages ? (
                        <BinderGrid
                          cards={rightCards} startIndex={rightStart}
                          rows={binder.rows} cols={binder.cols}
                          selectedCell={selectedCell} onSelectCell={onSelectCell}
                          onRemoveCard={onRemoveCard} onCardClick={onCardClick}
                          onInspectCard={onInspectCard}
                          isDragActive={activeDragId !== null}
                        />
                      ) : (
                        <div className="binder-spread__empty">End of binder</div>
                      )}
                    </div>
                  </div>
                </div>

                <DragOverlay>
                  {activeDragCard && (
                    <div style={{ width: '80px', opacity: 0.9, transform: 'rotate(3deg)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.6))' }}>
                      <img src={activeDragCard.card_image_url} alt={activeDragCard.card_name} style={{ width: '100%', borderRadius: '8px' }} />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </>
          )}

          {/* ══ GALLERY MODE ═══════════════════════════════════════════════ */}
          {viewMode === 'gallery' && (
            <div className="binder-gallery">
              <p className="binder-gallery__meta">
                {filledCards} card{filledCards !== 1 ? 's' : ''} &middot; total value {currencySymbol}{binder.cards.reduce((s, c) => s + (c?.card_price || 0), 0).toFixed(2)}
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="binder-gallery__grid">
                  {allCards.map((card, absoluteIndex) => card && (
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
                  ))}
                </div>
                <DragOverlay>
                  {activeDragCard && (
                    <div style={{ width: '80px', opacity: 0.9, transform: 'rotate(3deg)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.6))' }}>
                      <img src={activeDragCard.card_image_url} alt={activeDragCard.card_name} style={{ width: '100%', borderRadius: '8px' }} />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          )}

        </div>

        {/* ── Search drawer ─────────────────────────────────────────────── */}
        {searchIsOpen && (
          <aside className="search-drawer">
            <div className="search-drawer__header">
              <div>
                <h3>Search Cards</h3>
                {selectedCell !== null && <span className="slot-badge">Slot {selectedCell + 1}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {searchGame === 'pokemon' && (
                  <button
                    onClick={() => onToggleFilters(!showFilters)}
                    className={`btn btn-secondary icon-btn${showFilters ? ' active' : ''}`}
                    title="Filters (Pokémon only)"
                  >
                    <Filter size={16} />
                  </button>
                )}
                <button onClick={() => onSelectCell(null)} className="btn btn-secondary icon-btn" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Game selector */}
            <div className="game-selector">
              {[
                { id: 'pokemon', label: '🎴 Pokémon' },
                { id: 'mtg',     label: '⚔️ MTG' },
                { id: 'yugioh',  label: '🐉 Yu-Gi-Oh!' },
                { id: 'onepiece', label: '🏴‍☠️ One Piece' },
              ].map(g => (
                <button
                  key={g.id}
                  className={`game-selector__btn${searchGame === g.id ? ' active' : ''}`}
                  onClick={() => onGameChange(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {recentSearches.length > 0 && !searchQuery && (
              <div className="recent-searches">
                <span className="recent-searches__label"><Clock size={12} />Recent</span>
                <div className="recent-searches__chips">
                  {recentSearches.map(term => (
                    <button key={term} className="recent-chip"
                      onClick={() => { onSearchChange(term); onSearch(term, searchFilters, 1); }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="search-bar search-bar--large">
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search by name…"
                className="input search-input-large"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} className="btn btn-info">
                <Search size={18} />Search
              </button>
            </div>

            <div className="drawer-sort" style={{ marginBottom: '12px' }}>
              <SortAsc size={14} style={{ opacity: 0.55, flexShrink: 0 }} />
              <select
                value={searchSort}
                onChange={e => onSortChange(e.target.value)}
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
                    <select value={searchFilters.set} onChange={e => onFilterChange({ ...searchFilters, set: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All Sets</option>
                      {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={searchFilters.type} onChange={e => onFilterChange({ ...searchFilters, type: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All Types</option>
                      {['Colorless','Darkness','Dragon','Fairy','Fighting','Fire','Grass','Lightning','Metal','Psychic','Water'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Supertype</label>
                    <select value={searchFilters.supertype} onChange={e => onFilterChange({ ...searchFilters, supertype: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All</option>
                      <option value="Pokémon">Pokémon</option>
                      <option value="Trainer">Trainer</option>
                      <option value="Energy">Energy</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rarity</label>
                    <select value={searchFilters.rarity} onChange={e => onFilterChange({ ...searchFilters, rarity: e.target.value })} className="input" style={{ marginBottom: 0 }}>
                      <option value="">All</option>
                      {['Common','Uncommon','Rare','Rare Holo','Rare Ultra','Rare Secret'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={clearFilters} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Clear Filters</button>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #4a5568', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Searching…</p>
              </div>
            )}

            {!loading && searchResults.length === 0 && (searchQuery || searchFilters.set || searchFilters.type || searchFilters.rarity || searchFilters.supertype) && (
              <p style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6, fontSize: '0.875rem' }}>No cards found.</p>
            )}

            {!loading && searchResults.length === 0 && !searchQuery && !searchFilters.set && !searchFilters.type && !searchFilters.rarity && !searchFilters.supertype && (
              <p style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5, fontSize: '0.875rem' }}>Type a card name to search.</p>
            )}

            <div className="card-results drawer-results">
              {searchResults.map(card => {
                const p = card._price
                  ?? card.tcgplayer?.prices?.holofoil?.market
                  ?? card.tcgplayer?.prices?.normal?.market
                  ?? card.tcgplayer?.prices?.['1stEditionHolofoil']?.market
                  ?? card.tcgplayer?.prices?.unlimited?.market
                  ?? null;
                const cardGame = card._game ?? 'pokemon';
                const wishlistKey = `${card.id}::${cardGame}`;
                const isWishlisted = wishlistedKeys?.has(wishlistKey) ?? false;
                const isOwned = ownedApiIds?.has(card.id) ?? false;
                return (
                  <div key={card.id} onClick={() => onAddCard(card)} className={`search-card${isOwned ? ' search-card--owned' : ''}`}>
                    {isOwned && (
                      <span className="search-card__owned-badge" aria-label="Already in your collection">
                        <CheckCircle2 size={12} />Owned
                      </span>
                    )}
                    {onToggleWishlist && (
                      <button
                        type="button"
                        className={`search-card__wishlist-btn${isWishlisted ? ' is-active' : ''}`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        onClick={(e) => { e.stopPropagation(); onToggleWishlist(card, isWishlisted); }}
                      >
                        <Heart size={14} fill={isWishlisted ? '#ef4444' : 'none'} />
                      </button>
                    )}
                    <img src={card.images.small} alt={card.name} loading="lazy" decoding="async" />
                    <p>{card.name}</p>
                    <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{card.set.name}</p>
                    {p != null ? <p className="price">${p.toFixed(2)}</p> : null}
                  </div>
                );
              })}
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

      {shareOpen && (
        <ShareBinderModal binder={binder} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
