CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"note" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_by_user" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmarks_by_message" ON "bookmarks" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "bookmarks_by_conversation" ON "bookmarks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "bookmarks_by_user_created" ON "bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_by_user_message" ON "bookmarks" USING btree ("user_id","message_id");