-- Phase G: admin tunables singletons (admin_settings, auto_router_config).
-- Both tables use id = 'global' as the singleton row. Seeded with sensible
-- defaults via INSERT ... ON CONFLICT DO NOTHING so re-running this migration
-- (or running it on a partially-seeded environment) is idempotent.

CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "auto_router_config" (
  "id" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" bigint NOT NULL
);

-- Seed admin_settings 'global' singleton.
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
