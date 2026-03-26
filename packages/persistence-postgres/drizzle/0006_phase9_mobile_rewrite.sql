CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_from" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"usage_count" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "starter_suggestion_caches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs_refresh" boolean DEFAULT false NOT NULL,
	"generated_at" bigint NOT NULL,
	"source" text DEFAULT 'cache' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cli_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"name" text NOT NULL,
	"last_used_at" bigint,
	"created_at" bigint NOT NULL,
	"revoked_at" bigint
);
--> statement-breakpoint
CREATE TABLE "user_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"byok_enabled" boolean DEFAULT false NOT NULL,
	"encrypted_vercel_gateway_key" text,
	"encrypted_open_router_key" text,
	"encrypted_groq_key" text,
	"encrypted_deepgram_key" text,
	"encryption_ivs" text,
	"auth_tags" text,
	"last_validated" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "composio_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"composio_connection_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"integration_name" text NOT NULL,
	"status" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"oauth_state" text,
	"oauth_state_expires_at" bigint,
	"connected_at" bigint,
	"last_used_at" bigint,
	"last_error" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starter_suggestion_caches" ADD CONSTRAINT "starter_suggestion_caches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_api_keys" ADD CONSTRAINT "cli_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composio_connections" ADD CONSTRAINT "composio_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_by_user" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_by_user_template" ON "projects" USING btree ("user_id","is_template");--> statement-breakpoint
CREATE INDEX "templates_by_user" ON "templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_by_category" ON "templates" USING btree ("category","is_built_in");--> statement-breakpoint
CREATE UNIQUE INDEX "starter_suggestion_caches_by_user" ON "starter_suggestion_caches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cli_api_keys_by_user" ON "cli_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_api_keys_by_key_hash" ON "cli_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_api_keys_by_user" ON "user_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "composio_connections_by_user" ON "composio_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "composio_connections_by_user_integration" ON "composio_connections" USING btree ("user_id","integration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "composio_connections_by_connection_id" ON "composio_connections" USING btree ("composio_connection_id");
