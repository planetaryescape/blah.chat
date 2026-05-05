CREATE TABLE "document_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"user_id" text NOT NULL,
	"version" bigint NOT NULL,
	"content" text NOT NULL,
	"diff_summary" text,
	"source" text NOT NULL,
	"message_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "mode" text DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "active_document_id" text;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_revisions_by_document" ON "document_revisions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "document_revisions_by_user" ON "document_revisions" USING btree ("user_id");