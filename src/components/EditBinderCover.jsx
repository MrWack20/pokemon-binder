import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

export default function EditBinderCover({ binder, onSave, onCancel }) {
  const [coverData, setCoverData] = useState({
    coverColor: binder.coverColor,
    coverText: binder.coverText || binder.name,
    coverImage: binder.coverImage || null
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverData({ ...coverData, coverImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2>Edit Binder Cover</h2>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3>Cover Settings</h3>
          <div className="form-group">
            <label>Cover Text</label>
            <input
              type="text"
              value={coverData.coverText}
              onChange={(e) => setCoverData({ ...coverData, coverText: e.target.value })}
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Cover Color</label>
            <input
              type="color"
              value={coverData.coverColor}
              onChange={(e) => setCoverData({ ...coverData, coverColor: e.target.value })}
              className="color-input"
            />
          </div>
          <div className="form-group">
            <label>Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="input"
            />
            {coverData.coverImage && (
              <button 
                onClick={() => setCoverData({ ...coverData, coverImage: null })}
                className="btn btn-secondary"
                style={{ marginTop: '10px', width: '100%' }}
              >
                <X size={16} />
                Remove Image
              </button>
            )}
          </div>
          <div className="button-group">
            <button onClick={() => onSave(coverData)} className="btn btn-success">
              <Save size={20} />
              Save Changes
            </button>
            <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          </div>
        </div>

        <div className="card">
          <h3>Preview</h3>
          <div className="binder-cover-preview" style={{ 
            backgroundColor: coverData.coverColor,
            backgroundImage: coverData.coverImage ? `url(${coverData.coverImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            <h2 style={{ 
              textShadow: coverData.coverImage ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
              color: coverData.coverImage ? '#fff' : 'inherit'
            }}>
              {coverData.coverText}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}