import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Mail, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../../services/supabaseAuth.js';
import { runDiagnostics } from '../../supabase.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diag, setDiag] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) setError(`${err.message} — open DevTools console for details.`);
    else setSent(true);
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    setDiag(null);
    try {
      const report = await runDiagnostics();
      setDiag(report);
    } finally {
      setDiagnosing(false);
    }
  }

  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Book size={40} /><h1 style={{ fontSize: '2rem', margin: 0 }}>PokeBinder</h1>
          </div>
          <p style={{ opacity: 0.7 }}>Reset your password</p>
        </div>

        <div className="card">
          {!sent ? (
            <>
              <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Forgot password?</h2>
              <p style={{ opacity: 0.7, textAlign: 'center', marginBottom: '24px', fontSize: '0.95rem' }}>
                Enter your email and we'll send you a reset link.
              </p>
              {error && <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ paddingLeft: '40px' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  <Mail size={18} />{loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📬</div>
              <h2 style={{ marginBottom: '12px' }}>Check your inbox</h2>
              <p style={{ opacity: 0.7, marginBottom: '12px', fontSize: '0.95rem' }}>
                If <strong>{email}</strong> has an account, a reset link is on its way.
              </p>
              <p style={{ opacity: 0.55, marginBottom: '20px', fontSize: '0.82rem', lineHeight: 1.5 }}>
                Not arriving? Check <strong>spam</strong>, wait a minute, and try again.
                Free-tier Supabase limits to ~3 reset emails/hour.
              </p>
              <Link to="/login"><button className="btn btn-secondary" style={{ justifyContent: 'center' }}>Back to sign in</button></Link>
            </div>
          )}

          {/* Diagnostics — visible on both states so the user can self-test */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={handleDiagnose}
              disabled={diagnosing}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '8px 14px' }}
            >
              {diagnosing ? 'Running…' : 'Test Supabase connection'}
            </button>
            {diag && (
              <div style={{ marginTop: '12px', fontSize: '0.78rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6 }}>
                <div>env.url: {diag.env.url}</div>
                <div>env.anonKey: {diag.env.anonKey}</div>
                <div>auth.getSession: {diag.auth.getSession}</div>
                <div>db.ping: {diag.db.ping}</div>
                <div style={{ marginTop: '6px', color: diag.ok ? '#4ade80' : '#f87171' }}>
                  {diag.ok ? '✓ healthy' : '✗ problems detected — see console'}
                </div>
              </div>
            )}
          </div>
        </div>

        {!sent && (
          <p style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
              <ArrowLeft size={16} />Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
