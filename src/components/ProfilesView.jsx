import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function ProfilesView({ profiles, onCreateProfile, onSelectProfile, onDeleteProfile }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const handleCreate = async () => {
    if (newProfileName.trim()) {
      await onCreateProfile(newProfileName);
      setNewProfileName('');
      setShowCreate(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2>Your Profiles</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={20} />
          New Profile
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3>Create New Profile</h3>
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Profile Name"
            className="input"
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="button-group">
            <button onClick={handleCreate} className="btn btn-success">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid">
        {profiles.map(profile => (
          <div key={profile.id} className="card">
            <h3>{profile.name}</h3>
            <p className="text-muted">{profile.binders?.length || 0} binder(s)</p>
            <div className="button-group">
              <button onClick={() => onSelectProfile(profile)} className="btn btn-info">Open</button>
              <button onClick={() => confirm('Delete this profile?') && onDeleteProfile(profile.id)} className="btn btn-danger">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}