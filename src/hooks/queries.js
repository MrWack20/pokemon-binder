import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as binderSvc from '../services/binderService.js';
import * as cardSvc from '../services/cardService.js';
import * as profileSvc from '../services/profileService.js';
import * as wishlistSvc from '../services/wishlistService.js';
import { getCollectionStats } from '../services/statsService.js';

// ─── Query keys ──────────────────────────────────────────────────────────────
export const qk = {
  profile:        (userId)    => ['profile', userId],
  binders:        (profileId) => ['binders', profileId],
  cards:          (binderId)  => ['cards', binderId],
  ownedApiIds:    (profileId) => ['owned-api-ids', profileId],
  stats:          (profileId) => ['stats', profileId],
  wishlist:       (profileId) => ['wishlist', profileId],
  wishlistedKeys: (profileId) => ['wishlisted-keys', profileId],
  // Public, no profile scope:
  publicBinders:  () => ['public-binders'],
  news:           () => ['news'],
};

// Service functions return { data, error } — throw on error so React Query
// surfaces it through the standard error path.
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ── Lightweight sessionStorage fallback ─────────────────────────────────────
// Lets binders / cards / owned-id queries paint instantly on a hard refresh
// (before the network fetch finishes) the same way the old Dashboard's
// sessionStorage cache used to. Each successful fetch writes the result back;
// initialData reads it on first render. Cleared by AuthContext on sign-out
// via queryClient.clear() + clearLegacyCaches().
const SS_PREFIX = 'pkb_qcache:';
function ssGet(key) {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}
function ssSet(key, value) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(value)); }
  catch { /* quota / circular refs — non-fatal */ }
}

// ─── Queries ─────────────────────────────────────────────────────────────────
export function useBinders(profileId) {
  return useQuery({
    queryKey: qk.binders(profileId),
    queryFn: async () => {
      const data = await binderSvc.getBinders(profileId).then(unwrap);
      const next = data || [];
      ssSet(`binders:${profileId}`, next);
      return next;
    },
    enabled: !!profileId,
    initialData: () => (profileId ? ssGet(`binders:${profileId}`) : undefined),
    initialDataUpdatedAt: 0, // treat cache as stale → triggers background refetch
  });
}

export function useBinderCards(binderId) {
  return useQuery({
    queryKey: qk.cards(binderId),
    queryFn: async () => {
      const data = await cardSvc.getBinderCards(binderId).then(unwrap);
      const next = data || [];
      ssSet(`cards:${binderId}`, next);
      return next;
    },
    enabled: !!binderId,
    initialData: () => (binderId ? ssGet(`cards:${binderId}`) : undefined),
    initialDataUpdatedAt: 0,
  });
}

export function useOwnedApiIds(profileId) {
  return useQuery({
    queryKey: qk.ownedApiIds(profileId),
    // getOwnedApiIds resolves to { data: Set<string>, error }. We persist as
    // an array (Set isn't JSON-serializable) and rehydrate on read.
    queryFn: async () => {
      const set = await cardSvc.getOwnedApiIds(profileId).then(unwrap);
      const arr = set ? [...set] : [];
      ssSet(`owned:${profileId}`, arr);
      return new Set(arr);
    },
    enabled: !!profileId,
    initialData: () => {
      if (!profileId) return undefined;
      const arr = ssGet(`owned:${profileId}`);
      return Array.isArray(arr) ? new Set(arr) : undefined;
    },
    initialDataUpdatedAt: 0,
  });
}

export function useCollectionStats(profileId) {
  return useQuery({
    queryKey: qk.stats(profileId),
    queryFn: () => getCollectionStats(profileId).then(unwrap),
    enabled: !!profileId,
  });
}

// ─── Binder mutations ────────────────────────────────────────────────────────
export function useCreateBinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, fields }) => binderSvc.createBinder(profileId, fields).then(unwrap),
    onSuccess: (_data, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.binders(profileId) });
    },
  });
}

export function useUpdateBinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ binderId, updates }) => binderSvc.updateBinder(binderId, updates).then(unwrap),
    onSuccess: (data, { profileId }) => {
      // Patch the binders list in cache instead of invalidating — avoids a
      // full refetch and the brief flicker that comes with it.
      qc.setQueryData(qk.binders(profileId), (old = []) =>
        old.map(b => (b.id === data.id ? { ...b, ...data } : b))
      );
    },
  });
}

export function useDeleteBinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ binderId }) => binderSvc.deleteBinder(binderId).then(unwrap),
    onSuccess: (_data, { binderId, profileId }) => {
      qc.setQueryData(qk.binders(profileId), (old = []) => old.filter(b => b.id !== binderId));
      qc.removeQueries({ queryKey: qk.cards(binderId) });
    },
  });
}

export function useDuplicateBinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ binderId }) => binderSvc.duplicateBinder(binderId).then(unwrap),
    onSuccess: (_data, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.binders(profileId) });
    },
  });
}

// ─── Card mutations (with optimistic updates) ────────────────────────────────
//
// Cards mutations all key off `binderId`. We optimistically patch the
// `cards(binderId)` cache so the UI updates instantly, snapshot the previous
// state, roll back on error, and invalidate on settle so the truth comes
// from the server.

export function useAddCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ binderId, slotIndex, dbRow }) =>
      cardSvc.addCard(binderId, slotIndex, dbRow).then(unwrap),
    onMutate: async ({ binderId, slotIndex, dbRow }) => {
      await qc.cancelQueries({ queryKey: qk.cards(binderId) });
      const previous = qc.getQueryData(qk.cards(binderId));
      qc.setQueryData(qk.cards(binderId), (old = []) => {
        const without = old.filter(c => c.slot_index !== slotIndex);
        return [
          ...without,
          { id: `temp-${Date.now()}`, binder_id: binderId, slot_index: slotIndex, ...dbRow },
        ].sort((a, b) => a.slot_index - b.slot_index);
      });
      return { previous };
    },
    onError: (_err, { binderId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.cards(binderId), ctx.previous);
    },
    onSettled: (_data, _err, { binderId }) => {
      qc.invalidateQueries({ queryKey: qk.cards(binderId) });
    },
  });
}

export function useRemoveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId }) => cardSvc.removeCard(cardId).then(unwrap),
    onMutate: async ({ binderId, cardId }) => {
      await qc.cancelQueries({ queryKey: qk.cards(binderId) });
      const previous = qc.getQueryData(qk.cards(binderId));
      qc.setQueryData(qk.cards(binderId), (old = []) => old.filter(c => c.id !== cardId));
      return { previous };
    },
    onError: (_err, { binderId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.cards(binderId), ctx.previous);
    },
    onSettled: (_data, _err, { binderId }) => {
      qc.invalidateQueries({ queryKey: qk.cards(binderId) });
    },
  });
}

export function useMoveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, newSlotIndex }) => cardSvc.moveCard(cardId, newSlotIndex).then(unwrap),
    onMutate: async ({ binderId, cardId, newSlotIndex }) => {
      await qc.cancelQueries({ queryKey: qk.cards(binderId) });
      const previous = qc.getQueryData(qk.cards(binderId));
      qc.setQueryData(qk.cards(binderId), (old = []) => {
        // Remove anything at the destination slot, then move the source.
        const without = old.filter(c => c.slot_index !== newSlotIndex);
        return without.map(c => (c.id === cardId ? { ...c, slot_index: newSlotIndex } : c));
      });
      return { previous };
    },
    onError: (_err, { binderId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.cards(binderId), ctx.previous);
    },
    onSettled: (_data, _err, { binderId }) => {
      qc.invalidateQueries({ queryKey: qk.cards(binderId) });
    },
  });
}

export function useSwapCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId1, cardId2 }) => cardSvc.swapCards(cardId1, cardId2).then(unwrap),
    onMutate: async ({ binderId, cardId1, cardId2 }) => {
      await qc.cancelQueries({ queryKey: qk.cards(binderId) });
      const previous = qc.getQueryData(qk.cards(binderId));
      qc.setQueryData(qk.cards(binderId), (old = []) => {
        const a = old.find(c => c.id === cardId1);
        const b = old.find(c => c.id === cardId2);
        if (!a || !b) return old;
        return old.map(c => {
          if (c.id === cardId1) return { ...c, slot_index: b.slot_index };
          if (c.id === cardId2) return { ...c, slot_index: a.slot_index };
          return c;
        });
      });
      return { previous };
    },
    onError: (_err, { binderId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.cards(binderId), ctx.previous);
    },
    onSettled: (_data, _err, { binderId }) => {
      qc.invalidateQueries({ queryKey: qk.cards(binderId) });
    },
  });
}

// ─── Profile mutation ────────────────────────────────────────────────────────
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, updates }) => profileSvc.updateProfile(profileId, updates).then(unwrap),
    onSuccess: (data, { userId }) => {
      if (userId) qc.setQueryData(qk.profile(userId), data);
    },
  });
}

// ─── Wishlist (Phase 4.2) ───────────────────────────────────────────────────
export function useWishlist(profileId) {
  return useQuery({
    queryKey: qk.wishlist(profileId),
    queryFn: () => wishlistSvc.getWishlist(profileId).then(unwrap).then(d => d || []),
    enabled: !!profileId,
  });
}

/**
 * Lightweight Set<"<card_api_id>::<game>"> used by search-result and set-page
 * UIs to show a "wishlisted" badge without fetching every full row. Computed
 * server-side; React Query keeps it in sync via the same cache invalidation
 * the full wishlist gets.
 */
export function useWishlistedKeys(profileId) {
  return useQuery({
    queryKey: qk.wishlistedKeys(profileId),
    queryFn: async () => {
      const set = await wishlistSvc.getWishlistedKeys(profileId).then(unwrap);
      return set || new Set();
    },
    enabled: !!profileId,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, cardData }) =>
      wishlistSvc.addToWishlist(profileId, cardData).then(unwrap),
    // Optimistic — flip the badge instantly even before the server confirms.
    onMutate: async ({ profileId, cardData }) => {
      await qc.cancelQueries({ queryKey: qk.wishlistedKeys(profileId) });
      const previous = qc.getQueryData(qk.wishlistedKeys(profileId));
      qc.setQueryData(qk.wishlistedKeys(profileId), (old = new Set()) => {
        const next = new Set(old);
        next.add(`${cardData.card_api_id}::${cardData.card_game ?? 'pokemon'}`);
        return next;
      });
      return { previous };
    },
    onError: (_err, { profileId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.wishlistedKeys(profileId), ctx.previous);
    },
    onSettled: (_data, _err, { profileId }) => {
      qc.invalidateQueries({ queryKey: qk.wishlist(profileId) });
      qc.invalidateQueries({ queryKey: qk.wishlistedKeys(profileId) });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wishlistId, profileId, cardApiId, cardGame }) => {
      // Two call shapes: by id (from the wishlist page), or by card identity
      // (from search-result heart toggle, which doesn't know the row id).
      if (wishlistId) return wishlistSvc.removeFromWishlist(wishlistId).then(unwrap);
      return wishlistSvc.removeFromWishlistByCard(profileId, cardApiId, cardGame).then(unwrap);
    },
    onMutate: async ({ profileId, cardApiId, cardGame }) => {
      if (!profileId || !cardApiId) return;
      await qc.cancelQueries({ queryKey: qk.wishlistedKeys(profileId) });
      const previousKeys = qc.getQueryData(qk.wishlistedKeys(profileId));
      qc.setQueryData(qk.wishlistedKeys(profileId), (old = new Set()) => {
        const next = new Set(old);
        next.delete(`${cardApiId}::${cardGame ?? 'pokemon'}`);
        return next;
      });
      return { previousKeys };
    },
    onError: (_err, { profileId }, ctx) => {
      if (ctx?.previousKeys) qc.setQueryData(qk.wishlistedKeys(profileId), ctx.previousKeys);
    },
    onSettled: (_data, _err, { profileId }) => {
      if (!profileId) return;
      qc.invalidateQueries({ queryKey: qk.wishlist(profileId) });
      qc.invalidateQueries({ queryKey: qk.wishlistedKeys(profileId) });
    },
  });
}

export function useUpdateWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wishlistId, updates }) =>
      wishlistSvc.updateWishlistItem(wishlistId, updates).then(unwrap),
    onSuccess: (_data, { profileId }) => {
      if (profileId) qc.invalidateQueries({ queryKey: qk.wishlist(profileId) });
    },
  });
}

// ─── Public binders gallery (Phase 4 community) ─────────────────────────────
//
// Reads via the browser Supabase client. RLS policy `binders_public_select`
// permits anon + authenticated to read rows where is_public = true, so this
// works the same whether the visitor is signed in or not.
//
// Limited to 12 most-recent so the home-page gallery stays compact. The
// owner display name comes via the FK-embedded `profiles` join, gated by
// the SECURITY-DEFINER-backed `profiles_public_select` policy.
export function usePublicBinders(limit = 12) {
  return useQuery({
    queryKey: qk.publicBinders(),
    queryFn: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('binders')
        .select(`
          id, name, rows, cols, pages, cover_color, cover_text, cover_image_url, created_at, profile_id,
          binder_cards(count),
          profiles!inner(id, name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    // Public gallery doesn't need second-by-second freshness.
    staleTime: 5 * 60 * 1000,
  });
}

// ─── TCG news feed (Phase 4 community) ──────────────────────────────────────
//
// Hits our /api/news route which aggregates RSS from a curated source list.
// The route itself caches with revalidate: 1800 (30 min) so concurrent users
// hit Vercel's edge cache, not the upstream feeds.
export function useTcgNews() {
  return useQuery({
    queryKey: qk.news(),
    queryFn: async () => {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error(`news fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 min on the client; server cache handles the rest
  });
}
