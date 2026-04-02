-- ============================================================
-- PokeBinder Initial Schema
-- ============================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- binders
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS binders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  rows             integer NOT NULL DEFAULT 3,
  cols             integer NOT NULL DEFAULT 3,
  pages            integer NOT NULL DEFAULT 10,
  cover_color      text NOT NULL DEFAULT '#3b82f6',
  cover_text       text,
  cover_image_url  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- binder_cards
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS binder_cards (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  binder_id            uuid NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
  slot_index           integer NOT NULL,
  card_api_id          text NOT NULL,
  card_name            text NOT NULL,
  card_image_url       text NOT NULL,
  card_set             text,
  card_game            text NOT NULL DEFAULT 'pokemon',
  card_price           decimal,
  card_price_currency  text NOT NULL DEFAULT 'EUR',
  added_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (binder_id, slot_index)
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user_id        ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_binders_profile_id      ON binders(profile_id);
CREATE INDEX IF NOT EXISTS idx_binder_cards_binder_id  ON binder_cards(binder_id);
CREATE INDEX IF NOT EXISTS idx_binder_cards_card_api_id ON binder_cards(card_api_id);

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE binders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE binder_cards ENABLE ROW LEVEL SECURITY;

-- profiles: full CRUD for own row only
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- binders: full CRUD where parent profile belongs to the user
CREATE POLICY "binders_select" ON binders
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "binders_insert" ON binders
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "binders_update" ON binders
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "binders_delete" ON binders
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- binder_cards: full CRUD where parent binder belongs to the user
CREATE POLICY "binder_cards_select" ON binder_cards
  FOR SELECT USING (
    binder_id IN (
      SELECT b.id FROM binders b
      JOIN profiles p ON p.id = b.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "binder_cards_insert" ON binder_cards
  FOR INSERT WITH CHECK (
    binder_id IN (
      SELECT b.id FROM binders b
      JOIN profiles p ON p.id = b.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "binder_cards_update" ON binder_cards
  FOR UPDATE USING (
    binder_id IN (
      SELECT b.id FROM binders b
      JOIN profiles p ON p.id = b.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    binder_id IN (
      SELECT b.id FROM binders b
      JOIN profiles p ON p.id = b.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "binder_cards_delete" ON binder_cards
  FOR DELETE USING (
    binder_id IN (
      SELECT b.id FROM binders b
      JOIN profiles p ON p.id = b.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
