import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Lock, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { updatePassword } from '../../services/supabaseAuth.js';

/**
 * Handles password reset links sent by Supabase.
 * Supabase redirects to /auth/reset-password with a recovery token.
 * onAuthStateChange fires PASSWORD_RECOVERY → AuthContext sets user.
 * We wait for the user/loading to resolve, then show the new-password form.
 */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true);
    const { error: err } = await updatePassword(password);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      navigate('/', { replace: true });
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Verifying reset link…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Invalid or expired reset link.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/forgot-password')}>
          Request a new link
        </button>
      </div>
    );
  }

  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Book size={40} /><h1 style={{ fontSize: '2rem', margin: 0 }}>PokeBinder</h1>
          </div>
          <p style={{ opacity: 0.7 }}>Set a new password</p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>New password</h2>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  type="password"
                  className="input"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                  autoFocus
                />
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Save size={18} />{saving ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
