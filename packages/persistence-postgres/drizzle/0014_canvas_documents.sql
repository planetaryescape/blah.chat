-- Migration: Canvas documents table
CREATE TABLE IF NOT EXISTS "documents" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "conversation_id" text REFERENCES "conversations"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "document_type" text NOT NULL DEFAULT 'prose',
  "language" text,
  "version" bigint NOT NULL DEFAULT 1,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS "documents_by_user" ON "documents" ("user_id");
CREATE INDEX IF NOT EXISTS "documents_by_conversation" ON "documents" ("conversation_id");
