ALTER TABLE "notes" ADD COLUMN "suggested_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "share_id" text;
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "share_password" text;
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "share_expires_at" bigint;
--> statement-breakpoint
CREATE UNIQUE INDEX "notes_by_share_id" ON "notes" USING btree ("share_id");
