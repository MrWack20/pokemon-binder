-- Phase 3: Multi-game expansion
-- Run this in the Supabase SQL editor for your project.

-- Add default_game column to binders (tracks which game a binder is primarily for)
ALTER TABLE binders ADD COLUMN IF NOT EXISTS default_game TEXT NOT NULL DEFAULT 'pokemon';

-- Ensure all existing binder_cards have game set (should already be 'pokemon' from Phase 1)
UPDATE binder_cards SET card_game = 'pokemon' WHERE card_game IS NULL OR card_game = '';

-- Performance indexes for multi-game queries
CREATE INDEX IF NOT EXISTS idx_binder_cards_game    ON binder_cards(card_game);
CREATE INDEX IF NOT EXISTS idx_binder_cards_api_id  ON binder_cards(card_api_id);

-- (Optional) Card cache table to reduce external API calls
-- Uncomment if you want server-side caching in a future phase:
-- CREATE TABLE IF NOT EXISTS card_cache (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   card_api_id TEXT NOT NULL,
--   game        TEXT NOT NULL,
--   card_data   JSONB NOT NULL,
--   cached_at   TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(card_api_id, game)
-- );
