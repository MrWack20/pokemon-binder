import React, { useState } from 'react';
import { Save, X, Upload } from 'lucide-react';

/**
 * EditBinderCover — lets users change the cover color, text, and image.
 *
 * Cover images are uploaded to Supabase Storage by the parent (App.jsx).
 * This component tracks the selected File locally and passes it up via onSave.
 *
 * NOTE: A "binder-covers" storage bucket must exist in your Supabase project
 * (Storage → New bucket → name: binder-covers → Public: true).
 *
 * onSave(coverData, imageFile | null)
 *   coverData: { cover_color, cover_text, cover_image_url }
 *   imageFile: File if a new image was selected, null otherwise
 */
export default function EditBinderCover({ binder, onSave, onCancel }) {
  const [coverData, setCoverData] = useState({
    cover_color: binder.cover_color ?? '#3b82f6',
    cover_text: binder.cover_text ?? binder.name,
    cover_image_url: binder.cover_image_url ?? null,
  });

  // A new File selected by the user (not yet uploaded)
  const [imageFile, setImageFile] = useState(null);
  // Local preview URL — either a blob URL for a new file or the existing URL
  const [imagePreview, setImagePreview] = useState(binder.cover_image_url ?? null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imageFile) URL.revokeObjectURL(imagePreview); // free previous blob
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    if (imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setCoverData({ ...coverData, cover_image_url: null });
  };

  const handleSave = () => {
    onSave(coverData, imageFile);
  };

  return (
    <div>
      <div className="section-header">
        <h2>Edit Binder Cover</h2>
      </div>

      <div className="grid edit-cover-grid">
        {/* Settings panel */}
        <div className="card">
          <h3>Cover Settings</h3>

          <div className="form-group">
            <label>Cover Text</label>
            <input
              type="text"
              value={coverData.cover_text ?? ''}
              onChange={(e) => setCoverData({ ...coverData, cover_text: e.target.value })}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Cover Color</label>
            <input
              type="color"
              value={coverData.cover_color}
              onChange={(e) => setCoverData({ ...coverData, cover_color: e.target.value })}
              className="color-input"
            />
          </div>

          <div className="form-group">
            <label>Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="input"
            />
            {imageFile && (
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '4px' }}>
                <Upload size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                {imageFile.name} — will upload on save
              </p>
            )}
            {imagePreview && (
              <button
                onClick={handleRemoveImage}
                className="btn btn-secondary"
                style={{ marginTop: '10px', width: '100%' }}
              >
                <X size={16} />Remove Image
              </button>
            )}
          </div>

          <div className="button-group">
            <button onClick={handleSave} className="btn btn-success">
              <Save size={20} />Save Changes
            </button>
            <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          </div>
        </div>

        {/* Live preview */}
        <div className="card">
          <h3>Preview</h3>
          <div
            className="binder-cover-preview"
            style={{
              backgroundColor: coverData.cover_color,
              backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <h2 style={{
              textShadow: imagePreview ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
              color: imagePreview ? '#fff' : 'inherit',
            }}>
              {coverData.cover_text || binder.name}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
