ALTER TABLE "conversations" ADD COLUMN "is_incognito" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "incognito_settings" jsonb;