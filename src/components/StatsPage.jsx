import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { ArrowLeft, TrendingUp, Package, DollarSign, BookOpen, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCollectionStats } from '../hooks/queries.js';

const CHART_COLORS = ['#fbbf24', '#3b82f6', '#10b981', '#f87171', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'];

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£' };

// ── Custom chart tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, symbol }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '4px', color: '#fbbf24' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#fff', margin: 0 }}>
          {p.name}: {p.name.toLowerCase().includes('value') ? `${symbol}${Number(p.value).toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Stat summary card ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ color }}>
        <Icon size={28} />
      </div>
      <div className="stat-card__body">
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
        {sub && <p className="stat-card__sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: loading, error } = useCollectionStats(profile?.id);

  const savedSettings = (() => { try { return JSON.parse(localStorage.getItem('pokemonBinderSettings') || '{}'); } catch { return {}; } })();
  const currency = savedSettings.currency || 'USD';
  const symbol = CURRENCY_SYMBOL[currency] || '$';

  return (
    <div className="app">
      <div className="container">
        <div className="stats-page">

          {/* Header */}
          <div className="stats-header">
            <button onClick={() => navigate('/')} className="btn btn-secondary">
              <ArrowLeft size={18} />My Binders
            </button>
            <h2>Collection Statistics</h2>
            <div style={{ width: '130px' }} />
          </div>

          {loading && (
            <div className="stats-loading">
              <RefreshCw size={32} className="spinning" />
              <p>Loading your stats…</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
              Failed to load statistics.
            </div>
          )}

          {stats && !loading && (
            <>
              {/* Summary row */}
              <div className="stat-cards-row">
                <StatCard
                  icon={BookOpen}
                  label="Binders"
                  value={stats.totalBinders}
                  color="#3b82f6"
                />
                <StatCard
                  icon={Package}
                  label="Total Cards"
                  value={stats.totalCards.toLocaleString()}
                  color="#10b981"
                />
                <StatCard
                  icon={DollarSign}
                  label="Collection Value"
                  value={`${symbol}${stats.totalValue.toFixed(2)}`}
                  sub={stats.totalCards > 0
                    ? `avg ${symbol}${(stats.totalValue / stats.totalCards).toFixed(2)} per card`
                    : null}
                  color="#fbbf24"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Sets Represented"
                  value={stats.topSets.length > 0
                    ? `${stats.topSets.length}+`
                    : '—'}
                  color="#a78bfa"
                />
              </div>

              {/* Growth over time */}
              {stats.growthOverTime?.length >= 2 && (
                <div className="card stats-chart-card" style={{ marginBottom: '20px' }}>
                  <h3>Collection Growth</h3>
                  <p className="stats-chart-card__sub">Total cards in your collection over time</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats.growthOverTime} margin={{ top: 8, right: 8, left: -10, bottom: 40 }}>
                      <defs>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                      <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip symbol="" />} />
                      <Area type="monotone" dataKey="total" name="Total Cards" stroke="#3b82f6" fill="url(#growthGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Charts row */}
              {(stats.topSets.length > 0 || stats.binderValues.length > 0) && (
                <div className="stats-charts-row">

                  {stats.topSets.length > 0 && (
                    <div className="card stats-chart-card">
                      <h3>Cards by Set</h3>
                      <p className="stats-chart-card__sub">Top sets in your collection</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats.topSets} margin={{ top: 8, right: 8, left: -10, bottom: 60 }}>
                          <XAxis
                            dataKey="shortName"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip symbol={symbol} />} />
                          <Bar dataKey="count" name="Cards" radius={[4, 4, 0, 0]}>
                            {stats.topSets.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {stats.binderValues.length > 0 && (
                    <div className="card stats-chart-card">
                      <h3>Value by Binder</h3>
                      <p className="stats-chart-card__sub">Total market value per binder ({currency})</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats.binderValues} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
                          <XAxis
                            dataKey="shortName"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickFormatter={v => `${symbol}${v}`} />
                          <Tooltip content={<ChartTooltip symbol={symbol} />} />
                          <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                            {stats.binderValues.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Most valuable + Recently added */}
              <div className="stats-lists-row">

                {stats.mostValuable.length > 0 && (
                  <div className="card">
                    <h3>Most Valuable Cards</h3>
                    <p className="stats-chart-card__sub" style={{ marginBottom: '16px' }}>
                      Top cards across all binders
                    </p>
                    <div className="stats-card-list">
                      {stats.mostValuable.map((card, i) => (
                        <div key={card.id} className="stats-card-row">
                          <span className="stats-card-row__rank">{i + 1}</span>
                          <img
                            src={card.card_image_url}
                            alt={card.card_name}
                            className="stats-card-row__img"
                          />
                          <div className="stats-card-row__info">
                            <p className="stats-card-row__name">{card.card_name}</p>
                            <p className="stats-card-row__set">{card.card_set} · {card.binder_name}</p>
                          </div>
                          <span className="stats-card-row__price">
                            {symbol}{Number(card.card_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.recentlyAdded.length > 0 && (
                  <div className="card">
                    <h3>Recently Added</h3>
                    <p className="stats-chart-card__sub" style={{ marginBottom: '16px' }}>
                      Your latest additions
                    </p>
                    <div className="stats-card-list">
                      {stats.recentlyAdded.map(card => (
                        <div key={card.id} className="stats-card-row">
                          <img
                            src={card.card_image_url}
                            alt={card.card_name}
                            className="stats-card-row__img"
                          />
                          <div className="stats-card-row__info">
                            <p className="stats-card-row__name">{card.card_name}</p>
                            <p className="stats-card-row__set">{card.card_set} · {card.binder_name}</p>
                          </div>
                          <span className="stats-card-row__date">
                            {new Date(card.added_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Per-game breakdown */}
              {stats.gameBreakdown?.length > 1 && (
                <div className="card stats-chart-card" style={{ marginBottom: '20px' }}>
                  <h3>Collection by Game</h3>
                  <p className="stats-chart-card__sub">Cards and value across TCG games</p>
                  <div className="stats-game-row">
                    {stats.gameBreakdown.map((g, i) => (
                      <div key={g.game} className="stats-game-card" style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                        <p className="stats-game-card__label">{g.label}</p>
                        <p className="stats-game-card__count">{g.count.toLocaleString()} cards</p>
                        {g.value > 0 && <p className="stats-game-card__value">{symbol}{g.value.toFixed(2)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {stats.totalCards === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <h3 style={{ marginBottom: '8px' }}>No cards yet</h3>
                  <p style={{ opacity: 0.55 }}>
                    Add cards to your binders and your stats will appear here.
                  </p>
                  <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '20px', justifyContent: 'center' }}>
                    Go to My Binders
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
