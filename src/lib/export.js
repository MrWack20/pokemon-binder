// Phase 4.3 — pure-client export helpers.
//
// All exports run entirely in the browser: format the data, build a Blob,
// trigger a download via a temporary <a download>. No server endpoint
// needed because the data is already fetched (everything's in the React
// Query cache by the time the user clicks "Export").

// ── CSV formatting ──────────────────────────────────────────────────────────
//
// Conservative escape: wrap any field in quotes, double up internal quotes.
// Always quote — keeps the CSV valid regardless of the cell content.
function csvCell(value) {
  if (value === null || value === undefined) return '""';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

// ── Filename + blob plumbing ────────────────────────────────────────────────
//
// "Pikachu Deck — 2026-05-01.csv" sanitises to a filename Windows + macOS
// + Linux all accept.
function sanitizeFilename(name) {
  return String(name || 'export')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'export';
}

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function triggerDownload(blob, filename) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick — some browsers cancel the download if we
  // revoke synchronously before the click event has finished.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ── Schema ──────────────────────────────────────────────────────────────────
//
// Per-binder columns. Whole-collection export reuses these and prepends a
// `binder_name` column on the left so multi-binder rows stay traceable.
const BINDER_CSV_COLUMNS = [
  'slot_index',
  'card_name',
  'card_set',
  'card_game',
  'card_api_id',
  'card_price',
  'card_price_currency',
  'card_image_url',
  'added_at',
];

// ── Per-binder CSV ──────────────────────────────────────────────────────────
//
// `binder` shape: { name, rows, cols, pages, cards: Array<row | null> }.
// Empty slots are skipped — only filled cards are exported.
export function exportBinderCsv(binder) {
  const filled = (binder.cards || []).filter(c => c && c.id);
  const lines = [csvRow(BINDER_CSV_COLUMNS)];
  for (const c of filled) {
    lines.push(csvRow(BINDER_CSV_COLUMNS.map(col => c[col] ?? '')));
  }
  const csv = lines.join('\n') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${sanitizeFilename(binder.name)} — ${todayStamp()}.csv`);
}

// ── Per-binder JSON ─────────────────────────────────────────────────────────
//
// JSON keeps a header object with the binder's metadata so a future import
// can recreate the binder shape. Card rows are normalised — we strip
// internal id and binder_id (they're meaningless on import).
export function exportBinderJson(binder) {
  const filled = (binder.cards || [])
    .filter(c => c && c.id)
    .map(({ id, binder_id, ...rest }) => rest);

  const payload = {
    pokebinder_export_version: 1,
    exported_at: new Date().toISOString(),
    binder: {
      name: binder.name,
      rows: binder.rows,
      cols: binder.cols,
      pages: binder.pages,
      cover_color: binder.cover_color,
      cover_text: binder.cover_text,
      default_game: binder.default_game,
    },
    cards: filled,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${sanitizeFilename(binder.name)} — ${todayStamp()}.json`);
}

// ── Whole-collection CSV ────────────────────────────────────────────────────
//
// `binders` is the array from `getBinders` (each item has its own cards
// array attached). Output rows are prefixed with binder_name so a single
// CSV row carries enough context to be useful in a spreadsheet without
// joining back.
export function exportCollectionCsv(binders) {
  const cols = ['binder_name', ...BINDER_CSV_COLUMNS];
  const lines = [csvRow(cols)];
  for (const b of binders || []) {
    const filled = (b.cards || []).filter(c => c && c.id);
    for (const c of filled) {
      lines.push(csvRow([b.name, ...BINDER_CSV_COLUMNS.map(col => c[col] ?? '')]));
    }
  }
  const csv = lines.join('\n') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `pokebinder-collection — ${todayStamp()}.csv`);
}

// ── Whole-collection JSON ───────────────────────────────────────────────────
export function exportCollectionJson(binders) {
  const payload = {
    pokebinder_export_version: 1,
    exported_at: new Date().toISOString(),
    binders: (binders || []).map(b => ({
      name: b.name,
      rows: b.rows,
      cols: b.cols,
      pages: b.pages,
      cover_color: b.cover_color,
      cover_text: b.cover_text,
      default_game: b.default_game,
      // eslint-disable-next-line no-unused-vars
      cards: (b.cards || [])
        .filter(c => c && c.id)
        .map(({ id, binder_id, ...rest }) => rest),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `pokebinder-collection — ${todayStamp()}.json`);
}
