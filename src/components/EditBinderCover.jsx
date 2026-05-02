'use client';

import React, { useState } from 'react';
import { Save, X, Upload, Globe, Lock, Copy, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

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
    is_public: !!binder.is_public,
  });

  // A new File selected by the user (not yet uploaded)
  const [imageFile, setImageFile] = useState(null);
  // Local preview URL — either a blob URL for a new file or the existing URL
  const [imagePreview, setImagePreview] = useState(binder.cover_image_url ?? null);

  const [linkCopied, setLinkCopied] = useState(false);

  // Share URL — same origin as the app, /share/<binderId>. Only meaningful when
  // is_public is true (and only after Save persists that to the DB).
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${binder.id}`
    : `/share/${binder.id}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success('Share link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Long-press the link to copy manually.');
    }
  };

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

          {/* Visibility — opt-in public sharing */}
          <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={coverData.is_public}
                onChange={(e) => setCoverData({ ...coverData, is_public: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              {coverData.is_public ? <Globe size={16} /> : <Lock size={16} />}
              Make this binder public
            </label>
            <p style={{ fontSize: '0.85rem', opacity: 0.65, margin: '6px 0 0 26px', lineHeight: 1.4 }}>
              {coverData.is_public
                ? 'Anyone with the link can view this binder (read-only). Cards and value will be visible.'
                : 'Only you can view this binder.'}
            </p>

            {/* Share link surface — only meaningful when the saved DB value
                is true. While the user is toggling on but hasn't saved yet,
                we still show the URL but tell them to save first. */}
            {coverData.is_public && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                    className="input"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="btn btn-secondary"
                    title="Copy share link"
                    style={{ flexShrink: 0 }}
                  >
                    {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    title="Open in a new tab"
                    style={{ flexShrink: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
                {!binder.is_public && (
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '6px 0 0', color: '#fbbf24' }}>
                    Click <strong>Save Changes</strong> below to publish this binder.
                  </p>
                )}
              </div>
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
