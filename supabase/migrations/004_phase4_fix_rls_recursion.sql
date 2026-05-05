-- Phase 4.1 hotfix: break the infinite-recursion loop introduced by
-- migration 003's public-read policies.
--
-- ── Background ──────────────────────────────────────────────────────────
-- Migration 003 added these policies for /share/:binderId access:
--   profiles_public_select       USING (id IN (SELECT profile_id FROM binders WHERE is_public = true))
--   binder_cards_public_select   USING (binder_id IN (SELECT id FROM binders WHERE is_public = true))
--
-- The owner-side policies that already existed reference each other:
--   profiles_select              USING (user_id = auth.uid())
--   binders_select               USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
--   binder_cards_select          USING (binder_id IN (SELECT b.id FROM binders b JOIN profiles p ...))
--
-- When PostgREST evaluates RLS for a SELECT on profiles, it OR's every
-- applicable USING clause. profiles_public_select fires a subquery on
-- binders → which evaluates binders_select → which subqueries profiles
-- → which evaluates profiles_public_select → ... infinite recursion.
-- Postgres detects this and returns 500 for every request.
--
-- ── Fix ─────────────────────────────────────────────────────────────────
-- Replace the cross-table USING clauses with SECURITY DEFINER helper
-- functions. SECURITY DEFINER runs with the function owner's privileges
-- (postgres) rather than the caller's, so the lookup inside the function
-- does NOT trigger the caller's RLS again — the cycle terminates.
--
-- search_path = '' forces fully-qualified names (public.binders),
-- preventing schema-injection attacks via search_path manipulation.

CREATE OR REPLACE FUNCTION public.is_binder_public(_binder_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.binders
    WHERE id = _binder_id AND is_public = true
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_owns_public_binder(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.binders
    WHERE profile_id = _profile_id AND is_public = true
  );
$$;

-- Replace the recursion-prone policies with function-based ones.
DROP POLICY IF EXISTS "binder_cards_public_select" ON binder_cards;
CREATE POLICY "binder_cards_public_select" ON binder_cards
  FOR SELECT
  TO anon, authenticated
  USING (public.is_binder_public(binder_id));

DROP POLICY IF EXISTS "profiles_public_select" ON profiles;
CREATE POLICY "profiles_public_select" ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (public.profile_owns_public_binder(id));

-- binders_public_select (USING is_public = true) doesn't reference
-- other tables, so it never recursed and stays unchanged.
