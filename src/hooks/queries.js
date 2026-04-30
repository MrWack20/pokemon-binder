import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as binderSvc from '../services/binderService.js';
import * as cardSvc from '../services/cardService.js';
import * as profileSvc from '../services/profileService.js';
import { getCollectionStats } from '../services/statsService.js';

// ─── Query keys ──────────────────────────────────────────────────────────────
export const qk = {
  profile:     (userId)    => ['profile', userId],
  binders:     (profileId) => ['binders', profileId],
  cards:       (binderId)  => ['cards', binderId],
  ownedApiIds: (profileId) => ['owned-api-ids', profileId],
  stats:       (profileId) => ['stats', profileId],
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
