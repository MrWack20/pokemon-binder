'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, Users, ExternalLink } from 'lucide-react';
import { usePublicBinders } from '@/hooks/queries';

/**
 * Home-page section that shows recently-shared public binders.
 *
 * Quietly hides itself when there are no public binders yet, so a fresh
 * Supabase project doesn't render an empty box. Once 4+ binders exist
 * the gallery becomes a discovery surface — users browse what others
 * have shared without needing a direct link.
 */
export default function CommunityBindersSection() {
  const { data: binders, isLoading, error } = usePublicBinders(8);

  if (isLoading) {
    return (
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <Users size={20} />
          <h3>Community binders</h3>
        </div>
        <div className="public-binders-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-skeleton" aria-hidden="true">
              <div className="card-skeleton__img" style={{ aspectRatio: '5 / 3' }} />
              <div className="card-skeleton__name" />
              <div className="card-skeleton__meta" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !binders || binders.length === 0) {
    // Hide the section entirely on error or empty — don't waste vertical
    // space with "no binders yet."
    return null;
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <Users size={20} />
        <h3>Community binders</h3>
        <span className="dashboard-section__hint">
          Recently shared by other trainers · click to view
        </span>
      </div>

      <div className="public-binders-grid">
        {binders.map(binder => {
          const cardCount = binder.binder_cards?.[0]?.count ?? 0;
          const ownerName = binder.profiles?.name || 'A trainer';
          return (
            <Link
              key={binder.id}
              href={`/share/${binder.id}`}
              className="public-binder-card"
            >
              <div
                className="public-binder-card__cover"
                style={{
                  backgroundColor: binder.cover_color || '#1f2937',
                  backgroundImage: binder.cover_image_url ? `url(${binder.cover_image_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="public-binder-card__public-badge">
                  <Globe size={10} />Public
                </span>
                <h4 style={{
                  textShadow: binder.cover_image_url ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  color: binder.cover_image_url ? '#fff' : 'inherit',
                }}>
                  {binder.cover_text || binder.name}
                </h4>
              </div>
              <div className="public-binder-card__meta">
                <p className="public-binder-card__owner">{ownerName}</p>
                <p className="public-binder-card__name">{binder.name}</p>
                <p className="public-binder-card__count">{cardCount} card{cardCount !== 1 ? 's' : ''}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
