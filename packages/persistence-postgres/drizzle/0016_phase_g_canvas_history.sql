-- Phase G: canvas history + conversation mode columns.
-- Adds two nullable columns to `conversations` (metadata-only ALTER, cheap on
-- a populated table) and a new `document_revisions` append-only history table.

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "mode" text NOT NULL DEFAULT 'chat';

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "active_document_id" text;

CREATE TABLE IF NOT EXISTS "document_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "version" bigint NOT NULL,
  "content" text NOT NULL,
  "diff_summary" text,
  "source" text NOT NULL,
  "message_id" text REFERENCES "messages"("id") ON DELETE SET NULL,
  "created_at" bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_revisions_by_document"
  ON "document_revisions" ("document_id", "version");
CREATE INDEX IF NOT EXISTS "document_revisions_by_user"
  ON "document_revisions" ("user_id");
