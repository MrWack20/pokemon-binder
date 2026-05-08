'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Lock, Copy, Check, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateBinder } from '@/hooks/queries';

/**
 * ShareBinderModal — the single canonical place to flip a binder between
 * public and private and grab its share link.
 *
 * Self-contained:
 *  - reads `profile` from useAuth
 *  - calls useUpdateBinder mutation directly (so React Query keeps the
 *    binders list in sync everywhere — header, BindersView, BinderView)
 *  - takes only `binder` (with id, name, is_public) and `onClose`
 *
 * Triggered from both BinderView's header AND each card in BindersView.
 * The previous in-EditBinderCover toggle has been removed to avoid
 * double-source-of-truth bugs (race when both views try to flip is_public).
 */
export default function ShareBinderModal({ binder, onClose }) {
  const { profile } = useAuth();
  const updateMut = useUpdateBinder();
  const [linkCopied, setLinkCopied] = useState(false);

  const isPublic = !!binder.is_public;
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${binder.id}`
      : `/share/${binder.id}`;

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function togglePublic() {
    if (!profile?.id) return;
    try {
      await updateMut.mutateAsync({
        binderId: binder.id,
        profileId: profile.id,
        updates: { is_public: !isPublic },
      });
      toast.success(isPublic ? 'Binder is now private.' : 'Binder is now public!');
    } catch (err) {
      console.error('togglePublic:', err);
      toast.error('Failed to update visibility.');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success('Share link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Long-press the link to copy manually.');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="share-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Share binder"
      >
        <button
          className="share-modal__close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <X size={20} />
        </button>

        <div className="share-modal__header">
          <div
            className="share-modal__icon"
            style={{
              background: isPublic ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
              color: isPublic ? '#10b981' : 'rgba(255,255,255,0.7)',
            }}
          >
            {isPublic ? <Globe size={32} /> : <Lock size={32} />}
          </div>
          <h2 className="share-modal__title">
            {isPublic ? 'Public binder' : 'Private binder'}
          </h2>
          <p className="share-modal__subtitle">{binder.name}</p>
        </div>

        {isPublic ? (
          <>
            <p className="share-modal__desc">
              Anyone with this link can view your binder. Card images, set names,
              and total value are visible — but viewers can&apos;t edit anything.
            </p>

            <div className="share-modal__link-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="input share-modal__link-input"
              />
              <button
                onClick={copyLink}
                className="btn btn-secondary share-modal__link-btn"
                title="Copy link"
                type="button"
              >
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary share-modal__link-btn"
                title="Open in a new tab"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <button
              onClick={togglePublic}
              className="btn btn-secondary share-modal__primary-action"
              disabled={updateMut.isPending}
              type="button"
            >
              <Lock size={16} />
              {updateMut.isPending ? 'Updating…' : 'Make private'}
            </button>
          </>
        ) : (
          <>
            <p className="share-modal__desc">
              Only you can view this binder right now. Make it public to get a
              shareable read-only link you can post on Discord, Twitter, or
              forums.
            </p>

            <button
              onClick={togglePublic}
              className="btn btn-primary share-modal__primary-action"
              disabled={updateMut.isPending}
              type="button"
            >
              <Globe size={16} />
              {updateMut.isPending ? 'Publishing…' : 'Make public'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
