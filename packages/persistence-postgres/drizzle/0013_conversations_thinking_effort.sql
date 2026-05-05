-- Migration: add per-conversation thinking_effort column
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "thinking_effort" text NOT NULL DEFAULT 'none';
