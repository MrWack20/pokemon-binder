'use client';

import React, { useState } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import { useTcgNews } from '@/hooks/queries';

const GAME_LABELS = {
  pokemon:  '🎴 Pokémon',
  mtg:      '⚔️ MTG',
  yugioh:   '🐉 Yu-Gi-Oh!',
  onepiece: '🏴‍☠️ One Piece',
};

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Home-page TCG news feed. Aggregates curated RSS sources via the
 * /api/news route handler — no direct browser scraping, no third-party
 * news SDKs. Each item links out to the original publisher (target=_blank,
 * rel=noopener noreferrer) so we never re-host their content.
 *
 * Tabbed by game so the user can filter to what they care about, but
 * defaults to "All" to surface the broadest signal.
 */
export default function NewsSection() {
  const { data, isLoading, error } = useTcgNews();
  const [filter, setFilter] = useState('all');

  if (isLoading) {
    return (
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <Newspaper size={20} />
          <h3>TCG News</h3>
        </div>
        <div className="news-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-skeleton news-card-skeleton" aria-hidden="true">
              <div className="card-skeleton__name" />
              <div className="card-skeleton__meta" />
              <div className="card-skeleton__meta" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // On error, don't break the dashboard — quietly omit the section.
  // The error is logged server-side; users don't need to see broken news.
  if (error || !data?.items?.length) return null;

  const items = filter === 'all' ? data.items : data.items.filter(i => i.game === filter);
  const gamesPresent = Array.from(new Set(data.items.map(i => i.game))).sort();

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <Newspaper size={20} />
        <h3>TCG News</h3>
        <span className="dashboard-section__hint">
          From verified publishers · updates every 30 min
        </span>
      </div>

      {gamesPresent.length > 1 && (
        <div className="news-tabs" role="tablist" aria-label="Filter news by game">
          <button
            role="tab"
            aria-selected={filter === 'all'}
            className={`news-tab${filter === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {gamesPresent.map(game => (
            <button
              key={game}
              role="tab"
              aria-selected={filter === game}
              className={`news-tab${filter === game ? ' is-active' : ''}`}
              onClick={() => setFilter(game)}
            >
              {GAME_LABELS[game] || game}
            </button>
          ))}
        </div>
      )}

      <div className="news-grid">
        {items.slice(0, 6).map(item => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="news-card"
            title={`Read on ${item.sourceLabel}`}
          >
            {item.image && (
              <div
                className="news-card__image"
                style={{ backgroundImage: `url(${item.image})` }}
                aria-hidden="true"
              />
            )}
            <div className="news-card__body">
              <div className="news-card__meta-row">
                <span className="news-card__source">{item.sourceLabel}</span>
                <span className="news-card__time">
                  <Clock size={11} />{timeAgo(item.publishedAt)}
                </span>
              </div>
              <h4 className="news-card__title">{item.title}</h4>
              {item.summary && (
                <p className="news-card__summary">{item.summary}</p>
              )}
              <span className="news-card__cta">
                Read on {item.sourceLabel}
                <ExternalLink size={11} />
              </span>
            </div>
          </a>
        ))}
      </div>

      {items.length === 0 && (
        <p style={{ textAlign: 'center', padding: '24px 0', opacity: 0.5 }}>
          No recent {GAME_LABELS[filter] || filter} news.
        </p>
      )}
    </section>
  );
}
