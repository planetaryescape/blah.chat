CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"bucket" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" bigint NOT NULL,
	"extracted_text" text,
	"extraction_error" text,
	"extracted_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"comparison_group_id" text NOT NULL,
	"winner_message_id" text,
	"rating" text NOT NULL,
	"voted_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidations" (
	"id" text PRIMARY KEY NOT NULL,
	"comparison_group_id" text NOT NULL,
	"conversation_id" text,
	"user_message_id" text,
	"consolidated_message_id" text,
	"model_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"model" text NOT NULL,
	"active_leaf_message_id" text,
	"project_id" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"attachment_id" text,
	"conversation_id" text,
	"user_id" text,
	"chunk_index" bigint NOT NULL,
	"content" text NOT NULL,
	"search_document" text,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"content" text NOT NULL,
	"sequence" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_message_id" text NOT NULL,
	"requested_models" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"prompt_override" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"assistant_message_id" text NOT NULL,
	"model_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"conversation_id" text,
	"source_key" text NOT NULL,
	"chunk_index" bigint NOT NULL,
	"content" text NOT NULL,
	"search_document" text,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"source_message_id" text,
	"content" text NOT NULL,
	"category" text,
	"embedding" jsonb NOT NULL,
	"search_document" text,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_edges" (
	"parent_message_id" text NOT NULL,
	"child_message_id" text NOT NULL,
	"position" bigint DEFAULT 0 NOT NULL,
	"edge_type" text DEFAULT 'reply' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "message_edges_parent_message_id_child_message_id_pk" PRIMARY KEY("parent_message_id","child_message_id")
);
--> statement-breakpoint
CREATE TABLE "message_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"search_document" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"model" text,
	"comparison_group_id" text,
	"consolidated_message_id" text,
	"is_consolidation" boolean DEFAULT false NOT NULL,
	"root_message_id" text,
	"sibling_index" bigint DEFAULT 0 NOT NULL,
	"fork_reason" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"note_key" text NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"search_document" text,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text,
	"status" text NOT NULL,
	"latency_ms" bigint,
	"success_rate" double precision,
	"metadata" jsonb,
	"captured_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_candidate_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"model_id" text NOT NULL,
	"provider" text,
	"score" double precision NOT NULL,
	"rank" bigint,
	"features" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text,
	"generation_request_id" text,
	"conversation_id" text,
	"user_id" text,
	"route_label" text,
	"selected_model_id" text NOT NULL,
	"previous_model_id" text,
	"reasoning" text,
	"input" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_examples" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"route_label" text NOT NULL,
	"complexity" text,
	"source" text DEFAULT 'seed' NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"outcome_id" text,
	"comparison_group_id" text,
	"winner_message_id" text,
	"signal" text NOT NULL,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"generation_request_id" text,
	"generation_session_id" text,
	"status" text NOT NULL,
	"ttft_ms" bigint,
	"latency_ms" bigint,
	"total_tokens" bigint,
	"input_tokens" bigint,
	"output_tokens" bigint,
	"cost_usd" double precision,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"strategy" text DEFAULT 'outcome_weighted' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_key" text NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"search_document" text,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "user_preferences_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_votes" ADD CONSTRAINT "comparison_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidations" ADD CONSTRAINT "consolidations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidations" ADD CONSTRAINT "consolidations_user_message_id_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidations" ADD CONSTRAINT "consolidations_consolidated_message_id_messages_id_fk" FOREIGN KEY ("consolidated_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_checkpoints" ADD CONSTRAINT "generation_checkpoints_session_id_generation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."generation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_requests" ADD CONSTRAINT "generation_requests_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_requests" ADD CONSTRAINT "generation_requests_user_message_id_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_sessions" ADD CONSTRAINT "generation_sessions_request_id_generation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."generation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_sessions" ADD CONSTRAINT "generation_sessions_assistant_message_id_messages_id_fk" FOREIGN KEY ("assistant_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_edges" ADD CONSTRAINT "message_edges_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_edges" ADD CONSTRAINT "message_edges_child_message_id_messages_id_fk" FOREIGN KEY ("child_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_embeddings" ADD CONSTRAINT "note_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_candidate_scores" ADD CONSTRAINT "routing_candidate_scores_decision_id_routing_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."routing_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_policy_id_routing_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."routing_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_generation_request_id_generation_requests_id_fk" FOREIGN KEY ("generation_request_id") REFERENCES "public"."generation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_feedback" ADD CONSTRAINT "routing_feedback_outcome_id_routing_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."routing_outcomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_feedback" ADD CONSTRAINT "routing_feedback_winner_message_id_messages_id_fk" FOREIGN KEY ("winner_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_outcomes" ADD CONSTRAINT "routing_outcomes_decision_id_routing_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."routing_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_outcomes" ADD CONSTRAINT "routing_outcomes_generation_request_id_generation_requests_id_fk" FOREIGN KEY ("generation_request_id") REFERENCES "public"."generation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_outcomes" ADD CONSTRAINT "routing_outcomes_generation_session_id_generation_sessions_id_fk" FOREIGN KEY ("generation_session_id") REFERENCES "public"."generation_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_embeddings" ADD CONSTRAINT "task_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consolidations_by_comparison_group" ON "consolidations" USING btree ("comparison_group_id");--> statement-breakpoint
CREATE INDEX "consolidations_by_conversation" ON "consolidations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "file_chunks_by_attachment" ON "file_chunks" USING btree ("attachment_id");--> statement-breakpoint
CREATE INDEX "file_chunks_by_conversation" ON "file_chunks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_by_source_key" ON "knowledge_chunks" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_by_conversation" ON "knowledge_chunks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "memory_embeddings_by_user" ON "memory_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_embeddings_by_conversation" ON "memory_embeddings" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "message_embeddings_by_message" ON "message_embeddings" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_embeddings_by_conversation" ON "message_embeddings" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "note_embeddings_by_user" ON "note_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_embeddings_by_note_key" ON "note_embeddings" USING btree ("note_key");--> statement-breakpoint
CREATE INDEX "provider_health_snapshots_by_provider" ON "provider_health_snapshots" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "provider_health_snapshots_by_captured_at" ON "provider_health_snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "routing_candidate_scores_by_decision" ON "routing_candidate_scores" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "routing_candidate_scores_by_model" ON "routing_candidate_scores" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "routing_decisions_by_policy" ON "routing_decisions" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "routing_decisions_by_conversation" ON "routing_decisions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "routing_decisions_by_created_at" ON "routing_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "routing_examples_by_route_label" ON "routing_examples" USING btree ("route_label");--> statement-breakpoint
CREATE INDEX "routing_examples_by_source" ON "routing_examples" USING btree ("source");--> statement-breakpoint
CREATE INDEX "routing_feedback_by_outcome" ON "routing_feedback" USING btree ("outcome_id");--> statement-breakpoint
CREATE INDEX "routing_feedback_by_comparison_group" ON "routing_feedback" USING btree ("comparison_group_id");--> statement-breakpoint
CREATE INDEX "routing_feedback_by_signal" ON "routing_feedback" USING btree ("signal");--> statement-breakpoint
CREATE INDEX "routing_outcomes_by_decision" ON "routing_outcomes" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "routing_outcomes_by_session" ON "routing_outcomes" USING btree ("generation_session_id");--> statement-breakpoint
CREATE INDEX "routing_outcomes_by_created_at" ON "routing_outcomes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "routing_policies_by_active" ON "routing_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "task_embeddings_by_user" ON "task_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_embeddings_by_task_key" ON "task_embeddings" USING btree ("task_key");