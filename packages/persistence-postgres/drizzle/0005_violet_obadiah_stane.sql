CREATE TABLE "message_tool_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"tool_call_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"result" jsonb,
	"text_position" bigint,
	"is_partial" boolean DEFAULT false NOT NULL,
	"timestamp" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_tool_calls" ADD CONSTRAINT "message_tool_calls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_tool_calls" ADD CONSTRAINT "message_tool_calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_tool_calls" ADD CONSTRAINT "message_tool_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_tool_calls_by_message" ON "message_tool_calls" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_tool_calls_by_conversation" ON "message_tool_calls" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "message_tool_calls_by_user" ON "message_tool_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_tool_calls_by_message_partial" ON "message_tool_calls" USING btree ("message_id","is_partial");--> statement-breakpoint
CREATE UNIQUE INDEX "message_tool_calls_by_message_tool_call_id" ON "message_tool_calls" USING btree ("message_id","tool_call_id");