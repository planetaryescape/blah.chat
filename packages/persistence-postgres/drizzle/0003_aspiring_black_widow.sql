CREATE TABLE "feedback_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"page" text NOT NULL,
	"feedback_type" text NOT NULL,
	"description" text NOT NULL,
	"what_they_did" text,
	"what_they_saw" text,
	"what_they_expected" text,
	"screenshot_key" text,
	"user_suggested_urgency" text,
	"status" text NOT NULL,
	"priority" text DEFAULT 'none' NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"ai_triage" jsonb,
	"error_context" jsonb,
	"archived_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"storage_key" text,
	"url" text,
	"raw_content" text,
	"video_metadata" jsonb,
	"mime_type" text,
	"size" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"chunk_count" bigint,
	"processed_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text,
	"position" bigint NOT NULL,
	"provider" text DEFAULT 'unknown' NOT NULL,
	"title" text NOT NULL,
	"snippet" text,
	"url_hash" text NOT NULL,
	"url" text NOT NULL,
	"is_partial" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_message_id" text,
	"source_conversation_id" text,
	"project_id" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"url_hash" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"og_image" text,
	"favicon" text,
	"site_name" text,
	"enriched" boolean DEFAULT false NOT NULL,
	"error" text,
	"first_seen_at" bigint NOT NULL,
	"last_accessed_at" bigint NOT NULL,
	"access_count" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"deadline" bigint,
	"deadline_source" text,
	"urgency" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"source_type" text,
	"source_id" text,
	"source_context" jsonb,
	"project_id" text,
	"priority" bigint,
	"position" bigint,
	"completed_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "model_recommendation" jsonb;--> statement-breakpoint
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_entries_by_user" ON "feedback_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_entries_by_status" ON "feedback_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_entries_by_type" ON "feedback_entries" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX "knowledge_sources_by_user" ON "knowledge_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_by_status" ON "knowledge_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "knowledge_sources_by_project" ON "knowledge_sources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_by_user_type" ON "knowledge_sources" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "message_sources_by_message" ON "message_sources" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_sources_by_conversation" ON "message_sources" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "message_sources_by_url_hash" ON "message_sources" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "notes_by_user" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_by_user_updated" ON "notes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "notes_by_project" ON "notes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "notes_by_source_message" ON "notes" USING btree ("source_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_metadata_by_url_hash" ON "source_metadata" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "source_metadata_by_url" ON "source_metadata" USING btree ("url");--> statement-breakpoint
CREATE INDEX "tasks_by_user" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_by_user_status" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_by_user_deadline" ON "tasks" USING btree ("user_id","deadline");--> statement-breakpoint
CREATE INDEX "tasks_by_project" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_by_user_project" ON "tasks" USING btree ("user_id","project_id");