import React, { useState } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';

export default function BindersView({ profile, onBack, onCreateBinder, onSelectBinder, onDeleteBinder }) {
  const [showCreate, setShowCreate] = useState(false);
  const [binderForm, setBinderForm] = useState({
    name: '',
    rows: 3,
    cols: 3,
    pages: 10,
    coverColor: '#3b82f6',
    coverText: '',
    coverImage: null
  });

  const handleCreate = async () => {
    if (binderForm.name.trim()) {
      await onCreateBinder(binderForm);
      setBinderForm({ name: '', rows: 3, cols: 3, pages: 10, coverColor: '#3b82f6', coverText: '', coverImage: null });
      setShowCreate(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBinderForm({ ...binderForm, coverImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const totalCapacity = binderForm.rows * binderForm.cols * binderForm.pages;
  const suggestedPages = Math.ceil(1025 / (binderForm.rows * binderForm.cols));

  return (
    <div>
      <div className="section-header">
        <div>
          <button onClick={onBack} className="back-button">← Back to Profiles</button>
          <h2>{profile.name}'s Binders</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={20} />
          New Binder
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3>Create New Binder</h3>
          <input
            type="text"
            value={binderForm.name}
            onChange={(e) => setBinderForm({ ...binderForm, name: e.target.value })}
            placeholder="Binder Name"
            className="input"
          />
          <div className="form-row">
            <div className="form-group">
              <label>Rows per page</label>
              <input
                type="number"
                min="1"
                max="10"
                value={binderForm.rows}
                onChange={(e) => setBinderForm({ ...binderForm, rows: parseInt(e.target.value) })}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Columns per page</label>
              <input
                type="number"
                min="1"
                max="10"
                value={binderForm.cols}
                onChange={(e) => setBinderForm({ ...binderForm, cols: parseInt(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Number of Pages</label>
            <input
              type="number"
              min="1"
              max="500"
              value={binderForm.pages}
              onChange={(e) => setBinderForm({ ...binderForm, pages: parseInt(e.target.value) })}
              className="input"
            />
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '5px' }}>
              Total capacity: <strong>{totalCapacity} cards</strong>
              {totalCapacity < 1025 && (
                <span style={{ color: '#fbbf24', display: 'block', marginTop: '5px' }}>
                  ⚠️ For all 1025 Pokemon, you need at least {suggestedPages} pages with this grid size
                </span>
              )}
              {totalCapacity >= 1025 && (
                <span style={{ color: '#10b981', display: 'block', marginTop: '5px' }}>
                  ✓ This binder can hold all 1025 Pokemon!
                </span>
              )}
            </p>
          </div>
          <div className="form-group">
            <label>Cover Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="input"
            />
            {binderForm.coverImage && (
              <div style={{ marginTop: '10px' }}>
                <img src={binderForm.coverImage} alt="Cover preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                <button 
                  onClick={() => setBinderForm({ ...binderForm, coverImage: null })}
                  className="btn btn-secondary"
                  style={{ marginTop: '5px' }}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Cover Color</label>
            <input
              type="color"
              value={binderForm.coverColor}
              onChange={(e) => setBinderForm({ ...binderForm, coverColor: e.target.value })}
              className="color-input"
            />
          </div>
          <input
            type="text"
            value={binderForm.coverText}
            onChange={(e) => setBinderForm({ ...binderForm, coverText: e.target.value })}
            placeholder="Cover Text (optional)"
            className="input"
          />
          <div className="button-group">
            <button onClick={handleCreate} className="btn btn-success">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid">
        {(profile.binders || []).map(binder => (
          <div key={binder.id} className="binder-card">
            <div className="binder-cover" style={{ 
              backgroundColor: binder.coverColor,
              backgroundImage: binder.coverImage ? `url(${binder.coverImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              <h3 style={{ 
                textShadow: binder.coverImage ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                color: binder.coverImage ? '#fff' : 'inherit'
              }}>
                {binder.coverText || binder.name}
              </h3>
            </div>
            <div className="binder-info">
              <h4>{binder.name}</h4>
              <p className="text-muted">
                {binder.rows}x{binder.cols} grid • {binder.pages} pages
              </p>
              <p className="text-muted">
                {binder.cards.filter(c => c).length}/{binder.cards.length} cards
              </p>
              <div className="button-group">
                <button onClick={() => onSelectBinder(binder)} className="btn btn-info">
                  <Eye size={16} />
                  View
                </button>
                <button onClick={() => confirm('Delete this binder?') && onDeleteBinder(binder.id)} className="btn btn-danger">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}