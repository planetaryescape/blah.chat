CREATE TABLE "byod_migration_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"user_id" text NOT NULL,
	"migration_index" bigint NOT NULL,
	"migration_tag" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"duration_ms" bigint,
	"started_at" bigint NOT NULL,
	"completed_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "byod_neon_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"encrypted_connection_string" text NOT NULL,
	"encryption_iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"neon_project_id" text,
	"connection_status" text DEFAULT 'pending' NOT NULL,
	"connection_error" text,
	"last_health_check" bigint,
	"health_latency_ms" bigint,
	"consecutive_failures" bigint DEFAULT 0 NOT NULL,
	"schema_version" bigint DEFAULT 0 NOT NULL,
	"migration_status" text DEFAULT 'pending' NOT NULL,
	"migration_error" text,
	"last_migration_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "byod_neon_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "byod_migration_logs" ADD CONSTRAINT "byod_migration_logs_config_id_byod_neon_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."byod_neon_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "byod_migration_logs" ADD CONSTRAINT "byod_migration_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "byod_neon_configs" ADD CONSTRAINT "byod_neon_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "byod_migration_logs_config_id_idx" ON "byod_migration_logs" USING btree ("config_id");--> statement-breakpoint
CREATE UNIQUE INDEX "byod_migration_logs_config_tag_uniq" ON "byod_migration_logs" USING btree ("config_id","migration_tag");--> statement-breakpoint
CREATE INDEX "byod_neon_configs_connection_status_idx" ON "byod_neon_configs" USING btree ("connection_status");--> statement-breakpoint
CREATE INDEX "byod_neon_configs_migration_status_idx" ON "byod_neon_configs" USING btree ("migration_status");
