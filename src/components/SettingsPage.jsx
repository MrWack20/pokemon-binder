'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Lock, Mail, Palette, ArrowLeft, LogOut, DollarSign, Download, FileText, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import { BACKGROUND_THEMES } from '@/constants/themes';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/queries';
import { updateEmail, updatePassword } from '@/services/supabaseAuth';
import { createClient } from '@/lib/supabase/client';
import { exportCollectionCsv, exportCollectionJson } from '@/lib/export';

const SETTINGS_KEY = 'pokemonBinderSettings';

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : { backgroundTheme: 'default' };
  } catch {
    return { backgroundTheme: 'default' };
  }
}

export default function SettingsPage() {
  const { user, profile, setProfile, signOut } = useAuth();
  const router = useRouter();
  const updateProfileMut = useUpdateProfile();

  const [selectedTheme, setSelectedTheme] = useState(() => loadSettings().backgroundTheme);
  const [currency, setCurrency] = useState(() => loadSettings().currency || 'USD');
  const [displayName, setDisplayName] = useState(profile?.name ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const savingName = updateProfileMut.isPending;

  /**
   * Pull every binder + its cards for this profile in a single Supabase query
   * (FK embedding), build a `cards`-array shape per binder, then hand off to
   * the format-specific exporter. Skips the React Query layer because this is
   * a one-shot click handler — no cache invalidation needed.
   */
  async function fetchCollectionForExport() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('binders')
      .select(`
        id, name, rows, cols, pages, cover_color, cover_text, default_game,
        binder_cards (
          slot_index, card_api_id, card_name, card_image_url, card_set,
          card_game, card_price, card_price_currency, added_at
        )
      `)
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(b => ({
      ...b,
      // Match the shape exportBinderCsv / exportCollectionCsv expect:
      // an array of card rows, not the FK-embedded `binder_cards`.
      cards: b.binder_cards || [],
    }));
  }

  async function handleExport(format) {
    if (!profile?.id) return;
    setExporting(true);
    try {
      const binders = await fetchCollectionForExport();
      const totalCards = binders.reduce((s, b) => s + (b.cards?.length || 0), 0);
      if (totalCards === 0) {
        toast('Your collection is empty — nothing to export.', { icon: '📭' });
        return;
      }
      if (format === 'csv') exportCollectionCsv(binders);
      else exportCollectionJson(binders);
      toast.success(`Exported ${totalCards} card${totalCards !== 1 ? 's' : ''} as ${format.toUpperCase()}.`);
    } catch (err) {
      console.error('export collection:', err);
      toast.error('Failed to export collection.');
    } finally {
      setExporting(false);
    }
  }

  const isOAuth = user?.app_metadata?.provider !== 'email';

  // Live-preview the theme on the page background as the user browses
  function handleThemeChange(key) {
    setSelectedTheme(key);
    const css = BACKGROUND_THEMES[key]?.css || BACKGROUND_THEMES.default.css;
    document.body.style.background = css;
  }

  function handleSaveTheme() {
    const settings = { ...loadSettings(), backgroundTheme: selectedTheme };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toast.success('Theme saved.');
  }

  function handleSaveCurrency() {
    const settings = { ...loadSettings(), currency };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toast.success('Currency saved.');
  }

  async function handleSaveName() {
    if (!displayName.trim()) return;
    try {
      const data = await updateProfileMut.mutateAsync({
        profileId: profile.id,
        userId: user?.id,
        updates: { name: displayName.trim() },
      });
      setProfile(data);
      toast.success('Display name updated.');
    } catch (err) {
      toast.error(err?.message || 'Failed to update name.');
    }
  }

  async function handleSaveEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    const { error } = await updateEmail(newEmail.trim());
    setSavingEmail(false);
    if (error) toast.error(error.message || 'Failed to update email.');
    else { toast.success('Confirmation sent to your new email address.'); setNewEmail(''); }
  }

  async function handleSavePassword() {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) toast.error(error.message || 'Failed to update password.');
    else { toast.success('Password updated.'); setNewPassword(''); setConfirmPassword(''); }
  }

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) toast.error('Sign out failed. Please try again.');
    // ProtectedRoute handles redirect when user becomes null
  }

  return (
    <div className="app">
      <div className="container">
        <div className="settings-page">

          <div className="settings-header">
            <button onClick={() => router.push('/')} className="btn btn-secondary">
              <ArrowLeft size={18} />Back to App
            </button>
            <h2>Settings</h2>
            <div style={{ width: '120px' }} /> {/* balance flex */}
          </div>

          <div className="settings-grid">

            {/* ── Appearance ──────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <Palette size={20} /><h3>Appearance</h3>
              </div>
              <p className="settings-card__desc">Choose a background theme for the app.</p>
              <div className="form-group">
                <label>Theme</label>
                <select value={selectedTheme} onChange={(e) => handleThemeChange(e.target.value)} className="input">
                  {Object.entries(BACKGROUND_THEMES).map(([key, theme]) => (
                    <option key={key} value={key}>{theme.name}</option>
                  ))}
                </select>
              </div>
              <div
                className="settings-theme-preview"
                style={{ background: BACKGROUND_THEMES[selectedTheme]?.css || BACKGROUND_THEMES.default.css }}
              />
              <button onClick={handleSaveTheme} className="btn btn-success">
                <Save size={16} />Save Theme
              </button>
            </section>

            {/* ── Display Name ────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <User size={20} /><h3>Display Name</h3>
              </div>
              <p className="settings-card__desc">Your name shown across the app.</p>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="Your display name"
                  maxLength={50}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
              </div>
              <button onClick={handleSaveName} className="btn btn-success" disabled={savingName || !displayName.trim()}>
                <Save size={16} />{savingName ? 'Saving…' : 'Save Name'}
              </button>
            </section>

            {/* ── Email ───────────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <Mail size={20} /><h3>Email Address</h3>
              </div>
              {user?.email && (
                <p className="settings-card__desc">
                  Current: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{user.email}</strong>
                </p>
              )}
              {isOAuth ? (
                <div className="settings-oauth-note">
                  Your email is managed by Google. Change it through your Google account.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>New Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input" placeholder="new@example.com" />
                  </div>
                  <button onClick={handleSaveEmail} className="btn btn-success" disabled={savingEmail || !newEmail.trim()}>
                    <Mail size={16} />{savingEmail ? 'Sending…' : 'Update Email'}
                  </button>
                </>
              )}
            </section>

            {/* ── Password ────────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <Lock size={20} /><h3>Password</h3>
              </div>
              {isOAuth ? (
                <div className="settings-oauth-note">
                  Your password is managed by Google.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="Min. 6 characters" />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input"
                      placeholder="Repeat new password"
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePassword()}
                    />
                  </div>
                  <button onClick={handleSavePassword} className="btn btn-success" disabled={savingPassword || !newPassword}>
                    <Lock size={16} />{savingPassword ? 'Saving…' : 'Update Password'}
                  </button>
                </>
              )}
            </section>

            {/* ── Currency ────────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <DollarSign size={20} /><h3>Currency</h3>
              </div>
              <p className="settings-card__desc">Used for card prices and collection value.</p>
              <div className="form-group">
                <label>Display Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
              <button onClick={handleSaveCurrency} className="btn btn-success">
                <Save size={16} />Save Currency
              </button>
            </section>

            {/* ── Export collection ──────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <Download size={20} style={{ color: '#60a5fa' }} /><h3>Export collection</h3>
              </div>
              <p className="settings-card__desc">
                Download every card across all your binders. CSV opens in any spreadsheet
                tool. JSON preserves binder structure for re-import.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleExport('csv')}
                  className="btn btn-secondary"
                  disabled={exporting}
                  style={{ flex: 1, minWidth: '160px', justifyContent: 'center' }}
                >
                  <FileText size={16} />{exporting ? 'Preparing…' : 'Download CSV'}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="btn btn-secondary"
                  disabled={exporting}
                  style={{ flex: 1, minWidth: '160px', justifyContent: 'center' }}
                >
                  <FileJson size={16} />{exporting ? 'Preparing…' : 'Download JSON'}
                </button>
              </div>
            </section>

            {/* ── Sign Out ────────────────────────────────────────────── */}
            <section className="settings-card">
              <div className="settings-card__title">
                <LogOut size={20} style={{ color: '#f87171' }} /><h3>Account</h3>
              </div>
              <p className="settings-card__desc">Sign out of PokéBinder on this device.</p>
              <button onClick={handleSignOut} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
                <LogOut size={16} />Sign Out
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
