--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_conversation_client_message_unique"
  ON "messages" ("conversation_id", "client_message_id")
  WHERE "client_message_id" IS NOT NULL;
