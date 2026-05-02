-- Phase 4.1: Public binders + share links
-- Run this in the Supabase SQL editor for your project.

-- ────────────────────────────────────────────────────────────────────────────
-- Schema: opt-in public flag on binders
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE binders
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Partial index so the future "public gallery" query stays fast even when
-- 99% of binders are private.
CREATE INDEX IF NOT EXISTS idx_binders_is_public
  ON binders (is_public)
  WHERE is_public = true;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS policies for unauthenticated read access
-- These are layered ON TOP of the existing owner-only policies. Owners
-- still get full CRUD; anon + authenticated visitors get SELECT only,
-- and only when is_public = true.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Anyone can read a public binder row.
DROP POLICY IF EXISTS "binders_public_select" ON binders;
CREATE POLICY "binders_public_select" ON binders
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 2. Anyone can read the cards inside a public binder.
DROP POLICY IF EXISTS "binder_cards_public_select" ON binder_cards;
CREATE POLICY "binder_cards_public_select" ON binder_cards
  FOR SELECT
  TO anon, authenticated
  USING (
    binder_id IN (SELECT id FROM binders WHERE is_public = true)
  );

-- 3. Anyone can read the *display* fields of a profile that owns a public
--    binder, so the share page can render "<name>'s collection".
--
--    SECURITY NOTE: Postgres RLS gates rows, not columns. Any consumer of
--    this policy MUST `.select('id, name, avatar_url')` and never SELECT *
--    on the profiles table from a public path. The other columns
--    (user_id, created_at) aren't sensitive credentials, but the principle
--    of least exposure stands.
DROP POLICY IF EXISTS "profiles_public_select" ON profiles;
CREATE POLICY "profiles_public_select" ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    id IN (SELECT profile_id FROM binders WHERE is_public = true)
  );
