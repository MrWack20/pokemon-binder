import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClientProvider, useIsMutating } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Book, RefreshCw, Layers, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './App.css';
import { supabase, envHealth } from './supabase.js';
import { queryClient } from './queryClient.js';
import { BACKGROUND_THEMES } from './constants/themes';
// Heavy pages loaded lazily — reduces initial bundle by ~300KB (Recharts)
const SettingsPage    = lazy(() => import('./components/SettingsPage'));
const StatsPage       = lazy(() => import('./components/StatsPage'));
const SetsPage        = lazy(() => import('./components/SetsPage'));
import CardDetailModal from './components/CardDetailModal';
import CardInspectModal from './components/CardInspectModal';
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
  useBinders,
  useBinderCards,
  useCreateBinder,
  useUpdateBinder,
  useDeleteBinder,
  useDuplicateBinder,
  useAddCard,
  useRemoveCard,
  useMoveCard,
  useSwapCards,
} from './hooks/queries.js';
import { searchCards as searchCardsSvc, getSets, addRecentSearch } from './services/searchService.js';
import { mtgCardToDbRow, searchMtgCards } from './services/mtgService.js';
import { ygoCardToDbRow, searchYgoCards } from './services/yugiohService.js';
import { opCardToDbRow, searchOpCards } from './services/onepieceService.js';

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

// ─── Lazy-load fallback ───────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { binderId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── View state derived from URL ────────────────────────────────────────────
  // The URL is the source of truth so refresh always restores the user's spot.
  //   /                       → binders list
  //   /binder/:id             → binder grid (?page=N for current page)
  //   /binder/:id/edit        → cover editor
  const isEditPath = location.pathname.endsWith('/edit');
  const view = !binderId ? 'binders' : (isEditPath ? 'editBinder' : 'binderView');
  const currentPage = parseInt(searchParams.get('page'), 10) || 0;

  const setCurrentPage = (next) => {
    const value = typeof next === 'function' ? next(currentPage) : next;
    setSearchParams(value > 0 ? { page: String(value) } : {}, { replace: true });
  };

  // ── Server state via React Query ─────────────────────────────────────────
  // `binders` and `cardRows` come straight from the cache — no local mirror,
  // no manual loadBinders, no setSyncing flag-juggling. Refetch-on-focus and
  // refetch-on-reconnect are handled by queryClient defaults.
  const { data: binders = [], isFetched: bindersFetched } = useBinders(profile?.id);
  const { data: cardRows = [] } = useBinderCards(binderId);

  // Mutation hooks — each one owns its own optimistic update + rollback.
  const createBinderMut = useCreateBinder();
  const updateBinderMut = useUpdateBinder();
  const deleteBinderMut = useDeleteBinder();
  const duplicateBinderMut = useDuplicateBinder();
  const addCardMut = useAddCard();
  const removeCardMut = useRemoveCard();
  const moveCardMut = useMoveCard();
  const swapCardsMut = useSwapCards();

  // The Syncing pill now reflects ONLY in-flight writes — background refetches
  // happen invisibly. (Showing the pill on every focus-refetch was the
  // original "tab switch shows Syncing" complaint.)
  const syncing = useIsMutating() > 0;

  // Derive `selectedBinder` from the URL + query caches. This is the same
  // shape BinderView consumed before (binder meta + a slot-indexed cards
  // array), so no changes are needed downstream.
  const selectedBinder = useMemo(() => {
    if (!binderId) return null;
    const meta = binders.find(b => b.id === binderId);
    if (!meta) return null;
    return {
      ...meta,
      cards: buildCardsArray(meta.rows, meta.cols, meta.pages, cardRows),
    };
  }, [binderId, binders, cardRows]);

  // If the URL points at a binder that doesn't exist (deleted in another tab,
  // bad share link, etc.), bounce home. Only fires once binders have loaded.
  useEffect(() => {
    if (!binderId || !bindersFetched) return;
    if (binders.some(b => b.id === binderId)) return;
    toast.error('Binder not found.');
    navigate('/', { replace: true });
  }, [binderId, bindersFetched, binders, navigate]);

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
  const [searchPage, setSearchPage] = useState(1);
  const [totalSearchPages, setTotalSearchPages] = useState(0);
  const [searchSort, setSearchSort] = useState('');
  const [searchGame, setSearchGame] = useState('pokemon');
  const [modalCard, setModalCard] = useState(null);
  const [inspectCard, setInspectCard] = useState(null);

  // ── Settings state ───────────────────────────────────────────────────────
  const [appSettings, setAppSettings] = useState({ backgroundTheme: 'default' });

  // ── Bootstrap (theme + sets list only — server data is via React Query) ──
  useEffect(() => {
    loadSetsData();
    loadAppSettings();
  }, []);

  useEffect(() => {
    const theme = BACKGROUND_THEMES[appSettings.backgroundTheme] || BACKGROUND_THEMES.default;
    document.body.style.background = theme.css;
    document.body.style.minHeight = '100vh';
  }, [appSettings.backgroundTheme]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  const loadAppSettings = () => {
    const saved = localStorage.getItem('pokemonBinderSettings');
    if (saved) setAppSettings(JSON.parse(saved));
  };

  const loadSetsData = async () => {
    const { data } = await getSets();
    if (data) setSets(data);
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (query, filters = searchFilters, page = 1, sort = searchSort, game = searchGame) => {
    setLoading(true);
    setSearchResults([]);
    if (query?.trim()) addRecentSearch(query);

    let result;
    if (game === 'mtg') {
      result = await searchMtgCards(query, page);
    } else if (game === 'yugioh') {
      result = await searchYgoCards(query, page);
    } else if (game === 'onepiece') {
      result = await searchOpCards(query, page);
    } else {
      result = await searchCardsSvc(query, filters, page, sort);
    }

    const { data, error } = result;
    if (error || !data) {
      setSearchResults([]);
      setTotalSearchPages(0);
      setLoading(false);
      toast.error('Search failed. Try different terms or filters.');
      return;
    }
    setSearchResults(data.results);
    setTotalSearchPages(data.totalPages);
    setSearchPage(page);
    setLoading(false);
  };

  // ── Binder CRUD (mutations own the cache; we just call them) ──────────────
  const handleCreateBinder = async (binderData) => {
    try {
      const data = await createBinderMut.mutateAsync({
        profileId: profile.id,
        fields: {
          name: binderData.name,
          rows: binderData.rows,
          cols: binderData.cols,
          pages: binderData.pages,
          cover_color: binderData.coverColor,
          cover_text: binderData.coverText || null,
        },
      });
      if (binderData.coverImageFile) {
        const url = await uploadBinderCover(data.id, binderData.coverImageFile);
        if (url) {
          await updateBinderMut.mutateAsync({
            binderId: data.id,
            profileId: profile.id,
            updates: { cover_image_url: url },
          });
        }
      }
      toast.success(`Binder "${data.name}" created!`);
    } catch (err) {
      console.error('handleCreateBinder:', err);
      toast.error('Failed to create binder.');
    }
  };

  const handleDeleteBinder = async (deletedId) => {
    try {
      await deleteBinderMut.mutateAsync({ binderId: deletedId, profileId: profile.id });
      toast.success('Binder deleted.');
    } catch (err) {
      console.error('handleDeleteBinder:', err);
      toast.error('Failed to delete binder.');
    }
  };

  const handleDuplicateBinder = async (id, binderName) => {
    try {
      await duplicateBinderMut.mutateAsync({ binderId: id, profileId: profile.id });
      toast.success(`"${binderName}" duplicated.`);
    } catch (err) {
      console.error('handleDuplicateBinder:', err);
      toast.error('Failed to duplicate binder.');
    }
  };

  // ── Open binder ────────────────────────────────────────────────────────────
  const handleSelectBinder = (binder) => navigate(`/binder/${binder.id}`);

  // ── Card CRUD ─────────────────────────────────────────────────────────────

  /**
   * Add a TCG API card object to the selected slot.
   * Maps API fields → binder_cards DB columns. The mutation handles the
   * optimistic cache update + rollback on failure.
   */
  const handleAddCard = async (apiCard) => {
    if (selectedCell === null || !selectedBinder) return;
    const game = apiCard._game ?? 'pokemon';
    let dbRow;
    if (game === 'mtg') {
      dbRow = mtgCardToDbRow(apiCard);
    } else if (game === 'yugioh') {
      dbRow = ygoCardToDbRow(apiCard);
    } else if (game === 'onepiece') {
      dbRow = opCardToDbRow(apiCard);
    } else {
      dbRow = {
        card_api_id: apiCard.id,
        card_name: apiCard.name,
        card_image_url: apiCard.images?.small ?? apiCard.images?.large ?? '',
        card_set: apiCard.set?.name ?? null,
        card_game: 'pokemon',
        card_price: apiCard._price
          ?? apiCard.tcgplayer?.prices?.holofoil?.market
          ?? apiCard.tcgplayer?.prices?.normal?.market
          ?? apiCard.tcgplayer?.prices?.['1stEditionHolofoil']?.market
          ?? apiCard.tcgplayer?.prices?.unlimited?.market
          ?? null,
        card_price_currency: 'USD',
      };
    }

    try {
      const data = await addCardMut.mutateAsync({
        binderId: selectedBinder.id,
        slotIndex: selectedCell,
        dbRow,
      });
      setSelectedCell(null);
      setSearchResults([]);
      setSearchQuery('');
      setSearchFilters({ set: '', type: '', rarity: '', supertype: '', language: '' });
      setSearchPage(1);
      setTotalSearchPages(0);
      toast.success(`${data.card_name} added!`);
    } catch (err) {
      console.error('handleAddCard:', err);
      toast.error(`Failed to add card: ${err?.message ?? 'unknown error'}`);
    }
  };

  const handleRemoveCard = async (slotIndex) => {
    if (!selectedBinder) return;
    const card = selectedBinder.cards[slotIndex];
    // Skip optimistic temp rows — they don't exist in the DB yet.
    if (!card?.id || String(card.id).startsWith('temp-')) return;
    try {
      await removeCardMut.mutateAsync({ binderId: selectedBinder.id, cardId: card.id });
    } catch (err) {
      console.error('handleRemoveCard:', err);
      toast.error('Failed to remove card.');
    }
  };

  const handleSwapCards = async (fromIndex, toIndex) => {
    if (!selectedBinder || fromIndex === toIndex) return;
    const fromCard = selectedBinder.cards[fromIndex];
    const toCard = selectedBinder.cards[toIndex];
    if (!fromCard?.id || String(fromCard.id).startsWith('temp-')) return;

    try {
      if (toCard?.id && !String(toCard.id).startsWith('temp-')) {
        await swapCardsMut.mutateAsync({
          binderId: selectedBinder.id,
          cardId1: fromCard.id,
          cardId2: toCard.id,
        });
      } else {
        await moveCardMut.mutateAsync({
          binderId: selectedBinder.id,
          cardId: fromCard.id,
          newSlotIndex: toIndex,
        });
      }
    } catch (err) {
      console.error('handleSwapCards:', err);
      toast.error('Failed to move card.');
    }
  };

  // ── Cover edit save ───────────────────────────────────────────────────────
  const handleEditBinderSave = async (coverData, imageFile) => {
    try {
      let cover_image_url = coverData.cover_image_url;
      if (imageFile) {
        const url = await uploadBinderCover(selectedBinder.id, imageFile);
        if (url) cover_image_url = url;
      }
      await updateBinderMut.mutateAsync({
        binderId: selectedBinder.id,
        profileId: profile.id,
        updates: {
          cover_color: coverData.cover_color,
          cover_text: coverData.cover_text,
          cover_image_url,
        },
      });
      navigate(`/binder/${selectedBinder.id}`);
    } catch (err) {
      console.error('handleEditBinderSave:', err);
      toast.error('Failed to save cover.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <div className="container">
        <div className={`header${view === 'binderView' ? ' header--compact' : ''}`}>
          <div className="header-top">
            <h1>
              <Book size={36} style={{ marginRight: '12px', flexShrink: 0, color: '#fbbf24' }} />
              <span className="brand-text">PokéBinder</span>
            </h1>
            <div className="header-actions">
              {syncing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.65, fontSize: '0.85rem' }}>
                  <RefreshCw size={14} className="spinning" />
                  Syncing…
                </div>
              )}
              <UserMenu />
            </div>
          </div>
          {view === 'binders' && (
            <div className="header-nav">
              <p className="header-subtitle">
                Organize and showcase your TCG collection digitally.
              </p>
              <div className="header-nav__links">
                <button className="header-nav__btn" onClick={() => navigate('/sets')}>
                  <Layers size={16} />Browse Sets
                </button>
                <button className="header-nav__btn" onClick={() => navigate('/stats')}>
                  <BarChart2 size={16} />Statistics
                </button>
              </div>
            </div>
          )}
        </div>

        {/* On hard refresh, `user` hydrates from localStorage instantly but
            `profile` has to fetch. Render a skeleton in that gap so we don't
            flash an empty BindersView with a bare "'s Binders" heading. */}
        {view === 'binders' && user && !profile && <PageLoader />}

        {view === 'binders' && profile && (
          <BindersView
            profile={profile}
            binders={binders}
            onCreateBinder={handleCreateBinder}
            onSelectBinder={handleSelectBinder}
            onDeleteBinder={handleDeleteBinder}
            onDuplicateBinder={handleDuplicateBinder}
          />
        )}

        {view === 'binderView' && selectedBinder && (
          <BinderView
            binder={selectedBinder}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onBack={() => navigate('/')}
            onEditCover={() => navigate(`/binder/${selectedBinder.id}/edit`)}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onRemoveCard={handleRemoveCard}
            onCardClick={setModalCard}
            onInspectCard={setInspectCard}
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
            onSearchPageChange={(page) => handleSearch(searchQuery, searchFilters, page, searchSort, searchGame)}
            onSwapCards={handleSwapCards}
            searchSort={searchSort}
            onSortChange={(sort) => { setSearchSort(sort); handleSearch(searchQuery, searchFilters, 1, sort, searchGame); }}
            searchGame={searchGame}
            onGameChange={(game) => { setSearchGame(game); setSearchResults([]); setSearchQuery(''); }}
            currency={(() => { try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; } catch { return 'USD'; } })()}
          />
        )}

        {view === 'editBinder' && selectedBinder && (
          <EditBinderCover
            binder={selectedBinder}
            onSave={handleEditBinderSave}
            onCancel={() => navigate(`/binder/${selectedBinder.id}`)}
          />
        )}

        {modalCard && (
          <CardDetailModal
            card={modalCard}
            currency={(() => { try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; } catch { return 'USD'; } })()}
            onClose={() => setModalCard(null)}
            onInspect={(card) => { setModalCard(null); setInspectCard(card); }}
            onRemove={() => {
              const slotIndex = selectedBinder?.cards.findIndex(c => c?.id === modalCard.id);
              if (slotIndex !== undefined && slotIndex !== -1) handleRemoveCard(slotIndex);
              setModalCard(null);
            }}
          />
        )}

        {inspectCard && (
          <CardInspectModal
            card={inspectCard}
            onClose={() => setInspectCard(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function EnvHealthBanner() {
  if (envHealth.ok) return null;
  const missing = [
    envHealth.urlMissing && 'VITE_SUPABASE_URL',
    envHealth.keyMissing && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: '#7f1d1d', color: '#fff', padding: '10px 16px',
      fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.4,
      borderBottom: '1px solid #ef4444',
    }}>
      <strong>Configuration error:</strong> Missing environment variable(s): <code>{missing}</code>.
      {' '}On Vercel, set these for <strong>both Production and Preview</strong> separately, then redeploy.
      Auth and database calls will fail until this is fixed.
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EnvHealthBanner />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/binder/:binderId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/binder/:binderId/edit" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></ProtectedRoute>} />
            <Route path="/stats"    element={<ProtectedRoute><Suspense fallback={<PageLoader />}><StatsPage /></Suspense></ProtectedRoute>} />
            <Route path="/sets"     element={<ProtectedRoute><Suspense fallback={<PageLoader />}><SetsPage /></Suspense></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
