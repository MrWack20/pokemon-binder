import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ opacity: 0.7, marginBottom: '8px', fontSize: '0.95rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p style={{ opacity: 0.5, marginBottom: '24px', fontSize: '0.85rem' }}>
            Your collection data is safe — this is a display error only.
          </p>
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={18} /> Reload page
          </button>
        </div>
      </div>
    );
  }
}
