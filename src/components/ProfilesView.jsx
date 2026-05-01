'use client';

import React, { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUpdateProfile } from '../hooks/queries.js';

/**
 * ProfilesView — shows the current user's profile and allows renaming it.
 * In the Supabase model each user has exactly one profile (created on sign-up).
 */
export default function ProfilesView() {
  const { profile, setProfile, user } = useAuth();
  const updateProfileMut = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const saving = updateProfileMut.isPending;

  const handleSave = async () => {
    if (!name.trim() || !profile) return;
    try {
      const data = await updateProfileMut.mutateAsync({
        profileId: profile.id,
        userId: user?.id,
        updates: { name: name.trim() },
      });
      if (data) setProfile(data);
    } finally {
      setEditing(false);
    }
  };

  if (!profile) return null;

  return (
    <div>
      <div className="section-header">
        <h2>Your Profile</h2>
      </div>

      <div className="card" style={{ maxWidth: '480px' }}>
        {!editing ? (
          <>
            <h3>{profile.name}</h3>
            <p className="text-muted">{user?.email}</p>
            <div className="button-group">
              <button onClick={() => { setName(profile.name); setEditing(true); }} className="btn btn-secondary">
                <Edit2 size={16} />Edit Name
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="button-group">
              <button onClick={handleSave} className="btn btn-success" disabled={saving}>
                <Save size={16} />{saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-secondary">
                <X size={16} />Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
