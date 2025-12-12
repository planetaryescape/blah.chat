#!/usr/bin/env bun
/**
 * Backfill all Convex users with correct data from Clerk
 *
 * This script fetches all users from Convex, then for each user:
 * 1. Fetches full user data from Clerk API
 * 2. Extracts email and name
 * 3. Updates the user in Convex
 *
 * Usage: bun run scripts/backfill-users-from-clerk.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { clerkClient } from "@clerk/nextjs/server";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CONVEX_URL) {
  console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  process.exit(1);
}

if (!CLERK_SECRET_KEY) {
  console.error("❌ Missing CLERK_SECRET_KEY environment variable");
  process.exit(1);
}

async function backfillUsers() {
  console.log("🚀 Starting user backfill from Clerk...\n");

  const convex = new ConvexHttpClient(CONVEX_URL!);
  const clerk = await clerkClient();

  try {
    // Get all Convex users
    // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
    const users = await convex.query(api.users.listAllUsers);
    console.log(`📊 Found ${users.length} users in Convex\n`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const [index, user] of users.entries()) {
      const progress = `[${index + 1}/${users.length}]`;

      // Skip users who already have proper data
      if (user.email && user.name && user.name !== "Anonymous") {
        console.log(`${progress} ⏭️  Skipping ${user.email} (already has data)`);
        skipCount++;
        continue;
      }

      try {
        // Fetch full data from Clerk
        const clerkUser = await clerk.users.getUser(user.clerkId);

        // Extract email from primary email address
        const email =
          clerkUser.emailAddresses.find(
            (e: { id: string }) => e.id === clerkUser.primaryEmailAddressId,
          )?.emailAddress || "";

        // Extract name from first/last name
        const name =
          clerkUser.firstName && clerkUser.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
            : clerkUser.firstName || clerkUser.lastName || "Anonymous";

        // Update in Convex
        await convex.mutation(api.users.updateUser, {
          clerkId: user.clerkId,
          email,
          name,
          imageUrl: clerkUser.imageUrl,
        });

        console.log(`${progress} ✅ Updated: ${email || "no-email"} (${name})`);
        successCount++;
      } catch (error) {
        console.error(
          `${progress} ❌ Failed to update user ${user.clerkId}:`,
          error instanceof Error ? error.message : error,
        );
        failCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n📈 Backfill Summary:");
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount} (already had data)`);
    console.log(`   ❌ Failed:  ${failCount}`);
    console.log(`   📊 Total:   ${users.length}\n`);

    if (failCount === 0) {
      console.log("🎉 Backfill completed successfully!");
    } else {
      console.log(
        "⚠️  Backfill completed with errors. Please review failed updates above.",
      );
    }
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
