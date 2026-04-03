import React, { useState } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';

export default function BindersView({ profile, binders, onCreateBinder, onSelectBinder, onDeleteBinder }) {
  const [showCreate, setShowCreate] = useState(false);
  const [binderForm, setBinderForm] = useState({
    name: '',
    rows: 3,
    cols: 3,
    pages: 10,
    coverColor: '#3b82f6',
    coverText: '',
    coverImageFile: null,
    coverImagePreview: null,
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
    setBinderForm({ name: '', rows: 3, cols: 3, pages: 10, coverColor: '#3b82f6', coverText: '', coverImageFile: null, coverImagePreview: null });
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

  return (
    <div>
      <div className="section-header">
        <h2>{profile?.name}'s Binders</h2>
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
            className="input" />
          <div className="button-group">
            <button onClick={handleCreate} className="btn btn-success">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid">
        {binders.map(binder => {
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
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => confirm('Delete this binder?') && onDeleteBinder(binder.id)}
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
