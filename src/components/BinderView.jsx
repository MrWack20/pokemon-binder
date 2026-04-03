import React from 'react';
import { Edit2, ChevronLeft, ChevronRight, Filter, X, Search, Plus, GripVertical } from 'lucide-react';

export default function BinderView({
  binder, currentPage, onPageChange, onBack, onEditCover, selectedCell, onSelectCell,
  onRemoveCard, searchQuery, onSearchChange, onSearch, searchResults, loading, onAddCard,
  searchFilters, onFilterChange, sets, showFilters, onToggleFilters, searchPage, totalSearchPages,
  onSearchPageChange, draggedCard, onDragStart, onDragEnd, onSwapCards
}) {
  const slotsPerPage = binder.rows * binder.cols;
  const startIndex = currentPage * slotsPerPage;
  const endIndex = startIndex + slotsPerPage;
  const currentPageCards = binder.cards.slice(startIndex, endIndex);
  const totalPages = binder.pages;
  const filledCards = binder.cards.filter(c => c).length;

  const handleSearch = () => onSearch(searchQuery, searchFilters, 1);

  const clearFilters = () => onFilterChange({ set: '', type: '', rarity: '', supertype: '', language: '' });

  const handleDragStart = (e, pageIndex) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(startIndex + pageIndex);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, pageIndex) => {
    e.preventDefault();
    const absoluteToIndex = startIndex + pageIndex;
    if (draggedCard !== null && draggedCard !== absoluteToIndex) {
      onSwapCards(draggedCard, absoluteToIndex);
    }
    onDragEnd();
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <button onClick={onBack} className="back-button">← Back to Binders</button>
          <h2>{binder.name}</h2>
          <p className="text-muted" style={{ marginTop: '5px' }}>
            Page {currentPage + 1} of {totalPages} · {filledCards}/{binder.cards.length} cards filled
          </p>
        </div>
        <button className="btn btn-primary" onClick={onEditCover}>
          <Edit2 size={20} />
          Edit Cover
        </button>
      </div>

      <div className="pagination">
        <button className="btn btn-secondary" onClick={() => onPageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
          <ChevronLeft size={20} />Previous
        </button>
        <span className="page-indicator">Page {currentPage + 1} / {totalPages}</span>
        <button className="btn btn-secondary" onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>
          Next<ChevronRight size={20} />
        </button>
      </div>

      {selectedCell !== null && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <div className="section-header">
            <h3>Search Pokemon Cards</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => onToggleFilters(!showFilters)} className="btn btn-secondary">
                <Filter size={20} />{showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button onClick={() => onSelectCell(null)} className="btn btn-secondary">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by card name..."
              className="input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn btn-info">
              <Search size={20} />Search
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label>Set</label>
                  <select value={searchFilters.set} onChange={(e) => onFilterChange({ ...searchFilters, set: e.target.value })} className="input">
                    <option value="">All Sets</option>
                    {sets.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={searchFilters.type} onChange={(e) => onFilterChange({ ...searchFilters, type: e.target.value })} className="input">
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
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label>Supertype</label>
                  <select value={searchFilters.supertype} onChange={(e) => onFilterChange({ ...searchFilters, supertype: e.target.value })} className="input">
                    <option value="">All Supertypes</option>
                    <option value="Pokémon">Pokémon</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Energy">Energy</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select value={searchFilters.rarity} onChange={(e) => onFilterChange({ ...searchFilters, rarity: e.target.value })} className="input">
                    <option value="">All Rarities</option>
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Rare Holo">Rare Holo</option>
                    <option value="Rare Ultra">Rare Ultra</option>
                    <option value="Rare Secret">Rare Secret</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Language (Note: API has limited language filtering)</label>
                <select value={searchFilters.language} onChange={(e) => onFilterChange({ ...searchFilters, language: e.target.value })} className="input">
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
              <button onClick={clearFilters} className="btn btn-secondary" style={{ width: '100%' }}>
                Clear All Filters
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '50px', height: '50px', border: '4px solid #4a5568', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#9ca3af', fontSize: '1rem' }}>Searching Pokemon cards...</p>
            </div>
          )}

          {!loading && searchResults.length === 0 && (searchQuery || searchFilters.set || searchFilters.type || searchFilters.rarity || searchFilters.supertype || searchFilters.language) && (
            <p style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>No cards found. Try different search terms or filters.</p>
          )}

          {/* Search results still use TCG API card format */}
          <div className="card-results">
            {searchResults.map(card => (
              <div key={card.id} onClick={() => onAddCard(card)} className="search-card">
                <img src={card.images.small} alt={card.name} loading="lazy" style={{ imageRendering: 'auto' }} />
                <p>{card.name}</p>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>{card.set.name}</p>
                {card.cardmarket?.prices?.averageSellPrice && (
                  <p className="price">€{card.cardmarket.prices.averageSellPrice.toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>

          {totalSearchPages > 1 && (
            <div className="pagination" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => onSearchPageChange(Math.max(1, searchPage - 1))} disabled={searchPage === 1}>
                <ChevronLeft size={20} />Previous
              </button>
              <span className="page-indicator">Page {searchPage} / {totalSearchPages}</span>
              <button className="btn btn-secondary" onClick={() => onSearchPageChange(Math.min(totalSearchPages, searchPage + 1))} disabled={searchPage === totalSearchPages}>
                Next<ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div
          className="binder-grid"
          style={{ gridTemplateColumns: `repeat(${binder.cols}, 1fr)`, gridTemplateRows: `repeat(${binder.rows}, 1fr)` }}
        >
          {currentPageCards.map((card, pageIndex) => {
            const absoluteIndex = startIndex + pageIndex;
            return (
              <div
                key={absoluteIndex}
                onClick={() => !card && onSelectCell(absoluteIndex)}
                onDragStart={(e) => card && handleDragStart(e, pageIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, pageIndex)}
                draggable={!!card}
                className={`card-slot ${selectedCell === absoluteIndex ? 'selected' : ''} ${card ? 'filled' : 'empty'} ${draggedCard === absoluteIndex ? 'dragging' : ''}`}
                style={{ cursor: card ? 'grab' : 'pointer' }}
              >
                {card ? (
                  <div className="card-container">
                    <GripVertical size={16} className="drag-handle" />
                    {/* Binder grid cards use DB row fields */}
                    <img src={card.card_image_url} alt={card.card_name} loading="lazy" />
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveCard(absoluteIndex); }}
                      className="remove-btn"
                    >
                      <X size={16} />
                    </button>
                    {card.card_price && (
                      <div className="card-price">
                        €{Number(card.card_price).toFixed(2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <Plus size={32} style={{ opacity: 0.5 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
