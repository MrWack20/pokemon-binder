import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function UserMenu({ onOpenSettings }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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
    await signOut();
    navigate('/login');
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Trainer';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="btn btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fbbf24', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
            {initials}
          </div>
        )}
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        <ChevronDown size={16} style={{ opacity: 0.7, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '200px', zIndex: 100, background: 'rgba(30,41,59,0.97)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>{displayName}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <div style={{ padding: '6px' }}>
            <MenuItem icon={<Settings size={16} />} label="Settings" onClick={() => { setOpen(false); onOpenSettings?.(); }} />
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            <MenuItem icon={<LogOut size={16} />} label="Sign out" onClick={handleSignOut} danger />
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
      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: hover ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: '8px', color: danger ? '#f87171' : 'white', cursor: 'pointer', fontSize: '0.95rem', textAlign: 'left', transition: 'background 0.15s' }}
    >
      {icon}{label}
    </button>
  );
}
