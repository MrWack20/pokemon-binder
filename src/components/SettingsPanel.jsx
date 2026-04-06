import React, { useState } from 'react';
import { X, Save, User, Lock, Mail, Palette } from 'lucide-react';
import { BACKGROUND_THEMES } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext.jsx';
import { updateProfile } from '../services/profileService.js';
import { updateEmail, updatePassword } from '../services/supabaseAuth.js';

export default function SettingsPanel({ settings, onSave, onClose }) {
  const { user, profile, setProfile } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);

  // Account fields
  const [displayName, setDisplayName] = useState(profile?.name ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Per-section feedback
  const [nameMsg, setNameMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const isOAuth = user?.app_metadata?.provider !== 'email';

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setSaving(true);
    setNameMsg(null);
    const { data, error } = await updateProfile(profile.id, { name: displayName.trim() });
    if (error) {
      setNameMsg({ type: 'error', text: error.message });
    } else {
      setProfile(data);
      setNameMsg({ type: 'success', text: 'Display name updated.' });
    }
    setSaving(false);
  }

  async function handleSaveEmail() {
    if (!newEmail.trim()) return;
    setSaving(true);
    setEmailMsg(null);
    const { error } = await updateEmail(newEmail.trim());
    if (error) {
      setEmailMsg({ type: 'error', text: error.message });
    } else {
      setEmailMsg({ type: 'success', text: 'Confirmation sent to new email address.' });
      setNewEmail('');
    }
    setSaving(false);
  }

  async function handleSavePassword() {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    setPasswordMsg(null);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  }

  return (
    <div className="card" style={{ marginBottom: '30px' }}>
      <div className="section-header">
        <h3>Settings</h3>
        <button onClick={onClose} className="btn btn-secondary">
          <X size={20} />
        </button>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Palette size={18} /> Appearance
        </h4>
        <div className="form-group">
          <label>Background Theme</label>
          <select
            value={localSettings.backgroundTheme}
            onChange={(e) => setLocalSettings({ ...localSettings, backgroundTheme: e.target.value })}
            className="input"
          >
            {Object.entries(BACKGROUND_THEMES).map(([key, theme]) => (
              <option key={key} value={key}>{theme.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { onSave(localSettings); }}
          className="btn btn-success"
          disabled={saving}
        >
          <Save size={16} /> Save Theme
        </button>
      </div>

      {/* ── Account ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '25px', marginBottom: '30px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <User size={18} /> Display Name
        </h4>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Your display name"
            maxLength={50}
          />
        </div>
        {nameMsg && (
          <p style={{ color: nameMsg.type === 'error' ? '#ff6b6b' : '#51cf66', marginBottom: '10px', fontSize: '0.875rem' }}>
            {nameMsg.text}
          </p>
        )}
        <button onClick={handleSaveName} className="btn btn-success" disabled={saving || !displayName.trim()}>
          <Save size={16} /> Update Name
        </button>
      </div>

      {/* ── Email ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '25px', marginBottom: '30px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <Mail size={18} /> Change Email
        </h4>
        {user?.email && (
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '12px' }}>Current: {user.email}</p>
        )}
        {isOAuth ? (
          <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Email is managed by your OAuth provider.</p>
        ) : (
          <>
            <div className="form-group">
              <label>New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
                placeholder="new@email.com"
              />
            </div>
            {emailMsg && (
              <p style={{ color: emailMsg.type === 'error' ? '#ff6b6b' : '#51cf66', marginBottom: '10px', fontSize: '0.875rem' }}>
                {emailMsg.text}
              </p>
            )}
            <button onClick={handleSaveEmail} className="btn btn-success" disabled={saving || !newEmail.trim()}>
              <Save size={16} /> Update Email
            </button>
          </>
        )}
      </div>

      {/* ── Password ────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '25px', marginBottom: '10px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Lock size={18} /> Change Password
        </h4>
        {isOAuth ? (
          <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Password is managed by your OAuth provider.</p>
        ) : (
          <>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Min. 6 characters"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repeat new password"
              />
            </div>
            {passwordMsg && (
              <p style={{ color: passwordMsg.type === 'error' ? '#ff6b6b' : '#51cf66', marginBottom: '10px', fontSize: '0.875rem' }}>
                {passwordMsg.text}
              </p>
            )}
            <button onClick={handleSavePassword} className="btn btn-success" disabled={saving || !newPassword}>
              <Save size={16} /> Update Password
            </button>
          </>
        )}
      </div>

      <div className="button-group" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '20px', marginTop: '10px' }}>
        <button onClick={onClose} className="btn btn-secondary">Close</button>
      </div>
    </div>
  );
}
