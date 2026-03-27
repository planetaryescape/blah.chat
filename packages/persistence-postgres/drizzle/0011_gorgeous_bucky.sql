CREATE TABLE "conversation_integration_events" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"integration_name" text NOT NULL,
	"action" text NOT NULL,
	"source" text DEFAULT 'composer' NOT NULL,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_request_integrations" (
	"request_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"integration_name" text NOT NULL,
	"composio_connection_id" text,
	"connection_status" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "generation_request_integrations_request_id_integration_id_pk" PRIMARY KEY("request_id","integration_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_integration_events" ADD CONSTRAINT "conversation_integration_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_integration_events" ADD CONSTRAINT "conversation_integration_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_request_integrations" ADD CONSTRAINT "generation_request_integrations_request_id_generation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."generation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_integration_events_by_conversation" ON "conversation_integration_events" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "conversation_integration_events_by_user" ON "conversation_integration_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_request_integrations_by_request" ON "generation_request_integrations" USING btree ("request_id","created_at");