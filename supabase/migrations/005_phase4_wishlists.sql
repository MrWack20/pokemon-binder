-- Phase 4.2: Wishlists
-- Cards a user wants but doesn't yet own. Private to the owner — no public
-- read policy (unlike binders, wishlists aren't shareable yet).

CREATE TABLE IF NOT EXISTS wishlists (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_api_id          TEXT NOT NULL,
  card_name            TEXT NOT NULL,
  card_image_url       TEXT,
  card_set             TEXT,
  card_game            TEXT NOT NULL DEFAULT 'pokemon',
  card_price           NUMERIC(10, 2),
  card_price_currency  TEXT NOT NULL DEFAULT 'USD',
  priority             SMALLINT NOT NULL DEFAULT 0, -- 0 = normal, 1 = high
  notes                TEXT,
  added_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Same card can't be wishlisted twice for the same user in the same game.
  -- card_api_id alone isn't unique across games (e.g. a Pokemon and an MTG
  -- card could in theory share an id), so include card_game.
  UNIQUE (profile_id, card_api_id, card_game)
);

-- Hot path: "show me my wishlist" — order by priority desc, added_at desc.
CREATE INDEX IF NOT EXISTS idx_wishlists_profile_added
  ON wishlists (profile_id, priority DESC, added_at DESC);

-- For "is this card on my wishlist" cross-references on search results.
CREATE INDEX IF NOT EXISTS idx_wishlists_profile_api_id
  ON wishlists (profile_id, card_api_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Owner-only CRUD. The (SELECT auth.uid()) pattern is the optimised form
-- recommended by the Supabase performance advisors — caches the call once
-- per query rather than re-evaluating per row.
CREATE POLICY "wishlists_select" ON wishlists
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "wishlists_insert" ON wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "wishlists_update" ON wishlists
  FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "wishlists_delete" ON wishlists
  FOR DELETE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()))
  );
