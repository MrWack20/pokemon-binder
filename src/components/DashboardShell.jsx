'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { useIsMutating } from '@tanstack/react-query';
import { Book, RefreshCw, Layers, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { BACKGROUND_THEMES } from '@/constants/themes';
import CardDetailModal from '@/components/CardDetailModal';
import CardInspectModal from '@/components/CardInspectModal';
import BindersView from '@/components/BindersView';
import EditBinderCover from '@/components/EditBinderCover';
import BinderView from '@/components/BinderView';
import UserMenu from '@/components/Auth/UserMenu';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/hooks/queries';
import { searchCards as searchCardsSvc, getSets, addRecentSearch } from '@/services/searchService';
import { mtgCardToDbRow, searchMtgCards } from '@/services/mtgService';
import { ygoCardToDbRow, searchYgoCards } from '@/services/yugiohService';
import { opCardToDbRow, searchOpCards } from '@/services/onepieceService';

const supabase = createClient();

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

function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function DashboardShell() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const binderId = params?.binderId ?? null;
  const isEditPath = pathname?.endsWith('/edit') ?? false;
  const view = !binderId ? 'binders' : (isEditPath ? 'editBinder' : 'binderView');
  const currentPage = parseInt(searchParams.get('page'), 10) || 0;

  const setCurrentPage = (next) => {
    const value = typeof next === 'function' ? next(currentPage) : next;
    const sp = new URLSearchParams(searchParams.toString());
    if (value > 0) sp.set('page', String(value));
    else sp.delete('page');
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── Server state via React Query ─────────────────────────────────────────
  const { data: binders = [], isFetched: bindersFetched } = useBinders(profile?.id);
  const { data: cardRows = [] } = useBinderCards(binderId);

  const createBinderMut = useCreateBinder();
  const updateBinderMut = useUpdateBinder();
  const deleteBinderMut = useDeleteBinder();
  const duplicateBinderMut = useDuplicateBinder();
  const addCardMut = useAddCard();
  const removeCardMut = useRemoveCard();
  const moveCardMut = useMoveCard();
  const swapCardsMut = useSwapCards();

  const syncing = useIsMutating() > 0;

  const selectedBinder = useMemo(() => {
    if (!binderId) return null;
    const meta = binders.find(b => b.id === binderId);
    if (!meta) return null;
    return {
      ...meta,
      cards: buildCardsArray(meta.rows, meta.cols, meta.pages, cardRows),
    };
  }, [binderId, binders, cardRows]);

  // Bounce home if URL points at a binder that doesn't exist.
  useEffect(() => {
    if (!binderId || !bindersFetched) return;
    if (binders.some(b => b.id === binderId)) return;
    toast.error('Binder not found.');
    router.replace('/');
  }, [binderId, bindersFetched, binders, router]);

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

  useEffect(() => {
    (async () => {
      const { data } = await getSets();
      if (data) setSets(data);
    })();

    try {
      const saved = localStorage.getItem('pokemonBinderSettings');
      if (saved) setAppSettings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const theme = BACKGROUND_THEMES[appSettings.backgroundTheme] || BACKGROUND_THEMES.default;
    document.body.style.background = theme.css;
    document.body.style.minHeight = '100vh';
  }, [appSettings.backgroundTheme]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (query, filters = searchFilters, page = 1, sort = searchSort, game = searchGame) => {
    setLoading(true);
    setSearchResults([]);
    if (query?.trim()) addRecentSearch(query);

    let result;
    if (game === 'mtg') result = await searchMtgCards(query, page);
    else if (game === 'yugioh') result = await searchYgoCards(query, page);
    else if (game === 'onepiece') result = await searchOpCards(query, page);
    else result = await searchCardsSvc(query, filters, page, sort);

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

  // ── Binder CRUD ──────────────────────────────────────────────────────────
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

  const handleSelectBinder = (binder) => router.push(`/binder/${binder.id}`);

  // ── Card CRUD ─────────────────────────────────────────────────────────────
  const handleAddCard = async (apiCard) => {
    if (selectedCell === null || !selectedBinder) return;
    const game = apiCard._game ?? 'pokemon';
    let dbRow;
    if (game === 'mtg') dbRow = mtgCardToDbRow(apiCard);
    else if (game === 'yugioh') dbRow = ygoCardToDbRow(apiCard);
    else if (game === 'onepiece') dbRow = opCardToDbRow(apiCard);
    else {
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
          // is_public is optional in coverData; pass through only when defined
          // so old call sites that don't set it stay backwards compatible.
          ...(typeof coverData.is_public === 'boolean' && { is_public: coverData.is_public }),
        },
      });
      router.push(`/binder/${selectedBinder.id}`);
    } catch (err) {
      console.error('handleEditBinderSave:', err);
      toast.error('Failed to save cover.');
    }
  };

  const currency = (() => {
    try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}').currency || 'USD'; }
    catch { return 'USD'; }
  })();

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
                <button className="header-nav__btn" onClick={() => router.push('/sets')}>
                  <Layers size={16} />Browse Sets
                </button>
                <button className="header-nav__btn" onClick={() => router.push('/stats')}>
                  <BarChart2 size={16} />Statistics
                </button>
              </div>
            </div>
          )}
        </div>

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
            onBack={() => router.push('/')}
            onEditCover={() => router.push(`/binder/${selectedBinder.id}/edit`)}
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
            currency={currency}
          />
        )}

        {view === 'editBinder' && selectedBinder && (
          <EditBinderCover
            binder={selectedBinder}
            onSave={handleEditBinderSave}
            onCancel={() => router.push(`/binder/${selectedBinder.id}`)}
          />
        )}

        {modalCard && (
          <CardDetailModal
            card={modalCard}
            currency={currency}
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
