import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Book, Plus, Search, X, Trash2, Edit2, Eye, Save, ChevronLeft, ChevronRight, Filter, RefreshCw, Settings, Upload, GripVertical } from 'lucide-react';
import './App.css';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { BACKGROUND_THEMES, API_KEY } from './constants/themes';
import SettingsPanel from './components/SettingsPanel';
import ProfilesView from './components/ProfilesView';
import BindersView from './components/BindersView';
import EditBinderCover from './components/EditBinderCover';
import BinderView from './components/BinderView';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import LoginPage from './components/Auth/LoginPage.jsx';
import RegisterPage from './components/Auth/RegisterPage.jsx';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage.jsx';
import UserMenu from './components/Auth/UserMenu.jsx';

// ─── Dashboard (existing app) ─────────────────────────────────────────────────

function Dashboard() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [view, setView] = useState('profiles');
  const [selectedBinder, setSelectedBinder] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    set: '',
    type: '',
    rarity: '',
    supertype: '',
    language: ''
  });
  const [sets, setSets] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchCache, setSearchCache] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [totalSearchPages, setTotalSearchPages] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState({
    backgroundTheme: 'default'
  });
  const [draggedCard, setDraggedCard] = useState(null);

  // Load profiles from Firebase on mount
  useEffect(() => {
    loadProfilesFromFirebase();
    loadSets();
    loadAppSettings();
  }, []);

  // Apply background theme
  useEffect(() => {
    const theme = BACKGROUND_THEMES[appSettings.backgroundTheme] || BACKGROUND_THEMES.default;
    const colors = theme.colors;

    if (colors.length === 2) {
      document.body.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
    } else if (colors.length === 3) {
      document.body.style.background = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
    }
    document.body.style.minHeight = '100vh';
  }, [appSettings.backgroundTheme]);

  const loadAppSettings = () => {
    const saved = localStorage.getItem('pokemonBinderSettings');
    if (saved) {
      setAppSettings(JSON.parse(saved));
    }
  };

  const saveAppSettings = (newSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('pokemonBinderSettings', JSON.stringify(newSettings));
  };

  // Real-time listener for profiles
  const loadProfilesFromFirebase = () => {
    setSyncing(true);
    const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const profilesData = [];
      snapshot.forEach((doc) => {
        profilesData.push({ ...doc.data(), id: doc.id });
      });
      setProfiles(profilesData);
      setSyncing(false);
    }, (error) => {
      console.error('Error loading profiles:', error);
      setSyncing(false);
      // Fallback to localStorage if Firebase fails
      const savedProfiles = JSON.parse(localStorage.getItem('pokemonProfiles') || '[]');
      setProfiles(savedProfiles);
    });

    return unsubscribe;
  };

  const loadSets = async () => {
    try {
      const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};
      const response = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=250', { headers });
      const data = await response.json();
      setSets(data.data || []);
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };

  const searchCards = async (query, filters = searchFilters, page = 1) => {
    if (!query.trim() && !filters.set && !filters.type && !filters.rarity && !filters.supertype && !filters.language) return;

    const cacheKey = JSON.stringify({ query, filters, page });

    // Check cache first for instant results
    if (searchCache[cacheKey]) {
      setSearchResults(searchCache[cacheKey].results);
      setTotalSearchPages(searchCache[cacheKey].totalPages);
      setSearchPage(page);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchResults([]); // Clear old results immediately

    try {
      let queryParams = [];

      if (query.trim()) {
        queryParams.push(`name:${query}*`);
      }

      if (filters.set) {
        queryParams.push(`set.id:${filters.set}`);
      }

      if (filters.type) {
        queryParams.push(`types:${filters.type}`);
      }

      if (filters.rarity) {
        queryParams.push(`rarity:"${filters.rarity}"`);
      }

      if (filters.supertype) {
        queryParams.push(`supertype:${filters.supertype}`);
      }

      if (filters.language) {
        queryParams.push(`nationalPokedexNumbers:[1 TO 1025]`);
      }

      const queryString = queryParams.join(' ');
      const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

      const pageSize = 10; // Reduced for faster response

      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${queryString}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      let results = data.data || [];

      if (filters.language) {
        results = results.filter(card => {
          return true;
        });
      }

      const totalCount = data.totalCount || results.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Cache the results
      setSearchCache(prev => ({ ...prev, [cacheKey]: { results, totalPages } }));

      // Set results
      setSearchResults(results);
      setTotalSearchPages(totalPages);
      setSearchPage(page);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching cards:', error);
      setSearchResults([]);
      setTotalSearchPages(0);
      setLoading(false);
      alert('Search failed. Please try again with different filters.');
    }
  };

  const createProfile = async (name) => {
    setSyncing(true);
    try {
      const newProfile = {
        name,
        binders: [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'profiles'), newProfile);
      console.log('Profile created with ID:', docRef.id);
      setSyncing(false);
      return { ...newProfile, id: docRef.id };
    } catch (error) {
      console.error('Error creating profile:', error);
      setSyncing(false);
      alert('Failed to create profile. Please check your Firebase connection.');
    }
  };

  const deleteProfile = async (profileId) => {
    setSyncing(true);
    try {
      await deleteDoc(doc(db, 'profiles', profileId));
      if (currentProfile?.id === profileId) {
        setCurrentProfile(null);
        setView('profiles');
      }
      setSyncing(false);
    } catch (error) {
      console.error('Error deleting profile:', error);
      setSyncing(false);
      alert('Failed to delete profile.');
    }
  };

  const createBinder = async (profileId, binderData) => {
    setSyncing(true);
    try {
      const profile = profiles.find(p => p.id === profileId);
      const totalSlots = binderData.rows * binderData.cols * binderData.pages;
      const newBinder = {
        id: Date.now().toString(),
        ...binderData,
        cards: Array(totalSlots).fill(null),
        createdAt: new Date().toISOString()
      };

      const updatedBinders = [...(profile.binders || []), newBinder];
      await updateDoc(doc(db, 'profiles', profileId), {
        binders: updatedBinders
      });
      setSyncing(false);
    } catch (error) {
      console.error('Error creating binder:', error);
      setSyncing(false);
      alert('Failed to create binder.');
    }
  };

  const updateBinder = async (profileId, binderId, updates) => {
    setSyncing(true);
    try {
      const profile = profiles.find(p => p.id === profileId);
      const updatedBinders = profile.binders.map(b =>
        b.id === binderId ? { ...b, ...updates } : b
      );

      await updateDoc(doc(db, 'profiles', profileId), {
        binders: updatedBinders
      });
      setSyncing(false);
    } catch (error) {
      console.error('Error updating binder:', error);
      setSyncing(false);
      alert('Failed to update binder.');
    }
  };

  const deleteBinder = async (profileId, binderId) => {
    setSyncing(true);
    try {
      const profile = profiles.find(p => p.id === profileId);
      const updatedBinders = profile.binders.filter(b => b.id !== binderId);

      await updateDoc(doc(db, 'profiles', profileId), {
        binders: updatedBinders
      });
      setSyncing(false);
    } catch (error) {
      console.error('Error deleting binder:', error);
      setSyncing(false);
      alert('Failed to delete binder.');
    }
  };

  const addCardToBinder = async (card) => {
    if (selectedCell !== null && selectedBinder) {
      const updatedCards = [...selectedBinder.cards];
      updatedCards[selectedCell] = card;

      await updateBinder(currentProfile.id, selectedBinder.id, { cards: updatedCards });
      setSelectedBinder({ ...selectedBinder, cards: updatedCards });
      setSelectedCell(null);
      setSearchResults([]);
      setSearchQuery('');
      setSearchFilters({ set: '', type: '', rarity: '', supertype: '', language: '' });
      setSearchPage(1);
      setTotalSearchPages(0);
    }
  };

  const removeCardFromBinder = async (index) => {
    if (selectedBinder) {
      const updatedCards = [...selectedBinder.cards];
      updatedCards[index] = null;

      await updateBinder(currentProfile.id, selectedBinder.id, { cards: updatedCards });
      setSelectedBinder({ ...selectedBinder, cards: updatedCards });
    }
  };

  const swapCards = async (fromIndex, toIndex) => {
    if (selectedBinder && fromIndex !== toIndex) {
      const updatedCards = [...selectedBinder.cards];
      const temp = updatedCards[fromIndex];
      updatedCards[fromIndex] = updatedCards[toIndex];
      updatedCards[toIndex] = temp;

      await updateBinder(currentProfile.id, selectedBinder.id, { cards: updatedCards });
      setSelectedBinder({ ...selectedBinder, cards: updatedCards });
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>
            <Book size={40} style={{ marginRight: '15px' }} />
            PokeBinder
          </h1>
          <p style={{ fontSize: '1.5rem' }}>Struggling bringing your binder everywhere you go?
            <br />Organize and showcase your Pokémon TCG collection here in PokéBinder!
            <br />
            <br />By: MrWack</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            {syncing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                <RefreshCw size={16} className="spinning" />
                <span style={{ fontSize: '0.9rem' }}>Syncing with Firebase...</span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSettings(!showSettings)}
              >
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

        {view === 'profiles' && (
          <ProfilesView
            profiles={profiles}
            onCreateProfile={createProfile}
            onSelectProfile={(profile) => {
              setCurrentProfile(profile);
              setView('binders');
            }}
            onDeleteProfile={deleteProfile}
          />
        )}

        {view === 'binders' && currentProfile && (
          <BindersView
            profile={currentProfile}
            onBack={() => {
              setCurrentProfile(null);
              setView('profiles');
            }}
            onCreateBinder={(binderData) => createBinder(currentProfile.id, binderData)}
            onSelectBinder={(binder) => {
              setSelectedBinder(binder);
              setCurrentPage(0);
              setView('binderView');
            }}
            onDeleteBinder={(binderId) => deleteBinder(currentProfile.id, binderId)}
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
            }}
            onEditCover={() => setView('editBinder')}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onRemoveCard={removeCardFromBinder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={searchCards}
            searchResults={searchResults}
            loading={loading}
            onAddCard={addCardToBinder}
            searchFilters={searchFilters}
            onFilterChange={setSearchFilters}
            sets={sets}
            showFilters={showFilters}
            onToggleFilters={setShowFilters}
            searchPage={searchPage}
            totalSearchPages={totalSearchPages}
            onSearchPageChange={(page) => searchCards(searchQuery, searchFilters, page)}
            draggedCard={draggedCard}
            onDragStart={setDraggedCard}
            onDragEnd={() => setDraggedCard(null)}
            onSwapCards={swapCards}
          />
        )}

        {view === 'editBinder' && selectedBinder && (
          <EditBinderCover
            binder={selectedBinder}
            onSave={(updates) => {
              updateBinder(currentProfile.id, selectedBinder.id, updates);
              setSelectedBinder({ ...selectedBinder, ...updates });
              setView('binderView');
            }}
            onCancel={() => setView('binderView')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Root with Router + Auth ──────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/binders"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/binder/:id"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
