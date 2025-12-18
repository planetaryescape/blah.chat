#!/usr/bin/env bun

/**
 * Sync admin status from Convex to Clerk publicMetadata
 *
 * This script:
 * 1. Queries all users with isAdmin=true from Convex
 * 2. Updates their Clerk publicMetadata.isAdmin to true
 *
 * This fixes the mismatch where Convex has admin status but Clerk metadata doesn't,
 * which causes middleware to redirect admins away from /admin routes.
 *
 * Usage: bun run scripts/sync-admin-to-clerk.ts
 */

import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  process.exit(1);
}

if (!CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY environment variable");
  process.exit(1);
}

async function syncAdminToClerk() {
  console.log("Starting admin sync from Convex to Clerk...\n");

  const convex = new ConvexHttpClient(CONVEX_URL!);
  const clerk = await clerkClient();

  try {
    // Get all users from Convex (need admin to call this, so use direct DB query pattern)
    // @ts-ignore - Type depth exceeded with complex Convex query
    const users = await convex.query(api.users.listAllUsers);

    const admins = users.filter((u: { isAdmin?: boolean }) => u.isAdmin === true);
    console.log(`Found ${admins.length} admin(s) in Convex\n`);

    if (admins.length === 0) {
      console.log("No admins to sync.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const [index, admin] of admins.entries()) {
      const progress = `[${index + 1}/${admins.length}]`;

      try {
        // Update Clerk publicMetadata
        await clerk.users.updateUser(admin.clerkId, {
          publicMetadata: { isAdmin: true },
        });

        console.log(`${progress} Synced: ${admin.email || admin.clerkId}`);
        successCount++;
      } catch (error) {
        console.error(
          `${progress} Failed: ${admin.email || admin.clerkId}`,
          error instanceof Error ? error.message : error
        );
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\nSync Summary:");
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed:  ${failCount}`);
    console.log(`   Total:   ${admins.length}\n`);

    if (failCount === 0) {
      console.log("Sync completed successfully!");
      console.log("\nIMPORTANT: Sign out and back in to refresh your session token.");
    } else {
      console.log("Sync completed with errors. Review failed updates above.");
    }
  } catch (error) {
    console.error("Fatal error during sync:", error);
    process.exit(1);
  }
}

syncAdminToClerk()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
