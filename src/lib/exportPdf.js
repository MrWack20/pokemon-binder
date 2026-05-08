// Phase 4.3 — PDF export.
//
// Renders a binder as an A4 PDF: cover page with the binder name + summary,
// then one PDF page per binder page, with cards laid out in their grid
// positions. Uses jsPDF's image API directly — no html2canvas or DOM
// snapshotting needed, which keeps the bundle smaller and avoids CORS
// quirks specific to html2canvas.
//
// jsPDF (~150KB minified) is dynamically imported so the chunk only loads
// when the user actually clicks "Export as PDF". The cold-start hit is
// taken once per session.

// ── Filename helpers (mirrored from export.js for consistency) ──────────────
function sanitizeFilename(name) {
  return String(name || 'binder')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'binder';
}

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Image fetcher ───────────────────────────────────────────────────────────
//
// Loads an image via the browser's Image() with crossOrigin='anonymous',
// then redraws it onto a canvas and exports as a JPEG data URL. We use
// JPEG (not PNG) for two reasons: 1) it's smaller in the resulting PDF,
// 2) jsPDF takes any image format but JPEG is the most consistently
// supported. Quality 0.85 gives a sharp result without bloating files.
//
// CORS note: all four card APIs (Pokemon TCG, Scryfall, YGOPRODeck,
// OPTCG) serve images with `Access-Control-Allow-Origin: *`, so the
// canvas-tainting check passes. If a future API doesn't cooperate, the
// load will reject and the card slot will be skipped (logged once).
function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

// ── Layout computation ─────────────────────────────────────────────────────
//
// Given an A4 page area and a grid (rows × cols), find the largest card
// size that fits while preserving the standard 2.5:3.5 (= 5:7) card aspect
// ratio. Returns dimensions in mm.
function computeCardLayout(usableWidth, usableHeight, rows, cols) {
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;
  const aspect = 2.5 / 3.5;

  // Either width-bound or height-bound — pick the smaller fit.
  let cardWidth, cardHeight;
  if (cellWidth / cellHeight < aspect) {
    cardWidth = cellWidth * 0.92;
    cardHeight = cardWidth / aspect;
  } else {
    cardHeight = cellHeight * 0.92;
    cardWidth = cardHeight * aspect;
  }

  return { cellWidth, cellHeight, cardWidth, cardHeight };
}

// ── Public API ──────────────────────────────────────────────────────────────
/**
 * Generate and download a PDF representation of `binder`.
 *
 * `binder` shape: { id, name, rows, cols, pages, cards: Array<row|null>, ... }
 *
 * `onProgress(processed, total)` is optional — used by the UI to render a
 * loading state while images stream in.
 *
 * Resolves with `{ totalCards, skippedCards }` for telemetry/toast.
 */
export async function exportBinderPdf(binder, onProgress) {
  const { jsPDF } = await import('jspdf');

  const A4_WIDTH = 210;   // mm
  const A4_HEIGHT = 297;  // mm
  const MARGIN = 12;      // mm
  const usableWidth = A4_WIDTH - 2 * MARGIN;
  const usableHeight = A4_HEIGHT - 2 * MARGIN - 8; // -8 for header text

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // ── Cover page ──────────────────────────────────────────────────────────
  const filledCount = (binder.cards || []).filter(c => c && c.id).length;
  const totalSlots = binder.rows * binder.cols * binder.pages;
  const totalValue = (binder.cards || [])
    .filter(c => c && c.id)
    .reduce((s, c) => s + (Number(c.card_price) || 0), 0);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text(binder.name || 'Untitled binder', A4_WIDTH / 2, 60, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setTextColor(100);
  pdf.text(
    `${binder.rows}×${binder.cols} grid · ${binder.pages} page${binder.pages !== 1 ? 's' : ''}`,
    A4_WIDTH / 2, 75, { align: 'center' }
  );
  pdf.text(
    `${filledCount} of ${totalSlots} slots filled`,
    A4_WIDTH / 2, 85, { align: 'center' }
  );
  if (totalValue > 0) {
    pdf.text(
      `Estimated value: $${totalValue.toFixed(2)}`,
      A4_WIDTH / 2, 95, { align: 'center' }
    );
  }

  pdf.setFontSize(10);
  pdf.setTextColor(160);
  pdf.text(
    `Exported ${todayStamp()} from PokéBinder`,
    A4_WIDTH / 2, A4_HEIGHT - 14, { align: 'center' }
  );

  // ── Card pages ──────────────────────────────────────────────────────────
  const slotsPerPage = binder.rows * binder.cols;
  const { cellWidth, cellHeight, cardWidth, cardHeight } = computeCardLayout(
    usableWidth, usableHeight, binder.rows, binder.cols,
  );

  let processed = 0;
  let skipped = 0;
  const total = filledCount;

  for (let pageIdx = 0; pageIdx < binder.pages; pageIdx++) {
    pdf.addPage();

    // Page header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(60);
    pdf.text(binder.name || 'Untitled binder', MARGIN, MARGIN);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(140);
    pdf.text(
      `Page ${pageIdx + 1} / ${binder.pages}`,
      A4_WIDTH - MARGIN, MARGIN, { align: 'right' }
    );

    const startSlot = pageIdx * slotsPerPage;
    const pageCards = (binder.cards || []).slice(startSlot, startSlot + slotsPerPage);

    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i];
      if (!card || !card.id || !card.card_image_url) continue;

      const col = i % binder.cols;
      const row = Math.floor(i / binder.cols);
      // Top-left of the cell, then center the card within
      const cellX = MARGIN + col * cellWidth;
      const cellY = MARGIN + 8 + row * cellHeight; // +8 for the page header
      const x = cellX + (cellWidth - cardWidth) / 2;
      const y = cellY + (cellHeight - cardHeight) / 2;

      try {
        const dataUrl = await loadImageAsDataUrl(card.card_image_url);
        pdf.addImage(dataUrl, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');
        processed++;
        onProgress?.(processed, total);
      } catch (err) {
        skipped++;
        // Draw a placeholder rectangle so the slot isn't visually missing.
        pdf.setDrawColor(220);
        pdf.setFillColor(245);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
        pdf.setFontSize(8);
        pdf.setTextColor(160);
        pdf.text(
          card.card_name || 'card',
          x + cardWidth / 2,
          y + cardHeight / 2,
          { align: 'center', maxWidth: cardWidth - 4 }
        );
        // eslint-disable-next-line no-console
        console.warn('[exportPdf] image load failed, drew placeholder:', err?.message);
      }
    }
  }

  pdf.save(`${sanitizeFilename(binder.name)} — ${todayStamp()}.pdf`);

  return { totalCards: total, skippedCards: skipped };
}
