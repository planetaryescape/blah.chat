ALTER TABLE "users" ADD COLUMN "clerk_synced_at" bigint NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "users" SET "clerk_synced_at" = "updated_at" WHERE "clerk_synced_at" = 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "clerk_synced_at" DROP DEFAULT;
