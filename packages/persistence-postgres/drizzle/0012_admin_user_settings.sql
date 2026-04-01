CREATE TYPE "public"."admin_user_tier" AS ENUM('free', 'tier1', 'tier2');
--> statement-breakpoint
CREATE TABLE "user_admin_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"tier" "admin_user_tier" DEFAULT 'free' NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_admin_settings" ADD CONSTRAINT "user_admin_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
