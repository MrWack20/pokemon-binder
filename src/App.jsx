import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Book, RefreshCw, Settings } from 'lucide-react';
import './App.css';
import { supabase } from './supabase.js';
import { BACKGROUND_THEMES } from './constants/themes';
import SettingsPanel from './components/SettingsPanel';
import BindersView from './components/BindersView';
import EditBinderCover from './components/EditBinderCover';
import BinderView from './components/BinderView';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import LoginPage from './components/Auth/LoginPage.jsx';
import RegisterPage from './components/Auth/RegisterPage.jsx';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage.jsx';
import AuthCallbackPage from './components/Auth/AuthCallbackPage.jsx';
import ResetPasswordPage from './components/Auth/ResetPasswordPage.jsx';
import UserMenu from './components/Auth/UserMenu.jsx';
import {
  getBinders,
  createBinder as createBinderSvc,
  updateBinder as updateBinderSvc,
  deleteBinder as deleteBinderSvc,
} from './services/binderService.js';
import {
  getBinderCards,
  addCard,
  removeCard,
  moveCard,
  swapCards as swapCardsSvc,
} from './services/cardService.js';
import { searchCards as searchCardsSvc, getSets } from './services/searchService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Upload a cover image File to Supabase Storage bucket "binder-covers".
 * Requires the bucket to exist in your Supabase project (Storage → New bucket).
 * Returns the public URL, or null on failure.
 */
async function uploadBinderCover(binderId, file) {
  const ext = file.name.split('.').pop();
  const path = `${binderId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('binder-covers')
    .upload(path, file, { upsert: true });
  if (error) {
    console.error('Cover upload failed:', error.message);
    return null;
  }
  const { data: { publicUrl } } = supabase.storage
    .from('binder-covers')
    .getPublicUrl(path);
  return publicUrl;
}

/**
 * Reconstruct a slot-indexed cards array from binder_cards DB rows.
 * Slots without a card remain null.
 */
function buildCardsArray(rows, cols, pages, cardRows) {
  const totalSlots = rows * cols * pages;
  const arr = Array(totalSlots).fill(null);
  (cardRows || []).forEach(card => {
    if (card.slot_index >= 0 && card.slot_index < totalSlots) {
      arr[card.slot_index] = card;
    }
  });
  return arr;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const { profile } = useAuth();

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState('binders');
  const [binders, setBinders] = useState([]);
  const [selectedBinder, setSelectedBinder] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    set: '', type: '', rarity: '', supertype: '', language: '',
  });
  const [sets, setSets] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchCache, setSearchCache] = useState({});
  const [searchPage, setSearchPage] = useState(1);
  const [totalSearchPages, setTotalSearchPages] = useState(0);

  // ── Settings state ───────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState({ backgroundTheme: 'default' });

  // ── Drag state ───────────────────────────────────────────────────────────
  const [draggedCard, setDraggedCard] = useState(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSetsData();
    loadAppSettings();
  }, []);

  useEffect(() => {
    if (profile?.id) loadBinders();
  }, [profile]);

  useEffect(() => {
    const theme = BACKGROUND_THEMES[appSettings.backgroundTheme] || BACKGROUND_THEMES.default;
    const { colors } = theme;
    if (colors.length === 2) {
      document.body.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
    } else if (colors.length === 3) {
      document.body.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
    }
    document.body.style.minHeight = '100vh';
  }, [appSettings.backgroundTheme]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  const loadAppSettings = () => {
    const saved = localStorage.getItem('pokemonBinderSettings');
    if (saved) setAppSettings(JSON.parse(saved));
  };

  const saveAppSettings = (newSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('pokemonBinderSettings', JSON.stringify(newSettings));
  };

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadBinders = async () => {
    setSyncing(true);
    const { data, error } = await getBinders(profile.id);
    if (error) console.error('Error loading binders:', error);
    else setBinders(data || []);
    setSyncing(false);
  };

  const loadSetsData = async () => {
    const { data } = await getSets();
    if (data) setSets(data);
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (query, filters = searchFilters, page = 1) => {
    const cacheKey = JSON.stringify({ query, filters, page });
    if (searchCache[cacheKey]) {
      setSearchResults(searchCache[cacheKey].results);
      setTotalSearchPages(searchCache[cacheKey].totalPages);
      setSearchPage(page);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearchResults([]);
    const { data, error } = await searchCardsSvc(query, filters, page);
    if (error || !data) {
      setSearchResults([]);
      setTotalSearchPages(0);
      setLoading(false);
      alert('Search failed. Please try again with different filters.');
      return;
    }
    setSearchCache(prev => ({ ...prev, [cacheKey]: data }));
    setSearchResults(data.results);
    setTotalSearchPages(data.totalPages);
    setSearchPage(page);
    setLoading(false);
  };

  // ── Binder CRUD ───────────────────────────────────────────────────────────
  const handleCreateBinder = async (binderData) => {
    setSyncing(true);
    const { data, error } = await createBinderSvc(profile.id, {
      name: binderData.name,
      rows: binderData.rows,
      cols: binderData.cols,
      pages: binderData.pages,
      cover_color: binderData.coverColor,
      cover_text: binderData.coverText || null,
    });
    if (error || !data) {
      alert('Failed to create binder.');
      setSyncing(false);
      return;
    }
    // Upload cover image if one was provided
    if (binderData.coverImageFile) {
      const url = await uploadBinderCover(data.id, binderData.coverImageFile);
      if (url) {
        await updateBinderSvc(data.id, { cover_image_url: url });
        data.cover_image_url = url;
      }
    }
    setBinders(prev => [
      ...prev,
      { ...data, cards: Array(data.rows * data.cols * data.pages).fill(null) },
    ]);
    setSyncing(false);
  };

  const handleUpdateBinder = async (binderId, updates) => {
    setSyncing(true);
    const { data, error } = await updateBinderSvc(binderId, updates);
    if (error) { alert('Failed to update binder.'); setSyncing(false); return; }
    setBinders(prev => prev.map(b => b.id === binderId ? { ...b, ...data } : b));
    if (selectedBinder?.id === binderId) {
      setSelectedBinder(prev => ({ ...prev, ...data }));
    }
    setSyncing(false);
  };

  const handleDeleteBinder = async (binderId) => {
    setSyncing(true);
    const { error } = await deleteBinderSvc(binderId);
    if (error) { alert('Failed to delete binder.'); setSyncing(false); return; }
    setBinders(prev => prev.filter(b => b.id !== binderId));
    setSyncing(false);
  };

  // ── Open binder: fetch cards and reconstruct slot array ───────────────────
  const handleSelectBinder = async (binder) => {
    setSyncing(true);
    const { data: cardRows, error } = await getBinderCards(binder.id);
    if (error) { alert('Failed to load binder.'); setSyncing(false); return; }
    const cards = buildCardsArray(binder.rows, binder.cols, binder.pages, cardRows);
    setSelectedBinder({ ...binder, cards });
    setCurrentPage(0);
    setView('binderView');
    setSyncing(false);
  };

  // ── Card CRUD ─────────────────────────────────────────────────────────────

  /**
   * Add a TCG API card object to the selected slot.
   * Maps API fields → binder_cards DB columns.
   */
  const handleAddCard = async (apiCard) => {
    if (selectedCell === null || !selectedBinder) {
      console.warn('handleAddCard: selectedCell=', selectedCell, 'selectedBinder=', selectedBinder);
      return;
    }
    const { data, error } = await addCard(selectedBinder.id, selectedCell, {
      card_api_id: apiCard.id,
      card_name: apiCard.name,
      card_image_url: apiCard.images?.small ?? apiCard.images?.large ?? '',
      card_set: apiCard.set?.name ?? null,
      card_game: 'pokemon',
      card_price: apiCard.cardmarket?.prices?.averageSellPrice ?? null,
      card_price_currency: 'EUR',
    });
    if (error || !data) {
      console.error('addCard error:', error);
      alert(`Failed to add card: ${error?.message ?? 'no data returned'}`);
      return;
    }

    const updatedCards = [...selectedBinder.cards];
    updatedCards[selectedCell] = data;
    setSelectedBinder({ ...selectedBinder, cards: updatedCards });
    setSelectedCell(null);
    setSearchResults([]);
    setSearchQuery('');
    setSearchFilters({ set: '', type: '', rarity: '', supertype: '', language: '' });
    setSearchPage(1);
    setTotalSearchPages(0);
  };

  /** Remove a card by its slot index. Uses the DB row id stored in the slot. */
  const handleRemoveCard = async (slotIndex) => {
    if (!selectedBinder) return;
    const card = selectedBinder.cards[slotIndex];
    if (!card) return;
    const { error } = await removeCard(card.id);
    if (error) { alert('Failed to remove card.'); return; }
    const updatedCards = [...selectedBinder.cards];
    updatedCards[slotIndex] = null;
    setSelectedBinder({ ...selectedBinder, cards: updatedCards });
  };

  /**
   * Swap or move cards using slot indices (as BinderView expects).
   * Looks up the DB row id from the local slot array before calling the service.
   */
  const handleSwapCards = async (fromIndex, toIndex) => {
    if (!selectedBinder || fromIndex === toIndex) return;
    const fromCard = selectedBinder.cards[fromIndex];
    const toCard = selectedBinder.cards[toIndex];
    if (!fromCard) return;

    const { error } = fromCard && toCard
      ? await swapCardsSvc(fromCard.id, toCard.id)
      : await moveCard(fromCard.id, toIndex);

    if (error) { alert('Failed to move card.'); return; }

    const updatedCards = [...selectedBinder.cards];
    updatedCards[fromIndex] = toCard ? { ...toCard, slot_index: fromIndex } : null;
    updatedCards[toIndex] = { ...fromCard, slot_index: toIndex };
    setSelectedBinder({ ...selectedBinder, cards: updatedCards });
  };

  // ── Cover edit save ───────────────────────────────────────────────────────
  const handleEditBinderSave = async (coverData, imageFile) => {
    let cover_image_url = coverData.cover_image_url;
    if (imageFile) {
      const url = await uploadBinderCover(selectedBinder.id, imageFile);
      if (url) cover_image_url = url;
    }
    await handleUpdateBinder(selectedBinder.id, {
      cover_color: coverData.cover_color,
      cover_text: coverData.cover_text,
      cover_image_url,
    });
    setView('binderView');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>
            <Book size={40} style={{ marginRight: '15px' }} />
            PokeBinder
          </h1>
          <p style={{ fontSize: '1.5rem' }}>
            Struggling bringing your binder everywhere you go?
            <br />Organize and showcase your Pokémon TCG collection here in PokéBinder!
            <br /><br />By: MrWack
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            {syncing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                <RefreshCw size={16} className="spinning" />
                <span style={{ fontSize: '0.9rem' }}>Syncing…</span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
                <Settings size={20} />
                Settings
              </button>
              <UserMenu onOpenSettings={() => setShowSettings(true)} />
            </div>
          </div>
        </div>

        {showSettings && (
          <SettingsPanel
            settings={appSettings}
            onSave={saveAppSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {view === 'binders' && (
          <BindersView
            profile={profile}
            binders={binders}
            onCreateBinder={handleCreateBinder}
            onSelectBinder={handleSelectBinder}
            onDeleteBinder={handleDeleteBinder}
          />
        )}

        {view === 'binderView' && selectedBinder && (
          <BinderView
            binder={selectedBinder}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onBack={() => {
              setSelectedBinder(null);
              setCurrentPage(0);
              setView('binders');
              loadBinders(); // refresh card counts in binder list
            }}
            onEditCover={() => setView('editBinder')}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onRemoveCard={handleRemoveCard}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            searchResults={searchResults}
            loading={loading}
            onAddCard={handleAddCard}
            searchFilters={searchFilters}
            onFilterChange={setSearchFilters}
            sets={sets}
            showFilters={showFilters}
            onToggleFilters={setShowFilters}
            searchPage={searchPage}
            totalSearchPages={totalSearchPages}
            onSearchPageChange={(page) => handleSearch(searchQuery, searchFilters, page)}
            draggedCard={draggedCard}
            onDragStart={setDraggedCard}
            onDragEnd={() => setDraggedCard(null)}
            onSwapCards={handleSwapCards}
          />
        )}

        {view === 'editBinder' && selectedBinder && (
          <EditBinderCover
            binder={selectedBinder}
            onSave={handleEditBinderSave}
            onCancel={() => setView('binderView')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
