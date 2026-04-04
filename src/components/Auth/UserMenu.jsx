import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, Loader, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);
    if (error) {
      toast.error('Sign out failed. Please try again.');
    }
    // ProtectedRoute handles redirect to /login when user becomes null
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Trainer';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        disabled={signingOut}
        className="btn btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}
      >
        {signingOut ? (
          <Loader size={20} className="spinning" />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt={displayName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fbbf24', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {signingOut ? 'Signing out…' : displayName}
        </span>
        {!signingOut && (
          <ChevronDown size={16} style={{ opacity: 0.7, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
        )}
      </button>

      {open && !signingOut && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <div style={{ fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <div style={{ padding: '6px' }}>
            <MenuItem
              icon={<BarChart2 size={16} />}
              label="Statistics"
              onClick={() => { setOpen(false); navigate('/stats'); }}
            />
            <MenuItem
              icon={<Settings size={16} />}
              label="Settings"
              onClick={() => { setOpen(false); navigate('/settings'); }}
            />
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 6px' }} />
            <MenuItem
              icon={<LogOut size={16} />}
              label="Sign out"
              onClick={handleSignOut}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: '9px 12px',
        background: hover ? (danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)') : 'transparent',
        border: 'none', borderRadius: '8px',
        color: danger ? '#f87171' : 'white',
        cursor: 'pointer', fontSize: '0.95rem', textAlign: 'left',
        transition: 'background 0.15s',
      }}
    >
      {icon}{label}
    </button>
  );
}
