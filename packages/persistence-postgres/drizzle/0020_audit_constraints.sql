-- Dedupe existing rows before adding unique indexes (keep newest per key).
DELETE FROM "message_embeddings" a USING "message_embeddings" b
  WHERE a."message_id" = b."message_id"
    AND (a."updated_at" < b."updated_at" OR (a."updated_at" = b."updated_at" AND a."id" < b."id"));--> statement-breakpoint
DELETE FROM "note_embeddings" a USING "note_embeddings" b
  WHERE a."note_key" = b."note_key"
    AND (a."updated_at" < b."updated_at" OR (a."updated_at" = b."updated_at" AND a."id" < b."id"));--> statement-breakpoint
DELETE FROM "task_embeddings" a USING "task_embeddings" b
  WHERE a."task_key" = b."task_key"
    AND (a."updated_at" < b."updated_at" OR (a."updated_at" = b."updated_at" AND a."id" < b."id"));--> statement-breakpoint
DELETE FROM "notifications" a USING "notifications" b
  WHERE a."dedup_key" IS NOT NULL AND b."dedup_key" IS NOT NULL
    AND a."user_id" = b."user_id" AND a."type" = b."type" AND a."dedup_key" = b."dedup_key"
    AND (a."created_at" < b."created_at" OR (a."created_at" = b."created_at" AND a."id" < b."id"));--> statement-breakpoint
DELETE FROM "routing_outcomes" a USING "routing_outcomes" b
  WHERE a."generation_session_id" IS NOT NULL AND b."generation_session_id" IS NOT NULL
    AND a."generation_session_id" = b."generation_session_id"
    AND (a."created_at" < b."created_at" OR (a."created_at" = b."created_at" AND a."id" < b."id"));--> statement-breakpoint
DELETE FROM "routing_decisions" a USING "routing_decisions" b
  WHERE a."generation_request_id" IS NOT NULL AND b."generation_request_id" IS NOT NULL
    AND a."generation_request_id" = b."generation_request_id"
    AND a."selected_model_id" = b."selected_model_id"
    AND (a."created_at" < b."created_at" OR (a."created_at" = b."created_at" AND a."id" < b."id"));--> statement-breakpoint
UPDATE "routing_policies" SET "is_active" = false
  WHERE "is_active" = true AND "id" NOT IN (
    SELECT "id" FROM "routing_policies" WHERE "is_active" = true ORDER BY "updated_at" DESC, "id" DESC LIMIT 1
  );--> statement-breakpoint
DROP INDEX "message_embeddings_by_message";--> statement-breakpoint
DROP INDEX "note_embeddings_by_note_key";--> statement-breakpoint
DROP INDEX "notifications_by_dedup";--> statement-breakpoint
DROP INDEX "routing_outcomes_by_session";--> statement-breakpoint
DROP INDEX "task_embeddings_by_task_key";--> statement-breakpoint
CREATE UNIQUE INDEX "routing_decisions_request_model_unique" ON "routing_decisions" USING btree ("generation_request_id","selected_model_id") WHERE "routing_decisions"."generation_request_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "routing_policies_single_active" ON "routing_policies" USING btree ("is_active") WHERE "routing_policies"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "message_embeddings_by_message" ON "message_embeddings" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "note_embeddings_by_note_key" ON "note_embeddings" USING btree ("note_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_by_dedup" ON "notifications" USING btree ("user_id","type","dedup_key") WHERE "notifications"."dedup_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "routing_outcomes_by_session" ON "routing_outcomes" USING btree ("generation_session_id") WHERE "routing_outcomes"."generation_session_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "task_embeddings_by_task_key" ON "task_embeddings" USING btree ("task_key");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "mode";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "active_document_id";
