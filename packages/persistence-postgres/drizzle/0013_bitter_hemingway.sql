CREATE TABLE "admin_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_router_config" (
	"id" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"document_type" text DEFAULT 'prose' NOT NULL,
	"language" text,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "thinking_effort" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_router_config" ADD CONSTRAINT "auto_router_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Seed admin_settings 'global' singleton with sensible defaults so the
-- admin panels render against real data on first deploy. Idempotent via
-- ON CONFLICT DO NOTHING.
INSERT INTO "admin_settings" ("id", "value", "updated_by", "updated_at")
VALUES (
  'global',
  '{
    "limits": {
      "defaultMonthlyBudget": 10,
      "defaultBudgetAlertThreshold": 0.8,
      "budgetHardLimitEnabled": true,
      "defaultDailyMessageLimit": 50,
      "defaultMaxIntegrations": 5
    },
    "features": {
      "canvasMode": true,
      "comparisonMode": true,
      "voiceInput": true,
      "imageGeneration": true,
      "codeExecution": true,
      "autoRouter": true
    },
    "proTier": {
      "proModelsEnabled": false,
      "tier1DailyProModelLimit": 1,
      "tier2MonthlyProModelLimit": 50
    },
    "search": {
      "hybridEnabled": true,
      "rrfK": 60,
      "maxResults": 20,
      "embeddingsEnabled": true
    },
    "memory": {
      "maxMemoriesPerUser": 1000,
      "autoExtractionEnabled": true,
      "consolidationIntervalDays": 30,
      "extractEveryNMessages": 5
    },
    "transcriptProvider": {
      "provider": "groq",
      "costPerMinute": 0.0067
    }
  }'::jsonb,
  NULL,
  (extract(epoch from now()) * 1000)::bigint
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Seed auto_router_config 'global' singleton.
INSERT INTO "auto_router_config" ("id", "value", "updated_by", "updated_at")
VALUES (
  'global',
  '{
    "contextBuffer": 1.2,
    "longContextThreshold": 128000,
    "classifierConfidenceThreshold": 0.82,
    "classifierTopK": 5,
    "classifierFallbackEnabled": true
  }'::jsonb,
  NULL,
  (extract(epoch from now()) * 1000)::bigint
)
ON CONFLICT ("id") DO NOTHING;
