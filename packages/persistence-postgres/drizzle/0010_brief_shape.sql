CREATE TABLE "conversation_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"share_id" text NOT NULL,
	"title" text NOT NULL,
	"expires_at" bigint,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"password" text,
	"anonymize_usernames" boolean DEFAULT false,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "conversation_shares_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_shares" ADD CONSTRAINT "conversation_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_shares" ADD CONSTRAINT "conversation_shares_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_shares_user_idx" ON "conversation_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_shares_conversation_idx" ON "conversation_shares" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_shares_share_id_idx" ON "conversation_shares" USING btree ("share_id");