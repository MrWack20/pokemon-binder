'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Eye, Copy, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BindersView({ profile, binders, onCreateBinder, onSelectBinder, onDeleteBinder, onDuplicateBinder }) {
  const [showCreate, setShowCreate] = useState(false);
  const [sortOrder, setSortOrder] = useState('date_asc');
  const [binderForm, setBinderForm] = useState({
    name: '',
    rows: 3,
    cols: 3,
    pages: 10,
    coverColor: '#3b82f6',
    coverText: '',
    coverImageFile: null,
    coverImagePreview: null,
    defaultGame: 'pokemon',
  });

  const handleCreate = async () => {
    if (!binderForm.name.trim()) return;
    await onCreateBinder({
      name: binderForm.name,
      rows: binderForm.rows,
      cols: binderForm.cols,
      pages: binderForm.pages,
      coverColor: binderForm.coverColor,
      coverText: binderForm.coverText,
      coverImageFile: binderForm.coverImageFile,
    });
    setBinderForm({ name: '', rows: 3, cols: 3, pages: 10, coverColor: '#3b82f6', coverText: '', coverImageFile: null, coverImagePreview: null, defaultGame: 'pokemon' });
    setShowCreate(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBinderForm({
        ...binderForm,
        coverImageFile: file,
        coverImagePreview: URL.createObjectURL(file),
      });
    }
  };

  const removeImage = () => {
    if (binderForm.coverImagePreview) URL.revokeObjectURL(binderForm.coverImagePreview);
    setBinderForm({ ...binderForm, coverImageFile: null, coverImagePreview: null });
  };

  const totalCapacity = binderForm.rows * binderForm.cols * binderForm.pages;
  const suggestedPages = Math.ceil(1025 / (binderForm.rows * binderForm.cols));

  const sortedBinders = useMemo(() => {
    const arr = [...binders];
    if (sortOrder === 'name_asc') arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name_desc') arr.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === 'date_asc') arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortOrder === 'date_desc') arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [binders, sortOrder]);

  return (
    <div>
      <div className="section-header">
        <h2>{profile?.name ? `${profile.name}'s Binders` : 'Your Binders'}</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="binders-sort">
            <ArrowUpDown size={15} style={{ opacity: 0.6 }} />
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input binders-sort__select">
              <option value="date_asc">Oldest first</option>
              <option value="date_desc">Newest first</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={20} />New Binder
          </button>
        </div>
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
            maxLength={60}
          />
          <div className="form-row">
            <div className="form-group">
              <label>Rows per page</label>
              <input type="number" min="1" max="10" value={binderForm.rows}
                onChange={(e) => setBinderForm({ ...binderForm, rows: parseInt(e.target.value) })}
                className="input" />
            </div>
            <div className="form-group">
              <label>Columns per page</label>
              <input type="number" min="1" max="10" value={binderForm.cols}
                onChange={(e) => setBinderForm({ ...binderForm, cols: parseInt(e.target.value) })}
                className="input" />
            </div>
          </div>
          <div className="form-group">
            <label>Number of Pages</label>
            <input type="number" min="1" max="500" value={binderForm.pages}
              onChange={(e) => setBinderForm({ ...binderForm, pages: parseInt(e.target.value) })}
              className="input" />
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
            <label>Default Game</label>
            <select
              value={binderForm.defaultGame}
              onChange={e => setBinderForm({ ...binderForm, defaultGame: e.target.value })}
              className="input"
            >
              <option value="pokemon">🎴 Pokémon TCG</option>
              <option value="mtg">⚔️ Magic: The Gathering</option>
              <option value="yugioh">🐉 Yu-Gi-Oh!</option>
              <option value="onepiece">🏴‍☠️ One Piece TCG</option>
            </select>
          </div>
          <div className="form-group">
            <label>Cover Image (Optional)</label>
            <input type="file" accept="image/*" onChange={handleImageSelect} className="input" />
            {binderForm.coverImagePreview && (
              <div style={{ marginTop: '10px' }}>
                <img src={binderForm.coverImagePreview} alt="Cover preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                <button onClick={removeImage} className="btn btn-secondary" style={{ marginTop: '5px' }}>
                  Remove Image
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Cover Color</label>
            <input type="color" value={binderForm.coverColor}
              onChange={(e) => setBinderForm({ ...binderForm, coverColor: e.target.value })}
              className="color-input" />
          </div>
          <input type="text" value={binderForm.coverText}
            onChange={(e) => setBinderForm({ ...binderForm, coverText: e.target.value })}
            placeholder="Cover Text (optional)"
            className="input"
            maxLength={40} />
          <div className="button-group">
            <button onClick={handleCreate} className="btn btn-success">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid">
        {sortedBinders.map(binder => {
          const cardCount = parseInt(binder.binder_cards?.[0]?.count ?? 0);
          const totalSlots = binder.rows * binder.cols * binder.pages;
          return (
            <div key={binder.id} className="binder-card">
              <div
                className="binder-cover"
                style={{
                  backgroundColor: binder.cover_color,
                  backgroundImage: binder.cover_image_url ? `url(${binder.cover_image_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <h3 style={{
                  textShadow: binder.cover_image_url ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  color: binder.cover_image_url ? '#fff' : 'inherit',
                }}>
                  {binder.cover_text || binder.name}
                </h3>
              </div>
              <div className="binder-info">
                <h4>{binder.name}</h4>
                <p className="text-muted">
                  {binder.rows}×{binder.cols} grid · {binder.pages} pages
                </p>
                <p className="text-muted">{cardCount}/{totalSlots} cards</p>
                <div className="button-group">
                  <button onClick={() => onSelectBinder(binder)} className="btn btn-info">
                    <Eye size={16} />View
                  </button>
                  <button
                    onClick={() => onDuplicateBinder?.(binder.id, binder.name)}
                    className="btn btn-secondary"
                    title="Duplicate binder"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => {
                      toast((t) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span>Delete <strong>{binder.name}</strong>? This cannot be undone.</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => { toast.dismiss(t.id); onDeleteBinder(binder.id); }}
                              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
                            >Delete</button>
                            <button
                              onClick={() => toast.dismiss(t.id)}
                              style={{ background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
                            >Cancel</button>
                          </div>
                        </div>
                      ), { duration: Infinity });
                    }}
                    className="btn btn-danger"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
