CREATE INDEX "generation_requests_by_status_updated" ON "generation_requests" USING btree ("status","updated_at","id");--> statement-breakpoint
CREATE INDEX "generation_sessions_by_request_updated" ON "generation_sessions" USING btree ("request_id","updated_at");--> statement-breakpoint
CREATE INDEX "generation_sessions_by_message_status_updated" ON "generation_sessions" USING btree ("assistant_message_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "messages_by_status_updated" ON "messages" USING btree ("status","updated_at","id");