// View Transitions API helper.
//
// `document.startViewTransition(cb)` is supported in Chrome/Edge 111+,
// Safari 18+, and Opera. Firefox is implementing it. When available, it
// captures the current DOM, runs the callback (which usually triggers a
// React re-render), then animates between the old and new snapshots
// using CSS — for free, no animation library required.
//
// We use it for binder page flips: tapping Next on page 4 looks like
// the cards on page 4 cross-fade out and the cards on page 5 cross-fade
// in, which feels like physically turning a page rather than the grid
// snapping to new content.
//
// Browsers without support fall back to calling the callback directly —
// no animation, just the immediate state change.

export function withViewTransition(cb) {
  if (typeof document === 'undefined') {
    cb();
    return;
  }
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(cb);
    return;
  }
  // Fallback: just run the callback. The user gets the previous behavior
  // (instant swap, no animation).
  cb();
}
